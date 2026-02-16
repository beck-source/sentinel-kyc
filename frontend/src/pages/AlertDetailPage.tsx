import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Sparkles, AlertCircle, RefreshCw, KeyRound } from 'lucide-react';
import { useApiKey } from '@/components/ApiKeyDialog';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Alert {
  id: number;
  alert_id: string;
  alert_type: string;
  customer_id: string;
  customer_name: string;
  severity: string;
  status: string;
  description: string;
  created_date: string;
  assigned_analyst: string;
}

// ── Badge Color Maps ───────────────────────────────────────────────────────────

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

// ── Utility functions ──────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AlertDetailPage() {
  const { alert_id } = useParams<{ alert_id: string }>();
  const navigate = useNavigate();

  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { openDialogThen } = useApiKey();

  // AI Triage state
  const [aiTriageText, setAiTriageText] = useState('');
  const [aiTriageLoading, setAiTriageLoading] = useState(false);
  const [aiTriageError, setAiTriageError] = useState<string | null>(null);
  const [hasTriaged, setHasTriaged] = useState(false);

  // Status change loading
  const [statusChanging, setStatusChanging] = useState(false);

  const fetchAlert = useCallback(async () => {
    if (!alert_id) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/alerts/${alert_id}`);
      if (!res.ok) throw new Error('Failed to load alert');

      const data = await res.json();
      setAlert(data);
    } catch {
      setError('Failed to load alert details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [alert_id]);

  useEffect(() => {
    fetchAlert();
  }, [fetchAlert]);

  const handleStatusChange = async (newStatus: string) => {
    if (!alert_id || !alert) return;

    try {
      setStatusChanging(true);

      const res = await fetch(`/api/alerts/${alert_id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      // Re-fetch alert data to update display
      await fetchAlert();
    } catch {
      setError('Failed to update alert status. Please try again.');
    } finally {
      setStatusChanging(false);
    }
  };

  const handleAiTriage = async () => {
    if (!alert_id) return;

    try {
      setAiTriageLoading(true);
      setAiTriageError(null);
      setAiTriageText('');
      setHasTriaged(true);

      const res = await fetch(`/api/ai/alert-triage/${alert_id}`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('AI service unavailable');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('Stream not available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              setAiTriageLoading(false);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.text) {
                setAiTriageText((prev) => prev + parsed.text);
              }
            } catch (e) {
              if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
                throw e;
              }
            }
          }
        }
      }

      setAiTriageLoading(false);
    } catch (err) {
      setAiTriageLoading(false);
      setAiTriageError(
        err instanceof Error ? err.message : 'AI service unavailable. Please try again later.'
      );
    }
  };

  const renderActionButtons = () => {
    if (!alert) return null;

    const status = alert.status;

    if (status === 'Open') {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleStatusChange('Under Review')}
            disabled={statusChanging}
            data-testid="btn-begin-review"
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer"
            style={{
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              opacity: statusChanging ? 0.6 : 1,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {statusChanging ? 'Updating...' : 'Begin Review'}
          </button>
          <button
            onClick={() => handleStatusChange('Dismissed')}
            disabled={statusChanging}
            data-testid="btn-dismiss"
            className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors cursor-pointer"
            style={{
              borderColor: '#e2e8f0',
              backgroundColor: '#ffffff',
              color: '#64748b',
              opacity: statusChanging ? 0.6 : 1,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Dismiss
          </button>
        </div>
      );
    }

    if (status === 'Under Review') {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleStatusChange('Resolved')}
            disabled={statusChanging}
            data-testid="btn-resolve"
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer"
            style={{
              backgroundColor: '#16a34a',
              color: '#ffffff',
              opacity: statusChanging ? 0.6 : 1,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {statusChanging ? 'Updating...' : 'Resolve'}
          </button>
          <button
            onClick={() => handleStatusChange('Dismissed')}
            disabled={statusChanging}
            data-testid="btn-dismiss"
            className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors cursor-pointer"
            style={{
              borderColor: '#e2e8f0',
              backgroundColor: '#ffffff',
              color: '#64748b',
              opacity: statusChanging ? 0.6 : 1,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Dismiss
          </button>
        </div>
      );
    }

    if (status === 'Resolved' || status === 'Dismissed') {
      return (
        <button
          onClick={() => handleStatusChange('Open')}
          disabled={statusChanging}
          data-testid="btn-reopen"
          className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors cursor-pointer"
          style={{
            borderColor: '#e2e8f0',
            backgroundColor: '#ffffff',
            color: '#3b82f6',
            opacity: statusChanging ? 0.6 : 1,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {statusChanging ? 'Updating...' : 'Reopen'}
        </button>
      );
    }

    return null;
  };

  // Loading state
  if (loading) {
    return (
      <div data-testid="page-alert-detail" className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-12 shadow-sm text-center">
          <div className="inline-block w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="mt-3 text-sm text-muted-foreground">Loading alert details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !alert) {
    return (
      <div data-testid="page-alert-detail" className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-8 shadow-sm text-center">
          <p className="text-destructive font-medium">{error || 'Alert not found'}</p>
          <button
            onClick={() => navigate('/alerts')}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            Back to Alerts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="page-alert-detail" className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          to="/alerts"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
          AML Alerts
        </Link>
        <span style={{ color: '#cbd5e1' }}>{'>'}</span>
        <span style={{ color: '#0f172a', fontFamily: "'JetBrains Mono', monospace" }}>
          {alert.alert_id}
        </span>
      </div>

      {/* Profile Header Card */}
      <div
        className="bg-card rounded-lg border border-border shadow-sm"
        style={{ padding: '24px' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1
                className="text-2xl font-semibold"
                style={{ color: '#3b82f6', fontFamily: "'JetBrains Mono', monospace" }}
              >
                {alert.alert_id}
              </h1>
              <StatusBadge text={alert.severity} colors={SEVERITY_COLORS[alert.severity]} />
              <StatusBadge text={alert.status} colors={ALERT_STATUS_COLORS[alert.status]} />
            </div>
            <p
              className="text-lg font-medium"
              style={{ color: '#0f172a', fontFamily: "'DM Sans', sans-serif" }}
            >
              {alert.alert_type}
            </p>
          </div>

          {renderActionButtons()}
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <p
              className="text-xs font-medium uppercase tracking-wide mb-1"
              style={{ color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}
            >
              Created Date
            </p>
            <p
              className="text-sm"
              style={{ color: '#0f172a', fontFamily: "'JetBrains Mono', monospace" }}
            >
              {formatDate(alert.created_date)}
            </p>
          </div>
          <div>
            <p
              className="text-xs font-medium uppercase tracking-wide mb-1"
              style={{ color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}
            >
              Assigned Analyst
            </p>
            <p className="text-sm" style={{ color: '#0f172a', fontFamily: "'DM Sans', sans-serif" }}>
              {alert.assigned_analyst}
            </p>
          </div>
          <div>
            <p
              className="text-xs font-medium uppercase tracking-wide mb-1"
              style={{ color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}
            >
              Customer
            </p>
            <Link
              to={`/customers/${alert.customer_id}`}
              className="text-sm hover:underline"
              style={{ color: '#3b82f6', fontFamily: "'DM Sans', sans-serif" }}
            >
              {alert.customer_name}
            </Link>
            <p
              className="text-xs mt-0.5"
              style={{ color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}
            >
              {alert.customer_id}
            </p>
          </div>
        </div>
      </div>

      {/* Description Card */}
      <div
        className="bg-card rounded-lg border border-border shadow-sm"
        style={{ padding: '24px' }}
      >
        <h2
          className="text-sm font-medium uppercase tracking-wide mb-3"
          style={{ color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}
        >
          Description
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: '#0f172a', fontFamily: "'DM Sans', sans-serif" }}>
          {alert.description}
        </p>
      </div>

      {/* AI Triage Section */}
      <div className="space-y-3">
        <button
          onClick={handleAiTriage}
          disabled={aiTriageLoading}
          data-testid="ai-triage-btn"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer"
          style={{
            backgroundColor: '#7c3aed',
            color: '#ffffff',
            opacity: aiTriageLoading ? 0.6 : 1,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <Sparkles style={{ width: 16, height: 16 }} />
          {aiTriageLoading ? 'Analyzing...' : 'Triage with AI'}
        </button>

        {/* AI Error State */}
        {aiTriageError && (
          <div
            data-testid="ai-error-card"
            className="bg-card rounded-lg border shadow-sm"
            style={{
              padding: '20px',
              borderLeftWidth: '4px',
              borderLeftColor: '#f59e0b',
            }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle style={{ width: 20, height: 20, color: '#f59e0b', flexShrink: 0 }} />
              <div>
                <h3
                  className="text-sm font-semibold mb-1"
                  style={{ color: '#0f172a', fontFamily: "'DM Sans', sans-serif" }}
                >
                  AI service unavailable
                </h3>
                <p
                  className="text-sm mb-3"
                  style={{ color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}
                >
                  {aiTriageError}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAiTriage}
                    data-testid="ai-retry-btn"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                    style={{
                      backgroundColor: '#f59e0b',
                      color: '#ffffff',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <RefreshCw style={{ width: 12, height: 12 }} />
                    Retry
                  </button>
                  <button
                    onClick={() => openDialogThen(handleAiTriage)}
                    data-testid="ai-configure-key-btn"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                    style={{
                      backgroundColor: '#7c3aed',
                      color: '#ffffff',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <KeyRound style={{ width: 12, height: 12 }} />
                    Configure API Key
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Triage Panel */}
        {hasTriaged && !aiTriageError && (
          <div
            data-testid="ai-triage-panel"
            className="bg-card rounded-lg border shadow-sm"
            style={{
              padding: '20px',
              borderLeftWidth: '4px',
              borderLeftColor: '#3b82f6',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles style={{ width: 16, height: 16, color: '#7c3aed' }} />
              <span
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: '#7c3aed', fontFamily: "'DM Sans', sans-serif" }}
              >
                AI Generated
              </span>
            </div>

            {aiTriageLoading ? (
              <div className="space-y-2">
                <div
                  className="h-3 rounded animate-pulse"
                  style={{ backgroundColor: '#e2e8f0', width: '90%' }}
                />
                <div
                  className="h-3 rounded animate-pulse"
                  style={{ backgroundColor: '#e2e8f0', width: '75%' }}
                />
                <div
                  className="h-3 rounded animate-pulse"
                  style={{ backgroundColor: '#e2e8f0', width: '85%' }}
                />
              </div>
            ) : (
              <div
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: '#0f172a', fontFamily: "'DM Sans', sans-serif" }}
              >
                {aiTriageText}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({
  text,
  colors,
}: {
  text: string;
  colors?: { bg: string; text: string };
}) {
  const bg = colors?.bg || 'rgba(100, 116, 139, 0.1)';
  const color = colors?.text || '#64748b';

  return (
    <span
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
