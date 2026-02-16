import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Sparkles, Copy, AlertCircle, KeyRound } from 'lucide-react';
import { useApiKey } from '@/components/ApiKeyDialog';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Case {
  case_id: string;
  case_type: string;
  customer_id: string;
  customer_name: string;
  priority: string;
  status: string;
  assigned_analyst: string;
  opened_date: string;
  due_date: string | null;
  description?: string;
}

interface Note {
  id: number;
  content: string;
  analyst_name: string;
  created_at: string;
}

// ── Badge Color Maps ───────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  Critical: { bg: 'rgba(127, 29, 29, 0.1)', text: '#991b1b' },
  High: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626' },
  Medium: { bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706' },
  Low: { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Open: { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563eb' },
  'In Progress': { bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706' },
  Escalated: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626' },
  Closed: { bg: 'rgba(34, 197, 94, 0.1)', text: '#16a34a' },
};

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

function isOverdue(dateStr: string | null, status: string): boolean {
  if (!dateStr || status === 'Closed') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  return d < today;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  // Data
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notes
  const [newNoteContent, setNewNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const { openDialogThen } = useApiKey();

  // AI Summary
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Status transitions
  const [transitioning, setTransitioning] = useState(false);

  const fetchCase = useCallback(async () => {
    if (!caseId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/cases/${caseId}`);
      if (!res.ok) throw new Error('Failed to load case');
      const data = await res.json();
      setCaseData(data);
    } catch {
      setError('Failed to load case details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const fetchNotes = useCallback(async () => {
    if (!caseId) return;
    try {
      const res = await fetch(`/api/cases/${caseId}/notes`);
      if (!res.ok) throw new Error('Failed to load notes');
      const data = await res.json();
      setNotes(data);
    } catch {
      // Silently fail for notes
    }
  }, [caseId]);

  useEffect(() => {
    fetchCase();
    fetchNotes();
  }, [fetchCase, fetchNotes]);

  const handleAddNote = async () => {
    if (!caseId || !newNoteContent.trim()) return;
    try {
      setAddingNote(true);
      const res = await fetch(`/api/cases/${caseId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newNoteContent,
          analyst: 'Sarah Chen',
        }),
      });
      if (!res.ok) throw new Error('Failed to add note');
      setNewNoteContent('');
      await fetchNotes();
    } catch {
      // Error feedback could be added
    } finally {
      setAddingNote(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!caseId) return;
    try {
      setTransitioning(true);
      const res = await fetch(`/api/cases/${caseId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      await fetchCase();
    } catch {
      // Error feedback could be added
    } finally {
      setTransitioning(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!caseId) return;
    setAiLoading(true);
    setAiError(null);
    setAiSummary('');

    try {
      const res = await fetch(`/api/ai/case-summary/${caseId}`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('AI service unavailable');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Stream not available');

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
            const data = line.slice(6);
            if (data === '[DONE]') {
              setAiLoading(false);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                setAiError(parsed.error);
                setAiLoading(false);
                return;
              }
              if (parsed.text) {
                setAiSummary((prev) => prev + parsed.text);
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      }
      setAiLoading(false);
    } catch (err) {
      setAiError('AI service unavailable');
      setAiLoading(false);
    }
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(aiSummary);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  if (loading) {
    return (
      <div data-testid="page-case-detail" className="flex items-center justify-center p-12">
        <div className="inline-block w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div data-testid="page-case-detail" className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-8 shadow-sm text-center">
          <p className="text-destructive font-medium">{error || 'Case not found'}</p>
          <button
            onClick={() => navigate('/cases')}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            Back to Cases
          </button>
        </div>
      </div>
    );
  }

  const overdue = isOverdue(caseData.due_date, caseData.status);

  return (
    <div data-testid="page-case-detail" className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate('/cases')}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Cases
        </button>
        <ChevronRight style={{ width: 14, height: 14, color: '#cbd5e1' }} />
        <span style={{ color: '#3b82f6', fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
          {caseData.case_id}
        </span>
      </div>

      {/* Profile Header Card */}
      <div className="bg-card rounded-lg border border-border shadow-sm" style={{ padding: '24px' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: '#3b82f6',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {caseData.case_id}
              </h1>
              <StatusBadge text={caseData.priority} colors={PRIORITY_COLORS[caseData.priority]} />
              <StatusBadge text={caseData.status} colors={STATUS_COLORS[caseData.status]} />
            </div>
            <p style={{ fontSize: 14, color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}>
              {caseData.case_type}
            </p>
          </div>
        </div>

        {/* Metadata Grid */}
        <div
          className="grid gap-4 mt-6"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          }}
        >
          <MetadataItem label="Customer">
            <Link
              to={`/customers/${caseData.customer_id}`}
              style={{
                color: '#3b82f6',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                textDecoration: 'none',
              }}
              className="hover:underline"
            >
              {caseData.customer_name}
            </Link>
          </MetadataItem>
          <MetadataItem label="Assigned Analyst" value={caseData.assigned_analyst} />
          <MetadataItem label="Opened Date" value={formatDate(caseData.opened_date)} mono />
          <MetadataItem
            label="Due Date"
            value={formatDate(caseData.due_date)}
            mono
            isRed={overdue}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
          {caseData.status === 'Open' && (
            <>
              <button
                onClick={() => handleStatusChange('In Progress')}
                disabled={transitioning}
                data-testid="btn-start-work"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Start Work
              </button>
              <button
                onClick={() => handleStatusChange('Escalated')}
                disabled={transitioning}
                data-testid="btn-escalate"
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                }}
              >
                Escalate
              </button>
            </>
          )}
          {caseData.status === 'In Progress' && (
            <>
              <button
                onClick={() => handleStatusChange('Escalated')}
                disabled={transitioning}
                data-testid="btn-escalate"
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                }}
              >
                Escalate
              </button>
              <button
                onClick={() => handleStatusChange('Closed')}
                disabled={transitioning}
                data-testid="btn-close-case"
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  color: '#16a34a',
                }}
              >
                Close Case
              </button>
            </>
          )}
          {caseData.status === 'Escalated' && (
            <button
              onClick={() => handleStatusChange('Closed')}
              disabled={transitioning}
              data-testid="btn-close-case"
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                color: '#16a34a',
              }}
            >
              Close Case
            </button>
          )}
          {caseData.status === 'Closed' && (
            <button
              onClick={() => handleStatusChange('Open')}
              disabled={transitioning}
              data-testid="btn-reopen"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Reopen
            </button>
          )}
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-card rounded-lg border border-border shadow-sm" style={{ padding: '24px' }}>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#0f172a',
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 16,
          }}
        >
          Case Notes
        </h2>

        {/* Add Note */}
        <div className="mb-6">
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Add a note..."
            className="w-full p-3 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-y"
            style={{ fontFamily: "'DM Sans', sans-serif", minHeight: 80 }}
            rows={3}
          />
          <button
            onClick={handleAddNote}
            disabled={addingNote || !newNoteContent.trim()}
            className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Add Note
          </button>
        </div>

        {/* Notes List */}
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            No notes yet
          </p>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-4 rounded-lg border border-border"
                style={{ backgroundColor: '#f8fafc' }}
              >
                <p
                  className="text-sm mb-2"
                  style={{ color: '#0f172a', fontFamily: "'DM Sans', sans-serif" }}
                >
                  {note.content}
                </p>
                <div className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif" }}>{note.analyst_name}</span>
                  <span>•</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatTimestamp(note.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Case Summary */}
      <div className="bg-card rounded-lg border border-border shadow-sm" style={{ padding: '24px' }}>
        <div className="flex items-center justify-between mb-4">
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#0f172a',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            AI Case Summary
          </h2>
          {!aiSummary && !aiError && (
            <button
              onClick={handleGenerateSummary}
              disabled={aiLoading}
              data-testid="ai-case-summary-btn"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Sparkles style={{ width: 16, height: 16 }} />
              Generate Case Summary
            </button>
          )}
        </div>

        {aiLoading && (
          <div className="p-6 text-center">
            <div className="inline-block w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="mt-2 text-sm text-muted-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Generating summary...
            </p>
          </div>
        )}

        {aiError && (
          <div
            data-testid="ai-error-card"
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              borderColor: 'rgba(239, 68, 68, 0.2)',
            }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle style={{ width: 20, height: 20, color: '#dc2626', flexShrink: 0 }} />
              <div className="flex-1">
                <p className="text-sm" style={{ color: '#dc2626', fontFamily: "'DM Sans', sans-serif" }}>
                  {aiError}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={handleGenerateSummary}
                    data-testid="ai-retry-btn"
                    className="text-sm font-medium cursor-pointer hover:underline"
                    style={{ color: '#dc2626', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => openDialogThen(handleGenerateSummary)}
                    data-testid="ai-configure-key-btn"
                    className="flex items-center gap-1.5 text-sm font-medium cursor-pointer hover:underline"
                    style={{ color: '#7c3aed', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <KeyRound style={{ width: 12, height: 12 }} />
                    Configure API Key
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {aiSummary && (
          <div
            data-testid="ai-summary-panel"
            className="rounded-lg border p-4"
            style={{
              backgroundColor: '#f8fafc',
              borderLeft: '4px solid #3b82f6',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-xs font-medium uppercase"
                style={{ color: '#3b82f6', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.05em' }}
              >
                AI Generated
              </span>
              <button
                onClick={handleCopySummary}
                data-testid="copy-summary-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  backgroundColor: copySuccess ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                  color: copySuccess ? '#16a34a' : '#3b82f6',
                }}
              >
                <Copy style={{ width: 14, height: 14 }} />
                {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
            <p
              className="text-sm whitespace-pre-wrap"
              style={{ color: '#0f172a', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}
            >
              {aiSummary}
            </p>
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

function MetadataItem({
  label,
  value,
  mono,
  isRed,
  children,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  isRed?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p
        className="text-xs font-medium uppercase mb-1"
        style={{ color: '#64748b', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.05em' }}
      >
        {label}
      </p>
      {children ? (
        children
      ) : (
        <p
          className="text-sm"
          style={{
            color: isRed ? '#dc2626' : '#0f172a',
            fontWeight: isRed ? 600 : 400,
            fontFamily: mono ? "'JetBrains Mono', monospace" : "'DM Sans', sans-serif",
            fontSize: mono ? 12 : 14,
          }}
        >
          {value || '—'}
        </p>
      )}
    </div>
  );
}
