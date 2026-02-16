"""
Seed script for the Sentinel KYC Compliance Dashboard.

All data is hardcoded — no random generators, no faker libraries.
Idempotent: drops and recreates all tables on every run.

Usage: python -m app.seed
"""

from datetime import date, datetime, timedelta

from app.database import Base, engine, SessionLocal
from app.models import Analyst, Customer, Alert, Document, Case, CaseNote, ActivityLog

TODAY = date.today()


def d(days_offset: int) -> date:
    """Helper: return a date relative to today."""
    return TODAY + timedelta(days=days_offset)


def dt(days_offset: int, hour: int = 10, minute: int = 0) -> datetime:
    """Helper: return a datetime relative to today."""
    return datetime.combine(d(days_offset), datetime.min.time().replace(hour=hour, minute=minute))


def seed():
    # Drop and recreate all tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # ── ANALYSTS ──────────────────────────────────────────────
        analysts = [
            Analyst(name="Sarah Chen", role="Senior Compliance Analyst"),
            Analyst(name="James Morrison", role="Compliance Analyst"),
            Analyst(name="Priya Patel", role="Senior Compliance Analyst"),
            Analyst(name="Marcus Webb", role="Compliance Manager"),
            Analyst(name="Elena Rossi", role="Compliance Analyst"),
            Analyst(name="David Kim", role="AML Specialist"),
            Analyst(name="Lisa Chang", role="KYC Analyst"),
            Analyst(name="Robert Torres", role="Senior AML Analyst"),
        ]
        db.add_all(analysts)
        db.flush()

        # ── CUSTOMERS (40) ───────────────────────────────────────
        customers_data = [
            # High Risk (~10 = 25%)
            dict(customer_id="CUS-10001", legal_name="Meridian Capital Holdings Ltd", business_type="Holding Company", jurisdiction="Cayman Islands", risk_tier="High", kyc_status="Under Review", onboarding_date=d(-820), last_review_date=d(-45), next_review_due=d(-10), assigned_analyst="Sarah Chen", risk_factors=["High-risk jurisdiction: Cayman Islands", "Complex multi-layered ownership structure", "PEP association identified — board member linked to foreign government official", "Significant unexplained wealth indicators"]),
            dict(customer_id="CUS-10002", legal_name="Oaktree Trust Services AG", business_type="Trust", jurisdiction="Switzerland", risk_tier="High", kyc_status="Verified", onboarding_date=d(-650), last_review_date=d(-30), next_review_due=d(60), assigned_analyst="Priya Patel", risk_factors=["Opaque trust structure with nominee directors", "High-value transactions to non-transparent jurisdictions", "Frequent changes in beneficial ownership"]),
            dict(customer_id="CUS-10003", legal_name="Pacific Rim Trading Co", business_type="Trading Company", jurisdiction="Hong Kong", risk_tier="High", kyc_status="Verified", onboarding_date=d(-400), last_review_date=d(-60), next_review_due=d(15), assigned_analyst="David Kim", risk_factors=["Trade-based money laundering indicators", "Discrepancies between invoiced and market values", "Counterparties in sanctioned jurisdictions"]),
            dict(customer_id="CUS-10004", legal_name="Volkov International Group", business_type="Holding Company", jurisdiction="BVI", risk_tier="High", kyc_status="Under Review", onboarding_date=d(-300), last_review_date=d(-90), next_review_due=d(-20), assigned_analyst="Marcus Webb", risk_factors=["High-risk jurisdiction: BVI", "Politically exposed person as ultimate beneficial owner", "Source of funds documentation incomplete", "Shell company indicators in ownership chain"]),
            dict(customer_id="CUS-10005", legal_name="Golden Dragon Enterprises Ltd", business_type="Trading Company", jurisdiction="Singapore", risk_tier="High", kyc_status="Expired", onboarding_date=d(-900), last_review_date=d(-200), next_review_due=d(-60), assigned_analyst="Sarah Chen", risk_factors=["Overdue KYC renewal — 60 days past due", "Structuring pattern detected in transaction history", "Adverse media mentions regarding sanctions evasion"]),
            dict(customer_id="CUS-10006", legal_name="Caspian Energy Ventures SPV", business_type="SPV", jurisdiction="UAE", risk_tier="High", kyc_status="Pending", onboarding_date=d(-150), last_review_date=d(-150), next_review_due=d(30), assigned_analyst="James Morrison", risk_factors=["Single-purpose vehicle with limited transparency", "Energy sector exposure in sanctioned region", "Newly onboarded — limited transaction history"]),
            dict(customer_id="CUS-10007", legal_name="Aegean Maritime Holdings SA", business_type="Holding Company", jurisdiction="Luxembourg", risk_tier="High", kyc_status="Verified", onboarding_date=d(-500), last_review_date=d(-20), next_review_due=d(90), assigned_analyst="Elena Rossi", risk_factors=["Maritime sector — vessel flagging in high-risk jurisdictions", "Complex corporate structure across 4 jurisdictions", "Historical SARs filed by previous institution"]),
            dict(customer_id="CUS-10008", legal_name="Sahara Investment Fund III", business_type="Investment Fund", jurisdiction="Jersey", risk_tier="High", kyc_status="Under Review", onboarding_date=d(-700), last_review_date=d(-100), next_review_due=d(-5), assigned_analyst="Robert Torres", risk_factors=["Fund investors include high-risk jurisdiction entities", "Concentration risk — single large investor >40% of AUM", "Incomplete investor look-through documentation"]),
            dict(customer_id="CUS-10009", legal_name="Nordic Shield Private Equity", business_type="Private Equity", jurisdiction="UK", risk_tier="High", kyc_status="Verified", onboarding_date=d(-450), last_review_date=d(-15), next_review_due=d(120), assigned_analyst="Priya Patel", risk_factors=["Portfolio companies in high-risk sectors", "Leveraged buyout structures with offshore elements", "PEP among limited partners"]),
            dict(customer_id="CUS-10010", legal_name="Falcone Family Office", business_type="Family Office", jurisdiction="Delaware", risk_tier="High", kyc_status="Verified", onboarding_date=d(-600), last_review_date=d(-25), next_review_due=d(45), assigned_analyst="Lisa Chang", risk_factors=["High net worth individual with complex asset structures", "Dual citizenship — US/Italian", "Frequent large wire transfers to Mediterranean region"]),

            # Medium Risk (~14 = 35%)
            dict(customer_id="CUS-10011", legal_name="Sovereign Wealth Partners LLC", business_type="Investment Fund", jurisdiction="Delaware", risk_tier="Medium", kyc_status="Verified", onboarding_date=d(-550), last_review_date=d(-40), next_review_due=d(50), assigned_analyst="Sarah Chen", risk_factors=["Multiple investment vehicles under management", "Some investors from elevated-risk jurisdictions"]),
            dict(customer_id="CUS-10012", legal_name="Atlas Maritime Holdings", business_type="Holding Company", jurisdiction="UK", risk_tier="Medium", kyc_status="Verified", onboarding_date=d(-480), last_review_date=d(-35), next_review_due=d(75), assigned_analyst="James Morrison", risk_factors=["Shipping operations in multiple jurisdictions", "Moderate transaction volumes"]),
            dict(customer_id="CUS-10013", legal_name="Pinnacle Asset Management Pte", business_type="Investment Fund", jurisdiction="Singapore", risk_tier="Medium", kyc_status="Pending", onboarding_date=d(-100), last_review_date=d(-100), next_review_due=d(80), assigned_analyst="Priya Patel", risk_factors=["New relationship — undergoing enhanced onboarding", "Fund domiciled in Singapore with regional investors"]),
            dict(customer_id="CUS-10014", legal_name="Helvetia Fiduciary Services", business_type="Trust", jurisdiction="Switzerland", risk_tier="Medium", kyc_status="Verified", onboarding_date=d(-700), last_review_date=d(-50), next_review_due=d(40), assigned_analyst="Elena Rossi", risk_factors=["Swiss trust with European beneficiaries", "Moderate complexity in ownership structure"]),
            dict(customer_id="CUS-10015", legal_name="Crescent Bay Insurance Ltd", business_type="Insurance", jurisdiction="Cayman Islands", risk_tier="Medium", kyc_status="Verified", onboarding_date=d(-380), last_review_date=d(-20), next_review_due=d(100), assigned_analyst="David Kim", risk_factors=["Captive insurance structure", "Cayman Islands jurisdiction — mitigated by regulatory oversight"]),
            dict(customer_id="CUS-10016", legal_name="Tandem Capital Advisors", business_type="Private Equity", jurisdiction="UK", risk_tier="Medium", kyc_status="Under Review", onboarding_date=d(-250), last_review_date=d(-80), next_review_due=d(10), assigned_analyst="Marcus Webb", risk_factors=["PE fund with portfolio companies in emerging markets", "Periodic review triggered by regulatory change"]),
            dict(customer_id="CUS-10017", legal_name="Sterling Trade Finance Corp", business_type="Trading Company", jurisdiction="Hong Kong", risk_tier="Medium", kyc_status="Verified", onboarding_date=d(-600), last_review_date=d(-30), next_review_due=d(85), assigned_analyst="Lisa Chang", risk_factors=["Trade finance operations in Asia-Pacific", "Moderate counterparty risk"]),
            dict(customer_id="CUS-10018", legal_name="Bluestone Property Holdings", business_type="Holding Company", jurisdiction="Luxembourg", risk_tier="Medium", kyc_status="Verified", onboarding_date=d(-420), last_review_date=d(-55), next_review_due=d(35), assigned_analyst="Robert Torres", risk_factors=["Real estate holding structures across EU", "Some properties in emerging markets"]),
            dict(customer_id="CUS-10019", legal_name="Coral Reef Ventures SPV", business_type="SPV", jurisdiction="BVI", risk_tier="Medium", kyc_status="Pending", onboarding_date=d(-60), last_review_date=d(-60), next_review_due=d(120), assigned_analyst="Sarah Chen", risk_factors=["BVI-domiciled SPV — enhanced monitoring applied", "Resort development financing"]),
            dict(customer_id="CUS-10020", legal_name="Zenith Global Consulting AG", business_type="Holding Company", jurisdiction="Switzerland", risk_tier="Medium", kyc_status="Verified", onboarding_date=d(-350), last_review_date=d(-45), next_review_due=d(65), assigned_analyst="James Morrison", risk_factors=["Consulting fees from multiple jurisdictions", "Moderate transaction complexity"]),
            dict(customer_id="CUS-10021", legal_name="Ironclad Security Services", business_type="Trading Company", jurisdiction="UAE", risk_tier="Medium", kyc_status="Verified", onboarding_date=d(-280), last_review_date=d(-40), next_review_due=d(55), assigned_analyst="Priya Patel", risk_factors=["Security sector — dual-use goods risk", "UAE-based with government contracts"]),
            dict(customer_id="CUS-10022", legal_name="Maple Leaf Holdings Inc", business_type="Holding Company", jurisdiction="Jersey", risk_tier="Medium", kyc_status="Expired", onboarding_date=d(-800), last_review_date=d(-180), next_review_due=d(-30), assigned_analyst="David Kim", risk_factors=["KYC renewal overdue", "Canadian beneficial owners with Jersey holding structure"]),
            dict(customer_id="CUS-10023", legal_name="Jade Emperor Investment Trust", business_type="Trust", jurisdiction="Hong Kong", risk_tier="Medium", kyc_status="Verified", onboarding_date=d(-500), last_review_date=d(-25), next_review_due=d(70), assigned_analyst="Elena Rossi", risk_factors=["Family trust with cross-border beneficiaries", "Moderate AUM with quarterly distributions"]),
            dict(customer_id="CUS-10024", legal_name="Riviera Luxury Group SA", business_type="Holding Company", jurisdiction="Luxembourg", risk_tier="Medium", kyc_status="Verified", onboarding_date=d(-450), last_review_date=d(-35), next_review_due=d(90), assigned_analyst="Marcus Webb", risk_factors=["Luxury goods sector — higher cash transaction risk", "European operations with some Middle Eastern clients"]),

            # Low Risk (~16 = 40%)
            dict(customer_id="CUS-10025", legal_name="Northern Star Pension Fund", business_type="Investment Fund", jurisdiction="UK", risk_tier="Low", kyc_status="Verified", onboarding_date=d(-900), last_review_date=d(-30), next_review_due=d(150), assigned_analyst="Sarah Chen", risk_factors=["Regulated UK pension fund", "Low-risk investor base"]),
            dict(customer_id="CUS-10026", legal_name="Clearwater Technologies Inc", business_type="Trading Company", jurisdiction="Delaware", risk_tier="Low", kyc_status="Verified", onboarding_date=d(-700), last_review_date=d(-20), next_review_due=d(180), assigned_analyst="Lisa Chang", risk_factors=["US-domiciled technology company", "Transparent ownership structure"]),
            dict(customer_id="CUS-10027", legal_name="Canterbury Life Assurance", business_type="Insurance", jurisdiction="UK", risk_tier="Low", kyc_status="Verified", onboarding_date=d(-600), last_review_date=d(-15), next_review_due=d(200), assigned_analyst="James Morrison", risk_factors=["FCA-regulated insurance company", "Domestic operations only"]),
            dict(customer_id="CUS-10028", legal_name="Alpine Wealth Management GmbH", business_type="Family Office", jurisdiction="Switzerland", risk_tier="Low", kyc_status="Verified", onboarding_date=d(-550), last_review_date=d(-25), next_review_due=d(130), assigned_analyst="Priya Patel", risk_factors=["FINMA-regulated entity", "European HNW clients with verified source of wealth"]),
            dict(customer_id="CUS-10029", legal_name="Sunrise Healthcare Holdings", business_type="Holding Company", jurisdiction="Singapore", risk_tier="Low", kyc_status="Verified", onboarding_date=d(-480), last_review_date=d(-40), next_review_due=d(110), assigned_analyst="David Kim", risk_factors=["Healthcare sector — low inherent risk", "MAS-regulated subsidiary"]),
            dict(customer_id="CUS-10030", legal_name="Thames Valley Property Trust", business_type="Trust", jurisdiction="UK", risk_tier="Low", kyc_status="Verified", onboarding_date=d(-400), last_review_date=d(-30), next_review_due=d(160), assigned_analyst="Elena Rossi", risk_factors=["UK commercial property trust", "Regulated and transparent structure"]),
            dict(customer_id="CUS-10031", legal_name="Pacific Coast Ventures LLC", business_type="Private Equity", jurisdiction="Delaware", risk_tier="Low", kyc_status="Verified", onboarding_date=d(-350), last_review_date=d(-20), next_review_due=d(175), assigned_analyst="Robert Torres", risk_factors=["US-based PE with domestic portfolio", "SEC-registered investment adviser"]),
            dict(customer_id="CUS-10032", legal_name="Borealis Infrastructure Fund", business_type="Investment Fund", jurisdiction="Luxembourg", risk_tier="Low", kyc_status="Verified", onboarding_date=d(-500), last_review_date=d(-35), next_review_due=d(140), assigned_analyst="Marcus Webb", risk_factors=["CSSF-regulated infrastructure fund", "Institutional investor base"]),
            dict(customer_id="CUS-10033", legal_name="Eastgate Trading Partners", business_type="Trading Company", jurisdiction="Singapore", risk_tier="Low", kyc_status="Verified", onboarding_date=d(-300), last_review_date=d(-15), next_review_due=d(190), assigned_analyst="Sarah Chen", risk_factors=["Commodities trading — regulated exchange only", "Transparent beneficial ownership"]),
            dict(customer_id="CUS-10034", legal_name="Redwood Financial Services", business_type="Insurance", jurisdiction="Delaware", risk_tier="Low", kyc_status="Verified", onboarding_date=d(-450), last_review_date=d(-25), next_review_due=d(155), assigned_analyst="Lisa Chang", risk_factors=["State-regulated insurance provider", "Domestic client base"]),
            dict(customer_id="CUS-10035", legal_name="Harbour Point Capital", business_type="Investment Fund", jurisdiction="Jersey", risk_tier="Low", kyc_status="Verified", onboarding_date=d(-380), last_review_date=d(-20), next_review_due=d(165), assigned_analyst="James Morrison", risk_factors=["JFSC-regulated fund", "European institutional investors"]),
            dict(customer_id="CUS-10036", legal_name="Whitmore & Associates Trust", business_type="Trust", jurisdiction="UK", risk_tier="Low", kyc_status="Pending", onboarding_date=d(-40), last_review_date=d(-40), next_review_due=d(140), assigned_analyst="Priya Patel", risk_factors=["New onboarding — documentation in review", "UK-based family trust"]),
            dict(customer_id="CUS-10037", legal_name="Greenfield Agri Holdings", business_type="Holding Company", jurisdiction="Singapore", risk_tier="Low", kyc_status="Verified", onboarding_date=d(-600), last_review_date=d(-30), next_review_due=d(120), assigned_analyst="David Kim", risk_factors=["Agricultural holdings — low inherent risk", "Government-linked investment entity"]),
            dict(customer_id="CUS-10038", legal_name="Summit Peak Advisors", business_type="Family Office", jurisdiction="Switzerland", risk_tier="Low", kyc_status="Verified", onboarding_date=d(-500), last_review_date=d(-22), next_review_due=d(145), assigned_analyst="Elena Rossi", risk_factors=["FINMA-regulated family office", "Verified source of wealth — industrial enterprise"]),
            dict(customer_id="CUS-10039", legal_name="Keystone Infrastructure Corp", business_type="Holding Company", jurisdiction="Delaware", risk_tier="Low", kyc_status="Verified", onboarding_date=d(-420), last_review_date=d(-18), next_review_due=d(170), assigned_analyst="Robert Torres", risk_factors=["US infrastructure holding company", "Government contract visibility"]),
            dict(customer_id="CUS-10040", legal_name="Continental Trade Solutions", business_type="Trading Company", jurisdiction="UK", risk_tier="Low", kyc_status="Verified", onboarding_date=d(-350), last_review_date=d(-28), next_review_due=d(135), assigned_analyst="Marcus Webb", risk_factors=["UK-regulated trade finance", "HMRC-compliant operations"]),
        ]

        customer_objects = []
        for cd in customers_data:
            c = Customer(**cd)
            db.add(c)
            customer_objects.append(c)
        db.flush()

        # Build lookup by customer_id
        cust_map = {c.customer_id: c.id for c in customer_objects}

        # ── AML ALERTS (60) ──────────────────────────────────────
        alerts_data = [
            # Open (~18 = 30%)
            dict(alert_id="ALT-00001", alert_type="Unusual Transaction Volume", customer_id=cust_map["CUS-10001"], severity="Critical", status="Open", created_date=d(-5), assigned_analyst="Sarah Chen", description="Transaction volume for the current quarter exceeded 3.2x the historical average with 47 transactions totaling $2.3M, primarily to jurisdictions flagged as high-risk including BVI and Cayman Islands."),
            dict(alert_id="ALT-00002", alert_type="Sanctions Match", customer_id=cust_map["CUS-10004"], severity="Critical", status="Open", created_date=d(-3), assigned_analyst="Marcus Webb", description="Potential sanctions match identified: counterparty 'VK Industrial Group' shows 87% name similarity to OFAC SDN list entry. Wire transfer of $450,000 flagged on 2024-01-15."),
            dict(alert_id="ALT-00003", alert_type="PEP Match", customer_id=cust_map["CUS-10001"], severity="High", status="Open", created_date=d(-10), assigned_analyst="Sarah Chen", description="New PEP screening match: board director Alexander Volkov identified as relative of a senior government official in a CIS country. Relationship requires enhanced due diligence review."),
            dict(alert_id="ALT-00004", alert_type="Structuring Pattern", customer_id=cust_map["CUS-10005"], severity="Critical", status="Open", created_date=d(-2), assigned_analyst="David Kim", description="Structuring pattern detected: 12 deposits between $8,500 and $9,800 over a 3-week period, consistent with deliberate avoidance of the $10,000 reporting threshold. Total: $112,400."),
            dict(alert_id="ALT-00005", alert_type="Unusual Transaction Volume", customer_id=cust_map["CUS-10003"], severity="High", status="Open", created_date=d(-8), assigned_analyst="David Kim", description="Outbound wire transfers increased 280% month-over-month. 23 transactions totaling $1.8M directed to previously unseen counterparties in Southeast Asian jurisdictions."),
            dict(alert_id="ALT-00006", alert_type="Document Expired", customer_id=cust_map["CUS-10022"], severity="Medium", status="Open", created_date=d(-15), assigned_analyst="David Kim", description="Primary identification document (passport) for UBO Marcus Henderson expired 30 days ago. KYC file incomplete without valid ID. Customer contacted but no response received."),
            dict(alert_id="ALT-00007", alert_type="Address Mismatch", customer_id=cust_map["CUS-10006"], severity="Medium", status="Open", created_date=d(-12), assigned_analyst="James Morrison", description="Registered office address on file does not match the address provided in the latest bank statement. Discrepancy may indicate undisclosed change of operations or virtual office usage."),
            dict(alert_id="ALT-00008", alert_type="Sanctions Match", customer_id=cust_map["CUS-10007"], severity="High", status="Open", created_date=d(-7), assigned_analyst="Elena Rossi", description="Vessel 'MV Aegean Star' operated by subsidiary appeared in port call data for a sanctioned country. Potential violation of maritime sanctions regime requires immediate investigation."),
            dict(alert_id="ALT-00009", alert_type="PEP Match", customer_id=cust_map["CUS-10008"], severity="High", status="Open", created_date=d(-4), assigned_analyst="Robert Torres", description="Quarterly PEP screening identified new match: fund investor Hassan Al-Rashidi listed as a politically exposed person — former minister of finance in a Gulf state."),
            dict(alert_id="ALT-00010", alert_type="Unusual Transaction Volume", customer_id=cust_map["CUS-10009"], severity="Medium", status="Open", created_date=d(-18), assigned_analyst="Priya Patel", description="Capital call disbursements to portfolio companies increased significantly. Three transactions over $5M each within 48 hours to newly created entities. Pattern requires review."),
            dict(alert_id="ALT-00011", alert_type="Structuring Pattern", customer_id=cust_map["CUS-10010"], severity="High", status="Open", created_date=d(-6), assigned_analyst="Lisa Chang", description="Multiple cash deposits across 4 bank branches within a 5-day period, each below reporting threshold. Total: $87,600. Pattern consistent with structuring to avoid CTR filing."),
            dict(alert_id="ALT-00012", alert_type="Document Expired", customer_id=cust_map["CUS-10005"], severity="Medium", status="Open", created_date=d(-20), assigned_analyst="Sarah Chen", description="Certificate of Incorporation for Golden Dragon Enterprises expired. Annual renewal not filed. May indicate dormant company status or administrative neglect."),
            dict(alert_id="ALT-00013", alert_type="Unusual Transaction Volume", customer_id=cust_map["CUS-10011"], severity="Medium", status="Open", created_date=d(-14), assigned_analyst="Sarah Chen", description="Fund redemption activity increased 150% versus trailing 12-month average. Three large redemption requests from a single investor class. Monitoring for potential run risk."),
            dict(alert_id="ALT-00014", alert_type="Address Mismatch", customer_id=cust_map["CUS-10019"], severity="Low", status="Open", created_date=d(-25), assigned_analyst="Sarah Chen", description="Utility bill provided for address verification references a different suite number than the registered office. Minor discrepancy but flagged for completeness."),
            dict(alert_id="ALT-00015", alert_type="PEP Match", customer_id=cust_map["CUS-10024"], severity="Medium", status="Open", created_date=d(-9), assigned_analyst="Marcus Webb", description="Client representative Pierre Dubois identified as nephew of a sitting EU parliamentarian. Relationship is indirect but requires documentation under PEP policy."),
            dict(alert_id="ALT-00016", alert_type="Sanctions Match", customer_id=cust_map["CUS-10003"], severity="Critical", status="Open", created_date=d(-1), assigned_analyst="David Kim", description="Trade counterparty 'Shenzhen Industrial Materials Co' flagged by OFAC secondary sanctions screening. $320,000 invoice pending payment requires hold and review."),
            dict(alert_id="ALT-00017", alert_type="Document Expired", customer_id=cust_map["CUS-10016"], severity="Low", status="Open", created_date=d(-30), assigned_analyst="Marcus Webb", description="Tax registration certificate for Tandem Capital Advisors approaching renewal deadline. Currently valid but will expire in 15 days if not renewed."),
            dict(alert_id="ALT-00018", alert_type="Unusual Transaction Volume", customer_id=cust_map["CUS-10021"], severity="Medium", status="Open", created_date=d(-11), assigned_analyst="Priya Patel", description="Government contract payment of $2.1M received followed by immediate outbound transfers totaling $1.9M to three different entities. Rapid pass-through pattern flagged."),

            # Under Review (~12 = 20%)
            dict(alert_id="ALT-00019", alert_type="Unusual Transaction Volume", customer_id=cust_map["CUS-10002"], severity="High", status="Under Review", created_date=d(-35), assigned_analyst="Priya Patel", description="Wire transfers to 7 new counterparties in a single month, totaling $4.2M. Investigation ongoing — analyst reviewing counterparty documentation and transaction rationale."),
            dict(alert_id="ALT-00020", alert_type="Sanctions Match", customer_id=cust_map["CUS-10001"], severity="Critical", status="Under Review", created_date=d(-28), assigned_analyst="Sarah Chen", description="Name match against EU consolidated sanctions list for business associate. Currently under review — compliance team assessing whether the association is direct or incidental."),
            dict(alert_id="ALT-00021", alert_type="PEP Match", customer_id=cust_map["CUS-10010"], severity="High", status="Under Review", created_date=d(-40), assigned_analyst="Lisa Chang", description="UBO Giovanni Falcone identified as a former regional government official in Italy. Enhanced due diligence documentation being collected to assess ongoing risk."),
            dict(alert_id="ALT-00022", alert_type="Structuring Pattern", customer_id=cust_map["CUS-10003"], severity="High", status="Under Review", created_date=d(-33), assigned_analyst="David Kim", description="Series of 15 payments between $4,000 and $4,900 to the same beneficiary over 6 weeks. Analyst investigating whether this represents installment payments or deliberate structuring."),
            dict(alert_id="ALT-00023", alert_type="Document Expired", customer_id=cust_map["CUS-10014"], severity="Medium", status="Under Review", created_date=d(-45), assigned_analyst="Elena Rossi", description="Annual financial statements for Helvetia Fiduciary Services are 45 days overdue. Client claims auditor delays. Follow-up scheduled for next week."),
            dict(alert_id="ALT-00024", alert_type="Unusual Transaction Volume", customer_id=cust_map["CUS-10017"], severity="Medium", status="Under Review", created_date=d(-38), assigned_analyst="Lisa Chang", description="Trade finance utilization rate jumped from 40% to 92% of facility limit within two weeks. Review in progress to verify underlying trade documentation supports the increase."),
            dict(alert_id="ALT-00025", alert_type="Address Mismatch", customer_id=cust_map["CUS-10004"], severity="Medium", status="Under Review", created_date=d(-42), assigned_analyst="Marcus Webb", description="Corporate registry search reveals new registered address in a different BVI district. Client has not notified us of the change. Verification in progress."),
            dict(alert_id="ALT-00026", alert_type="Sanctions Match", customer_id=cust_map["CUS-10021"], severity="High", status="Under Review", created_date=d(-30), assigned_analyst="Priya Patel", description="Sub-contractor identified in security services supply chain appears on a regional sanctions watchlist. Reviewing contractual relationships and exposure level."),
            dict(alert_id="ALT-00027", alert_type="PEP Match", customer_id=cust_map["CUS-10009"], severity="Medium", status="Under Review", created_date=d(-50), assigned_analyst="Priya Patel", description="Limited partner Sir James Worthington holds a hereditary peerage and sits on a parliamentary committee. Low-risk PEP but requires annual certification under policy."),
            dict(alert_id="ALT-00028", alert_type="Structuring Pattern", customer_id=cust_map["CUS-10011"], severity="Low", status="Under Review", created_date=d(-55), assigned_analyst="Sarah Chen", description="Multiple small subscription payments from retail investors detected. Likely legitimate investment activity but pattern triggered automated structuring alert. Reviewing."),
            dict(alert_id="ALT-00029", alert_type="Unusual Transaction Volume", customer_id=cust_map["CUS-10018"], severity="Medium", status="Under Review", created_date=d(-32), assigned_analyst="Robert Torres", description="Property acquisition payments of $8.5M across 3 transactions in a single week. Reviewing sale/purchase agreements to confirm legitimate real estate activity."),
            dict(alert_id="ALT-00030", alert_type="Document Expired", customer_id=cust_map["CUS-10008"], severity="Low", status="Under Review", created_date=d(-48), assigned_analyst="Robert Torres", description="Fund prospectus supplement is 6 months past renewal date. Legal team reviewing whether this triggers regulatory notification requirements."),

            # Resolved (~24 = 40%)
            dict(alert_id="ALT-00031", alert_type="Unusual Transaction Volume", customer_id=cust_map["CUS-10025"], severity="Medium", status="Resolved", created_date=d(-90), assigned_analyst="Sarah Chen", description="Pension fund quarterly rebalancing caused elevated transaction volumes. Confirmed legitimate portfolio management activity. No further action required."),
            dict(alert_id="ALT-00032", alert_type="Sanctions Match", customer_id=cust_map["CUS-10012"], severity="High", status="Resolved", created_date=d(-85), assigned_analyst="James Morrison", description="False positive: 'Atlas Shipping Ltd' flagged but confirmed different entity from 'Atlas Maritime Shipping' on sanctions list. Different jurisdiction, ownership, and registration."),
            dict(alert_id="ALT-00033", alert_type="PEP Match", customer_id=cust_map["CUS-10026"], severity="Low", status="Resolved", created_date=d(-100), assigned_analyst="Lisa Chang", description="Board member Robert Clearwater identified as former low-level government advisor. Role was advisory only, no decision-making authority. Classified as low-risk PEP. Annual review scheduled."),
            dict(alert_id="ALT-00034", alert_type="Document Expired", customer_id=cust_map["CUS-10027"], severity="Low", status="Resolved", created_date=d(-75), assigned_analyst="James Morrison", description="Renewed business license received and verified. Document updated in system. KYC file now complete and compliant."),
            dict(alert_id="ALT-00035", alert_type="Address Mismatch", customer_id=cust_map["CUS-10028"], severity="Low", status="Resolved", created_date=d(-95), assigned_analyst="Priya Patel", description="Client confirmed office relocation within Zurich. New address verified against commercial registry. All records updated."),
            dict(alert_id="ALT-00036", alert_type="Structuring Pattern", customer_id=cust_map["CUS-10029"], severity="Medium", status="Resolved", created_date=d(-80), assigned_analyst="David Kim", description="Regular payroll disbursements to healthcare staff across multiple clinics caused pattern alert. Confirmed legitimate payroll activity. Alert dismissed as false positive."),
            dict(alert_id="ALT-00037", alert_type="Unusual Transaction Volume", customer_id=cust_map["CUS-10030"], severity="Low", status="Resolved", created_date=d(-110), assigned_analyst="Elena Rossi", description="Quarterly rent collections from trust properties caused volume spike. Normal seasonal pattern consistent with lease payment schedules."),
            dict(alert_id="ALT-00038", alert_type="Sanctions Match", customer_id=cust_map["CUS-10031"], severity="Medium", status="Resolved", created_date=d(-70), assigned_analyst="Robert Torres", description="Portfolio company 'Keystone Analytics' flagged due to name similarity with sanctioned entity. Confirmed no connection — different industry, ownership, and geography."),
            dict(alert_id="ALT-00039", alert_type="PEP Match", customer_id=cust_map["CUS-10032"], severity="Low", status="Resolved", created_date=d(-120), assigned_analyst="Marcus Webb", description="Fund manager previously held elected office in local municipality 15 years ago. No current political exposure. Risk assessed as negligible."),
            dict(alert_id="ALT-00040", alert_type="Document Expired", customer_id=cust_map["CUS-10033"], severity="Low", status="Resolved", created_date=d(-65), assigned_analyst="Sarah Chen", description="Renewed Certificate of Good Standing received from Singapore ACRA. Document verified and filed. Compliance status current."),
            dict(alert_id="ALT-00041", alert_type="Unusual Transaction Volume", customer_id=cust_map["CUS-10034"], severity="Low", status="Resolved", created_date=d(-105), assigned_analyst="Lisa Chang", description="Insurance premium collection spike during annual renewal period. Volume consistent with historical Q4 patterns. No anomalies detected."),
            dict(alert_id="ALT-00042", alert_type="Address Mismatch", customer_id=cust_map["CUS-10035"], severity="Low", status="Resolved", created_date=d(-88), assigned_analyst="James Morrison", description="Suite number discrepancy resolved — client operates from two floors in the same building. Both addresses verified through site visit."),
            dict(alert_id="ALT-00043", alert_type="Structuring Pattern", customer_id=cust_map["CUS-10013"], severity="Medium", status="Resolved", created_date=d(-60), assigned_analyst="Priya Patel", description="Investor subscription payments came in varying amounts due to currency conversion from SGD to USD. Not structuring — FX-related variation explained."),
            dict(alert_id="ALT-00044", alert_type="Sanctions Match", customer_id=cust_map["CUS-10015"], severity="High", status="Resolved", created_date=d(-55), assigned_analyst="David Kim", description="Reinsurance counterparty initially flagged but confirmed to be a Lloyd's syndicate — regulated entity with no sanctions nexus. False positive cleared."),
            dict(alert_id="ALT-00045", alert_type="PEP Match", customer_id=cust_map["CUS-10020"], severity="Medium", status="Resolved", created_date=d(-78), assigned_analyst="James Morrison", description="Consultant Dr. Eva Hartmann identified as spouse of a Swiss cantonal official. Low-level PEP classification applied. Enhanced monitoring not required per policy."),
            dict(alert_id="ALT-00046", alert_type="Unusual Transaction Volume", customer_id=cust_map["CUS-10023"], severity="Medium", status="Resolved", created_date=d(-68), assigned_analyst="Elena Rossi", description="Trust distribution to beneficiaries exceeded normal quarterly amount. Trustee confirmed early distribution approved by trust deed for educational expenses."),
            dict(alert_id="ALT-00047", alert_type="Document Expired", customer_id=cust_map["CUS-10036"], severity="Low", status="Resolved", created_date=d(-50), assigned_analyst="Priya Patel", description="Proof of address for trustee updated with new utility bill. Previous document had expired during onboarding process. File now complete."),
            dict(alert_id="ALT-00048", alert_type="Unusual Transaction Volume", customer_id=cust_map["CUS-10037"], severity="Low", status="Resolved", created_date=d(-115), assigned_analyst="David Kim", description="Government subsidy payments received in bulk caused volume spike. Confirmed as legitimate agricultural subsidy disbursement through official channels."),
            dict(alert_id="ALT-00049", alert_type="Structuring Pattern", customer_id=cust_map["CUS-10038"], severity="Low", status="Resolved", created_date=d(-92), assigned_analyst="Elena Rossi", description="Regular monthly transfers to family members flagged as potential structuring. Confirmed as standing instructions for family allowances. Amounts consistent over 24 months."),
            dict(alert_id="ALT-00050", alert_type="Address Mismatch", customer_id=cust_map["CUS-10039"], severity="Low", status="Resolved", created_date=d(-82), assigned_analyst="Robert Torres", description="PO Box address provided on application differed from physical office. Both addresses verified — PO Box used for correspondence, physical office confirmed."),
            dict(alert_id="ALT-00051", alert_type="Unusual Transaction Volume", customer_id=cust_map["CUS-10040"], severity="Low", status="Resolved", created_date=d(-97), assigned_analyst="Marcus Webb", description="Year-end inventory purchases caused transaction volume increase. Consistent with prior year patterns. Trade documentation verified."),
            dict(alert_id="ALT-00052", alert_type="Sanctions Match", customer_id=cust_map["CUS-10014"], severity="Medium", status="Resolved", created_date=d(-72), assigned_analyst="Elena Rossi", description="Beneficiary name 'M. Hassan' matched broadly against sanctions list. Full name verification confirmed no match. Different date of birth and nationality."),
            dict(alert_id="ALT-00053", alert_type="PEP Match", customer_id=cust_map["CUS-10011"], severity="Low", status="Resolved", created_date=d(-108), assigned_analyst="Sarah Chen", description="Investor identified as former campaign treasurer for a US congressional candidate. Not a PEP under our policy definition. Documented and closed."),
            dict(alert_id="ALT-00054", alert_type="Document Expired", customer_id=cust_map["CUS-10025"], severity="Low", status="Resolved", created_date=d(-62), assigned_analyst="Sarah Chen", description="Audited financial statements updated for current fiscal year. Previous year's statements had technically expired per 12-month policy. Now current."),

            # Dismissed (~6 = 10%)
            dict(alert_id="ALT-00055", alert_type="Sanctions Match", customer_id=cust_map["CUS-10026"], severity="Low", status="Dismissed", created_date=d(-130), assigned_analyst="Lisa Chang", description="Automated screening flagged common name 'Global Technologies' against sanctions list. Completely different entity in different country. Dismissed as false positive."),
            dict(alert_id="ALT-00056", alert_type="PEP Match", customer_id=cust_map["CUS-10027"], severity="Low", status="Dismissed", created_date=d(-140), assigned_analyst="James Morrison", description="Name match on 'Canterbury' triggered regional political figure screening. No connection to the insurance company. Geographic coincidence. Dismissed."),
            dict(alert_id="ALT-00057", alert_type="Address Mismatch", customer_id=cust_map["CUS-10030"], severity="Low", status="Dismissed", created_date=d(-125), assigned_analyst="Elena Rossi", description="Automated address verification flagged difference between 'Street' and 'St.' abbreviation. Same address confirmed. System sensitivity too high — dismissed."),
            dict(alert_id="ALT-00058", alert_type="Document Expired", customer_id=cust_map["CUS-10031"], severity="Low", status="Dismissed", created_date=d(-135), assigned_analyst="Robert Torres", description="Alert triggered for passport expiry but the document type in question was a corporate certificate, not a passport. Data entry error in document system. Dismissed."),
            dict(alert_id="ALT-00059", alert_type="Structuring Pattern", customer_id=cust_map["CUS-10034"], severity="Low", status="Dismissed", created_date=d(-145), assigned_analyst="Lisa Chang", description="Automated pattern detection flagged regular premium payments as structuring. These are scheduled insurance premium collections at fixed amounts. Dismissed — expected activity."),
            dict(alert_id="ALT-00060", alert_type="Unusual Transaction Volume", customer_id=cust_map["CUS-10032"], severity="Low", status="Dismissed", created_date=d(-150), assigned_analyst="Marcus Webb", description="Infrastructure fund capital deployment caused temporary volume spike during project closing. Fully documented with legal agreements. Normal fund activity dismissed."),
        ]

        alert_objects = []
        for ad in alerts_data:
            a = Alert(**ad)
            db.add(a)
            alert_objects.append(a)
        db.flush()

        # ── DOCUMENTS (80) ───────────────────────────────────────
        documents_data = [
            # Documents expiring within 30 days (12 documents)
            dict(document_id="DOC-00001", doc_type="Passport", customer_id=cust_map["CUS-10001"], issue_date=d(-1800), expiry_date=d(5), verification_status="Verified"),
            dict(document_id="DOC-00002", doc_type="Business License", customer_id=cust_map["CUS-10003"], issue_date=d(-350), expiry_date=d(10), verification_status="Verified"),
            dict(document_id="DOC-00003", doc_type="Tax Registration", customer_id=cust_map["CUS-10004"], issue_date=d(-360), expiry_date=d(15), verification_status="Pending"),
            dict(document_id="DOC-00004", doc_type="Certificate of Incorporation", customer_id=cust_map["CUS-10005"], issue_date=d(-365), expiry_date=d(8), verification_status="Verified"),
            dict(document_id="DOC-00005", doc_type="Bank Statement", customer_id=cust_map["CUS-10006"], issue_date=d(-85), expiry_date=d(5), verification_status="Pending"),
            dict(document_id="DOC-00006", doc_type="Proof of Address", customer_id=cust_map["CUS-10007"], issue_date=d(-80), expiry_date=d(12), verification_status="Verified"),
            dict(document_id="DOC-00007", doc_type="Utility Bill", customer_id=cust_map["CUS-10008"], issue_date=d(-88), expiry_date=d(2), verification_status="Pending"),
            dict(document_id="DOC-00008", doc_type="Directors Register", customer_id=cust_map["CUS-10009"], issue_date=d(-355), expiry_date=d(20), verification_status="Verified"),
            dict(document_id="DOC-00009", doc_type="Passport", customer_id=cust_map["CUS-10010"], issue_date=d(-1750), expiry_date=d(25), verification_status="Verified"),
            dict(document_id="DOC-00010", doc_type="Business License", customer_id=cust_map["CUS-10011"], issue_date=d(-340), expiry_date=d(18), verification_status="Verified"),
            dict(document_id="DOC-00011", doc_type="Tax Registration", customer_id=cust_map["CUS-10016"], issue_date=d(-370), expiry_date=d(7), verification_status="Pending"),
            dict(document_id="DOC-00012", doc_type="Certificate of Incorporation", customer_id=cust_map["CUS-10022"], issue_date=d(-360), expiry_date=d(3), verification_status="Verified"),

            # Already expired documents (8)
            dict(document_id="DOC-00013", doc_type="Passport", customer_id=cust_map["CUS-10005"], issue_date=d(-1900), expiry_date=d(-30), verification_status="Expired"),
            dict(document_id="DOC-00014", doc_type="Business License", customer_id=cust_map["CUS-10022"], issue_date=d(-400), expiry_date=d(-15), verification_status="Expired"),
            dict(document_id="DOC-00015", doc_type="Utility Bill", customer_id=cust_map["CUS-10004"], issue_date=d(-120), expiry_date=d(-25), verification_status="Expired"),
            dict(document_id="DOC-00016", doc_type="Bank Statement", customer_id=cust_map["CUS-10001"], issue_date=d(-150), expiry_date=d(-55), verification_status="Expired"),
            dict(document_id="DOC-00017", doc_type="Proof of Address", customer_id=cust_map["CUS-10008"], issue_date=d(-130), expiry_date=d(-40), verification_status="Expired"),
            dict(document_id="DOC-00018", doc_type="Tax Registration", customer_id=cust_map["CUS-10005"], issue_date=d(-420), expiry_date=d(-50), verification_status="Expired"),
            dict(document_id="DOC-00019", doc_type="Certificate of Incorporation", customer_id=cust_map["CUS-10022"], issue_date=d(-500), expiry_date=d(-10), verification_status="Expired"),
            dict(document_id="DOC-00020", doc_type="Directors Register", customer_id=cust_map["CUS-10004"], issue_date=d(-400), expiry_date=d(-20), verification_status="Expired"),

            # Verified documents with future expiry (40)
            dict(document_id="DOC-00021", doc_type="Passport", customer_id=cust_map["CUS-10002"], issue_date=d(-500), expiry_date=d(800), verification_status="Verified"),
            dict(document_id="DOC-00022", doc_type="Business License", customer_id=cust_map["CUS-10002"], issue_date=d(-200), expiry_date=d(165), verification_status="Verified"),
            dict(document_id="DOC-00023", doc_type="Certificate of Incorporation", customer_id=cust_map["CUS-10002"], issue_date=d(-650), expiry_date=d(710), verification_status="Verified"),
            dict(document_id="DOC-00024", doc_type="Passport", customer_id=cust_map["CUS-10003"], issue_date=d(-300), expiry_date=d(1060), verification_status="Verified"),
            dict(document_id="DOC-00025", doc_type="Bank Statement", customer_id=cust_map["CUS-10003"], issue_date=d(-60), expiry_date=d(30 + 1), verification_status="Verified"),
            dict(document_id="DOC-00026", doc_type="Passport", customer_id=cust_map["CUS-10006"], issue_date=d(-400), expiry_date=d(960), verification_status="Verified"),
            dict(document_id="DOC-00027", doc_type="Tax Registration", customer_id=cust_map["CUS-10007"], issue_date=d(-300), expiry_date=d(65), verification_status="Verified"),
            dict(document_id="DOC-00028", doc_type="Certificate of Incorporation", customer_id=cust_map["CUS-10008"], issue_date=d(-700), expiry_date=d(660), verification_status="Verified"),
            dict(document_id="DOC-00029", doc_type="Passport", customer_id=cust_map["CUS-10012"], issue_date=d(-400), expiry_date=d(960), verification_status="Verified"),
            dict(document_id="DOC-00030", doc_type="Business License", customer_id=cust_map["CUS-10012"], issue_date=d(-180), expiry_date=d(185), verification_status="Verified"),
            dict(document_id="DOC-00031", doc_type="Certificate of Incorporation", customer_id=cust_map["CUS-10012"], issue_date=d(-480), expiry_date=d(880), verification_status="Verified"),
            dict(document_id="DOC-00032", doc_type="Passport", customer_id=cust_map["CUS-10014"], issue_date=d(-500), expiry_date=d(860), verification_status="Verified"),
            dict(document_id="DOC-00033", doc_type="Bank Statement", customer_id=cust_map["CUS-10014"], issue_date=d(-50), expiry_date=d(40), verification_status="Verified"),
            dict(document_id="DOC-00034", doc_type="Passport", customer_id=cust_map["CUS-10015"], issue_date=d(-300), expiry_date=d(1060), verification_status="Verified"),
            dict(document_id="DOC-00035", doc_type="Business License", customer_id=cust_map["CUS-10015"], issue_date=d(-200), expiry_date=d(165), verification_status="Verified"),
            dict(document_id="DOC-00036", doc_type="Tax Registration", customer_id=cust_map["CUS-10017"], issue_date=d(-250), expiry_date=d(115), verification_status="Verified"),
            dict(document_id="DOC-00037", doc_type="Certificate of Incorporation", customer_id=cust_map["CUS-10017"], issue_date=d(-600), expiry_date=d(760), verification_status="Verified"),
            dict(document_id="DOC-00038", doc_type="Passport", customer_id=cust_map["CUS-10018"], issue_date=d(-350), expiry_date=d(1010), verification_status="Verified"),
            dict(document_id="DOC-00039", doc_type="Directors Register", customer_id=cust_map["CUS-10018"], issue_date=d(-200), expiry_date=d(165), verification_status="Verified"),
            dict(document_id="DOC-00040", doc_type="Passport", customer_id=cust_map["CUS-10020"], issue_date=d(-300), expiry_date=d(1060), verification_status="Verified"),
            dict(document_id="DOC-00041", doc_type="Business License", customer_id=cust_map["CUS-10020"], issue_date=d(-150), expiry_date=d(215), verification_status="Verified"),
            dict(document_id="DOC-00042", doc_type="Passport", customer_id=cust_map["CUS-10021"], issue_date=d(-250), expiry_date=d(1110), verification_status="Verified"),
            dict(document_id="DOC-00043", doc_type="Tax Registration", customer_id=cust_map["CUS-10021"], issue_date=d(-200), expiry_date=d(165), verification_status="Verified"),
            dict(document_id="DOC-00044", doc_type="Passport", customer_id=cust_map["CUS-10023"], issue_date=d(-400), expiry_date=d(960), verification_status="Verified"),
            dict(document_id="DOC-00045", doc_type="Certificate of Incorporation", customer_id=cust_map["CUS-10023"], issue_date=d(-500), expiry_date=d(860), verification_status="Verified"),
            dict(document_id="DOC-00046", doc_type="Passport", customer_id=cust_map["CUS-10024"], issue_date=d(-350), expiry_date=d(1010), verification_status="Verified"),
            dict(document_id="DOC-00047", doc_type="Business License", customer_id=cust_map["CUS-10024"], issue_date=d(-160), expiry_date=d(205), verification_status="Verified"),
            dict(document_id="DOC-00048", doc_type="Passport", customer_id=cust_map["CUS-10025"], issue_date=d(-500), expiry_date=d(860), verification_status="Verified"),
            dict(document_id="DOC-00049", doc_type="Certificate of Incorporation", customer_id=cust_map["CUS-10025"], issue_date=d(-900), expiry_date=d(460), verification_status="Verified"),
            dict(document_id="DOC-00050", doc_type="Bank Statement", customer_id=cust_map["CUS-10025"], issue_date=d(-30), expiry_date=d(60), verification_status="Verified"),
            dict(document_id="DOC-00051", doc_type="Passport", customer_id=cust_map["CUS-10026"], issue_date=d(-400), expiry_date=d(960), verification_status="Verified"),
            dict(document_id="DOC-00052", doc_type="Business License", customer_id=cust_map["CUS-10026"], issue_date=d(-100), expiry_date=d(265), verification_status="Verified"),
            dict(document_id="DOC-00053", doc_type="Passport", customer_id=cust_map["CUS-10027"], issue_date=d(-350), expiry_date=d(1010), verification_status="Verified"),
            dict(document_id="DOC-00054", doc_type="Tax Registration", customer_id=cust_map["CUS-10027"], issue_date=d(-180), expiry_date=d(185), verification_status="Verified"),
            dict(document_id="DOC-00055", doc_type="Passport", customer_id=cust_map["CUS-10028"], issue_date=d(-300), expiry_date=d(1060), verification_status="Verified"),
            dict(document_id="DOC-00056", doc_type="Proof of Address", customer_id=cust_map["CUS-10028"], issue_date=d(-40), expiry_date=d(50), verification_status="Verified"),
            dict(document_id="DOC-00057", doc_type="Passport", customer_id=cust_map["CUS-10029"], issue_date=d(-250), expiry_date=d(1110), verification_status="Verified"),
            dict(document_id="DOC-00058", doc_type="Certificate of Incorporation", customer_id=cust_map["CUS-10029"], issue_date=d(-480), expiry_date=d(880), verification_status="Verified"),
            dict(document_id="DOC-00059", doc_type="Passport", customer_id=cust_map["CUS-10030"], issue_date=d(-200), expiry_date=d(1160), verification_status="Verified"),
            dict(document_id="DOC-00060", doc_type="Utility Bill", customer_id=cust_map["CUS-10030"], issue_date=d(-30), expiry_date=d(60), verification_status="Verified"),

            # Pending verification documents (8)
            dict(document_id="DOC-00061", doc_type="Passport", customer_id=cust_map["CUS-10013"], issue_date=d(-100), expiry_date=d(1260), verification_status="Pending"),
            dict(document_id="DOC-00062", doc_type="Business License", customer_id=cust_map["CUS-10013"], issue_date=d(-90), expiry_date=d(275), verification_status="Pending"),
            dict(document_id="DOC-00063", doc_type="Certificate of Incorporation", customer_id=cust_map["CUS-10019"], issue_date=d(-60), expiry_date=d(1300), verification_status="Pending"),
            dict(document_id="DOC-00064", doc_type="Passport", customer_id=cust_map["CUS-10036"], issue_date=d(-40), expiry_date=d(1320), verification_status="Pending"),
            dict(document_id="DOC-00065", doc_type="Proof of Address", customer_id=cust_map["CUS-10036"], issue_date=d(-35), expiry_date=d(55), verification_status="Pending"),
            dict(document_id="DOC-00066", doc_type="Business License", customer_id=cust_map["CUS-10006"], issue_date=d(-145), expiry_date=d(220), verification_status="Pending"),
            dict(document_id="DOC-00067", doc_type="Directors Register", customer_id=cust_map["CUS-10019"], issue_date=d(-55), expiry_date=d(310), verification_status="Pending"),
            dict(document_id="DOC-00068", doc_type="Tax Registration", customer_id=cust_map["CUS-10013"], issue_date=d(-95), expiry_date=d(270), verification_status="Pending"),

            # Rejected documents (4)
            dict(document_id="DOC-00069", doc_type="Bank Statement", customer_id=cust_map["CUS-10004"], issue_date=d(-100), expiry_date=d(-10), verification_status="Rejected"),
            dict(document_id="DOC-00070", doc_type="Proof of Address", customer_id=cust_map["CUS-10005"], issue_date=d(-80), expiry_date=d(10), verification_status="Rejected"),
            dict(document_id="DOC-00071", doc_type="Utility Bill", customer_id=cust_map["CUS-10001"], issue_date=d(-70), expiry_date=d(20), verification_status="Rejected"),
            dict(document_id="DOC-00072", doc_type="Bank Statement", customer_id=cust_map["CUS-10008"], issue_date=d(-90), expiry_date=d(0), verification_status="Rejected"),

            # Additional verified documents for remaining customers
            dict(document_id="DOC-00073", doc_type="Passport", customer_id=cust_map["CUS-10031"], issue_date=d(-200), expiry_date=d(1160), verification_status="Verified"),
            dict(document_id="DOC-00074", doc_type="Certificate of Incorporation", customer_id=cust_map["CUS-10032"], issue_date=d(-500), expiry_date=d(860), verification_status="Verified"),
            dict(document_id="DOC-00075", doc_type="Passport", customer_id=cust_map["CUS-10033"], issue_date=d(-180), expiry_date=d(1180), verification_status="Verified"),
            dict(document_id="DOC-00076", doc_type="Passport", customer_id=cust_map["CUS-10034"], issue_date=d(-250), expiry_date=d(1110), verification_status="Verified"),
            dict(document_id="DOC-00077", doc_type="Passport", customer_id=cust_map["CUS-10035"], issue_date=d(-300), expiry_date=d(1060), verification_status="Verified"),
            dict(document_id="DOC-00078", doc_type="Passport", customer_id=cust_map["CUS-10037"], issue_date=d(-350), expiry_date=d(1010), verification_status="Verified"),
            dict(document_id="DOC-00079", doc_type="Passport", customer_id=cust_map["CUS-10038"], issue_date=d(-280), expiry_date=d(1080), verification_status="Verified"),
            dict(document_id="DOC-00080", doc_type="Passport", customer_id=cust_map["CUS-10039"], issue_date=d(-220), expiry_date=d(1140), verification_status="Verified"),
        ]

        for dd in documents_data:
            db.add(Document(**dd))
        db.flush()

        # ── CASES (30) ───────────────────────────────────────────
        cases_data = [
            # Open cases (8)
            dict(case_id="CAS-00001", case_type="Enhanced Due Diligence", customer_id=cust_map["CUS-10001"], priority="Critical", status="Open", opened_date=d(-10), due_date=d(5), assigned_analyst="Sarah Chen"),
            dict(case_id="CAS-00002", case_type="Alert Investigation", customer_id=cust_map["CUS-10004"], priority="Critical", status="Open", opened_date=d(-5), due_date=d(10), assigned_analyst="Marcus Webb"),
            dict(case_id="CAS-00003", case_type="Periodic Review", customer_id=cust_map["CUS-10008"], priority="High", status="Open", opened_date=d(-15), due_date=d(-3), assigned_analyst="Robert Torres"),
            dict(case_id="CAS-00004", case_type="Onboarding", customer_id=cust_map["CUS-10019"], priority="Medium", status="Open", opened_date=d(-20), due_date=d(15), assigned_analyst="Sarah Chen"),
            dict(case_id="CAS-00005", case_type="Enhanced Due Diligence", customer_id=cust_map["CUS-10006"], priority="High", status="Open", opened_date=d(-8), due_date=d(22), assigned_analyst="James Morrison"),
            dict(case_id="CAS-00006", case_type="Alert Investigation", customer_id=cust_map["CUS-10005"], priority="Critical", status="Open", opened_date=d(-3), due_date=d(12), assigned_analyst="David Kim"),
            dict(case_id="CAS-00007", case_type="Periodic Review", customer_id=cust_map["CUS-10022"], priority="Medium", status="Open", opened_date=d(-25), due_date=d(-8), assigned_analyst="David Kim"),
            dict(case_id="CAS-00008", case_type="Onboarding", customer_id=cust_map["CUS-10036"], priority="Low", status="Open", opened_date=d(-12), due_date=d(30), assigned_analyst="Priya Patel"),

            # In Progress cases (8)
            dict(case_id="CAS-00009", case_type="Enhanced Due Diligence", customer_id=cust_map["CUS-10003"], priority="High", status="In Progress", opened_date=d(-30), due_date=d(5), assigned_analyst="David Kim"),
            dict(case_id="CAS-00010", case_type="Alert Investigation", customer_id=cust_map["CUS-10009"], priority="High", status="In Progress", opened_date=d(-25), due_date=d(-5), assigned_analyst="Priya Patel"),
            dict(case_id="CAS-00011", case_type="Periodic Review", customer_id=cust_map["CUS-10002"], priority="Medium", status="In Progress", opened_date=d(-35), due_date=d(10), assigned_analyst="Priya Patel"),
            dict(case_id="CAS-00012", case_type="Onboarding", customer_id=cust_map["CUS-10013"], priority="Medium", status="In Progress", opened_date=d(-40), due_date=d(20), assigned_analyst="Priya Patel"),
            dict(case_id="CAS-00013", case_type="Enhanced Due Diligence", customer_id=cust_map["CUS-10007"], priority="High", status="In Progress", opened_date=d(-20), due_date=d(15), assigned_analyst="Elena Rossi"),
            dict(case_id="CAS-00014", case_type="Alert Investigation", customer_id=cust_map["CUS-10010"], priority="Medium", status="In Progress", opened_date=d(-28), due_date=d(-2), assigned_analyst="Lisa Chang"),
            dict(case_id="CAS-00015", case_type="Periodic Review", customer_id=cust_map["CUS-10016"], priority="Medium", status="In Progress", opened_date=d(-22), due_date=d(8), assigned_analyst="Marcus Webb"),
            dict(case_id="CAS-00016", case_type="Enhanced Due Diligence", customer_id=cust_map["CUS-10021"], priority="Medium", status="In Progress", opened_date=d(-18), due_date=d(12), assigned_analyst="Priya Patel"),

            # Escalated cases (4)
            dict(case_id="CAS-00017", case_type="Alert Investigation", customer_id=cust_map["CUS-10001"], priority="Critical", status="Escalated", opened_date=d(-45), due_date=d(-15), assigned_analyst="Sarah Chen"),
            dict(case_id="CAS-00018", case_type="Enhanced Due Diligence", customer_id=cust_map["CUS-10004"], priority="Critical", status="Escalated", opened_date=d(-50), due_date=d(-10), assigned_analyst="Marcus Webb"),
            dict(case_id="CAS-00019", case_type="Alert Investigation", customer_id=cust_map["CUS-10005"], priority="High", status="Escalated", opened_date=d(-40), due_date=d(-7), assigned_analyst="David Kim"),
            dict(case_id="CAS-00020", case_type="Enhanced Due Diligence", customer_id=cust_map["CUS-10008"], priority="High", status="Escalated", opened_date=d(-38), due_date=d(-12), assigned_analyst="Robert Torres"),

            # Closed cases (10)
            dict(case_id="CAS-00021", case_type="Periodic Review", customer_id=cust_map["CUS-10025"], priority="Low", status="Closed", opened_date=d(-90), due_date=d(-60), assigned_analyst="Sarah Chen"),
            dict(case_id="CAS-00022", case_type="Onboarding", customer_id=cust_map["CUS-10026"], priority="Low", status="Closed", opened_date=d(-100), due_date=d(-70), assigned_analyst="Lisa Chang"),
            dict(case_id="CAS-00023", case_type="Alert Investigation", customer_id=cust_map["CUS-10027"], priority="Medium", status="Closed", opened_date=d(-85), due_date=d(-55), assigned_analyst="James Morrison"),
            dict(case_id="CAS-00024", case_type="Periodic Review", customer_id=cust_map["CUS-10028"], priority="Low", status="Closed", opened_date=d(-80), due_date=d(-50), assigned_analyst="Priya Patel"),
            dict(case_id="CAS-00025", case_type="Enhanced Due Diligence", customer_id=cust_map["CUS-10029"], priority="Medium", status="Closed", opened_date=d(-75), due_date=d(-45), assigned_analyst="David Kim"),
            dict(case_id="CAS-00026", case_type="Onboarding", customer_id=cust_map["CUS-10030"], priority="Low", status="Closed", opened_date=d(-95), due_date=d(-65), assigned_analyst="Elena Rossi"),
            dict(case_id="CAS-00027", case_type="Periodic Review", customer_id=cust_map["CUS-10031"], priority="Low", status="Closed", opened_date=d(-88), due_date=d(-58), assigned_analyst="Robert Torres"),
            dict(case_id="CAS-00028", case_type="Alert Investigation", customer_id=cust_map["CUS-10032"], priority="Medium", status="Closed", opened_date=d(-70), due_date=d(-40), assigned_analyst="Marcus Webb"),
            dict(case_id="CAS-00029", case_type="Periodic Review", customer_id=cust_map["CUS-10033"], priority="Low", status="Closed", opened_date=d(-82), due_date=d(-52), assigned_analyst="Sarah Chen"),
            dict(case_id="CAS-00030", case_type="Onboarding", customer_id=cust_map["CUS-10034"], priority="Low", status="Closed", opened_date=d(-78), due_date=d(-48), assigned_analyst="Lisa Chang"),
        ]

        case_objects = []
        for cd in cases_data:
            c = Case(**cd)
            db.add(c)
            case_objects.append(c)
        db.flush()

        case_map = {c.case_id: c.id for c in case_objects}

        # ── CASE NOTES (2-3 per case) ────────────────────────────
        case_notes_data = [
            # CAS-00001
            dict(case_id=case_map["CAS-00001"], content="Initiated enhanced due diligence review for Meridian Capital Holdings. Requesting updated beneficial ownership documentation and source of wealth verification.", analyst_name="Sarah Chen", created_at=dt(-10, 9, 15)),
            dict(case_id=case_map["CAS-00001"], content="Received partial documentation from client. Ownership chain shows 3 layers of holding companies. Need to trace through to ultimate beneficial owners.", analyst_name="Sarah Chen", created_at=dt(-7, 14, 30)),
            dict(case_id=case_map["CAS-00001"], content="Identified PEP connection at second layer of ownership. Escalation may be required if additional risk factors surface during UBO verification.", analyst_name="Sarah Chen", created_at=dt(-3, 11, 0)),

            # CAS-00002
            dict(case_id=case_map["CAS-00002"], content="Opened investigation into potential sanctions match for Volkov International Group. Gathering counterparty details and wire transfer documentation.", analyst_name="Marcus Webb", created_at=dt(-5, 10, 0)),
            dict(case_id=case_map["CAS-00002"], content="OFAC screening confirms 87% name match. Requesting additional identifying information from client to perform definitive match/no-match determination.", analyst_name="Marcus Webb", created_at=dt(-3, 15, 45)),

            # CAS-00003
            dict(case_id=case_map["CAS-00003"], content="Periodic review initiated for Sahara Investment Fund III. Reviewing current investor list and look-through documentation.", analyst_name="Robert Torres", created_at=dt(-15, 9, 30)),
            dict(case_id=case_map["CAS-00003"], content="Identified gaps in investor documentation — 3 investors missing current passports. Sent request to fund administrator.", analyst_name="Robert Torres", created_at=dt(-10, 11, 15)),
            dict(case_id=case_map["CAS-00003"], content="Review is overdue. Fund administrator citing operational delays. Escalation recommended if documentation not received by end of week.", analyst_name="Robert Torres", created_at=dt(-2, 16, 0)),

            # CAS-00004
            dict(case_id=case_map["CAS-00004"], content="Onboarding case opened for Coral Reef Ventures SPV. BVI-domiciled entity requires enhanced onboarding procedures per policy.", analyst_name="Sarah Chen", created_at=dt(-20, 10, 0)),
            dict(case_id=case_map["CAS-00004"], content="Received Certificate of Incorporation and Director Register. Pending verification of UBO identity documents.", analyst_name="Sarah Chen", created_at=dt(-12, 14, 0)),

            # CAS-00005
            dict(case_id=case_map["CAS-00005"], content="EDD triggered by energy sector exposure in sanctioned region. Reviewing supply chain documentation for Caspian Energy Ventures.", analyst_name="James Morrison", created_at=dt(-8, 10, 30)),
            dict(case_id=case_map["CAS-00005"], content="Initial review shows operations are limited to non-sanctioned areas within the region. Awaiting confirmation from independent source.", analyst_name="James Morrison", created_at=dt(-4, 13, 45)),
            dict(case_id=case_map["CAS-00005"], content="Engaged external compliance consultant to verify geographic scope of operations. Report expected within 10 business days.", analyst_name="James Morrison", created_at=dt(-1, 9, 0)),

            # CAS-00006
            dict(case_id=case_map["CAS-00006"], content="Investigation opened following detection of structuring pattern in Golden Dragon Enterprises account. Reviewing 3 months of transaction history.", analyst_name="David Kim", created_at=dt(-3, 11, 0)),
            dict(case_id=case_map["CAS-00006"], content="Transaction analysis shows 12 deposits between $8,500-$9,800 over 3 weeks. Pattern is consistent with structuring. Preparing SAR filing documentation.", analyst_name="David Kim", created_at=dt(-1, 15, 30)),

            # CAS-00007
            dict(case_id=case_map["CAS-00007"], content="Periodic review for Maple Leaf Holdings overdue by 30 days. KYC documentation expired. Multiple outreach attempts to client.", analyst_name="David Kim", created_at=dt(-25, 9, 0)),
            dict(case_id=case_map["CAS-00007"], content="Client responded — claims administrative delay due to change of corporate secretary. New documentation promised within 2 weeks.", analyst_name="David Kim", created_at=dt(-15, 10, 30)),
            dict(case_id=case_map["CAS-00007"], content="Still awaiting documentation. Review remains overdue. Considering relationship restriction if documents not received by next week.", analyst_name="David Kim", created_at=dt(-5, 14, 0)),

            # CAS-00008
            dict(case_id=case_map["CAS-00008"], content="Standard onboarding initiated for Whitmore & Associates Trust. UK-based family trust — standard risk profile.", analyst_name="Priya Patel", created_at=dt(-12, 10, 0)),
            dict(case_id=case_map["CAS-00008"], content="Received trust deed and beneficiary information. Performing standard screening checks.", analyst_name="Priya Patel", created_at=dt(-8, 11, 30)),

            # CAS-00009
            dict(case_id=case_map["CAS-00009"], content="EDD review in progress for Pacific Rim Trading. Focus on trade-based money laundering indicators. Reviewing trade documentation for last 6 months.", analyst_name="David Kim", created_at=dt(-30, 10, 0)),
            dict(case_id=case_map["CAS-00009"], content="Found discrepancies between invoiced values and market prices for 5 shipments. Requesting explanation from client and independent price verification.", analyst_name="David Kim", created_at=dt(-20, 14, 30)),
            dict(case_id=case_map["CAS-00009"], content="Client provided explanations for 3 of 5 discrepancies citing market volatility. Two remaining require further investigation with counterparty banks.", analyst_name="David Kim", created_at=dt(-10, 11, 0)),

            # CAS-00010
            dict(case_id=case_map["CAS-00010"], content="Investigation into PEP-linked PE fund. Reviewing limited partner documentation and source of funds for PEP investor.", analyst_name="Priya Patel", created_at=dt(-25, 9, 30)),
            dict(case_id=case_map["CAS-00010"], content="PEP's investment source verified as legitimate — proceeds from sale of family business. Documented in file. Case nearing resolution.", analyst_name="Priya Patel", created_at=dt(-15, 13, 0)),

            # CAS-00011
            dict(case_id=case_map["CAS-00011"], content="Annual periodic review for Oaktree Trust Services. Reviewing trust structure changes and beneficiary updates over the past year.", analyst_name="Priya Patel", created_at=dt(-35, 10, 0)),
            dict(case_id=case_map["CAS-00011"], content="Trust structure unchanged. Two new beneficiaries added — both screened clear. Updating KYC file with current information.", analyst_name="Priya Patel", created_at=dt(-20, 11, 45)),

            # CAS-00012
            dict(case_id=case_map["CAS-00012"], content="Onboarding for Pinnacle Asset Management. Singapore-domiciled fund with regional investors. Enhanced procedures applied.", analyst_name="Priya Patel", created_at=dt(-40, 10, 0)),
            dict(case_id=case_map["CAS-00012"], content="Investor look-through completed for top 10 investors. All cleared screening. Remaining investors below materiality threshold.", analyst_name="Priya Patel", created_at=dt(-25, 14, 0)),
            dict(case_id=case_map["CAS-00012"], content="MAS regulatory check completed. Fund is properly licensed. Onboarding documentation 90% complete — awaiting final board resolution.", analyst_name="Priya Patel", created_at=dt(-10, 9, 30)),

            # CAS-00013
            dict(case_id=case_map["CAS-00013"], content="EDD review for Aegean Maritime. Focus on vessel operations in potentially sanctioned waters.", analyst_name="Elena Rossi", created_at=dt(-20, 10, 0)),
            dict(case_id=case_map["CAS-00013"], content="Vessel tracking data reviewed for past 12 months. Port call in sanctioned country identified but client claims it was weather-related emergency stop.", analyst_name="Elena Rossi", created_at=dt(-12, 15, 0)),

            # CAS-00014
            dict(case_id=case_map["CAS-00014"], content="Investigation into structuring alerts for Falcone Family Office. Analyzing cash deposit patterns across multiple accounts.", analyst_name="Lisa Chang", created_at=dt(-28, 9, 0)),
            dict(case_id=case_map["CAS-00014"], content="Cash deposit analysis complete. 8 deposits below CTR threshold within 30 days. Client claims deposits are from property rental income collected in cash.", analyst_name="Lisa Chang", created_at=dt(-18, 14, 30)),
            dict(case_id=case_map["CAS-00014"], content="Reviewing rental agreements and property portfolio to verify explanation. Partial documentation received. Case overdue — expediting.", analyst_name="Lisa Chang", created_at=dt(-5, 10, 15)),

            # CAS-00015
            dict(case_id=case_map["CAS-00015"], content="Periodic review for Tandem Capital triggered by regulatory change affecting PE fund disclosures.", analyst_name="Marcus Webb", created_at=dt(-22, 10, 0)),
            dict(case_id=case_map["CAS-00015"], content="Reviewed updated regulatory requirements. Fund is broadly compliant but needs to update investor disclosures for new regime.", analyst_name="Marcus Webb", created_at=dt(-12, 11, 30)),

            # CAS-00016
            dict(case_id=case_map["CAS-00016"], content="EDD initiated for Ironclad Security Services due to government contract exposure and dual-use goods risk.", analyst_name="Priya Patel", created_at=dt(-18, 10, 0)),
            dict(case_id=case_map["CAS-00016"], content="Export license documentation reviewed. All licenses current and valid. No restricted end-users identified in contract registry.", analyst_name="Priya Patel", created_at=dt(-8, 13, 0)),

            # CAS-00017
            dict(case_id=case_map["CAS-00017"], content="Alert investigation escalated to compliance committee. Multiple concurrent alerts for Meridian Capital require senior oversight.", analyst_name="Sarah Chen", created_at=dt(-45, 10, 0)),
            dict(case_id=case_map["CAS-00017"], content="Committee review scheduled for next board meeting. Interim transaction monitoring enhanced. All wire transfers over $50K require manual approval.", analyst_name="Marcus Webb", created_at=dt(-30, 14, 0)),
            dict(case_id=case_map["CAS-00017"], content="Board presentation prepared summarizing risk exposure. Recommendation to consider relationship exit if remediation not achieved within 60 days.", analyst_name="Sarah Chen", created_at=dt(-15, 11, 30)),

            # CAS-00018
            dict(case_id=case_map["CAS-00018"], content="EDD escalated for Volkov International. Sanctions concern requires legal department involvement.", analyst_name="Marcus Webb", created_at=dt(-50, 10, 0)),
            dict(case_id=case_map["CAS-00018"], content="Legal counsel engaged. Formal legal opinion requested on sanctions exposure. Client placed on enhanced monitoring pending resolution.", analyst_name="Marcus Webb", created_at=dt(-35, 15, 0)),

            # CAS-00019
            dict(case_id=case_map["CAS-00019"], content="Investigation escalated after discovery of multiple expired KYC documents and structuring alerts for Golden Dragon.", analyst_name="David Kim", created_at=dt(-40, 10, 0)),
            dict(case_id=case_map["CAS-00019"], content="SAR filed with regulatory authority. Account activity restrictions implemented pending full investigation completion.", analyst_name="David Kim", created_at=dt(-25, 16, 0)),
            dict(case_id=case_map["CAS-00019"], content="Regulatory authority acknowledged SAR receipt. No additional requests at this time. Continuing internal investigation.", analyst_name="David Kim", created_at=dt(-10, 10, 30)),

            # CAS-00020
            dict(case_id=case_map["CAS-00020"], content="EDD escalated for Sahara Investment Fund. Incomplete investor look-through and concentration risk concerns.", analyst_name="Robert Torres", created_at=dt(-38, 10, 0)),
            dict(case_id=case_map["CAS-00020"], content="Fund administrator provided updated investor list. Single investor holding >40% identified as sovereign wealth entity. Enhanced verification in progress.", analyst_name="Robert Torres", created_at=dt(-20, 13, 45)),

            # CAS-00021 through CAS-00030 (Closed cases — 2 notes each)
            dict(case_id=case_map["CAS-00021"], content="Annual periodic review for Northern Star Pension Fund completed. Low-risk profile confirmed. All documentation current.", analyst_name="Sarah Chen", created_at=dt(-85, 10, 0)),
            dict(case_id=case_map["CAS-00021"], content="Review closed. Next review scheduled per standard annual cycle. No risk tier change recommended.", analyst_name="Sarah Chen", created_at=dt(-62, 14, 0)),

            dict(case_id=case_map["CAS-00022"], content="Onboarding for Clearwater Technologies completed. All documentation received and verified.", analyst_name="Lisa Chang", created_at=dt(-95, 10, 0)),
            dict(case_id=case_map["CAS-00022"], content="Customer fully onboarded. Low-risk classification confirmed. Standard monitoring applied.", analyst_name="Lisa Chang", created_at=dt(-72, 11, 0)),

            dict(case_id=case_map["CAS-00023"], content="Alert investigation for Canterbury Life Assurance. False positive sanctions match resolved.", analyst_name="James Morrison", created_at=dt(-80, 10, 0)),
            dict(case_id=case_map["CAS-00023"], content="Investigation closed. No further action required. Screening parameters adjusted to reduce false positives for this entity.", analyst_name="James Morrison", created_at=dt(-57, 14, 30)),

            dict(case_id=case_map["CAS-00024"], content="Periodic review for Alpine Wealth Management completed. FINMA-regulated entity in good standing.", analyst_name="Priya Patel", created_at=dt(-75, 10, 0)),
            dict(case_id=case_map["CAS-00024"], content="Review closed. All KYC documentation current. Source of wealth verified. No concerns identified.", analyst_name="Priya Patel", created_at=dt(-52, 13, 0)),

            dict(case_id=case_map["CAS-00025"], content="EDD for Sunrise Healthcare completed. MAS regulatory status confirmed. Operations verified as low-risk.", analyst_name="David Kim", created_at=dt(-70, 10, 0)),
            dict(case_id=case_map["CAS-00025"], content="Case closed. Risk assessment confirms Low tier appropriate. Next EDD cycle in 24 months.", analyst_name="David Kim", created_at=dt(-47, 11, 30)),

            dict(case_id=case_map["CAS-00026"], content="Onboarding for Thames Valley Property Trust completed. UK-regulated trust with transparent structure.", analyst_name="Elena Rossi", created_at=dt(-90, 10, 0)),
            dict(case_id=case_map["CAS-00026"], content="Onboarding closed. Standard monitoring and annual review cycle applied.", analyst_name="Elena Rossi", created_at=dt(-67, 14, 0)),

            dict(case_id=case_map["CAS-00027"], content="Periodic review for Pacific Coast Ventures completed. SEC registration confirmed. Portfolio companies screened clear.", analyst_name="Robert Torres", created_at=dt(-83, 10, 0)),
            dict(case_id=case_map["CAS-00027"], content="Review closed. Low-risk status maintained. Comprehensive documentation on file.", analyst_name="Robert Torres", created_at=dt(-60, 11, 0)),

            dict(case_id=case_map["CAS-00028"], content="Alert investigation for Borealis Infrastructure Fund. Volume alert during capital deployment resolved as expected activity.", analyst_name="Marcus Webb", created_at=dt(-65, 10, 0)),
            dict(case_id=case_map["CAS-00028"], content="Investigation closed. Capital call and deployment documented with supporting legal agreements. No anomalies.", analyst_name="Marcus Webb", created_at=dt(-42, 15, 0)),

            dict(case_id=case_map["CAS-00029"], content="Periodic review for Eastgate Trading Partners. Clean record maintained. MAS compliance confirmed.", analyst_name="Sarah Chen", created_at=dt(-77, 10, 0)),
            dict(case_id=case_map["CAS-00029"], content="Review closed. Trading activity within expected parameters. Documentation current.", analyst_name="Sarah Chen", created_at=dt(-54, 12, 0)),

            dict(case_id=case_map["CAS-00030"], content="Onboarding for Redwood Financial Services completed. State-regulated insurer with domestic operations.", analyst_name="Lisa Chang", created_at=dt(-73, 10, 0)),
            dict(case_id=case_map["CAS-00030"], content="Onboarding closed. Standard risk profile. All regulatory documentation verified.", analyst_name="Lisa Chang", created_at=dt(-50, 13, 30)),
        ]

        for cn in case_notes_data:
            db.add(CaseNote(**cn))
        db.flush()

        # ── ACTIVITY LOG (50 entries) ─────────────────────────────
        activity_data = [
            dict(action="Alert ALT-00031 resolved — pension fund quarterly rebalancing confirmed as legitimate activity", analyst_name="Sarah Chen", created_at=dt(-1, 16, 30)),
            dict(action="Customer CUS-10001 risk tier review initiated — multiple concurrent alerts flagged", analyst_name="Sarah Chen", created_at=dt(-1, 14, 15)),
            dict(action="Document DOC-00034 verified for Crescent Bay Insurance Ltd — passport renewal confirmed", analyst_name="David Kim", created_at=dt(-1, 11, 0)),
            dict(action="Case CAS-00009 status updated to In Progress — EDD review underway for Pacific Rim Trading", analyst_name="David Kim", created_at=dt(-2, 15, 45)),
            dict(action="Alert ALT-00004 created — structuring pattern detected for Golden Dragon Enterprises", analyst_name="David Kim", created_at=dt(-2, 10, 30)),
            dict(action="Customer CUS-10022 flagged for overdue KYC renewal — Maple Leaf Holdings", analyst_name="David Kim", created_at=dt(-3, 9, 0)),
            dict(action="Alert ALT-00016 created — sanctions screening flagged trade counterparty for Pacific Rim Trading", analyst_name="David Kim", created_at=dt(-3, 14, 30)),
            dict(action="Case CAS-00017 escalated to compliance committee — Meridian Capital Holdings", analyst_name="Sarah Chen", created_at=dt(-4, 11, 15)),
            dict(action="Document DOC-00040 verified for Zenith Global Consulting — Certificate of Good Standing confirmed", analyst_name="James Morrison", created_at=dt(-4, 16, 0)),
            dict(action="Alert ALT-00032 resolved — false positive sanctions match for Atlas Maritime Holdings confirmed", analyst_name="James Morrison", created_at=dt(-5, 13, 30)),
            dict(action="Customer CUS-10005 KYC status changed to Expired — Golden Dragon Enterprises documents overdue", analyst_name="Sarah Chen", created_at=dt(-5, 10, 0)),
            dict(action="Case CAS-00002 opened — alert investigation for Volkov International Group sanctions concern", analyst_name="Marcus Webb", created_at=dt(-5, 9, 45)),
            dict(action="Alert ALT-00033 resolved — low-risk PEP classification for Clearwater Technologies board member", analyst_name="Lisa Chang", created_at=dt(-6, 14, 0)),
            dict(action="Document DOC-00022 verified for Oaktree Trust Services — business license renewal confirmed", analyst_name="Priya Patel", created_at=dt(-7, 11, 30)),
            dict(action="Case CAS-00005 opened — EDD for Caspian Energy Ventures due to sanctioned region exposure", analyst_name="James Morrison", created_at=dt(-8, 10, 15)),
            dict(action="Alert ALT-00005 created — unusual transaction volume detected for Pacific Rim Trading", analyst_name="David Kim", created_at=dt(-8, 9, 0)),
            dict(action="Customer CUS-10016 periodic review triggered by regulatory change — Tandem Capital Advisors", analyst_name="Marcus Webb", created_at=dt(-9, 15, 30)),
            dict(action="Alert ALT-00034 resolved — renewed business license received for Canterbury Life Assurance", analyst_name="James Morrison", created_at=dt(-10, 14, 45)),
            dict(action="Case CAS-00001 opened — enhanced due diligence for Meridian Capital Holdings", analyst_name="Sarah Chen", created_at=dt(-10, 9, 15)),
            dict(action="Document DOC-00047 verified for Riviera Luxury Group — updated business license on file", analyst_name="Marcus Webb", created_at=dt(-11, 11, 0)),
            dict(action="Alert ALT-00035 resolved — address mismatch for Alpine Wealth Management clarified", analyst_name="Priya Patel", created_at=dt(-12, 16, 15)),
            dict(action="Customer CUS-10006 onboarding enhanced monitoring applied — Caspian Energy Ventures", analyst_name="James Morrison", created_at=dt(-13, 10, 30)),
            dict(action="Alert ALT-00036 resolved — structuring alert for Sunrise Healthcare dismissed as payroll activity", analyst_name="David Kim", created_at=dt(-14, 13, 0)),
            dict(action="Case CAS-00003 opened — periodic review for Sahara Investment Fund III", analyst_name="Robert Torres", created_at=dt(-15, 9, 30)),
            dict(action="Document DOC-00056 verified for Alpine Wealth Management — proof of address updated", analyst_name="Priya Patel", created_at=dt(-16, 14, 45)),
            dict(action="Alert ALT-00037 resolved — quarterly rent collection volume for Thames Valley Trust confirmed", analyst_name="Elena Rossi", created_at=dt(-17, 11, 15)),
            dict(action="Customer CUS-10023 risk tier confirmed as Medium — Jade Emperor Investment Trust annual review", analyst_name="Elena Rossi", created_at=dt(-18, 10, 0)),
            dict(action="Case CAS-00016 opened — EDD for Ironclad Security Services dual-use goods review", analyst_name="Priya Patel", created_at=dt(-18, 15, 30)),
            dict(action="Alert ALT-00038 resolved — portfolio company name similarity to sanctioned entity cleared", analyst_name="Robert Torres", created_at=dt(-20, 13, 45)),
            dict(action="Document DOC-00030 verified for Atlas Maritime Holdings — business license confirmed current", analyst_name="James Morrison", created_at=dt(-21, 10, 30)),
            dict(action="Case CAS-00013 status updated to In Progress — Aegean Maritime EDD review", analyst_name="Elena Rossi", created_at=dt(-22, 9, 0)),
            dict(action="Alert ALT-00039 resolved — former municipal official PEP classification for Borealis Fund", analyst_name="Marcus Webb", created_at=dt(-23, 14, 15)),
            dict(action="Customer CUS-10004 placed on enhanced monitoring — Volkov International Group", analyst_name="Marcus Webb", created_at=dt(-25, 11, 0)),
            dict(action="Case CAS-00007 opened — periodic review for Maple Leaf Holdings overdue", analyst_name="David Kim", created_at=dt(-25, 9, 15)),
            dict(action="Alert ALT-00042 resolved — address discrepancy for Harbour Point Capital resolved via site visit", analyst_name="James Morrison", created_at=dt(-26, 15, 30)),
            dict(action="Document DOC-00037 verified for Sterling Trade Finance — Certificate of Incorporation confirmed", analyst_name="Lisa Chang", created_at=dt(-28, 10, 45)),
            dict(action="Case CAS-00014 opened — alert investigation for Falcone Family Office structuring concerns", analyst_name="Lisa Chang", created_at=dt(-28, 9, 0)),
            dict(action="Alert ALT-00043 resolved — currency conversion explains subscription payment variations for Pinnacle AM", analyst_name="Priya Patel", created_at=dt(-30, 14, 0)),
            dict(action="Customer CUS-10009 risk factors updated — PEP among limited partners documented", analyst_name="Priya Patel", created_at=dt(-32, 11, 30)),
            dict(action="Case CAS-00011 status updated to In Progress — annual review for Oaktree Trust Services", analyst_name="Priya Patel", created_at=dt(-33, 10, 0)),
            dict(action="Alert ALT-00044 resolved — Lloyd's syndicate reinsurance counterparty confirmed not sanctioned", analyst_name="David Kim", created_at=dt(-35, 15, 45)),
            dict(action="Document DOC-00049 verified for Northern Star Pension Fund — Certificate of Incorporation current", analyst_name="Sarah Chen", created_at=dt(-37, 11, 0)),
            dict(action="Case CAS-00019 escalated — SAR filed for Golden Dragon Enterprises structuring activity", analyst_name="David Kim", created_at=dt(-38, 9, 30)),
            dict(action="Alert ALT-00045 resolved — low-level PEP classification for Zenith Global consultant", analyst_name="James Morrison", created_at=dt(-40, 14, 15)),
            dict(action="Customer CUS-10002 beneficial ownership structure verified — Oaktree Trust Services", analyst_name="Priya Patel", created_at=dt(-42, 10, 45)),
            dict(action="Case CAS-00018 escalated — Volkov International sanctions concern requires legal review", analyst_name="Marcus Webb", created_at=dt(-45, 16, 0)),
            dict(action="Alert ALT-00046 resolved — trust distribution for Jade Emperor confirmed per trust deed", analyst_name="Elena Rossi", created_at=dt(-48, 13, 30)),
            dict(action="Document DOC-00052 verified for Clearwater Technologies — business license renewed", analyst_name="Lisa Chang", created_at=dt(-50, 11, 15)),
            dict(action="Case CAS-00022 closed — Clearwater Technologies onboarding completed successfully", analyst_name="Lisa Chang", created_at=dt(-52, 10, 0)),
            dict(action="Alert ALT-00048 resolved — government agricultural subsidy confirmed for Greenfield Agri Holdings", analyst_name="David Kim", created_at=dt(-55, 14, 45)),
        ]

        for ad in activity_data:
            db.add(ActivityLog(**ad))

        db.commit()

        # Print summary
        customer_count = db.query(Customer).count()
        alert_count = db.query(Alert).count()
        document_count = db.query(Document).count()
        case_count = db.query(Case).count()
        note_count = db.query(CaseNote).count()
        activity_count = db.query(ActivityLog).count()
        analyst_count = db.query(Analyst).count()

        print(f"Seeded: {customer_count} customers, {alert_count} alerts, {document_count} documents, {case_count} cases, {note_count} case notes, {activity_count} activity log entries, {analyst_count} analysts")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
