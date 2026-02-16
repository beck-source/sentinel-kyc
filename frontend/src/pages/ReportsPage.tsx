import { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BarChart3, Sparkles, RefreshCw, AlertCircle, KeyRound } from 'lucide-react';
import { useApiKey } from '@/components/ApiKeyDialog';

// ── Types ──────────────────────────────────────────────────────────────────────

interface QuarterlyMetrics {
  [metric: string]: { Q1: number; Q2: number; Q3: number; Q4: number };
}

interface ResolutionData {
  month: string;
  total: number;
  resolved: number;
  resolution_rate: number;
  within_sla: number;
}

interface SlaData {
  quarter: string;
  alerts_sla: number;
  cases_sla: number;
  overall: number;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const [metrics, setMetrics] = useState<QuarterlyMetrics | null>(null);
  const [resolutionData, setResolutionData] = useState<ResolutionData[]>([]);
  const [slaData, setSlaData] = useState<SlaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { openDialogThen } = useApiKey();

  // AI narrative state
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [metricsRes, resRes, slaRes] = await Promise.all([
        fetch('/api/reports/quarterly-metrics'),
        fetch('/api/reports/resolution-rate'),
        fetch('/api/reports/sla-adherence'),
      ]);

      if (!metricsRes.ok) throw new Error('Failed to load metrics');

      const [metricsData, resData, slaDataResult] = await Promise.all([
        metricsRes.json(),
        resRes.ok ? resRes.json() : [],
        slaRes.ok ? slaRes.json() : [],
      ]);

      setMetrics(metricsData);
      setResolutionData(resData);
      setSlaData(slaDataResult);
    } catch {
      setError('Failed to load report data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generateNarrative = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiText('');

    try {
      const response = await fetch('/api/ai/compliance-narrative', {
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
              // Skip malformed JSON
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

  if (error) {
    return (
      <div data-testid="page-reports" className="space-y-6">
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

  if (loading) {
    return (
      <div data-testid="page-reports" className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-8 shadow-sm animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-6" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const metricRows = metrics ? Object.entries(metrics) : [];

  return (
    <div data-testid="page-reports" className="space-y-6">
      {/* Quarterly Metrics Table */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div
          className="flex items-center gap-3 border-b border-border"
          style={{ padding: '16px 24px', backgroundColor: '#f8fafc' }}
        >
          <BarChart3 style={{ width: 18, height: 18, color: '#3b82f6' }} />
          <h2
            className="text-base font-semibold"
            style={{ color: '#0f172a', fontFamily: "'DM Sans', sans-serif" }}
          >
            Quarterly Compliance Metrics
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" data-testid="metrics-table">
            <thead>
              <tr className="border-b border-border" style={{ backgroundColor: '#f8fafc' }}>
                <th
                  className="text-left"
                  style={{
                    padding: '12px 24px',
                    color: '#64748b',
                    fontSize: 11,
                    fontWeight: 500,
                    fontFamily: "'DM Sans', sans-serif",
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    minWidth: 240,
                  }}
                >
                  Metric
                </th>
                {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
                  <th
                    key={q}
                    className="text-right"
                    style={{
                      padding: '12px 24px',
                      color: '#64748b',
                      fontSize: 11,
                      fontWeight: 500,
                      fontFamily: "'DM Sans', sans-serif",
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      minWidth: 100,
                    }}
                  >
                    {q}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metricRows.map(([metric, values], idx) => (
                <tr
                  key={metric}
                  className="border-b border-border transition-colors duration-150"
                  data-testid={`metric-row-${idx}`}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#eff6ff';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '';
                  }}
                >
                  <td
                    style={{
                      padding: '12px 24px',
                      color: '#334155',
                      fontSize: 13,
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 500,
                    }}
                  >
                    {metric}
                  </td>
                  {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
                    <td
                      key={q}
                      className="text-right"
                      style={{
                        padding: '12px 24px',
                        color: '#0f172a',
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 600,
                      }}
                    >
                      {typeof values[q as keyof typeof values] === 'number'
                        ? metric.includes('%')
                          ? `${values[q as keyof typeof values]}%`
                          : values[q as keyof typeof values].toLocaleString()
                        : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Resolution Rate Chart */}
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div
            className="border-b border-border"
            style={{ padding: '16px 24px', backgroundColor: '#f8fafc' }}
          >
            <h3
              className="text-sm font-semibold"
              style={{ color: '#0f172a', fontFamily: "'DM Sans', sans-serif" }}
            >
              Alert Resolution Rate by Month
            </h3>
            <p
              className="text-xs mt-1"
              style={{ color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}
            >
              Last 6 months — percentage of alerts resolved within SLA
            </p>
          </div>
          <div style={{ padding: '20px 16px', height: 320 }} data-testid="resolution-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#64748b', fontFamily: "'DM Sans', sans-serif" }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}
                />
                <Bar
                  dataKey="resolution_rate"
                  name="Resolution Rate"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="within_sla"
                  name="Within SLA"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                  opacity={0.7}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SLA Adherence Chart */}
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div
            className="border-b border-border"
            style={{ padding: '16px 24px', backgroundColor: '#f8fafc' }}
          >
            <h3
              className="text-sm font-semibold"
              style={{ color: '#0f172a', fontFamily: "'DM Sans', sans-serif" }}
            >
              SLA Adherence by Quarter
            </h3>
            <p
              className="text-xs mt-1"
              style={{ color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}
            >
              Percentage of alerts and cases meeting SLA deadlines
            </p>
          </div>
          <div style={{ padding: '20px 16px', height: 320 }} data-testid="sla-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="quarter"
                  tick={{ fontSize: 11, fill: '#64748b', fontFamily: "'DM Sans', sans-serif" }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}
                />
                <Bar
                  dataKey="alerts_sla"
                  name="Alerts SLA"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="cases_sla"
                  name="Cases SLA"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="overall"
                  name="Overall"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Compliance Narrative */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div
          className="flex items-center justify-between border-b border-border"
          style={{ padding: '16px 24px', backgroundColor: '#f8fafc' }}
        >
          <div>
            <h3
              className="text-sm font-semibold"
              style={{ color: '#0f172a', fontFamily: "'DM Sans', sans-serif" }}
            >
              Quarterly Compliance Narrative
            </h3>
            <p
              className="text-xs mt-1"
              style={{ color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}
            >
              AI-generated narrative for board compliance reports
            </p>
          </div>
          <button
            onClick={generateNarrative}
            disabled={aiLoading}
            data-testid="ai-narrative-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: '#7c3aed',
              color: '#ffffff',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <Sparkles style={{ width: 15, height: 15 }} />
            {aiLoading ? 'Generating...' : 'Generate Compliance Narrative'}
          </button>
        </div>

        <div style={{ padding: '24px' }}>
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
                Unable to generate narrative. Check your API key or try again later.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateNarrative}
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
                  onClick={() => openDialogThen(generateNarrative)}
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

          {/* AI loading */}
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
              data-testid="ai-narrative-panel"
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
                className="text-sm leading-relaxed"
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

          {/* Default empty state */}
          {!aiText && !aiLoading && !aiError && (
            <div className="text-center py-8">
              <BarChart3
                className="mx-auto mb-3"
                style={{ width: 32, height: 32, color: '#cbd5e1', opacity: 0.5 }}
              />
              <p
                className="text-sm"
                style={{ color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}
              >
                Click "Generate Compliance Narrative" to create an AI-powered quarterly report summary
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
