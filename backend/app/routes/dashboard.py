from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Customer, Alert, Document

router = APIRouter()


@router.get("/dashboard/kpis")
def get_kpis(db: Session = Depends(get_db)):
    today = date.today()

    # Reviews Due This Month: customers whose next_review_due is in the current month
    reviews_due = (
        db.query(func.count(Customer.id))
        .filter(
            extract("year", Customer.next_review_due) == today.year,
            extract("month", Customer.next_review_due) == today.month,
        )
        .scalar()
    ) or 0

    # High-Risk Customer Rate
    total_customers = db.query(func.count(Customer.id)).scalar() or 0
    high_risk_count = (
        db.query(func.count(Customer.id))
        .filter(Customer.risk_tier == "High")
        .scalar()
    ) or 0
    high_risk_rate = round((high_risk_count / total_customers * 100), 1) if total_customers > 0 else 0

    # Open Critical Alerts: severity=Critical AND status in (Open, Under Review)
    open_critical = (
        db.query(func.count(Alert.id))
        .filter(
            Alert.severity == "Critical",
            Alert.status.in_(["Open", "Under Review"]),
        )
        .scalar()
    ) or 0

    # Documents Expiring in 30 Days
    thirty_days_out = today + timedelta(days=30)
    docs_expiring = (
        db.query(func.count(Document.id))
        .filter(
            Document.expiry_date >= today,
            Document.expiry_date <= thirty_days_out,
        )
        .scalar()
    ) or 0

    return {
        "reviews_due_this_month": reviews_due,
        "high_risk_rate": high_risk_rate,
        "high_risk_count": high_risk_count,
        "total_customers": total_customers,
        "open_critical_alerts": open_critical,
        "docs_expiring_30_days": docs_expiring,
    }


@router.get("/dashboard/risk-distribution")
def get_risk_distribution(db: Session = Depends(get_db)):
    results = (
        db.query(Customer.risk_tier, func.count(Customer.id))
        .group_by(Customer.risk_tier)
        .all()
    )
    distribution = {tier: count for tier, count in results}
    total = sum(distribution.values())
    return {
        "distribution": distribution,
        "total": total,
    }


@router.get("/dashboard/alert-trend")
def get_alert_trend(db: Session = Depends(get_db)):
    """Return alert counts by month x severity for the last 6 months."""
    today = date.today()

    # Generate the last 6 months (including current)
    months = []
    for i in range(5, -1, -1):
        # Go back i months
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        months.append((y, m))

    # Query all alerts with created_date in the range
    first_month = months[0]
    start_date = date(first_month[0], first_month[1], 1)

    alerts = (
        db.query(
            extract("year", Alert.created_date).label("year"),
            extract("month", Alert.created_date).label("month"),
            Alert.severity,
            func.count(Alert.id).label("count"),
        )
        .filter(Alert.created_date >= start_date)
        .group_by(
            extract("year", Alert.created_date),
            extract("month", Alert.created_date),
            Alert.severity,
        )
        .all()
    )

    # Build structured response
    month_names = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]

    trend = []
    for y, m in months:
        entry = {
            "month": month_names[m - 1],
            "year": y,
            "Critical": 0,
            "High": 0,
            "Medium": 0,
            "Low": 0,
        }
        for row in alerts:
            if int(row.year) == y and int(row.month) == m:
                entry[row.severity] = row.count
        trend.append(entry)

    return trend
