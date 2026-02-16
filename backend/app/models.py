from datetime import date, datetime

from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Analyst(Base):
    __tablename__ = "analysts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String, unique=True, nullable=False, index=True)
    legal_name = Column(String, nullable=False)
    business_type = Column(String, nullable=False)
    jurisdiction = Column(String, nullable=False)
    risk_tier = Column(String, nullable=False)
    kyc_status = Column(String, nullable=False)
    onboarding_date = Column(Date, nullable=False)
    last_review_date = Column(Date)
    next_review_due = Column(Date)
    assigned_analyst = Column(String)
    risk_factors = Column(JSON)

    alerts = relationship("Alert", back_populates="customer")
    documents = relationship("Document", back_populates="customer")
    cases = relationship("Case", back_populates="customer")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String, unique=True, nullable=False, index=True)
    alert_type = Column(String, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    severity = Column(String, nullable=False)
    status = Column(String, nullable=False)
    created_date = Column(Date, nullable=False)
    assigned_analyst = Column(String)
    description = Column(Text, nullable=False)

    customer = relationship("Customer", back_populates="alerts")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(String, unique=True, nullable=False, index=True)
    doc_type = Column(String, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    issue_date = Column(Date, nullable=False)
    expiry_date = Column(Date)
    verification_status = Column(String, nullable=False)

    customer = relationship("Customer", back_populates="documents")


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String, unique=True, nullable=False, index=True)
    case_type = Column(String, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    priority = Column(String, nullable=False)
    status = Column(String, nullable=False)
    opened_date = Column(Date, nullable=False)
    due_date = Column(Date)
    assigned_analyst = Column(String)

    customer = relationship("Customer", back_populates="cases")
    notes = relationship("CaseNote", back_populates="case", order_by="CaseNote.created_at")


class CaseNote(Base):
    __tablename__ = "case_notes"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    content = Column(Text, nullable=False)
    analyst_name = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    case = relationship("Case", back_populates="notes")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)
    analyst_name = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
