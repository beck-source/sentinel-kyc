from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ActivityLog

router = APIRouter()


@router.get("/activity")
def list_activity(db: Session = Depends(get_db)):
    entries = (
        db.query(ActivityLog)
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
