from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Customer, Alert, Document, Case, ActivityLog, Analyst

router = APIRouter()


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    return {
        "customers": db.query(Customer).count(),
        "alerts": db.query(Alert).count(),
        "documents": db.query(Document).count(),
        "cases": db.query(Case).count(),
        "activity_entries": db.query(ActivityLog).count(),
        "analysts": db.query(Analyst).count(),
    }
