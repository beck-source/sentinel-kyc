import os
import json
import asyncio
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Customer, Alert, Document, Case, CaseNote

router = APIRouter()

# ── API Key Management ─────────────────────────────────────────────────────────

KEY_FILE = Path(__file__).resolve().parent.parent.parent / ".api_key"


def _read_saved_key() -> str:
    """Read API key from saved file, falling back to env var."""
    if KEY_FILE.exists():
        key = KEY_FILE.read_text().strip()
        if key:
            return key
    return os.environ.get("ANTHROPIC_API_KEY", "")


def _save_key(key: str) -> None:
    """Save API key to local file."""
    KEY_FILE.write_text(key.strip())


def _validate_key(key: str) -> bool:
    """Validate an API key by making a minimal API call."""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=key)
        client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1,
            messages=[{"role": "user", "content": "hi"}],
        )
        return True
    except Exception:
        return False


class ApiKeyRequest(BaseModel):
    key: str


@router.get("/ai/key-status")
async def key_status():
    """Check whether a valid API key is configured."""
    key = _read_saved_key()
    return {"configured": bool(key)}


@router.post("/ai/key")
async def set_api_key(body: ApiKeyRequest):
    """Validate and save an API key."""
    key = body.key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="API key cannot be empty")
    if not _validate_key(key):
        raise HTTPException(status_code=400, detail="Invalid API key")
    _save_key(key)
    return {"status": "saved"}


@router.delete("/ai/key")
async def delete_api_key():
    """Remove the saved API key file."""
    if KEY_FILE.exists():
        KEY_FILE.unlink()
    return {"status": "deleted"}


def get_anthropic_client():
    """Create and return an Anthropic client, or raise if no key."""
    api_key = _read_saved_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service unavailable: ANTHROPIC_API_KEY not set")
    try:
        import anthropic
        return anthropic.Anthropic(api_key=api_key)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {str(e)}")


async def stream_ai_response(prompt: str, system_prompt: str = ""):
    """Stream AI response as SSE events."""
    try:
        client = get_anthropic_client()
    except HTTPException as e:
        yield f"data: {json.dumps({'error': e.detail})}\n\n"
        yield "data: [DONE]\n\n"
        return

    import anthropic as _anthropic

    try:
        messages = [{"role": "user", "content": prompt}]
        kwargs = {
            "model": "claude-sonnet-4-5-20250929",
            "max_tokens": 4096,
            "messages": messages,
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        with client.messages.stream(**kwargs) as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'text': text})}\n\n"
                await asyncio.sleep(0)  # yield control

        yield "data: [DONE]\n\n"
    except _anthropic.AuthenticationError:
        yield f"data: {json.dumps({'error': 'invalid_api_key'})}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': f'AI service unavailable: {str(e)}'})}\n\n"
        yield "data: [DONE]\n\n"


# ── Risk Assessment ──────────────────────────────────────────────────────────


