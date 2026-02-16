from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import asc, desc

from app.database import get_db
from app.models import Document, Customer

router = APIRouter()


class StatusUpdate(BaseModel):
    status: str


def serialize_document(doc: Document) -> dict:
    return {
        "id": doc.id,
        "document_id": doc.document_id,
        "doc_type": doc.doc_type,
        "customer_id": doc.customer.customer_id,
        "customer_name": doc.customer.legal_name,
        "issue_date": doc.issue_date.isoformat() if doc.issue_date else None,
        "expiry_date": doc.expiry_date.isoformat() if doc.expiry_date else None,
        "verification_status": doc.verification_status,
    }


@router.get("/documents")
def list_documents(
    search: str = "",
    status: str = "",
    doc_type: str = "",
    sort_by: str = "expiry_date",
    sort_order: str = "asc",
    db: Session = Depends(get_db),
):
    query = db.query(Document).options(joinedload(Document.customer))

    # Search
    if search:
        search_lower = f"%{search.lower()}%"
        query = query.join(Document.customer).filter(
            (Document.document_id.ilike(search_lower))
            | (Customer.legal_name.ilike(search_lower))
        )

    # Filters
    if status:
        statuses = [s.strip() for s in status.split(",")]
        query = query.filter(Document.verification_status.in_(statuses))
    if doc_type:
        types = [t.strip() for t in doc_type.split(",")]
        query = query.filter(Document.doc_type.in_(types))

    # Sorting
    sort_map = {
        "document_id": Document.document_id,
        "doc_type": Document.doc_type,
        "verification_status": Document.verification_status,
        "issue_date": Document.issue_date,
        "expiry_date": Document.expiry_date,
    }
    sort_col = sort_map.get(sort_by, Document.expiry_date)
    order_fn = desc if sort_order == "desc" else asc

    # Handle nulls for expiry_date sort
    if sort_by == "expiry_date" or sort_by not in sort_map:
        if sort_order == "asc":
            query = query.order_by(Document.expiry_date.asc().nullslast())
        else:
            query = query.order_by(Document.expiry_date.desc().nullsfirst())
    else:
        query = query.order_by(order_fn(sort_col))

    documents = query.all()
    return [serialize_document(doc) for doc in documents]


@router.get("/documents/types")
def get_doc_types(db: Session = Depends(get_db)):
    types = db.query(Document.doc_type).distinct().order_by(Document.doc_type).all()
    return [t[0] for t in types]


@router.get("/documents/{document_id}")
def get_document(document_id: str, db: Session = Depends(get_db)):
    doc = (
        db.query(Document)
        .options(joinedload(Document.customer))
        .filter(Document.document_id == document_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return serialize_document(doc)


# Valid status transitions
DOC_TRANSITIONS = {
    "Pending": {"Verify": "Verified", "Reject": "Rejected", "Mark Expired": "Expired"},
    "Verified": {"Mark Expired": "Expired"},
    "Expired": {"Request New": "Pending"},
    "Rejected": {"Request New": "Pending"},
}


@router.put("/documents/{document_id}/status")
def update_document_status(document_id: str, body: StatusUpdate, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    new_status = body.status
    current = doc.verification_status
    valid_transitions = DOC_TRANSITIONS.get(current, {})

    if new_status not in valid_transitions.values():
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition from '{current}' to '{new_status}'"
        )

    doc.verification_status = new_status
    db.commit()
    db.refresh(doc)

    doc = (
        db.query(Document)
        .options(joinedload(Document.customer))
        .filter(Document.document_id == document_id)
        .first()
    )
    return serialize_document(doc)
