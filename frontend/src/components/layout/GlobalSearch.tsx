import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Users,
  AlertTriangle,
  Briefcase,
  FileText,
  X,
} from 'lucide-react';

interface SearchResults {
  customers: Array<{
    id: number;
    customer_id: string;
    legal_name: string;
    risk_tier: string;
    kyc_status: string;
    business_type: string;
  }>;
  alerts: Array<{
    id: number;
    alert_id: string;
    alert_type: string;
    severity: string;
    status: string;
    customer_name: string | null;
    customer_cid: string | null;
  }>;
  cases: Array<{
    id: number;
    case_id: string;
    case_type: string;
    priority: string;
    status: string;
    customer_name: string | null;
    customer_cid: string | null;
  }>;
  documents: Array<{
    id: number;
    document_id: string;
    doc_type: string;
    verification_status: string;
    customer_name: string | null;
    customer_cid: string | null;
  }>;
}

const RISK_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  High: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626' },
  Medium: { bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706' },
  Low: { bg: 'rgba(34, 197, 94, 0.1)', text: '#16a34a' },
};

const SEVERITY_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  Critical: { bg: 'rgba(127, 29, 29, 0.1)', text: '#991b1b' },
  High: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626' },
  Medium: { bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706' },
  Low: { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b' },
};

export function GlobalSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on route change
  useEffect(() => {
    setIsOpen(false);
    setQuery('');
    setResults(null);
    setNoResults(false);
  }, [location.pathname]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults(null);
      setIsOpen(false);
      setNoResults(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      const data: SearchResults = await res.json();

      setResults(data);

      const totalResults =
        data.customers.length +
        data.alerts.length +
        data.cases.length +
        data.documents.length;

      setNoResults(totalResults === 0);
      setIsOpen(true);
    } catch {
      setResults(null);
      setNoResults(true);
      setIsOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);

    // Debounce: clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value.length < 2) {
      setResults(null);
      setIsOpen(false);
      setNoResults(false);
      return;
    }

    // Set new debounce timer (300ms)
    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    setQuery('');
    setResults(null);
    setNoResults(false);
    navigate(path);
  };

  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setIsOpen(false);
    setNoResults(false);
    inputRef.current?.focus();
  };

  const hasResults = results && (
    results.customers.length > 0 ||
    results.alerts.length > 0 ||
    results.cases.length > 0 ||
    results.documents.length > 0
  );

  return (
    <div ref={containerRef} className="relative" style={{ width: 380 }} data-testid="global-search-container">
      {/* Search Input */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          style={{ width: 16, height: 16 }}
        />
        <input
          ref={inputRef}
          data-testid="global-search"
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (query.length >= 2 && (hasResults || noResults)) {
              setIsOpen(true);
            }
          }}
          placeholder="Search customers, alerts, cases..."
          className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
          autoComplete="off"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            data-testid="search-clear"
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        )}
        {loading && (
          <div
            className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"
          />
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div
          data-testid="search-results-dropdown"
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg border border-border shadow-lg overflow-hidden z-50"
          style={{
            maxHeight: 480,
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
          }}
        >
          {noResults && (
            <div
              className="px-4 py-8 text-center"
              data-testid="search-no-results"
            >
              <p
                className="text-sm text-muted-foreground"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                No results for &apos;{query}&apos;
              </p>
            </div>
          )}

          {hasResults && (
            <div className="py-2">
              {/* Customers */}
              {results!.customers.length > 0 && (
                <SearchSection
                  title="Customers"
                  icon={<Users style={{ width: 14, height: 14 }} />}
                >
                  {results!.customers.map((c) => (
                    <button
                      key={c.customer_id}
                      data-testid={`search-result-${c.customer_id}`}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left cursor-pointer"
                      onClick={() => handleNavigate(`/customers?highlight=${c.customer_id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono-id text-xs"
                            style={{ color: '#3b82f6' }}
                          >
                            {c.customer_id}
                          </span>
                          <span className="text-sm font-medium text-foreground truncate">
                            {c.legal_name}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{c.business_type}</span>
                      </div>
                      <Badge
                        text={c.risk_tier}
                        colors={RISK_BADGE_COLORS[c.risk_tier]}
                      />
                    </button>
                  ))}
                </SearchSection>
              )}

              {/* Alerts */}
              {results!.alerts.length > 0 && (
                <SearchSection
                  title="Alerts"
                  icon={<AlertTriangle style={{ width: 14, height: 14 }} />}
                >
                  {results!.alerts.map((a) => (
                    <button
                      key={a.alert_id}
                      data-testid={`search-result-${a.alert_id}`}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left cursor-pointer"
                      onClick={() => handleNavigate(`/alerts?highlight=${a.alert_id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-id text-xs" style={{ color: '#3b82f6' }}>
                            {a.alert_id}
                          </span>
                          <span className="text-sm font-medium text-foreground truncate">
                            {a.alert_type}
                          </span>
                        </div>
                        {a.customer_name && (
                          <span className="text-xs text-muted-foreground">{a.customer_name}</span>
                        )}
                      </div>
                      <Badge
                        text={a.severity}
                        colors={SEVERITY_BADGE_COLORS[a.severity]}
                      />
                    </button>
                  ))}
                </SearchSection>
              )}

              {/* Cases */}
              {results!.cases.length > 0 && (
                <SearchSection
                  title="Cases"
                  icon={<Briefcase style={{ width: 14, height: 14 }} />}
                >
                  {results!.cases.map((c) => (
                    <button
                      key={c.case_id}
                      data-testid={`search-result-${c.case_id}`}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left cursor-pointer"
                      onClick={() => handleNavigate(`/cases?highlight=${c.case_id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-id text-xs" style={{ color: '#3b82f6' }}>
                            {c.case_id}
                          </span>
                          <span className="text-sm font-medium text-foreground truncate">
                            {c.case_type}
                          </span>
                        </div>
                        {c.customer_name && (
                          <span className="text-xs text-muted-foreground">{c.customer_name}</span>
                        )}
                      </div>
                      <Badge
                        text={c.priority}
                        colors={SEVERITY_BADGE_COLORS[c.priority]}
                      />
                    </button>
                  ))}
                </SearchSection>
              )}

              {/* Documents */}
              {results!.documents.length > 0 && (
                <SearchSection
                  title="Documents"
                  icon={<FileText style={{ width: 14, height: 14 }} />}
                >
                  {results!.documents.map((d) => (
                    <button
                      key={d.document_id}
                      data-testid={`search-result-${d.document_id}`}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left cursor-pointer"
                      onClick={() => handleNavigate(`/documents?highlight=${d.document_id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-id text-xs" style={{ color: '#3b82f6' }}>
                            {d.document_id}
                          </span>
                          <span className="text-sm font-medium text-foreground truncate">
                            {d.doc_type}
                          </span>
                        </div>
                        {d.customer_name && (
                          <span className="text-xs text-muted-foreground">{d.customer_name}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </SearchSection>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div data-testid={`search-section-${title.toLowerCase()}`}>
      <div
        className="flex items-center gap-2 px-4 py-2 border-b border-border"
        style={{ backgroundColor: '#f8fafc' }}
      >
        <span style={{ color: '#64748b' }}>{icon}</span>
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function Badge({
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
      className="flex-shrink-0 text-xs font-medium uppercase px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: bg,
        color,
        fontSize: 11,
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: '0.03em',
      }}
    >
      {text}
    </span>
  );
}
