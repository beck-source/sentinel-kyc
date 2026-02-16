from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import asc, desc

from app.database import get_db
from app.models import Alert, Customer

router = APIRouter()


class StatusUpdate(BaseModel):
    status: str


def serialize_alert(a: Alert) -> dict:
    return {
        "id": a.id,
        "alert_id": a.alert_id,
        "alert_type": a.alert_type,
        "customer_id": a.customer.customer_id,
        "customer_name": a.customer.legal_name,
        "severity": a.severity,
        "status": a.status,
        "created_date": a.created_date.isoformat() if a.created_date else None,
        "assigned_analyst": a.assigned_analyst,
        "description": a.description,
    }


@router.get("/alerts")
def list_alerts(
    search: str = "",
    severity: str = "",
    status: str = "",
    alert_type: str = "",
    sort_by: str = "alert_id",
    sort_order: str = "asc",
    db: Session = Depends(get_db),
):
    query = db.query(Alert).options(joinedload(Alert.customer))

    # Search
    if search:
        search_lower = f"%{search.lower()}%"
        query = query.join(Alert.customer).filter(
            (Alert.alert_id.ilike(search_lower))
            | (Customer.legal_name.ilike(search_lower))
        )

    # Filters
    if severity:
        severities = [s.strip() for s in severity.split(",")]
        query = query.filter(Alert.severity.in_(severities))
    if status:
        statuses = [s.strip() for s in status.split(",")]
        query = query.filter(Alert.status.in_(statuses))
    if alert_type:
        types = [t.strip() for t in alert_type.split(",")]
        query = query.filter(Alert.alert_type.in_(types))

    # Sorting
    sort_map = {
        "alert_id": Alert.alert_id,
        "alert_type": Alert.alert_type,
        "severity": Alert.severity,
        "status": Alert.status,
        "created_date": Alert.created_date,
        "assigned_analyst": Alert.assigned_analyst,
    }
    sort_col = sort_map.get(sort_by, Alert.alert_id)
    order_fn = desc if sort_order == "desc" else asc
    query = query.order_by(order_fn(sort_col))

    alerts = query.all()
    return [serialize_alert(a) for a in alerts]


@router.get("/alerts/types")
def get_alert_types(db: Session = Depends(get_db)):
    types = db.query(Alert.alert_type).distinct().order_by(Alert.alert_type).all()
    return [t[0] for t in types]


@router.get("/alerts/{alert_id}")
def get_alert(alert_id: str, db: Session = Depends(get_db)):
    alert = (
        db.query(Alert)
        .options(joinedload(Alert.customer))
        .filter(Alert.alert_id == alert_id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return serialize_alert(alert)


# Valid status transitions
ALERT_TRANSITIONS = {
    "Open": {"Begin Review": "Under Review", "Dismiss": "Dismissed"},
    "Under Review": {"Resolve": "Resolved", "Dismiss": "Dismissed"},
    "Resolved": {"Reopen": "Open"},
    "Dismissed": {"Reopen": "Open"},
}


@router.put("/alerts/{alert_id}/status")
def update_alert_status(alert_id: str, body: StatusUpdate, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    new_status = body.status
    current = alert.status
    valid_transitions = ALERT_TRANSITIONS.get(current, {})

    # Check if the new status is reachable from current
    if new_status not in valid_transitions.values():
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition from '{current}' to '{new_status}'"
        )

    alert.status = new_status
    db.commit()
    db.refresh(alert)

    # Re-load with customer relationship
    alert = (
        db.query(Alert)
        .options(joinedload(Alert.customer))
        .filter(Alert.alert_id == alert_id)
        .first()
    )
    return serialize_alert(alert)
