import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight,
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  User,
  ShieldAlert,
  FileText,
  AlertTriangle,
  Briefcase,
  Clock,
  AlertCircle,
  Sparkles,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import { useApiKey } from '@/components/ApiKeyDialog';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Customer {
  id: number;
  customer_id: string;
  legal_name: string;
  business_type: string;
  jurisdiction: string;
  risk_tier: string;
  kyc_status: string;
  onboarding_date: string | null;
  last_review_date: string | null;
  next_review_due: string | null;
  assigned_analyst: string;
  risk_factors: string[];
}

interface CustomerAlert {
  id: number;
  alert_id: string;
  alert_type: string;
  severity: string;
  status: string;
  created_date: string | null;
  assigned_analyst: string;
  description: string;
}

interface CustomerDocument {
  id: number;
  document_id: string;
  doc_type: string;
  issue_date: string | null;
  expiry_date: string | null;
  verification_status: string;
}

interface CustomerCase {
  id: number;
  case_id: string;
  case_type: string;
  priority: string;
  status: string;
  opened_date: string | null;
  due_date: string | null;
  assigned_analyst: string;
}

interface ActivityEntry {
  id: number;
  action: string;
  analyst_name: string;
  created_at: string | null;
}

// ── Badge Color Maps ───────────────────────────────────────────────────────────

