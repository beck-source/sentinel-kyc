import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
} from 'lucide-react';

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

type SortOrder = 'asc' | 'desc';

interface SortState {
  column: string;
  order: SortOrder;
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

// ── Utility functions ──────────────────────────────────────────────────────────

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
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
  { key: 'customer_id', label: 'Customer ID', width: '120px' },
  { key: 'legal_name', label: 'Name', width: 'auto' },
  { key: 'business_type', label: 'Business Type', width: '160px' },
  { key: 'jurisdiction', label: 'Jurisdiction', width: '140px' },
  { key: 'risk_tier', label: 'Risk Tier', width: '110px' },
  { key: 'kyc_status', label: 'KYC Status', width: '130px' },
  { key: 'last_review_date', label: 'Last Review', width: '120px' },
  { key: 'next_review_due', label: 'Next Review Due', width: '135px' },
];

const PAGE_SIZE = 15;

// ── Component ──────────────────────────────────────────────────────────────────

export function CustomersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [riskTierFilter, setRiskTierFilter] = useState<string[]>(() => {
    const param = searchParams.get('risk_tier');
    return param ? param.split(',') : [];
  });
  const [kycStatusFilter, setKycStatusFilter] = useState<string[]>([]);
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string[]>([]);

  // Sorting
  const [sort, setSort] = useState<SortState>({ column: 'customer_id', order: 'asc' });

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
      if (riskTierFilter.length > 0) params.set('risk_tier', riskTierFilter.join(','));
      if (kycStatusFilter.length > 0) params.set('kyc_status', kycStatusFilter.join(','));
      if (jurisdictionFilter.length > 0) params.set('jurisdiction', jurisdictionFilter.join(','));
      params.set('sort_by', sort.column);
      params.set('sort_order', sort.order);

      const [customersRes, jurisdictionsRes] = await Promise.all([
        fetch(`/api/customers?${params.toString()}`),
        fetch('/api/customers/jurisdictions'),
      ]);

      if (!customersRes.ok) throw new Error('Failed to load customers');

      const customersData = await customersRes.json();
      setCustomers(customersData);

      if (jurisdictionsRes.ok) {
        const jurData = await jurisdictionsRes.json();
        setJurisdictions(jurData);
      }
    } catch {
      setError('Failed to load customer data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, riskTierFilter, kycStatusFilter, jurisdictionFilter, sort]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, riskTierFilter, kycStatusFilter, jurisdictionFilter]);

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
  const totalPages = Math.max(1, Math.ceil(customers.length / PAGE_SIZE));
  const paginatedCustomers = useMemo(
    () => customers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [customers, page]
  );

  const handleSort = (column: string) => {
    setSort((prev) => ({
      column,
      order: prev.column === column && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const clearAllFilters = () => {
    setSearch('');
    setRiskTierFilter([]);
    setKycStatusFilter([]);
    setJurisdictionFilter([]);
  };

  const hasActiveFilters =
    search.length > 0 ||
    riskTierFilter.length > 0 ||
    kycStatusFilter.length > 0 ||
    jurisdictionFilter.length > 0;

  // Error state
  if (error) {
    return (
      <div data-testid="page-customers" className="space-y-6">
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
    <div data-testid="page-customers" className="space-y-0">
      {/* Toolbar: Search + Filters */}
      <div
        className="bg-card rounded-t-lg border border-border shadow-sm"
        style={{ padding: '16px 24px' }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-[360px]" data-testid="customer-search-container">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              style={{ width: 15, height: 15 }}
            />
            <input
              data-testid="customer-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or ID..."
              className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                data-testid="customer-search-clear"
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>

          {/* Filter: Risk Tier */}
          <MultiSelectFilter
            label="Risk Tier"
            options={['High', 'Medium', 'Low']}
            selected={riskTierFilter}
            onChange={setRiskTierFilter}
            isOpen={openFilter === 'risk_tier'}
            onToggle={() => setOpenFilter(openFilter === 'risk_tier' ? null : 'risk_tier')}
            testId="filter-risk-tier"
          />

          {/* Filter: KYC Status */}
          <MultiSelectFilter
            label="KYC Status"
            options={['Verified', 'Pending', 'Under Review', 'Expired']}
            selected={kycStatusFilter}
            onChange={setKycStatusFilter}
            isOpen={openFilter === 'kyc_status'}
            onToggle={() => setOpenFilter(openFilter === 'kyc_status' ? null : 'kyc_status')}
            testId="filter-kyc-status"
          />

          {/* Filter: Jurisdiction */}
          <MultiSelectFilter
            label="Jurisdiction"
            options={jurisdictions}
            selected={jurisdictionFilter}
            onChange={setJurisdictionFilter}
            isOpen={openFilter === 'jurisdiction'}
            onToggle={() => setOpenFilter(openFilter === 'jurisdiction' ? null : 'jurisdiction')}
            testId="filter-jurisdiction"
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
            <p className="mt-3 text-sm text-muted-foreground">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center" data-testid="empty-state">
            <Users className="mx-auto mb-3 text-muted-foreground" style={{ width: 32, height: 32, opacity: 0.5 }} />
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
              <table className="w-full" data-testid="customers-table">
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
                  {paginatedCustomers.map((customer) => {
                    const overdue = isOverdue(customer.next_review_due);
                    return (
                      <tr
                        key={customer.customer_id}
                        data-testid={`customer-row-${customer.customer_id}`}
                        data-overdue={overdue ? 'true' : undefined}
                        onClick={() => navigate(`/customers/${customer.customer_id}`)}
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
                            style={{ color: '#3b82f6' }}
                            data-testid="customer-id-cell"
                          >
                            {customer.customer_id}
                          </span>
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
                            {customer.legal_name}
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
                          {customer.business_type}
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
                          {customer.jurisdiction}
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            backgroundColor: overdue ? 'rgba(239, 68, 68, 0.03)' : undefined,
                          }}
                        >
                          <StatusBadge
                            text={customer.risk_tier}
                            colors={RISK_TIER_COLORS[customer.risk_tier]}
                            testId={`risk-badge-${customer.customer_id}`}
                          />
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            backgroundColor: overdue ? 'rgba(239, 68, 68, 0.03)' : undefined,
                          }}
                        >
                          <StatusBadge
                            text={customer.kyc_status}
                            colors={KYC_STATUS_COLORS[customer.kyc_status]}
                            testId={`kyc-badge-${customer.customer_id}`}
                          />
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
                          {formatDate(customer.last_review_date)}
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
                          {formatDate(customer.next_review_due)}
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
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, customers.length)} of{' '}
                {customers.length} customers
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