@router.post("/ai/risk-assessment/{customer_id}")
async def risk_assessment(customer_id: str, db: Session = Depends(get_db)):
    customer = (
        db.query(Customer)
        .filter(Customer.customer_id == customer_id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Get linked data
    alerts = db.query(Alert).filter(Alert.customer_id == customer.id).all()
    documents = db.query(Document).filter(Document.customer_id == customer.id).all()
    cases = db.query(Case).filter(Case.customer_id == customer.id).all()

    # Build prompt with all customer data
    alert_data = "\n".join([
        f"  - {a.alert_id}: {a.alert_type} (Severity: {a.severity}, Status: {a.status}) - {a.description[:100]}"
        for a in alerts
    ]) or "  No alerts"

    doc_data = "\n".join([
        f"  - {d.document_id}: {d.doc_type} (Status: {d.verification_status}, Expiry: {d.expiry_date})"
        for d in documents
    ]) or "  No documents"

    case_data = "\n".join([
        f"  - {c.case_id}: {c.case_type} (Priority: {c.priority}, Status: {c.status})"
        for c in cases
    ]) or "  No cases"

    risk_factors = ", ".join(customer.risk_factors) if customer.risk_factors else "None identified"

    prompt = f"""Analyze the following KYC customer profile and generate a comprehensive risk assessment.

CUSTOMER PROFILE:
- Customer ID: {customer.customer_id}
- Legal Name: {customer.legal_name}
- Business Type: {customer.business_type}
- Jurisdiction: {customer.jurisdiction}
- Current Risk Tier: {customer.risk_tier}
- KYC Status: {customer.kyc_status}
- Onboarding Date: {customer.onboarding_date}
- Last Review: {customer.last_review_date}
- Next Review Due: {customer.next_review_due}
- Assigned Analyst: {customer.assigned_analyst}
- Risk Factors: {risk_factors}

ALERT HISTORY:
{alert_data}

DOCUMENT STATUS:
{doc_data}

CASE HISTORY:
{case_data}

Generate a structured risk assessment with these exact sections. Use markdown headers (##) for each section:

## Executive Summary
(2-3 sentences summarizing the overall risk posture)

## Key Risk Factors
(Bullet list of identified risk factors with explanations)

## Alert History Analysis
(Analysis of alert patterns and concerns)

## Document Compliance Status
(Assessment of document verification status and any gaps)

## Recommended Risk Tier
(State your recommended risk tier — HIGH, MEDIUM, or LOW — with justification. If it differs from the current tier of {customer.risk_tier}, explicitly note the difference.)

## Suggested Next Steps
(Numbered list of recommended actions for the analyst)
"""

    system_prompt = "You are a senior KYC compliance analyst at a major financial institution. Generate formal, regulatory-aware risk assessments. Be specific, reference the data provided, and use professional compliance language suitable for regulatory review."

    return StreamingResponse(
        stream_ai_response(prompt, system_prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Alert Triage ─────────────────────────────────────────────────────────────


@router.post("/ai/alert-triage/{alert_id}")
async def alert_triage(alert_id: str, db: Session = Depends(get_db)):
    alert = (
        db.query(Alert)
        .options(joinedload(Alert.customer))
        .filter(Alert.alert_id == alert_id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Get customer's other alerts for context
    other_alerts = (
        db.query(Alert)
        .filter(Alert.customer_id == alert.customer_id, Alert.id != alert.id)
        .all()
    )

    other_alert_text = "\n".join([
        f"  - {a.alert_id}: {a.alert_type} (Severity: {a.severity}, Status: {a.status})"
        for a in other_alerts
    ]) or "  No other alerts"

    prompt = f"""Triage the following AML alert and provide a structured assessment.

ALERT DETAILS:
- Alert ID: {alert.alert_id}
- Alert Type: {alert.alert_type}
- Severity: {alert.severity}
- Status: {alert.status}
- Created Date: {alert.created_date}
- Description: {alert.description}

CUSTOMER CONTEXT:
- Customer: {alert.customer.legal_name} ({alert.customer.customer_id})
- Business Type: {alert.customer.business_type}
- Jurisdiction: {alert.customer.jurisdiction}
- Risk Tier: {alert.customer.risk_tier}

CUSTOMER'S OTHER ALERTS:
{other_alert_text}

Generate a concise triage assessment with these exact sections. Use markdown headers (##) for each:

## Risk Rating
(Rate this alert 1-10 with a brief explanation. 1=lowest risk, 10=highest.)

## Pattern Analysis
(Does this match known money laundering or financial crime typologies? Be specific.)

## Recommended Investigation Steps
(Numbered list of 3-5 concrete investigation steps)

## Similar Historical Alerts
(Reference the customer's other alerts and any patterns)

## Recommended Disposition
(Recommend: investigate further, escalate, or likely false positive. Be decisive.)
"""

    system_prompt = "You are an experienced AML compliance analyst. Provide concise, actionable triage assessments. Be direct and specific — analysts need clear guidance, not hedging."

    return StreamingResponse(
        stream_ai_response(prompt, system_prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Case Summary ─────────────────────────────────────────────────────────────


@router.post("/ai/case-summary/{case_id}")
async def case_summary(case_id: str, db: Session = Depends(get_db)):
    case = (
        db.query(Case)
        .options(joinedload(Case.customer))
        .filter(Case.case_id == case_id)
        .first()
    )
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Get notes
    notes = (
        db.query(CaseNote)
        .filter(CaseNote.case_id == case.id)
        .order_by(CaseNote.created_at)
        .all()
    )

    # Get linked alerts and documents
    alerts = db.query(Alert).filter(Alert.customer_id == case.customer_id).all()
    documents = db.query(Document).filter(Document.customer_id == case.customer_id).all()

    notes_text = "\n".join([
        f"  [{n.created_at}] {n.analyst_name}: {n.content}"
        for n in notes
    ]) or "  No notes recorded"

    alert_text = "\n".join([
        f"  - {a.alert_id}: {a.alert_type} ({a.severity}, {a.status})"
        for a in alerts
    ]) or "  No alerts"

    doc_text = "\n".join([
        f"  - {d.document_id}: {d.doc_type} ({d.verification_status})"
        for d in documents
    ]) or "  No documents"

    prompt = f"""Generate a formal case closure summary for the following compliance case.

CASE DETAILS:
- Case ID: {case.case_id}
- Case Type: {case.case_type}
- Priority: {case.priority}
- Status: {case.status}
- Opened: {case.opened_date}
- Due Date: {case.due_date}
- Assigned Analyst: {case.assigned_analyst}

CUSTOMER:
- {case.customer.legal_name} ({case.customer.customer_id})
- Business Type: {case.customer.business_type}
- Jurisdiction: {case.customer.jurisdiction}
- Risk Tier: {case.customer.risk_tier}

CASE NOTES (chronological):
{notes_text}

ASSOCIATED ALERTS:
{alert_text}

ASSOCIATED DOCUMENTS:
{doc_text}

Generate a formal case summary with these exact sections. Use markdown headers (##):

## Case Overview
(Brief overview of the case, its trigger, and scope)

## Investigation Steps Taken
(Based on the case notes, summarize what investigation was performed)

## Findings Summary
(Key findings from the investigation)

## Risk Assessment Conclusion
(Overall risk assessment based on the investigation)

## Recommended Disposition
(Recommend: close with no further action, escalate to senior management, continue monitoring, or refer to regulatory authority)
"""

    system_prompt = "You are a senior compliance officer writing formal case summaries for regulatory records. Use formal, precise language suitable for audit review. Reference specific data points from the case."

    return StreamingResponse(
        stream_ai_response(prompt, system_prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Compliance Narrative ────────────────────────────────────────────────────


@router.post("/ai/compliance-narrative")
async def compliance_narrative(db: Session = Depends(get_db)):
    # Gather metrics for the narrative
    from sqlalchemy import func
    from datetime import date

    total_customers = db.query(Customer).count()
    high_risk = db.query(Customer).filter(Customer.risk_tier == "High").count()
    total_alerts = db.query(Alert).count()
    resolved_alerts = db.query(Alert).filter(Alert.status == "Resolved").count()
    open_alerts = db.query(Alert).filter(Alert.status == "Open").count()
    total_cases = db.query(Case).count()
    closed_cases = db.query(Case).filter(Case.status == "Closed").count()
    escalated_cases = db.query(Case).filter(Case.status == "Escalated").count()
    verified_docs = db.query(Document).filter(Document.verification_status == "Verified").count()
    expired_docs = db.query(Document).filter(Document.verification_status == "Expired").count()
    total_docs = db.query(Document).count()

    prompt = f"""Generate a quarterly compliance report narrative based on the following metrics.

COMPLIANCE METRICS:
- Total Customers Under Monitoring: {total_customers}
- High-Risk Customers: {high_risk} ({round(high_risk/total_customers*100, 1)}% of total)
- Total AML Alerts Generated: {total_alerts}
- Alerts Resolved: {resolved_alerts} ({round(resolved_alerts/total_alerts*100, 1)}% resolution rate)
- Open Alerts Requiring Action: {open_alerts}
- Total Compliance Cases: {total_cases}
- Cases Closed: {closed_cases}
- Cases Escalated: {escalated_cases}
- Documents Verified: {verified_docs} of {total_docs}
- Documents Expired: {expired_docs}

Write a 3-4 paragraph professional narrative suitable for inclusion in a quarterly compliance report to the Board of Directors. Cover:
1. Overall compliance program health and key metrics
2. AML monitoring effectiveness and alert resolution
3. Document compliance and any concerns
4. Recommendations and forward-looking priorities

Do NOT use markdown headers — write flowing paragraphs. Use formal board-report language.
"""

    system_prompt = "You are the Chief Compliance Officer preparing the quarterly compliance report narrative for the Board of Directors. Write in a formal, authoritative tone with specific metrics references."

    return StreamingResponse(
        stream_ai_response(prompt, system_prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
