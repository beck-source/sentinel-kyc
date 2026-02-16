from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import asc, desc

from app.database import get_db
from app.models import Case, CaseNote, Customer

router = APIRouter()


class StatusUpdate(BaseModel):
    status: str


class NoteCreate(BaseModel):
    content: str
    analyst: str = "Sarah Chen"


def serialize_case(c: Case) -> dict:
    return {
        "id": c.id,
        "case_id": c.case_id,
        "case_type": c.case_type,
        "customer_id": c.customer.customer_id,
        "customer_name": c.customer.legal_name,
        "priority": c.priority,
        "status": c.status,
        "opened_date": c.opened_date.isoformat() if c.opened_date else None,
        "due_date": c.due_date.isoformat() if c.due_date else None,
        "assigned_analyst": c.assigned_analyst,
    }


@router.get("/cases")
def list_cases(
    search: str = "",
    status: str = "",
    case_type: str = "",
    priority: str = "",
    sort_by: str = "case_id",
    sort_order: str = "asc",
    db: Session = Depends(get_db),
):
    query = db.query(Case).options(joinedload(Case.customer))

    # Search
    if search:
        search_lower = f"%{search.lower()}%"
        query = query.join(Case.customer).filter(
            (Case.case_id.ilike(search_lower))
            | (Customer.legal_name.ilike(search_lower))
        )

    # Filters
    if status:
        statuses = [s.strip() for s in status.split(",")]
        query = query.filter(Case.status.in_(statuses))
    if case_type:
        types = [t.strip() for t in case_type.split(",")]
        query = query.filter(Case.case_type.in_(types))
    if priority:
        priorities = [p.strip() for p in priority.split(",")]
        query = query.filter(Case.priority.in_(priorities))

    # Sorting
    sort_map = {
        "case_id": Case.case_id,
        "case_type": Case.case_type,
        "priority": Case.priority,
        "status": Case.status,
        "opened_date": Case.opened_date,
        "due_date": Case.due_date,
        "assigned_analyst": Case.assigned_analyst,
    }
    sort_col = sort_map.get(sort_by, Case.case_id)
    order_fn = desc if sort_order == "desc" else asc
    query = query.order_by(order_fn(sort_col))

    cases = query.all()
    return [serialize_case(c) for c in cases]


@router.get("/cases/types")
def get_case_types(db: Session = Depends(get_db)):
    types = db.query(Case.case_type).distinct().order_by(Case.case_type).all()
    return [t[0] for t in types]


@router.get("/cases/{case_id}")
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = (
        db.query(Case)
        .options(joinedload(Case.customer))
        .filter(Case.case_id == case_id)
        .first()
    )
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return serialize_case(case)


@router.get("/cases/{case_id}/notes")
def get_case_notes(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    notes = (
        db.query(CaseNote)
        .filter(CaseNote.case_id == case.id)
        .order_by(CaseNote.created_at)
        .all()
    )
    return [
        {
            "id": n.id,
            "content": n.content,
            "analyst_name": n.analyst_name,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notes
    ]


@router.post("/cases/{case_id}/notes")
def add_case_note(case_id: str, body: NoteCreate, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    note = CaseNote(
        case_id=case.id,
        content=body.content,
        analyst_name=body.analyst,
        created_at=datetime.utcnow(),
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return {
        "id": note.id,
        "content": note.content,
        "analyst_name": note.analyst_name,
        "created_at": note.created_at.isoformat() if note.created_at else None,
    }


# Valid status transitions
CASE_TRANSITIONS = {
    "Open": {"Start Work": "In Progress", "Escalate": "Escalated"},
    "In Progress": {"Escalate": "Escalated", "Close Case": "Closed"},
    "Escalated": {"Close Case": "Closed"},
    "Closed": {"Reopen": "Open"},
}


@router.put("/cases/{case_id}/status")
def update_case_status(case_id: str, body: StatusUpdate, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    new_status = body.status
    current = case.status
    valid_transitions = CASE_TRANSITIONS.get(current, {})

    if new_status not in valid_transitions.values():
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition from '{current}' to '{new_status}'"
        )

    case.status = new_status
    db.commit()
    db.refresh(case)

    case = (
        db.query(Case)
        .options(joinedload(Case.customer))
        .filter(Case.case_id == case_id)
        .first()
    )
    return serialize_case(case)
