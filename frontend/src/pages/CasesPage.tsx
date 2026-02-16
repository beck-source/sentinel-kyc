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
  Briefcase,
} from 'lucide-react';

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
}

type SortOrder = 'asc' | 'desc';

interface SortState {
  column: string;
  order: SortOrder;
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

// ── Utility functions ──────────────────────────────────────────────────────────

function isOverdue(dateStr: string | null, status: string): boolean {
  if (!dateStr || status === 'Closed') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  return d < today;
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

// ── Constants ──────────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'case_id', label: 'Case ID', width: '130px' },
  { key: 'case_type', label: 'Case Type', width: '160px' },
  { key: 'customer_name', label: 'Customer Name', width: 'auto' },
  { key: 'priority', label: 'Priority', width: '110px' },
  { key: 'status', label: 'Status', width: '120px' },
  { key: 'assigned_analyst', label: 'Assigned Analyst', width: '160px' },
  { key: 'opened_date', label: 'Opened Date', width: '120px' },
  { key: 'due_date', label: 'Due Date', width: '120px' },
];

const PAGE_SIZE = 15;

// ── Component ──────────────────────────────────────────────────────────────────

export function CasesPage() {
  const navigate = useNavigate();

  // Data
  const [cases, setCases] = useState<Case[]>([]);
  const [caseTypes, setCaseTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [caseTypeFilter, setCaseTypeFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);

  // Sorting
  const [sort, setSort] = useState<SortState>({ column: 'case_id', order: 'asc' });

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
      if (statusFilter.length > 0) params.set('status', statusFilter.join(','));
      if (caseTypeFilter.length > 0) params.set('case_type', caseTypeFilter.join(','));
      if (priorityFilter.length > 0) params.set('priority', priorityFilter.join(','));
      params.set('sort_by', sort.column);
      params.set('sort_order', sort.order);

      const [casesRes, typesRes] = await Promise.all([
        fetch(`/api/cases?${params.toString()}`),
        fetch('/api/cases/types'),
      ]);

      if (!casesRes.ok) throw new Error('Failed to load cases');

      const casesData = await casesRes.json();
      setCases(casesData);

      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setCaseTypes(typesData);
      }
    } catch {
      setError('Failed to load case data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, caseTypeFilter, priorityFilter, sort]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, caseTypeFilter, priorityFilter]);

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
  const totalPages = Math.max(1, Math.ceil(cases.length / PAGE_SIZE));
  const paginatedCases = useMemo(
    () => cases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [cases, page]
  );

  const handleSort = (column: string) => {
    setSort((prev) => ({
      column,
      order: prev.column === column && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const clearAllFilters = () => {
    setSearch('');
    setStatusFilter([]);
    setCaseTypeFilter([]);
    setPriorityFilter([]);
  };

  const hasActiveFilters =
    search.length > 0 ||
    statusFilter.length > 0 ||
    caseTypeFilter.length > 0 ||
    priorityFilter.length > 0;

  // Error state
  if (error) {
    return (
      <div data-testid="page-cases" className="space-y-6">
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
    <div data-testid="page-cases" className="space-y-0">
      {/* Toolbar: Search + Filters */}
      <div
        className="bg-card rounded-t-lg border border-border shadow-sm"
        style={{ padding: '16px 24px' }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-[360px]" data-testid="case-search-container">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              style={{ width: 15, height: 15 }}
            />
            <input
              data-testid="case-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Case ID or Customer..."
              className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                data-testid="case-search-clear"
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>

          {/* Filter: Status */}
          <MultiSelectFilter
            label="Status"
            options={['Open', 'In Progress', 'Escalated', 'Closed']}
            selected={statusFilter}
            onChange={setStatusFilter}
            isOpen={openFilter === 'status'}
            onToggle={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
            testId="filter-status"
          />

          {/* Filter: Case Type */}
          <MultiSelectFilter
            label="Case Type"
            options={caseTypes}
            selected={caseTypeFilter}
            onChange={setCaseTypeFilter}
            isOpen={openFilter === 'case_type'}
            onToggle={() => setOpenFilter(openFilter === 'case_type' ? null : 'case_type')}
            testId="filter-case-type"
          />

          {/* Filter: Priority */}
          <MultiSelectFilter
            label="Priority"
            options={['Critical', 'High', 'Medium', 'Low']}
            selected={priorityFilter}
            onChange={setPriorityFilter}
            isOpen={openFilter === 'priority'}
            onToggle={() => setOpenFilter(openFilter === 'priority' ? null : 'priority')}
            testId="filter-priority"
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
            <p className="mt-3 text-sm text-muted-foreground">Loading cases...</p>
          </div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center" data-testid="empty-state">
            <Briefcase className="mx-auto mb-3 text-muted-foreground" style={{ width: 32, height: 32, opacity: 0.5 }} />
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
              <table className="w-full" data-testid="cases-table">
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
                  {paginatedCases.map((caseItem) => {
                    const overdue = isOverdue(caseItem.due_date, caseItem.status);
                    return (
                      <tr
                        key={caseItem.case_id}
                        data-testid={`case-row-${caseItem.case_id}`}
                        data-overdue={overdue ? 'true' : undefined}
                        onClick={() => navigate(`/cases/${caseItem.case_id}`)}
                        className="border-b border-border transition-colors duration-150 cursor-pointer"
                        style={{
                          backgroundColor: overdue ? 'rgba(239, 68, 68, 0.03)' : undefined,
                          boxShadow: overdue ? 'inset 3px 0 0 0 #ef4444' : undefined,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = '#eff6ff';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = overdue ? 'rgba(239, 68, 68, 0.03)' : '';
                        }}
                      >
                        <td
                          style={{
                            padding: '12px 16px',
                            backgroundColor: overdue ? 'rgba(239, 68, 68, 0.03)' : undefined,
                          }}
                        >
                          <span
                            className="font-mono-id"
                            style={{ color: '#3b82f6', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                            data-testid="case-id-cell"
                          >
                            {caseItem.case_id}
                          </span>
                        </td>
                        <td
                          className="text-sm"
                          style={{
                            padding: '12px 16px',
                            color: '#475569',
                            fontFamily: "'DM Sans', sans-serif",
                            backgroundColor: overdue ? 'rgba(239, 68, 68, 0.03)' : undefined,
                          }}
                        >
                          {caseItem.case_type}
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            backgroundColor: overdue ? 'rgba(239, 68, 68, 0.03)' : undefined,
                          }}
                        >
                          <span
                            className="text-sm font-medium"
                            style={{ color: '#0f172a', fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {caseItem.customer_name}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            backgroundColor: overdue ? 'rgba(239, 68, 68, 0.03)' : undefined,
                          }}
                        >
                          <StatusBadge
                            text={caseItem.priority}
                            colors={PRIORITY_COLORS[caseItem.priority]}
                            testId={`priority-badge-${caseItem.case_id}`}
                          />
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            backgroundColor: overdue ? 'rgba(239, 68, 68, 0.03)' : undefined,
                          }}
                        >
                          <StatusBadge
                            text={caseItem.status}
                            colors={STATUS_COLORS[caseItem.status]}
                            testId={`status-badge-${caseItem.case_id}`}
                          />
                        </td>
                        <td
                          className="text-sm"
                          style={{
                            padding: '12px 16px',
                            color: '#475569',
                            fontFamily: "'DM Sans', sans-serif",
                            backgroundColor: overdue ? 'rgba(239, 68, 68, 0.03)' : undefined,
                          }}
                        >
                          {caseItem.assigned_analyst}
                        </td>
                        <td
                          className="text-sm"
                          style={{
                            padding: '12px 16px',
                            color: '#475569',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 12,
                            backgroundColor: overdue ? 'rgba(239, 68, 68, 0.03)' : undefined,
                          }}
                        >
                          {formatDate(caseItem.opened_date)}
                        </td>
                        <td
                          className="text-sm"
                          style={{
                            padding: '12px 16px',
                            color: overdue ? '#dc2626' : '#475569',
                            fontWeight: overdue ? 600 : 400,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 12,
                            backgroundColor: overdue ? 'rgba(239, 68, 68, 0.03)' : undefined,
                          }}
                        >
                          {formatDate(caseItem.due_date)}
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
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, cases.length)} of{' '}
                {cases.length} cases
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
