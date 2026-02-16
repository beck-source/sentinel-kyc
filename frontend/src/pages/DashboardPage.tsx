import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  ShieldAlert,
  AlertTriangle,
  FileWarning,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface KpiData {
  reviews_due_this_month: number;
  high_risk_rate: number;
  high_risk_count: number;
  total_customers: number;
  open_critical_alerts: number;
  docs_expiring_30_days: number;
}

interface RiskDistribution {
  distribution: Record<string, number>;
  total: number;
}

interface AlertTrendEntry {
  month: string;
  year: number;
  Critical: number;
  High: number;
  Medium: number;
  Low: number;
}

interface ActivityEntry {
  id: number;
  action: string;
  analyst_name: string;
  created_at: string;
}

const RISK_COLORS: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#22c55e',
};

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#991b1b',
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#64748b',
};

export function DashboardPage() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [riskDist, setRiskDist] = useState<RiskDistribution | null>(null);
  const [alertTrend, setAlertTrend] = useState<AlertTrendEntry[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [kpiRes, riskRes, trendRes, actRes] = await Promise.all([
        fetch('/api/dashboard/kpis'),
        fetch('/api/dashboard/risk-distribution'),
        fetch('/api/dashboard/alert-trend'),
        fetch('/api/activity'),
      ]);

      if (!kpiRes.ok || !riskRes.ok || !trendRes.ok || !actRes.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const [kpiData, riskData, trendData, actData] = await Promise.all([
        kpiRes.json(),
        riskRes.json(),
        trendRes.json(),
        actRes.json(),
      ]);

      setKpis(kpiData);
      setRiskDist(riskData);
      setAlertTrend(trendData);
      setActivities(actData.slice(0, 20));
    } catch {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return (
      <div data-testid="page-dashboard" className="space-y-6">
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

  if (loading || !kpis) {
    return (
      <div data-testid="page-dashboard" className="space-y-6">
        {/* KPI Skeleton */}
        <div className="grid grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-6 shadow-sm animate-pulse">
              <div className="h-4 bg-muted rounded w-2/3 mb-4" />
              <div className="h-9 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
        {/* Chart Skeleton */}
        <div className="grid grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-6 shadow-sm animate-pulse h-80" />
          ))}
        </div>
      </div>
    );
  }

  // KPI cards config
  const kpiCards = [
    {
      label: 'Reviews Due This Month',
      value: kpis.reviews_due_this_month,
      format: 'number' as const,
      icon: CalendarCheck,
      iconColor: '#3b82f6',
      iconBg: 'rgba(59, 130, 246, 0.1)',
      trend: { direction: 'up' as const, value: 12 },
      onClick: () => navigate('/customers'),
      testId: 'kpi-reviews-due',
    },
    {
      label: 'High-Risk Customer Rate',
      value: kpis.high_risk_rate,
      format: 'percent' as const,
      icon: ShieldAlert,
      iconColor: '#ef4444',
      iconBg: 'rgba(239, 68, 68, 0.1)',
      trend: { direction: 'up' as const, value: 3 },
      onClick: () => navigate('/customers?risk_tier=High'),
      testId: 'kpi-high-risk',
    },
    {
      label: 'Open Critical Alerts',
      value: kpis.open_critical_alerts,
      format: 'number' as const,
      icon: AlertTriangle,
      iconColor: '#dc2626',
      iconBg: 'rgba(220, 38, 38, 0.1)',
      trend: { direction: 'down' as const, value: 8 },
      onClick: () => navigate('/alerts?severity=Critical&status=Open'),
      testId: 'kpi-critical-alerts',
    },
    {
      label: 'Documents Expiring in 30 Days',
      value: kpis.docs_expiring_30_days,
      format: 'number' as const,
      icon: FileWarning,
      iconColor: '#f59e0b',
      iconBg: 'rgba(245, 158, 11, 0.1)',
      trend: { direction: 'up' as const, value: 5 },
      onClick: () => navigate('/documents'),
      testId: 'kpi-docs-expiring',
    },
  ];

  // Donut chart data — sorted so High comes first visually
  const tierOrder = ['High', 'Medium', 'Low'];
  const donutData = riskDist
    ? tierOrder
        .filter((tier) => riskDist.distribution[tier] != null)
        .map((tier) => ({
          name: tier,
          value: riskDist.distribution[tier],
        }))
    : [];

  return (
    <div data-testid="page-dashboard" className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-5" data-testid="kpi-cards">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          const TrendIcon = kpi.trend.direction === 'up' ? TrendingUp : TrendingDown;
          // Context-aware trend color
          const isGoodDown = kpi.testId === 'kpi-critical-alerts';
          const trendColor =
            kpi.trend.direction === 'down'
              ? isGoodDown
                ? '#22c55e'
                : '#ef4444'
              : kpi.testId === 'kpi-reviews-due'
                ? '#64748b'
                : '#ef4444';

          return (
            <button
              key={kpi.testId}
              data-testid={kpi.testId}
              onClick={kpi.onClick}
              className="bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow duration-200 text-left cursor-pointer group relative overflow-hidden"
              style={{ padding: '20px 24px' }}
            >
              {/* Trend indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-1" data-testid={`${kpi.testId}-trend`}>
                <TrendIcon
                  style={{ width: 14, height: 14, color: trendColor }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: trendColor, fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {kpi.trend.value}%
                </span>
              </div>

              {/* Icon + Label */}
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className="flex items-center justify-center rounded-lg"
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: kpi.iconBg,
                  }}
                >
                  <Icon style={{ width: 16, height: 16, color: kpi.iconColor }} />
                </div>
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}
                >
                  {kpi.label}
                </span>
              </div>

              {/* Value */}
              <div
                className="font-bold"
                data-testid={`${kpi.testId}-value`}
                style={{
                  fontSize: 34,
                  lineHeight: 1.1,
                  color: '#0f172a',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {kpi.format === 'percent' ? `${kpi.value}%` : kpi.value}
              </div>

              {/* Hover underline accent */}
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: kpi.iconColor }}
              />
            </button>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-5" data-testid="charts-row">
        {/* Donut Chart — Risk Distribution */}
        <div
          className="bg-card rounded-lg border border-border shadow-sm"
          style={{ padding: 24 }}
          data-testid="risk-distribution-chart"
        >
          <h3
            className="text-sm font-semibold uppercase tracking-wider mb-5"
            style={{ color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}
          >
            Customer Risk Distribution
          </h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {donutData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={RISK_COLORS[entry.name] || '#64748b'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} customers`, name]}
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif",
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                {/* Center label */}
                <text
                  x="50%"
                  y="46%"
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    fill: '#0f172a',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                  data-testid="donut-center-total"
                >
                  {riskDist?.total || 0}
                </text>
                <text
                  x="50%"
                  y="58%"
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{
                    fontSize: 12,
                    fill: '#64748b',
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 500,
                  }}
                >
                  TOTAL
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex justify-center gap-6 mt-2">
            {donutData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="rounded-full"
                  style={{
                    width: 10,
                    height: 10,
                    backgroundColor: RISK_COLORS[entry.name] || '#64748b',
                  }}
                />
                <span className="text-xs font-medium" style={{ color: '#64748b' }}>
                  {entry.name}
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: '#0f172a', fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart — Alert Volume by Month */}
        <div
          className="bg-card rounded-lg border border-border shadow-sm"
          style={{ padding: 24 }}
          data-testid="alert-trend-chart"
        >
          <h3
            className="text-sm font-semibold uppercase tracking-wider mb-5"
            style={{ color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}
          >
            Alert Volume by Month
          </h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={alertTrend}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 12,
                    fill: '#64748b',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 12,
                    fill: '#64748b',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif",
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    fontSize: 12,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
                <Bar dataKey="Critical" stackId="a" fill={SEVERITY_COLORS.Critical} radius={[0, 0, 0, 0]} />
                <Bar dataKey="High" stackId="a" fill={SEVERITY_COLORS.High} radius={[0, 0, 0, 0]} />
                <Bar dataKey="Medium" stackId="a" fill={SEVERITY_COLORS.Medium} radius={[0, 0, 0, 0]} />
                <Bar dataKey="Low" stackId="a" fill={SEVERITY_COLORS.Low} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div
        className="bg-card rounded-lg border border-border shadow-sm"
        style={{ padding: 24 }}
        data-testid="activity-feed"
      >
        <div className="flex items-center gap-2 mb-5">
          <Activity style={{ width: 16, height: 16, color: '#64748b' }} />
          <h3
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}
          >
            Recent Activity
          </h3>
        </div>
        <div
          className="space-y-0 divide-y divide-border overflow-y-auto"
          style={{ maxHeight: 420 }}
        >
          {activities.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-4 py-3 first:pt-0 last:pb-0"
              data-testid="activity-entry"
            >
              {/* Timestamp */}
              <div
                className="flex-shrink-0 text-xs font-medium rounded-md px-2 py-1"
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  minWidth: 140,
                }}
                data-testid="activity-timestamp"
              >
                {formatTimestamp(entry.created_at)}
              </div>

              {/* Description */}
              <span
                className="text-sm flex-1"
                style={{ color: '#334155', fontFamily: "'DM Sans', sans-serif" }}
                data-testid="activity-description"
              >
                {entry.action}
              </span>

              {/* Analyst */}
              <span
                className="text-xs font-medium flex-shrink-0"
                style={{
                  color: '#3b82f6',
                  fontFamily: "'DM Sans', sans-serif",
                  whiteSpace: 'nowrap',
                }}
                data-testid="activity-analyst"
              >
                {entry.analyst_name}
              </span>
            </div>
          ))}
          {activities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No activity recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}
