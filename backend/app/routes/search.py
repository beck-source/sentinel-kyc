from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Customer, Alert, Document, Case

router = APIRouter()


@router.get("/search")
def global_search(q: str = Query(..., min_length=2), db: Session = Depends(get_db)):
    """Cross-entity search across customers, alerts, cases, and documents."""
    pattern = f"%{q}%"
    max_per_type = 8

    # Search customers by customer_id, legal_name, or assigned_analyst
    customers = (
        db.query(Customer)
        .filter(
            (Customer.customer_id.ilike(pattern))
            | (Customer.legal_name.ilike(pattern))
            | (Customer.assigned_analyst.ilike(pattern))
        )
        .limit(max_per_type)
        .all()
    )

    # Search alerts by alert_id, assigned_analyst, or via customer name
    alerts = (
        db.query(Alert)
        .options(joinedload(Alert.customer))
        .filter(
            (Alert.alert_id.ilike(pattern))
            | (Alert.assigned_analyst.ilike(pattern))
            | (Alert.customer.has(Customer.legal_name.ilike(pattern)))
        )
        .limit(max_per_type)
        .all()
    )

    # Search cases by case_id, assigned_analyst, or via customer name
    cases = (
        db.query(Case)
        .options(joinedload(Case.customer))
        .filter(
            (Case.case_id.ilike(pattern))
            | (Case.assigned_analyst.ilike(pattern))
            | (Case.customer.has(Customer.legal_name.ilike(pattern)))
        )
        .limit(max_per_type)
        .all()
    )

    # Search documents by document_id or via customer name
    documents = (
        db.query(Document)
        .options(joinedload(Document.customer))
        .filter(
            (Document.document_id.ilike(pattern))
            | (Document.customer.has(Customer.legal_name.ilike(pattern)))
        )
        .limit(max_per_type)
        .all()
    )

    return {
        "customers": [
            {
                "id": c.id,
                "customer_id": c.customer_id,
                "legal_name": c.legal_name,
                "risk_tier": c.risk_tier,
                "kyc_status": c.kyc_status,
                "business_type": c.business_type,
            }
            for c in customers
        ],
        "alerts": [
            {
                "id": a.id,
                "alert_id": a.alert_id,
                "alert_type": a.alert_type,
                "severity": a.severity,
                "status": a.status,
                "customer_name": a.customer.legal_name if a.customer else None,
                "customer_cid": a.customer.customer_id if a.customer else None,
            }
            for a in alerts
        ],
        "cases": [
            {
                "id": c.id,
                "case_id": c.case_id,
                "case_type": c.case_type,
                "priority": c.priority,
                "status": c.status,
                "customer_name": c.customer.legal_name if c.customer else None,
                "customer_cid": c.customer.customer_id if c.customer else None,
            }
            for c in cases
        ],
        "documents": [
            {
                "id": d.id,
                "document_id": d.document_id,
                "doc_type": d.doc_type,
                "verification_status": d.verification_status,
                "customer_name": d.customer.legal_name if d.customer else None,
                "customer_cid": d.customer.customer_id if d.customer else None,
            }
            for d in documents
        ],
    }
