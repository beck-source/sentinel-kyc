import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routes import health, customers, alerts, documents, cases, activity, stats, dashboard, search, ai, reports


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run seed on startup to ensure data is available."""
    # Create tables (retry for Cloud SQL proxy startup)
    for attempt in range(5):
        try:
            Base.metadata.create_all(bind=engine)
            break
        except Exception:
            if attempt == 4:
                raise
            time.sleep(2)

    # Auto-seed if database is empty
    from app.models import Customer
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        count = db.query(Customer).count()
        if count == 0:
            from app.seed import seed
            print("Database empty — running seed...")
            seed()
            print("Seed complete.")
    finally:
        db.close()

    yield


app = FastAPI(title="Sentinel KYC Compliance API", lifespan=lifespan)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(customers.router, prefix="/api", tags=["customers"])
app.include_router(alerts.router, prefix="/api", tags=["alerts"])
app.include_router(documents.router, prefix="/api", tags=["documents"])
app.include_router(cases.router, prefix="/api", tags=["cases"])
app.include_router(activity.router, prefix="/api", tags=["activity"])
app.include_router(stats.router, prefix="/api", tags=["stats"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(search.router, prefix="/api", tags=["search"])
app.include_router(ai.router, prefix="/api", tags=["ai"])
app.include_router(reports.router, prefix="/api", tags=["reports"])
