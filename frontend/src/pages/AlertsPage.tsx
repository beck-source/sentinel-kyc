import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertTriangle,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Alert {
  id: number;
  alert_id: string;
  alert_type: string;
  customer_name: string;
  severity: string;
  status: string;
  created_date: string;
  assigned_analyst: string;
}

type SortOrder = 'asc' | 'desc';

interface SortState {
  column: string;
  order: SortOrder;
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

// ── Constants ──────────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'alert_id', label: 'Alert ID', width: '130px' },
  { key: 'alert_type', label: 'Alert Type', width: 'auto' },
  { key: 'customer_name', label: 'Customer Name', width: 'auto' },
  { key: 'severity', label: 'Severity', width: '110px' },
  { key: 'status', label: 'Status', width: '130px' },
  { key: 'created_date', label: 'Created Date', width: '130px' },
  { key: 'assigned_analyst', label: 'Assigned Analyst', width: '160px' },
];

const PAGE_SIZE = 15;

// ── Component ──────────────────────────────────────────────────────────────────

export function AlertsPage() {
  const navigate = useNavigate();

  // Data
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertTypes, setAlertTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [alertTypeFilter, setAlertTypeFilter] = useState<string[]>([]);

  // Sorting
  const [sort, setSort] = useState<SortState>({ column: 'created_date', order: 'desc' });

  // Pagination
  const [page, setPage] = useState(1);

  // Filter dropdowns open state
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (severityFilter.length > 0) params.set('severity', severityFilter.join(','));
      if (statusFilter.length > 0) params.set('status', statusFilter.join(','));
      if (alertTypeFilter.length > 0) params.set('alert_type', alertTypeFilter.join(','));
      params.set('sort_by', sort.column);
      params.set('sort_order', sort.order);

      const [alertsRes, typesRes] = await Promise.all([
        fetch(`/api/alerts?${params.toString()}`),
        fetch('/api/alerts/types'),
      ]);

      if (!alertsRes.ok) throw new Error('Failed to load alerts');

      const alertsData = await alertsRes.json();
      setAlerts(alertsData);

      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setAlertTypes(typesData);
      }
    } catch {
      setError('Failed to load alert data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, severityFilter, statusFilter, alertTypeFilter, sort]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, severityFilter, statusFilter, alertTypeFilter]);

  // Close filter dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-filter-dropdown]')) {
        setOpenFilter(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(alerts.length / PAGE_SIZE));
  const paginatedAlerts = useMemo(
    () => alerts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [alerts, page]
  );

  const handleSort = (column: string) => {
    setSort((prev) => ({
      column,
      order: prev.column === column && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const clearAllFilters = () => {
    setSearch('');
    setSeverityFilter([]);
    setStatusFilter([]);
    setAlertTypeFilter([]);
  };

  const hasActiveFilters =
    search.length > 0 ||
    severityFilter.length > 0 ||
    statusFilter.length > 0 ||
    alertTypeFilter.length > 0;

  // Error state
  if (error) {
    return (
      <div data-testid="page-alerts" className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-8 shadow-sm text-center">
          <p className="text-destructive font-medium">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="page-alerts" className="space-y-0">
      {/* Toolbar: Search + Filters */}
      <div
        className="bg-card rounded-t-lg border border-border shadow-sm"
        style={{ padding: '16px 24px' }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-[360px]" data-testid="alert-search-container">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              style={{ width: 15, height: 15 }}
            />
            <input
              data-testid="alert-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Alert ID or Customer Name..."
              className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                data-testid="alert-search-clear"
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>

          {/* Filter: Severity */}
          <MultiSelectFilter
            label="Severity"
            options={['Critical', 'High', 'Medium', 'Low']}
            selected={severityFilter}
            onChange={setSeverityFilter}
            isOpen={openFilter === 'severity'}
            onToggle={() => setOpenFilter(openFilter === 'severity' ? null : 'severity')}
            testId="filter-severity"
          />

          {/* Filter: Status */}
          <MultiSelectFilter
            label="Status"
            options={['Open', 'Under Review', 'Resolved', 'Dismissed']}
            selected={statusFilter}
            onChange={setStatusFilter}
            isOpen={openFilter === 'status'}
            onToggle={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
            testId="filter-status"
          />

          {/* Filter: Alert Type */}
          <MultiSelectFilter
            label="Alert Type"
            options={alertTypes}
            selected={alertTypeFilter}
            onChange={setAlertTypeFilter}
            isOpen={openFilter === 'alert_type'}
            onToggle={() => setOpenFilter(openFilter === 'alert_type' ? null : 'alert_type')}
            testId="filter-alert-type"
          />

          {/* Clear all filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              data-testid="clear-filters"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-destructive bg-destructive/5 hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <X style={{ width: 12, height: 12 }} />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        className="bg-card rounded-b-lg border border-t-0 border-border shadow-sm overflow-hidden"
      >
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="mt-3 text-sm text-muted-foreground">Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center" data-testid="empty-state">
            <AlertTriangle className="mx-auto mb-3 text-muted-foreground" style={{ width: 32, height: 32, opacity: 0.5 }} />
            <p className="text-sm font-medium text-muted-foreground">No results found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your filters or search term
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                data-testid="empty-clear-filters"
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="alerts-table">
                <thead>
                  <tr
                    className="border-b border-border"
                    style={{ backgroundColor: '#f8fafc' }}
                  >
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        data-testid={`th-${col.key}`}
                        onClick={() => handleSort(col.key)}
                        className="text-left cursor-pointer select-none group"
                        style={{
                          padding: '12px 16px',
                          width: col.width,
                          position: 'sticky',
                          top: 0,
                          backgroundColor: '#f8fafc',
                          zIndex: 1,
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-xs font-medium uppercase tracking-wider"
                            style={{
                              color: '#64748b',
                              fontFamily: "'DM Sans', sans-serif",
                              letterSpacing: '0.05em',
                            }}
                          >
                            {col.label}
                          </span>
                          <SortIndicator column={col.key} sort={sort} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedAlerts.map((alert) => {
                    return (
                      <tr
                        key={alert.alert_id}
                        data-testid={`alert-row-${alert.alert_id}`}
                        onClick={() => navigate(`/alerts/${alert.alert_id}`)}
                        className="border-b border-border transition-colors duration-150 cursor-pointer"
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = '#eff6ff';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = '';
                        }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            className="font-mono-id"
                            style={{ color: '#3b82f6' }}
                            data-testid="alert-id-cell"
                          >
                            {alert.alert_id}
                          </span>
                        </td>
                        <td
                          className="text-sm font-medium"
                          style={{
                            padding: '12px 16px',
                            color: '#0f172a',
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {alert.alert_type}
                        </td>
                        <td
                          className="text-sm font-medium"
                          style={{
                            padding: '12px 16px',
                            color: '#0f172a',
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {alert.customer_name}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <StatusBadge
                            text={alert.severity}
                            colors={SEVERITY_COLORS[alert.severity]}
                            testId={`severity-badge-${alert.alert_id}`}
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <StatusBadge
                            text={alert.status}
                            colors={ALERT_STATUS_COLORS[alert.status]}
                            testId={`status-badge-${alert.alert_id}`}
                          />
                        </td>
                        <td
                          className="text-sm"
                          style={{
                            padding: '12px 16px',
                            color: '#475569',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 12,
                          }}
                        >
                          {formatDate(alert.created_date)}
                        </td>
                        <td
                          className="text-sm"
                          style={{
                            padding: '12px 16px',
                            color: '#475569',
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {alert.assigned_analyst}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div
              className="flex items-center justify-between border-t border-border"
              style={{ padding: '12px 24px' }}
              data-testid="pagination"
            >
              <span
                className="text-xs"
                style={{ color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}
              >
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, alerts.length)} of{' '}
                {alerts.length} alerts
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  data-testid="page-prev"
                  className="p-1.5 rounded-md hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft style={{ width: 16, height: 16, color: '#64748b' }} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    data-testid={`page-${p}`}
                    className="min-w-[32px] h-8 rounded-md text-xs font-medium transition-colors cursor-pointer"
                    style={{
                      backgroundColor: p === page ? '#3b82f6' : 'transparent',
                      color: p === page ? '#ffffff' : '#64748b',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  data-testid="page-next"
                  className="p-1.5 rounded-md hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight style={{ width: 16, height: 16, color: '#64748b' }} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SortIndicator({ column, sort }: { column: string; sort: SortState }) {
  if (sort.column !== column) {
    return (
      <ArrowUpDown
        className="opacity-0 group-hover:opacity-40 transition-opacity"
        style={{ width: 13, height: 13, color: '#64748b' }}
      />
    );
  }
  const Icon = sort.order === 'asc' ? ArrowUp : ArrowDown;
  return <Icon style={{ width: 13, height: 13, color: '#3b82f6' }} data-testid={`sort-indicator-${column}`} />;
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

function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  isOpen,
  onToggle,
  testId,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  isOpen: boolean;
  onToggle: () => void;
  testId: string;
}) {
  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="relative" data-filter-dropdown data-testid={testId}>
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer"
        style={{
          borderColor: selected.length > 0 ? '#3b82f6' : '#e2e8f0',
          backgroundColor: selected.length > 0 ? 'rgba(59, 130, 246, 0.05)' : '#ffffff',
          color: selected.length > 0 ? '#3b82f6' : '#64748b',
          fontFamily: "'DM Sans', sans-serif",
        }}
        data-testid={`${testId}-trigger`}
      >
        <Filter style={{ width: 12, height: 12 }} />
        {label}
        {selected.length > 0 && (
          <span
            className="flex items-center justify-center rounded-full text-white text-xs font-bold"
            style={{
              width: 18,
              height: 18,
              fontSize: 10,
              backgroundColor: '#3b82f6',
              marginLeft: 2,
            }}
          >
            {selected.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-border shadow-lg z-50 py-1"
          style={{
            minWidth: 200,
            maxHeight: 300,
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
          }}
          data-testid={`${testId}-dropdown`}
        >
          {options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <button
                key={option}
                onClick={() => toggleOption(option)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent/50 transition-colors text-left cursor-pointer"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
                data-testid={`${testId}-option-${option.replace(/\s+/g, '-')}`}
              >
                <div
                  className="flex items-center justify-center rounded border"
                  style={{
                    width: 16,
                    height: 16,
                    borderColor: isSelected ? '#3b82f6' : '#cbd5e1',
                    backgroundColor: isSelected ? '#3b82f6' : '#ffffff',
                    flexShrink: 0,
                  }}
                >
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5L4 7L8 3"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span style={{ color: '#334155' }}>{option}</span>
              </button>
            );
          })}
          {selected.length > 0 && (
            <div className="border-t border-border mt-1 pt-1 px-3 py-1.5">
              <button
                onClick={() => onChange([])}
                className="text-xs text-destructive hover:underline cursor-pointer"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
                data-testid={`${testId}-clear`}
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
