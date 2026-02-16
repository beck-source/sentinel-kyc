from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Customer, Alert, Document, Case, ActivityLog

router = APIRouter()


def serialize_customer(c: Customer) -> dict:
    return {
        "id": c.id,
        "customer_id": c.customer_id,
        "legal_name": c.legal_name,
        "business_type": c.business_type,
        "jurisdiction": c.jurisdiction,
        "risk_tier": c.risk_tier,
        "kyc_status": c.kyc_status,
        "onboarding_date": c.onboarding_date.isoformat() if c.onboarding_date else None,
        "last_review_date": c.last_review_date.isoformat() if c.last_review_date else None,
        "next_review_due": c.next_review_due.isoformat() if c.next_review_due else None,
        "assigned_analyst": c.assigned_analyst,
        "risk_factors": c.risk_factors or [],
    }


SORTABLE_COLUMNS = {
    "customer_id": Customer.customer_id,
    "legal_name": Customer.legal_name,
    "business_type": Customer.business_type,
    "jurisdiction": Customer.jurisdiction,
    "risk_tier": Customer.risk_tier,
    "kyc_status": Customer.kyc_status,
    "last_review_date": Customer.last_review_date,
    "next_review_due": Customer.next_review_due,
    "onboarding_date": Customer.onboarding_date,
    "assigned_analyst": Customer.assigned_analyst,
}


@router.get("/customers")
def list_customers(
    search: Optional[str] = None,
    risk_tier: Optional[str] = Query(None, description="Comma-separated risk tiers"),
    kyc_status: Optional[str] = Query(None, description="Comma-separated KYC statuses"),
    jurisdiction: Optional[str] = Query(None, description="Comma-separated jurisdictions"),
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = "asc",
    db: Session = Depends(get_db),
):
    query = db.query(Customer)

    # Search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Customer.legal_name.ilike(search_term))
            | (Customer.customer_id.ilike(search_term))
        )

    # Multi-select filters
    if risk_tier:
        tiers = [t.strip() for t in risk_tier.split(",") if t.strip()]
        if tiers:
            query = query.filter(Customer.risk_tier.in_(tiers))

    if kyc_status:
        statuses = [s.strip() for s in kyc_status.split(",") if s.strip()]
        if statuses:
            query = query.filter(Customer.kyc_status.in_(statuses))

    if jurisdiction:
        jurisdictions = [j.strip() for j in jurisdiction.split(",") if j.strip()]
        if jurisdictions:
            query = query.filter(Customer.jurisdiction.in_(jurisdictions))

    # Sorting
    if sort_by and sort_by in SORTABLE_COLUMNS:
        col = SORTABLE_COLUMNS[sort_by]
        if sort_order == "desc":
            query = query.order_by(desc(col))
        else:
            query = query.order_by(asc(col))
    else:
        query = query.order_by(Customer.customer_id)

    customers = query.all()
    return [serialize_customer(c) for c in customers]


@router.get("/customers/jurisdictions")
def list_jurisdictions(db: Session = Depends(get_db)):
    """Return a unique list of all jurisdictions in the database."""
    results = db.query(Customer.jurisdiction).distinct().order_by(Customer.jurisdiction).all()
    return [r[0] for r in results]


@router.get("/customers/{customer_id}")
def get_customer(customer_id: str, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return serialize_customer(customer)


@router.get("/customers/{customer_id}/alerts")
def get_customer_alerts(customer_id: str, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    alerts = (
        db.query(Alert)
        .filter(Alert.customer_id == customer.id)
        .order_by(Alert.created_date.desc())
        .all()
    )
    return [
        {
            "id": a.id,
            "alert_id": a.alert_id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "status": a.status,
            "created_date": a.created_date.isoformat() if a.created_date else None,
            "assigned_analyst": a.assigned_analyst,
            "description": a.description,
        }
        for a in alerts
    ]


@router.get("/customers/{customer_id}/documents")
def get_customer_documents(customer_id: str, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    documents = (
        db.query(Document)
        .filter(Document.customer_id == customer.id)
        .order_by(Document.expiry_date.asc())
        .all()
    )
    return [
        {
            "id": d.id,
            "document_id": d.document_id,
            "doc_type": d.doc_type,
            "issue_date": d.issue_date.isoformat() if d.issue_date else None,
            "expiry_date": d.expiry_date.isoformat() if d.expiry_date else None,
            "verification_status": d.verification_status,
        }
        for d in documents
    ]


@router.get("/customers/{customer_id}/cases")
def get_customer_cases(customer_id: str, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    cases = (
        db.query(Case)
        .filter(Case.customer_id == customer.id)
        .order_by(Case.opened_date.desc())
        .all()
    )
    return [
        {
            "id": c.id,
            "case_id": c.case_id,
            "case_type": c.case_type,
            "priority": c.priority,
            "status": c.status,
            "opened_date": c.opened_date.isoformat() if c.opened_date else None,
            "due_date": c.due_date.isoformat() if c.due_date else None,
            "assigned_analyst": c.assigned_analyst,
        }
        for c in cases
    ]


@router.get("/customers/{customer_id}/activity")
def get_customer_activity(customer_id: str, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Filter activity log entries that mention this customer's ID or name
    entries = (
        db.query(ActivityLog)
        .filter(
            (ActivityLog.action.ilike(f"%{customer.customer_id}%"))
            | (ActivityLog.action.ilike(f"%{customer.legal_name}%"))
        )
        .order_by(ActivityLog.created_at.desc())
        .all()
    )
    return [
        {
            "id": e.id,
            "action": e.action,
            "analyst_name": e.analyst_name,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]
