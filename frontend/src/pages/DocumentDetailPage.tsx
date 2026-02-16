import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight,
  ArrowLeft,
  FileText,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Document {
  id: number;
  document_id: string;
  doc_type: string;
  customer_name: string;
  customer_id: string;
  issue_date: string | null;
  expiry_date: string | null;
  verification_status: string;
}

// ── Badge Color Maps ───────────────────────────────────────────────────────────

const DOC_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Verified: { bg: 'rgba(34, 197, 94, 0.1)', text: '#16a34a' },
  Pending: { bg: 'rgba(234, 179, 8, 0.1)', text: '#a16207' },
  Expired: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626' },
  Rejected: { bg: 'rgba(127, 29, 29, 0.1)', text: '#991b1b' },
};

// ── Utility ────────────────────────────────────────────────────────────────────

function calculateDaysUntilExpiry(expiryDateStr: string | null): number | null {
  if (!expiryDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr + 'T00:00:00');
  const diffMs = expiry.getTime() - today.getTime();
  return Math.ceil(diffMs / 86400000);
}

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

// ── Component ──────────────────────────────────────────────────────────────────

export function DocumentDetailPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDocument = useCallback(async () => {
    if (!documentId) return;
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/documents/${documentId}`);

      if (!res.ok) throw new Error('Document not found');

      const data = await res.json();
      setDocument(data);
    } catch {
      setError('Failed to load document data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const handleStatusChange = async (newStatus: string) => {
    if (!documentId) return;

    try {
      setActionLoading(true);
      setError(null);

      const res = await fetch(`/api/documents/${documentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      // Re-fetch document data after status change
      await fetchDocument();
    } catch {
      setError('Failed to update document status. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div data-testid="page-document-detail" className="space-y-6">
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
  if (error && !document) {
    return (
      <div data-testid="page-document-detail" className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-8 shadow-sm text-center">
          <AlertCircle className="mx-auto mb-3 text-destructive" style={{ width: 32, height: 32 }} />
          <p className="text-destructive font-medium">{error || 'Document not found'}</p>
          <button
            onClick={() => navigate('/documents')}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

  if (!document) return null;

  const daysUntilExpiry = calculateDaysUntilExpiry(document.expiry_date);
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

  return (
    <div data-testid="page-document-detail" className="space-y-5">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-2 text-sm"
        data-testid="breadcrumb"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <Link
          to="/documents"
          className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          data-testid="breadcrumb-documents"
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Documents
        </Link>
        <ChevronRight style={{ width: 14, height: 14, color: '#94a3b8' }} />
        <span className="text-foreground font-medium">{document.document_id}</span>
      </nav>

      {/* Profile Header Card */}
      <div
        className="bg-card rounded-lg border border-border shadow-sm"
        style={{ padding: '24px 28px' }}
        data-testid="document-profile-header"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span
                className="font-mono-id"
                style={{ color: '#3b82f6', fontSize: 13 }}
                data-testid="detail-document-id"
              >
                {document.document_id}
              </span>
              <StatusBadge
                text={document.verification_status}
                colors={DOC_STATUS_COLORS[document.verification_status]}
                testId="detail-status-badge"
              />
            </div>
            <h1
              className="text-xl font-bold"
              style={{ color: '#0f172a', fontFamily: "'DM Sans', sans-serif" }}
              data-testid="detail-doc-type"
            >
              {document.doc_type}
            </h1>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8">
          <MetaField
            icon={Calendar}
            label="Issue Date"
            value={formatDate(document.issue_date)}
            testId="detail-issue-date"
          />
          <MetaField
            icon={Calendar}
            label="Expiry Date"
            value={formatDate(document.expiry_date)}
            testId="detail-expiry-date"
          />
          <MetaField
            icon={Clock}
            label="Days Until Expiry"
            value={
              daysUntilExpiry === null
                ? '—'
                : isExpired
                  ? 'EXPIRED'
                  : daysUntilExpiry.toString()
            }
            valueColor={
              daysUntilExpiry === null
                ? '#334155'
                : isExpired || isExpiringSoon
                  ? '#dc2626'
                  : '#334155'
            }
            valueWeight={isExpired || isExpiringSoon ? 700 : 500}
            testId="detail-days-until-expiry"
          />
          <MetaFieldLink
            icon={User}
            label="Customer"
            value={document.customer_name}
            linkTo={`/customers/${document.customer_id}`}
            testId="detail-customer"
          />
        </div>
      </div>

      {/* Action Buttons Section */}
      <div
        className="bg-card rounded-lg border border-border shadow-sm"
        style={{ padding: '24px 28px' }}
        data-testid="document-actions"
      >
        <h3
          className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: '#64748b', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.05em' }}
        >
          Actions
        </h3>

        {error && document && (
          <div
            className="mb-4 p-3 rounded-lg flex items-start gap-2"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
          >
            <AlertCircle style={{ width: 16, height: 16, color: '#dc2626', flexShrink: 0, marginTop: 2 }} />
            <p className="text-sm" style={{ color: '#dc2626', fontFamily: "'DM Sans', sans-serif" }}>
              {error}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {document.verification_status === 'Pending' && (
            <>
              <ActionButton
                icon={CheckCircle}
                label="Verify"
                onClick={() => handleStatusChange('Verified')}
                disabled={actionLoading}
                variant="success"
                testId="btn-verify"
              />
              <ActionButton
                icon={XCircle}
                label="Reject"
                onClick={() => handleStatusChange('Rejected')}
                disabled={actionLoading}
                variant="danger"
                testId="btn-reject"
              />
              <ActionButton
                icon={Clock}
                label="Mark Expired"
                onClick={() => handleStatusChange('Expired')}
                disabled={actionLoading}
                variant="warning"
                testId="btn-mark-expired"
              />
            </>
          )}

          {document.verification_status === 'Verified' && (
            <ActionButton
              icon={Clock}
              label="Mark Expired"
              onClick={() => handleStatusChange('Expired')}
              disabled={actionLoading}
              variant="warning"
              testId="btn-mark-expired"
            />
          )}

          {(document.verification_status === 'Expired' || document.verification_status === 'Rejected') && (
            <ActionButton
              icon={RefreshCw}
              label="Request New"
              onClick={() => handleStatusChange('Pending')}
              disabled={actionLoading}
              variant="primary"
              testId="btn-request-new"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function MetaField({
  icon: Icon,
  label,
  value,
  valueColor,
  valueWeight,
  testId,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  valueColor?: string;
  valueWeight?: number;
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
          style={{
            color: valueColor || '#334155',
            fontWeight: valueWeight || 500,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function MetaFieldLink({
  icon: Icon,
  label,
  value,
  linkTo,
  testId,
}: {
  icon: typeof User;
  label: string;
  value: string;
  linkTo: string;
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
        <Link
          to={linkTo}
          className="text-sm font-medium hover:underline"
          style={{ color: '#3b82f6', fontFamily: "'DM Sans', sans-serif" }}
        >
          {value}
        </Link>
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

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant,
  testId,
}: {
  icon: typeof CheckCircle;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant: 'primary' | 'success' | 'danger' | 'warning';
  testId?: string;
}) {
  const variantStyles: Record<string, { bg: string; hoverBg: string; text: string }> = {
    primary: {
      bg: '#3b82f6',
      hoverBg: '#2563eb',
      text: '#ffffff',
    },
    success: {
      bg: '#16a34a',
      hoverBg: '#15803d',
      text: '#ffffff',
    },
    danger: {
      bg: '#dc2626',
      hoverBg: '#b91c1c',
      text: '#ffffff',
    },
    warning: {
      bg: '#d97706',
      hoverBg: '#b45309',
      text: '#ffffff',
    },
  };

  const style = variantStyles[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        fontFamily: "'DM Sans', sans-serif",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLElement).style.backgroundColor = style.hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = style.bg;
      }}
    >
      <Icon style={{ width: 16, height: 16 }} />
      {label}
    </button>
  );
}