const RISK_TIER_COLORS: Record<string, { bg: string; text: string }> = {
  High: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626' },
  Medium: { bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706' },
  Low: { bg: 'rgba(34, 197, 94, 0.1)', text: '#16a34a' },
};

const KYC_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Verified: { bg: 'rgba(34, 197, 94, 0.1)', text: '#16a34a' },
  Pending: { bg: 'rgba(234, 179, 8, 0.1)', text: '#a16207' },
  'Under Review': { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563eb' },
  Expired: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626' },
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  Critical: { bg: 'rgba(127, 29, 29, 0.1)', text: '#991b1b' },
  High: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626' },
  Medium: { bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706' },
  Low: { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b' },
};

const ALERT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Open: { bg: 'rgba(239, 68, 68, 0.08)', text: '#dc2626' },
  'Under Review': { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563eb' },
  Resolved: { bg: 'rgba(34, 197, 94, 0.1)', text: '#16a34a' },
  Dismissed: { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b' },
};

const DOC_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Verified: { bg: 'rgba(34, 197, 94, 0.1)', text: '#16a34a' },
  Pending: { bg: 'rgba(234, 179, 8, 0.1)', text: '#a16207' },
  Expired: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626' },
  Rejected: { bg: 'rgba(127, 29, 29, 0.1)', text: '#991b1b' },
};

const CASE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Open: { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563eb' },
  'In Progress': { bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706' },
  Escalated: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626' },
  Closed: { bg: 'rgba(34, 197, 94, 0.1)', text: '#16a34a' },
};

const PRIORITY_COLORS = SEVERITY_COLORS;

// ── Utility ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTimestamp(isoStr: string | null): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

// ── Tab IDs ────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'documents' | 'alerts' | 'cases' | 'timeline';

const TABS: { id: TabId; label: string; icon: typeof FileText }[] = [
  { id: 'overview', label: 'Overview', icon: ShieldAlert },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'cases', label: 'Cases', icon: Briefcase },
  { id: 'timeline', label: 'Timeline', icon: Clock },
];

// ── Component ──────────────────────────────────────────────────────────────────

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [alerts, setAlerts] = useState<CustomerAlert[]>([]);
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [cases, setCases] = useState<CustomerCase[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const fetchData = useCallback(async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      setError(null);

      const [custRes, alertsRes, docsRes, casesRes, activityRes] = await Promise.all([
        fetch(`/api/customers/${customerId}`),
        fetch(`/api/customers/${customerId}/alerts`),
        fetch(`/api/customers/${customerId}/documents`),
        fetch(`/api/customers/${customerId}/cases`),
        fetch(`/api/customers/${customerId}/activity`),
      ]);

      if (!custRes.ok) throw new Error('Customer not found');

      const [custData, alertsData, docsData, casesData, activityData] = await Promise.all([
        custRes.json(),
        alertsRes.ok ? alertsRes.json() : [],
        docsRes.ok ? docsRes.json() : [],
        casesRes.ok ? casesRes.json() : [],
        activityRes.ok ? activityRes.json() : [],
      ]);

      setCustomer(custData);
      setAlerts(alertsData);
      setDocuments(docsData);
      setCases(casesData);
      setActivity(activityData);
    } catch {
      setError('Failed to load customer data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Loading state ──
  if (loading) {
    return (
      <div data-testid="page-customer-detail" className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-8 shadow-sm animate-pulse">
          <div className="h-5 bg-muted rounded w-1/3 mb-4" />
          <div className="h-8 bg-muted rounded w-2/3 mb-4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
        <div className="bg-card rounded-lg border border-border p-8 shadow-sm animate-pulse h-64" />
      </div>
    );
  }

  // ── Error state ──
  if (error || !customer) {
    return (
      <div data-testid="page-customer-detail" className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-8 shadow-sm text-center">
          <AlertCircle className="mx-auto mb-3 text-destructive" style={{ width: 32, height: 32 }} />
          <p className="text-destructive font-medium">{error || 'Customer not found'}</p>
          <button
            onClick={() => navigate('/customers')}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="page-customer-detail" className="space-y-5">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-2 text-sm"
        data-testid="breadcrumb"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <Link
          to="/customers"
          className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          data-testid="breadcrumb-customers"
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Customers
        </Link>
        <ChevronRight style={{ width: 14, height: 14, color: '#94a3b8' }} />
        <span className="text-foreground font-medium">{customer.legal_name}</span>
      </nav>

      {/* Profile Header Card */}
      <div
        className="bg-card rounded-lg border border-border shadow-sm"
        style={{ padding: '24px 28px' }}
        data-testid="customer-profile-header"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span
                className="font-mono-id"
                style={{ color: '#3b82f6', fontSize: 13 }}
                data-testid="detail-customer-id"
              >
                {customer.customer_id}
              </span>
              <StatusBadge
                text={customer.risk_tier}
                colors={RISK_TIER_COLORS[customer.risk_tier]}
                testId="detail-risk-badge"
              />
              <StatusBadge
                text={customer.kyc_status}
                colors={KYC_STATUS_COLORS[customer.kyc_status]}
                testId="detail-kyc-badge"
              />
            </div>
            <h1
              className="text-xl font-bold"
              style={{ color: '#0f172a', fontFamily: "'DM Sans', sans-serif" }}
              data-testid="detail-legal-name"
            >
              {customer.legal_name}
            </h1>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8">
          <MetaField
            icon={Building2}
            label="Business Type"
            value={customer.business_type}
            testId="detail-business-type"
          />
          <MetaField
            icon={MapPin}
            label="Jurisdiction"
            value={customer.jurisdiction}
            testId="detail-jurisdiction"
          />
          <MetaField
            icon={Calendar}
            label="Onboarding Date"
            value={formatDate(customer.onboarding_date)}
            testId="detail-onboarding-date"
          />
          <MetaField
            icon={User}
            label="Assigned Analyst"
            value={customer.assigned_analyst}
            testId="detail-assigned-analyst"
          />
          <MetaField
            icon={Calendar}
            label="Last Review"
            value={formatDate(customer.last_review_date)}
            testId="detail-last-review"
          />
          <MetaField
            icon={Calendar}
            label="Next Review Due"
            value={formatDate(customer.next_review_due)}
            testId="detail-next-review"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div
          className="flex border-b border-border"
          style={{ backgroundColor: '#f8fafc' }}
          data-testid="detail-tabs"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count =
              tab.id === 'documents'
                ? documents.length
                : tab.id === 'alerts'
                  ? alerts.length
                  : tab.id === 'cases'
                    ? cases.length
                    : tab.id === 'timeline'
                      ? activity.length
                      : null;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.id}`}
                className="flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors relative cursor-pointer"
                style={{
                  color: isActive ? '#3b82f6' : '#64748b',
                  fontFamily: "'DM Sans', sans-serif",
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                <Icon style={{ width: 15, height: 15 }} />
                {tab.label}
                {count !== null && count > 0 && (
                  <span
                    className="text-xs rounded-full"
                    style={{
                      padding: '1px 7px',
                      fontSize: 10,
                      fontFamily: "'JetBrains Mono', monospace",
                      backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                      color: isActive ? '#3b82f6' : '#64748b',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div style={{ padding: '24px 28px' }}>
          {activeTab === 'overview' && (
            <OverviewTab customer={customer} />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab documents={documents} />
          )}
          {activeTab === 'alerts' && (
            <AlertsTab alerts={alerts} />
          )}
          {activeTab === 'cases' && (
            <CasesTab cases={cases} />
          )}
          {activeTab === 'timeline' && (
            <TimelineTab activity={activity} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Overview (Risk Factors) ──────────────────────────────────────────────

function OverviewTab({ customer }: { customer: Customer }) {
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const { openDialogThen } = useApiKey();

  const generateAssessment = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiText('');

    try {
      const response = await fetch(`/api/ai/risk-assessment/${customer.customer_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('AI service unavailable');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                setAiError(parsed.error);
                setAiLoading(false);
                return;
              }
              if (parsed.text) {
                setAiText((prev) => prev + parsed.text);
              }
            } catch {
              // skip malformed
            }
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI service unavailable';
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div data-testid="tab-content-overview" className="space-y-6">
      {/* Risk Factors */}
      <div>
        <h3
          className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: '#64748b', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.05em' }}
        >
          Risk Factors
        </h3>
        {customer.risk_factors && customer.risk_factors.length > 0 ? (
          <div className="flex flex-wrap gap-2.5" data-testid="risk-factors-list">
            {customer.risk_factors.map((factor, idx) => (
              <div
                key={idx}
                data-testid={`risk-factor-${idx}`}
                className="flex items-center gap-2 rounded-lg border"
                style={{
                  padding: '8px 14px',
                  borderColor: 'rgba(239, 68, 68, 0.2)',
                  backgroundColor: 'rgba(239, 68, 68, 0.04)',
                }}
              >
                <ShieldAlert style={{ width: 14, height: 14, color: '#ef4444', flexShrink: 0 }} />
                <span
                  className="text-sm"
                  style={{ color: '#334155', fontFamily: "'DM Sans', sans-serif" }}
                >
                  {factor}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No risk factors identified for this customer" />
        )}
      </div>

      {/* AI Risk Assessment */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: '#64748b', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.05em' }}
          >
            AI Risk Assessment
          </h3>
          <button
            onClick={generateAssessment}
            disabled={aiLoading}
            data-testid="ai-risk-assessment-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: '#7c3aed',
              color: '#ffffff',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <Sparkles style={{ width: 15, height: 15 }} />
            {aiLoading ? 'Generating...' : 'Generate Risk Assessment'}
          </button>
        </div>

        {/* Error state */}
        {aiError && (
          <div
            data-testid="ai-error-card"
            className="rounded-lg border"
            style={{
              padding: '16px 20px',
              borderColor: '#fbbf24',
              backgroundColor: 'rgba(251, 191, 36, 0.05)',
              borderLeft: '4px solid #f59e0b',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle style={{ width: 16, height: 16, color: '#d97706' }} />
              <span
                className="text-sm font-semibold"
                style={{ color: '#92400e', fontFamily: "'DM Sans', sans-serif" }}
              >
                AI service unavailable
              </span>
            </div>
            <p
              className="text-sm mb-3"
              style={{ color: '#78716c', fontFamily: "'DM Sans', sans-serif" }}
            >
              Unable to generate risk assessment. Check your API key or try again later.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={generateAssessment}
                data-testid="ai-retry-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  color: '#d97706',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                <RefreshCw style={{ width: 12, height: 12 }} />
                Retry
              </button>
              <button
                onClick={() => openDialogThen(generateAssessment)}
                data-testid="ai-configure-key-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'rgba(124, 58, 237, 0.1)',
                  color: '#7c3aed',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                }}
              >
                <KeyRound style={{ width: 12, height: 12 }} />
                Configure API Key
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {aiLoading && !aiText && (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-4/5" />
          </div>
        )}

        {/* AI generated content */}
        {aiText && (
          <div
            data-testid="ai-risk-assessment-panel"
            className="rounded-lg"
            style={{
              padding: '20px 24px',
              borderLeft: '4px solid #3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.03)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles style={{ width: 14, height: 14, color: '#7c3aed' }} />
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{
                  color: '#7c3aed',
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '0.05em',
                }}
              >
                AI Generated
              </span>
            </div>
            <div
              className="text-sm leading-relaxed prose-sm"
              style={{
                color: '#334155',
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: 'pre-wrap',
                lineHeight: 1.75,
              }}
            >
              {aiText}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!aiText && !aiLoading && !aiError && (
          <div
            className="rounded-lg border border-dashed text-center"
            style={{ padding: '32px 24px', borderColor: '#e2e8f0' }}
          >
            <Sparkles
              className="mx-auto mb-2"
              style={{ width: 24, height: 24, color: '#cbd5e1' }}
            />
            <p
              className="text-sm"
              style={{ color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}
            >
              Click "Generate Risk Assessment" to create an AI-powered compliance assessment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Documents ────────────────────────────────────────────────────────────

function DocumentsTab({ documents }: { documents: CustomerDocument[] }) {
  if (documents.length === 0) {
    return <EmptyState message="No documents for this customer" testId="empty-documents" />;
  }

  return (
    <div data-testid="tab-content-documents">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border" style={{ backgroundColor: '#f8fafc' }}>
            <Th>Document ID</Th>
            <Th>Type</Th>
            <Th>Status</Th>
            <Th>Issue Date</Th>
            <Th>Expiry Date</Th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.document_id} className="border-b border-border" data-testid={`doc-row-${doc.document_id}`}>
              <Td mono>{doc.document_id}</Td>
              <Td>{doc.doc_type}</Td>
              <Td>
                <StatusBadge
                  text={doc.verification_status}
                  colors={DOC_STATUS_COLORS[doc.verification_status]}
                />
              </Td>
              <Td mono>{formatDate(doc.issue_date)}</Td>
              <Td mono>{formatDate(doc.expiry_date)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: Alerts ───────────────────────────────────────────────────────────────

function AlertsTab({ alerts }: { alerts: CustomerAlert[] }) {
  if (alerts.length === 0) {
    return <EmptyState message="No alerts for this customer" testId="empty-alerts" />;
  }

  return (
    <div data-testid="tab-content-alerts">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border" style={{ backgroundColor: '#f8fafc' }}>
            <Th>Alert ID</Th>
            <Th>Type</Th>
            <Th>Severity</Th>
            <Th>Status</Th>
            <Th>Created</Th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => (
            <tr key={alert.alert_id} className="border-b border-border" data-testid={`alert-row-${alert.alert_id}`}>
              <Td mono>{alert.alert_id}</Td>
              <Td>{alert.alert_type}</Td>
              <Td>
                <StatusBadge
                  text={alert.severity}
                  colors={SEVERITY_COLORS[alert.severity]}
                />
              </Td>
              <Td>
                <StatusBadge
                  text={alert.status}
                  colors={ALERT_STATUS_COLORS[alert.status]}
                />
              </Td>
              <Td mono>{formatDate(alert.created_date)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: Cases ────────────────────────────────────────────────────────────────

function CasesTab({ cases }: { cases: CustomerCase[] }) {
  if (cases.length === 0) {
    return <EmptyState message="No cases for this customer" testId="empty-cases" />;
  }

  return (
    <div data-testid="tab-content-cases">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border" style={{ backgroundColor: '#f8fafc' }}>
            <Th>Case ID</Th>
            <Th>Type</Th>
            <Th>Priority</Th>
            <Th>Status</Th>
            <Th>Opened</Th>
            <Th>Due Date</Th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.case_id} className="border-b border-border" data-testid={`case-row-${c.case_id}`}>
              <Td mono>{c.case_id}</Td>
              <Td>{c.case_type}</Td>
              <Td>
                <StatusBadge
                  text={c.priority}
                  colors={PRIORITY_COLORS[c.priority]}
                />
              </Td>
              <Td>
                <StatusBadge
                  text={c.status}
                  colors={CASE_STATUS_COLORS[c.status]}
                />
              </Td>
              <Td mono>{formatDate(c.opened_date)}</Td>
              <Td mono>{formatDate(c.due_date)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: Timeline ─────────────────────────────────────────────────────────────

function TimelineTab({ activity }: { activity: ActivityEntry[] }) {
  if (activity.length === 0) {
    return <EmptyState message="No activity recorded for this customer" testId="empty-timeline" />;
  }

  return (
    <div data-testid="tab-content-timeline" className="space-y-0">
      {activity.map((entry, idx) => (
        <div
          key={entry.id}
          className="flex items-start gap-4 relative"
          style={{ padding: '14px 0' }}
          data-testid={`timeline-entry-${idx}`}
        >
          {/* Timeline dot and line */}
          <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
            <div
              className="rounded-full border-2 flex-shrink-0"
              style={{
                width: 10,
                height: 10,
                borderColor: '#3b82f6',
                backgroundColor: idx === 0 ? '#3b82f6' : '#ffffff',
                marginTop: 4,
              }}
            />
            {idx < activity.length - 1 && (
              <div
                style={{
                  width: 1,
                  flex: 1,
                  backgroundColor: '#e2e8f0',
                  marginTop: 4,
                  minHeight: 24,
                }}
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p
              className="text-sm"
              style={{ color: '#334155', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}
            >
              {entry.action}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span
                className="text-xs"
                style={{
                  color: '#94a3b8',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                }}
              >
                {formatTimestamp(entry.created_at)}
              </span>
              <span
                className="text-xs font-medium"
                style={{ color: '#3b82f6', fontFamily: "'DM Sans', sans-serif" }}
              >
                {entry.analyst_name}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function MetaField({
  icon: Icon,
  label,
  value,
  testId,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div className="flex items-start gap-2.5" data-testid={testId}>
      <Icon
        className="flex-shrink-0 mt-0.5"
        style={{ width: 14, height: 14, color: '#94a3b8' }}
      />
      <div>
        <p
          className="text-xs uppercase tracking-wider font-medium mb-0.5"
          style={{ color: '#94a3b8', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.05em' }}
        >
          {label}
        </p>
        <p
          className="text-sm font-medium"
          style={{ color: '#334155', fontFamily: "'DM Sans', sans-serif" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({
  text,
  colors,
  testId,
}: {
  text: string;
  colors?: { bg: string; text: string };
  testId?: string;
}) {
  const bg = colors?.bg || 'rgba(100, 116, 139, 0.1)';
  const color = colors?.text || '#64748b';

  return (
    <span
      data-testid={testId}
      className="inline-flex items-center text-xs font-medium uppercase rounded-full whitespace-nowrap"
      style={{
        backgroundColor: bg,
        color,
        padding: '2px 10px',
        fontSize: 11,
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: '0.03em',
        lineHeight: '20px',
      }}
    >
      {text}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="text-left"
      style={{
        padding: '10px 14px',
        color: '#64748b',
        fontSize: 11,
        fontWeight: 500,
        fontFamily: "'DM Sans', sans-serif",
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td
      className="text-sm"
      style={{
        padding: '10px 14px',
        color: mono ? '#3b82f6' : '#334155',
        fontFamily: mono ? "'JetBrains Mono', monospace" : "'DM Sans', sans-serif",
        fontSize: mono ? 12 : 13,
      }}
    >
      {children}
    </td>
  );
}

function EmptyState({ message, testId }: { message: string; testId?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      data-testid={testId || 'empty-tab'}
    >
      <AlertCircle
        className="mb-2"
        style={{ width: 24, height: 24, color: '#cbd5e1' }}
      />
      <p
        className="text-sm"
        style={{ color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}
      >
        {message}
      </p>
    </div>
  );
}
