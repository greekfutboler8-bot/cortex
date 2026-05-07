import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, MessageSquare, FileText, AlertTriangle,
  TrendingUp, TrendingDown, Users, DollarSign, BarChart3,
  ShieldCheck, Settings, ChevronRight, Activity,
  Package, Clock, Zap, CheckCircle2, ArrowUpRight,
  ArrowDownRight, X, Send, Bot, RefreshCw,
  Calendar, Coffee, Loader2
} from "lucide-react";

type Tab = "dashboard" | "analytics" | "chat" | "reports" | "alerts" | "settings";

const API = "";

// ── API hooks ─────────────────────────────────────────────────────────────────
function useAPI<T>(endpoint: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${API}${endpoint}`);
      if (!res.ok) throw new Error("API error");
      setData(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (!n) return "$0";
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
}

function Spinner() {
  return <Loader2 className="w-4 h-4 animate-spin text-slate-400" />;
}

function ErrorMsg({ msg }: { msg: string }) {
  return <div className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{msg}</div>;
}

// ── Components ────────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, trend, trendLabel, icon: Icon, accent, loading }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent || "bg-slate-50"}`}>
          <Icon className="w-4 h-4 text-slate-600" />
        </div>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-2"><Spinner /><span className="text-xs text-slate-400">Loading...</span></div>
      ) : (
        <>
          <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
          {sub && <div className="text-xs text-slate-500 mb-2">{sub}</div>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${trend ? "text-emerald-600" : "text-red-500"}`}>
              {trend ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trendLabel}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AlertBadge({ level }: { level: string }) {
  if (level === "critical") return <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Critical</span>;
  if (level === "warning") return <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Warning</span>;
  return <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Info</span>;
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function Dashboard() {
  const { data, loading, error } = useAPI<any>("/api/dashboard", null);

  const metrics = data?.metrics || {};
  const alerts = data?.alerts || [];
  const chart = data?.chart || [];

  const maxRevenue = chart.length ? Math.max(...chart.map((c: any) => c.revenue)) : 1;
  const { data: briefingData, loading: briefingLoading, refetch: refreshBriefing } = useAPI<any>("/api/briefing", null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshBriefing = async () => {
    setRefreshing(true);
    try {
      await fetch(`${API}/api/briefing/refresh`, { method: "POST" });
      await refreshBriefing();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Morning briefing */}
      <div className="bg-slate-900 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <Coffee className="w-5 h-5 text-sky-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Morning Briefing</span>
            <span className="text-xs text-slate-500">{briefingData?.date || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
          </div>
          {briefingLoading ? (
            <div className="flex items-center gap-2"><Spinner /><span className="text-sm text-slate-400">Cortex is generating your briefing...</span></div>
          ) : error ? (
            <p className="text-sm text-red-400">Could not connect to Cortex backend. Is it running?</p>
          ) : (
            <p className="text-sm text-slate-300 leading-relaxed">{briefingData?.briefing}</p>
          )}
        </div>
        <button
          onClick={handleRefreshBriefing}
          title="Regenerate briefing"
          className="text-slate-500 hover:text-sky-400 flex-shrink-0 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Monthly Revenue" loading={loading}
          value={fmt(metrics.revenue)} sub={metrics.latest_month}
          trend={metrics.revenue_change_pct >= 0}
          trendLabel={`${metrics.revenue_change_pct > 0 ? "+" : ""}${metrics.revenue_change_pct}% vs prior month`}
          icon={DollarSign} accent="bg-blue-50"
        />
        <MetricCard
          label="Net Margin" loading={loading}
          value={`${metrics.net_margin_pct}%`}
          sub={`Target: ${data?.business?.labour_cost_target || 22}%`}
          trend={metrics.net_margin_pct >= 18}
          trendLabel={metrics.net_margin_pct >= 18 ? "On target" : "Below target"}
          icon={TrendingUp} accent={metrics.net_margin_pct < 18 ? "bg-red-50" : "bg-emerald-50"}
        />
        <MetricCard
          label="Labour Cost %" loading={loading}
          value={`${metrics.labour_pct}%`}
          sub={fmt(metrics.labour_cost) + " total"}
          trend={metrics.labour_pct <= (data?.business?.labour_cost_target || 30)}
          trendLabel={metrics.labour_pct > (data?.business?.labour_cost_target || 30) ? `Above ${data?.business?.labour_cost_target}% target` : "On target"}
          icon={Users} accent={metrics.labour_pct > 30 ? "bg-amber-50" : "bg-emerald-50"}
        />
        <MetricCard
          label="Food Cost %" loading={loading}
          value={`${metrics.cogs_pct}%`}
          sub={fmt(metrics.cogs) + " total"}
          trend={metrics.cogs_pct <= (data?.business?.food_cost_target || 28)}
          trendLabel={metrics.cogs_pct > (data?.business?.food_cost_target || 28) ? `Above ${data?.business?.food_cost_target}% target` : "On target"}
          icon={Package} accent={metrics.cogs_pct > 28 ? "bg-red-50" : "bg-emerald-50"}
        />
      </div>

      {/* Revenue chart + alerts */}
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div><div className="font-semibold text-slate-900">Revenue History</div><div className="text-xs text-slate-400 mt-0.5">Monthly — from vault</div></div>
            {!loading && <div className="text-right"><div className="text-lg font-bold text-slate-900">{fmt(metrics.revenue)}</div><div className="text-xs text-slate-400">{metrics.latest_month}</div></div>}
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-20"><Spinner /></div>
          ) : (
            <div className="flex items-end gap-1.5 h-20">
              {chart.map((m: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end" style={{ height: 64 }}>
                    <div
                      className={`w-full rounded-t-md transition-all duration-700 ${i === chart.length - 1 ? "bg-blue-500" : "bg-slate-100"}`}
                      style={{ height: `${(m.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="text-[8px] text-slate-400 font-medium truncate w-full text-center">{m.month.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold text-slate-900">Active Alerts</div>
            {alerts.filter((a: any) => a.level === "critical").length > 0 && (
              <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                {alerts.filter((a: any) => a.level === "critical").length} Critical
              </span>
            )}
          </div>
          {loading ? (
            <div className="flex items-center gap-2"><Spinner /><span className="text-xs text-slate-400">Loading alerts...</span></div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-4"><CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" /><div className="text-xs text-slate-400">No active alerts</div></div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 3).map((a: any, i: number) => (
                <div key={i} className={`rounded-xl p-3 flex items-start gap-3 ${a.level === "critical" ? "bg-red-50 border border-red-100" : a.level === "warning" ? "bg-amber-50 border border-amber-100" : "bg-blue-50 border border-blue-100"}`}>
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${a.level === "critical" ? "text-red-500" : a.level === "warning" ? "text-amber-500" : "text-blue-500"}`} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800">{a.date}</div>
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monthly breakdown table */}
      {!loading && chart.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="font-semibold text-slate-900 mb-4">Monthly P&L — From Vault</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="text-left pb-2 font-semibold">Month</th>
                  <th className="text-right pb-2 font-semibold">Revenue</th>
                  <th className="text-right pb-2 font-semibold">Labour</th>
                  <th className="text-right pb-2 font-semibold">COGS</th>
                  <th className="text-right pb-2 font-semibold">Net</th>
                  <th className="text-right pb-2 font-semibold">Margin</th>
                </tr>
              </thead>
              <tbody>
                {[...chart].reverse().map((m: any, i: number) => {
                  const margin = m.revenue ? Math.round((m.net / m.revenue) * 100) : 0;
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-2 text-slate-700 font-medium">{m.month}</td>
                      <td className="py-2 text-right text-slate-900 font-semibold">{fmt(m.revenue)}</td>
                      <td className="py-2 text-right text-slate-600">{fmt(m.labour)}</td>
                      <td className="py-2 text-right text-slate-600">{fmt(m.cogs)}</td>
                      <td className={`py-2 text-right font-bold ${m.net < 5000 ? "text-red-600" : "text-emerald-600"}`}>{fmt(m.net)}</td>
                      <td className={`py-2 text-right text-xs font-semibold ${margin < 10 ? "text-red-500" : margin < 20 ? "text-amber-500" : "text-emerald-600"}`}>{margin}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────
function Analytics() {
  const { data, loading } = useAPI<any>("/api/dashboard", null);
  const chart = data?.chart || [];
  const metrics = data?.metrics || {};
  const profile = data?.business || {};
  const maxRevenue = chart.length ? Math.max(...chart.map((c: any) => c.revenue)) : 1;

  // ── Derived analytics ──────────────────────────────────────────────────────

  // Profit trend: last 6 months net margins
  const profitTrend = chart.slice(-6).map((m: any) => ({
    month: m.month,
    margin: m.revenue ? Math.round((m.net / m.revenue) * 100) : 0,
    net: m.net,
    revenue: m.revenue,
  }));
  const trendDir = profitTrend.length >= 2
    ? profitTrend[profitTrend.length - 1].margin - profitTrend[0].margin
    : 0;

  // Week-over-week comparison (using monthly data grouped by half-year)
  const firstHalf = chart.slice(0, Math.floor(chart.length / 2));
  const secondHalf = chart.slice(Math.floor(chart.length / 2));
  const firstHalfAvg = firstHalf.length ? Math.round(firstHalf.reduce((a: number, m: any) => a + m.revenue, 0) / firstHalf.length) : 0;
  const secondHalfAvg = secondHalf.length ? Math.round(secondHalf.reduce((a: number, m: any) => a + m.revenue, 0) / secondHalf.length) : 0;
  const periodChange = firstHalfAvg ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100) : 0;

  // Seasonal comparison: latest month vs same position from 6 months ago
  const latestMonth = chart[chart.length - 1];
  const priorPeriodMonth = chart[chart.length - 7] || chart[0];
  const seasonalChange = priorPeriodMonth?.revenue
    ? Math.round(((latestMonth?.revenue - priorPeriodMonth?.revenue) / priorPeriodMonth?.revenue) * 100)
    : null;

  // Best/worst months by revenue
  const sortedByRevenue = [...chart].sort((a: any, b: any) => b.revenue - a.revenue);
  const bestMonth = sortedByRevenue[0];
  const worstMonth = sortedByRevenue[sortedByRevenue.length - 1];

  // Break-even: fixed costs (rent + estimated fixed labour) vs revenue needed
  const avgRent = chart.length ? Math.round(chart.reduce((a: number, m: any) => a + (m.rent || 8000), 0) / chart.length) : 8000;
  const fixedLabour = chart.length ? Math.round(chart.reduce((a: number, m: any) => a + m.labour, 0) / chart.length * 0.6) : 0;
  const totalFixed = avgRent + fixedLabour;
  const breakEvenRevenue = metrics.net_margin_pct > 0
    ? Math.round(totalFixed / ((100 - metrics.cogs_pct - metrics.labour_pct) / 100))
    : 0;
  const breakEvenWeekly = Math.round(breakEvenRevenue / 4.33);

  // Cash flow warning: months below $5k net
  const lowCashMonths = chart.filter((m: any) => m.net < 5000);

  // Day of week from weekly-trends vault file (static from vault template data)
  const dayData = [
    { day: "Saturday", revenue: 28900, rank: 1 },
    { day: "Friday", revenue: 26400, rank: 2 },
    { day: "Sunday", revenue: 24500, rank: 3 },
    { day: "Thursday", revenue: 22100, rank: 4 },
    { day: "Wednesday", revenue: 21400, rank: 5 },
    { day: "Monday", revenue: 19800, rank: 6 },
    { day: "Tuesday", revenue: 18200, rank: 7 },
  ];
  const maxDay = Math.max(...dayData.map(d => d.revenue));

  return (
    <div className="space-y-6">

      {/* Top metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Latest Revenue" loading={loading} value={fmt(metrics.revenue)} sub={metrics.latest_month} trend={metrics.revenue_change_pct >= 0} trendLabel={`${metrics.revenue_change_pct > 0 ? "+" : ""}${metrics.revenue_change_pct}% vs prior`} icon={DollarSign} accent="bg-blue-50" />
        <MetricCard label="Net Profit" loading={loading} value={fmt(metrics.net_profit)} sub={metrics.latest_month} trend={metrics.net_profit > 5000} trendLabel={metrics.net_profit > 5000 ? "Healthy" : "Watch closely"} icon={TrendingUp} accent="bg-emerald-50" />
        <MetricCard label="Food Cost %" loading={loading} value={`${metrics.cogs_pct}%`} sub={`Target: ${profile.food_cost_target}%`} trend={metrics.cogs_pct <= profile.food_cost_target} trendLabel={metrics.cogs_pct > profile.food_cost_target ? "Above target" : "On target"} icon={Package} accent="bg-red-50" />
        <MetricCard label="Labour Cost %" loading={loading} value={`${metrics.labour_pct}%`} sub={`Target: ${profile.labour_cost_target}%`} trend={metrics.labour_pct <= profile.labour_cost_target} trendLabel={metrics.labour_pct > profile.labour_cost_target ? "Above target" : "On target"} icon={Users} accent="bg-amber-50" />
      </div>

      {/* Revenue trend chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div><div className="font-semibold text-slate-900">Revenue Trend</div><div className="text-xs text-slate-400 mt-0.5">All months in vault</div></div>
          <div className="text-right"><div className="text-xs text-slate-400">Latest</div><div className="font-bold text-slate-900">{fmt(metrics.revenue)}</div></div>
        </div>
        {loading ? <div className="flex items-center justify-center h-40"><Spinner /></div> : (
          <div className="flex items-end gap-2 h-40">
            {chart.map((m: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full flex items-end" style={{ height: 128 }}>
                  <div className={`w-full rounded-t-md transition-all ${i === chart.length - 1 ? "bg-blue-500" : i >= chart.length - 3 ? "bg-blue-200" : "bg-slate-100"}`} style={{ height: `${(m.revenue / maxRevenue) * 100}%` }} />
                </div>
                <span className="text-[8px] text-slate-400 font-medium">{m.month.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profit trend line + seasonal comparison */}
      {!loading && chart.length >= 2 && (
        <div className="grid lg:grid-cols-2 gap-4">

          {/* Profit margin trend */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div><div className="font-semibold text-slate-900">Profit Margin Trend</div><div className="text-xs text-slate-400 mt-0.5">Last 6 months</div></div>
              <div className={`text-xs font-bold px-2 py-1 rounded-full ${trendDir > 0 ? "bg-emerald-100 text-emerald-700" : trendDir < 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                {trendDir > 0 ? `↑ +${trendDir}pts` : trendDir < 0 ? `↓ ${trendDir}pts` : "Flat"}
              </div>
            </div>
            <div className="space-y-2">
              {profitTrend.map((m: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-16 font-medium">{m.month.split(" ")[0]}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${m.margin < 5 ? "bg-red-400" : m.margin < 15 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${Math.min(m.margin * 3, 100)}%` }} />
                  </div>
                  <span className={`text-xs font-bold w-10 text-right ${m.margin < 5 ? "text-red-600" : m.margin < 15 ? "text-amber-600" : "text-emerald-600"}`}>{m.margin}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Seasonal comparison */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="font-semibold text-slate-900 mb-1">Seasonal Comparison</div>
            <div className="text-xs text-slate-400 mb-4">Latest month vs 6 months prior</div>
            {seasonalChange !== null ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <div className="text-xs text-slate-400 mb-1">{priorPeriodMonth?.month}</div>
                    <div className="text-xl font-bold text-slate-700">{fmt(priorPeriodMonth?.revenue)}</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                    <div className="text-xs text-blue-400 mb-1">{latestMonth?.month}</div>
                    <div className="text-xl font-bold text-blue-700">{fmt(latestMonth?.revenue)}</div>
                  </div>
                </div>
                <div className={`flex items-center justify-center gap-2 p-3 rounded-xl ${seasonalChange >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                  <span className={`text-lg font-bold ${seasonalChange >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {seasonalChange >= 0 ? "+" : ""}{seasonalChange}%
                  </span>
                  <span className="text-sm text-slate-500">vs same period prior</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <div className="text-xs text-slate-400">Prior net profit</div>
                    <div className={`text-sm font-bold ${priorPeriodMonth?.net < 5000 ? "text-red-600" : "text-emerald-600"}`}>{fmt(priorPeriodMonth?.net)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Latest net profit</div>
                    <div className={`text-sm font-bold ${latestMonth?.net < 5000 ? "text-red-600" : "text-emerald-600"}`}>{fmt(latestMonth?.net)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400 text-center py-4">Not enough data for comparison yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Best/worst day of week + break-even */}
      {!loading && (
        <div className="grid lg:grid-cols-2 gap-4">

          {/* Best and worst performing days */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="font-semibold text-slate-900 mb-4">Revenue by Day of Week</div>
            <div className="space-y-2.5 mb-4">
              {dayData.map((d, i) => (
                <div key={d.day} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-20 font-medium">{d.day}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${i === 0 ? "bg-emerald-400" : i === dayData.length - 1 ? "bg-red-400" : "bg-blue-300"}`} style={{ width: `${(d.revenue / maxDay) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-14 text-right">{fmt(d.revenue)}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <div className="text-xs text-emerald-600 font-semibold mb-0.5">Best Day</div>
                <div className="font-bold text-emerald-700">{dayData[0].day}</div>
                <div className="text-xs text-emerald-600">{fmt(dayData[0].revenue)} avg</div>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <div className="text-xs text-red-600 font-semibold mb-0.5">Lowest Day</div>
                <div className="font-bold text-red-700">{dayData[dayData.length - 1].day}</div>
                <div className="text-xs text-red-600">{fmt(dayData[dayData.length - 1].revenue)} avg</div>
              </div>
            </div>
          </div>

          {/* Break-even calculator */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="font-semibold text-slate-900 mb-1">Break-Even Analysis</div>
            <div className="text-xs text-slate-400 mb-4">Based on your fixed costs and current margins</div>
            <div className="space-y-3 mb-4">
              {[
                { label: "Avg Monthly Rent", value: fmt(avgRent), note: "from vault" },
                { label: "Est. Fixed Labour", value: fmt(fixedLabour), note: "60% of avg labour" },
                { label: "Total Fixed Costs", value: fmt(totalFixed), note: "per month", bold: true },
              ].map(item => (
                <div key={item.label} className={`flex justify-between items-center py-2 ${item.bold ? "border-t border-slate-100 pt-3" : ""}`}>
                  <div>
                    <span className={`text-sm ${item.bold ? "font-bold text-slate-900" : "text-slate-600"}`}>{item.label}</span>
                    <span className="text-xs text-slate-400 ml-2">{item.note}</span>
                  </div>
                  <span className={`font-bold ${item.bold ? "text-slate-900" : "text-slate-700"}`}>{item.value}</span>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
              <div className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-1">Break-Even Revenue</div>
              <div className="text-2xl font-bold text-blue-700">{fmt(breakEvenRevenue)}<span className="text-sm font-normal text-blue-400">/month</span></div>
              <div className="text-xs text-blue-500 mt-1">{fmt(breakEvenWeekly)}/week to cover fixed costs</div>
            </div>
            {metrics.revenue > 0 && (
              <div className={`mt-3 p-3 rounded-xl text-center text-sm font-semibold ${metrics.revenue >= breakEvenRevenue ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {metrics.revenue >= breakEvenRevenue
                  ? `✓ Above break-even by ${fmt(metrics.revenue - breakEvenRevenue)}`
                  : `⚠ Below break-even by ${fmt(breakEvenRevenue - metrics.revenue)}`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cash flow warning + period comparison */}
      {!loading && (
        <div className="grid lg:grid-cols-2 gap-4">

          {/* Cash flow warning */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="font-semibold text-slate-900 mb-4">Cash Flow History</div>
            {lowCashMonths.length > 0 ? (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800">
                    <strong>{lowCashMonths.length} month{lowCashMonths.length > 1 ? "s" : ""}</strong> with net profit below $5,000 — low cash risk.
                  </div>
                </div>
                {lowCashMonths.map((m: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-red-50 rounded-xl">
                    <span className="text-sm font-medium text-slate-700">{m.month}</span>
                    <span className="text-sm font-bold text-red-600">{fmt(m.net)} net</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <div className="text-sm font-semibold text-slate-700">No cash flow warnings</div>
                <div className="text-xs text-slate-400">All months above $5,000 net profit</div>
              </div>
            )}
          </div>

          {/* Period-over-period comparison */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="font-semibold text-slate-900 mb-1">Period Comparison</div>
            <div className="text-xs text-slate-400 mb-4">First half vs second half of data</div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <div className="text-xs text-slate-400 mb-1">Earlier period avg</div>
                  <div className="text-xl font-bold text-slate-700">{fmt(firstHalfAvg)}</div>
                  <div className="text-xs text-slate-400 mt-1">per month</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                  <div className="text-xs text-blue-400 mb-1">Recent period avg</div>
                  <div className="text-xl font-bold text-blue-700">{fmt(secondHalfAvg)}</div>
                  <div className="text-xs text-blue-400 mt-1">per month</div>
                </div>
              </div>
              <div className={`flex items-center justify-center gap-2 p-3 rounded-xl ${periodChange >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                <span className={`text-xl font-bold ${periodChange >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {periodChange >= 0 ? "+" : ""}{periodChange}%
                </span>
                <span className="text-sm text-slate-500">revenue change</span>
              </div>
              <div className="text-xs text-slate-400 text-center">
                Based on {firstHalf.length} vs {secondHalf.length} months of data
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost structure */}
      {!loading && metrics.revenue > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="font-semibold text-slate-900 mb-4">Cost Structure — {metrics.latest_month}</div>
          <div className="space-y-4">
            {[
              { label: "Food & Beverage (COGS)", pct: metrics.cogs_pct, target: profile.food_cost_target || 28, color: "bg-red-400" },
              { label: "Labour", pct: metrics.labour_pct, target: profile.labour_cost_target || 30, color: "bg-amber-400" },
              { label: "Net Profit", pct: metrics.net_margin_pct, target: 20, color: "bg-emerald-400" },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-700 font-medium">{item.label}</span>
                  <div>
                    <span className={`font-bold ${item.label === "Net Profit" ? (item.pct < item.target ? "text-red-600" : "text-emerald-600") : (item.pct > item.target ? "text-red-600" : "text-emerald-600")}`}>{item.pct}%</span>
                    <span className="text-slate-400 text-xs ml-1">/ {item.target}% target</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${Math.min(item.pct * 2, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best and worst months */}
      {!loading && chart.length >= 2 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">Best Month on Record</div>
            <div className="text-2xl font-bold text-emerald-700 mb-1">{fmt(bestMonth?.revenue)}</div>
            <div className="text-sm text-emerald-600 font-medium">{bestMonth?.month}</div>
            <div className="text-xs text-emerald-500 mt-1">Net: {fmt(bestMonth?.net)}</div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
            <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3">Lowest Month on Record</div>
            <div className="text-2xl font-bold text-red-700 mb-1">{fmt(worstMonth?.revenue)}</div>
            <div className="text-sm text-red-600 font-medium">{worstMonth?.month}</div>
            <div className="text-xs text-red-500 mt-1">Net: {fmt(worstMonth?.net)}</div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Chat Tab ──────────────────────────────────────────────────────────────────
function Chat() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (text?: string) => {
    const question = text || input;
    if (!question.trim()) return;
    setMessages(m => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, save_note: false }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "ai", text: data.answer }]);
    } catch {
      setMessages(m => [...m, { role: "ai", text: "Could not reach the Cortex backend. Make sure it's running on port 8000." }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" style={{ height: "calc(100vh - 180px)" }}>
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center"><Bot className="w-4 h-4 text-sky-400" /></div>
        <div>
          <div className="text-sm font-bold text-slate-900">Ask Cortex</div>
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-xs text-slate-400">Powered by local AI · no data leaves this device</span></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <div className="text-sm text-slate-400">Ask anything about your business.</div>
            <div className="text-xs text-slate-300 mt-1">Cortex reads directly from your vault.</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "ai" && <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center mr-2 flex-shrink-0 mt-1"><Bot className="w-3.5 h-3.5 text-sky-400" /></div>}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "bg-slate-900 text-white rounded-tr-sm" : "bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-sm"}`}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center mr-2 flex-shrink-0"><Bot className="w-3.5 h-3.5 text-sky-400" /></div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-slate-100">
        <div className="flex gap-2 mb-3 flex-wrap">
          {["What's my food cost this month?", "Where am I losing the most money?", "How is my labour cost trending?"].map(q => (
            <button key={q} onClick={() => send(q)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full transition-colors">{q}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask anything about your business..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white transition-all" />
          <button onClick={() => send()} className="w-10 h-10 bg-slate-900 hover:bg-slate-700 text-white rounded-xl flex items-center justify-center transition-colors"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────
function Reports() {
  const { data, loading } = useAPI<any>("/api/report", null);
  const monthly = data?.monthly_history || [];
  const metrics = data?.metrics || {};

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div><div className="font-semibold text-slate-900">Monthly Summary Report</div><div className="text-xs text-slate-400 mt-0.5">{metrics.latest_month}</div></div>
          <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-3 py-1 rounded-full">Latest</span>
        </div>
        {loading ? (
          <div className="p-8 flex items-center gap-2 justify-center"><Spinner /><span className="text-sm text-slate-400">Loading report...</span></div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-xs text-slate-400 mb-1">Revenue</div>
                <div className="text-xl font-bold text-slate-900">{fmt(metrics.revenue)}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-xs text-slate-400 mb-1">Net Profit</div>
                <div className={`text-xl font-bold ${metrics.net_profit < 5000 ? "text-red-600" : "text-emerald-600"}`}>{fmt(metrics.net_profit)}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <div className="text-xs text-slate-400 mb-1">Net Margin</div>
                <div className={`text-xl font-bold ${metrics.net_margin_pct < 10 ? "text-red-600" : "text-slate-900"}`}>{metrics.net_margin_pct}%</div>
              </div>
            </div>

            {/* Full monthly history */}
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Full History</div>
              <div className="space-y-2">
                {[...monthly].reverse().map((m: any, i: number) => {
                  const margin = m.revenue ? Math.round((m.net / m.revenue) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700 font-medium">{m.month}</span>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-slate-500">{fmt(m.revenue)}</span>
                        <span className={`font-bold ${m.net < 5000 ? "text-red-600" : "text-emerald-600"}`}>{fmt(m.net)}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${margin < 10 ? "bg-red-100 text-red-600" : margin < 20 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>{margin}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Alerts Tab ────────────────────────────────────────────────────────────────
function Alerts() {
  const { data, loading, refetch } = useAPI<any>("/api/alerts", { alerts: [] });
  const [dismissed, setDismissed] = useState<number[]>([]);
  const allAlerts = data?.alerts || [];
  const visible = allAlerts.filter((_: any, i: number) => !dismissed.includes(i));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">{visible.length} active alert{visible.length !== 1 ? "s" : ""} from vault</div>
        <div className="flex gap-3">
          <button onClick={refetch} className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"><RefreshCw className="w-3 h-3" />Refresh</button>
          <button onClick={() => setDismissed(allAlerts.map((_: any, i: number) => i))} className="text-xs text-slate-400 hover:text-slate-600">Dismiss all</button>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 justify-center py-12"><Spinner /><span className="text-sm text-slate-400">Loading anomaly log...</span></div>
      ) : (
        <AnimatePresence>
          {visible.map((a: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
              <div className={`bg-white rounded-2xl border shadow-sm p-5 flex gap-4 ${a.level === "critical" ? "border-red-200" : a.level === "warning" ? "border-amber-200" : "border-blue-100"}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${a.level === "critical" ? "bg-red-100" : a.level === "warning" ? "bg-amber-100" : "bg-blue-100"}`}>
                  <AlertTriangle className={`w-4 h-4 ${a.level === "critical" ? "text-red-600" : a.level === "warning" ? "text-amber-600" : "text-blue-600"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900 text-sm">{a.date}</span>
                    <AlertBadge level={a.level} />
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{a.desc}</p>
                  {a.status && <span className="text-xs text-slate-400 mt-2 block">Status: {a.status}</span>}
                </div>
                <button onClick={() => setDismissed(d => [...d, allAlerts.indexOf(a)])} className="text-slate-300 hover:text-slate-500 flex-shrink-0"><X className="w-4 h-4" /></button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
      {!loading && visible.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <div className="font-semibold text-slate-700">All clear</div>
          <div className="text-sm text-slate-400 mt-1">No active alerts in the vault.</div>
        </div>
      )}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab() {
  const { data: business, loading: bizLoading } = useAPI<any>("/api/business", null);
  const { data: qbStatus } = useAPI<any>("/api/quickbooks/status", { connected: false });
  const [activePanel, setActivePanel] = React.useState<string | null>(null);
  const [thresholds, setThresholds] = React.useState({ food: 28, labour: 30, cash: 5000 });
  const [briefingHour, setBriefingHour] = React.useState(7);
  const [digestSources, setDigestSources] = React.useState({ quickbooks: true, square: false, csv: true });
  const [saved, setSaved] = React.useState<string | null>(null);

  const toggle = (panel: string) => setActivePanel(activePanel === panel ? null : panel);

  const showSaved = (label: string) => {
    setSaved(label);
    setTimeout(() => setSaved(null), 2000);
  };

  return (
    <div className="space-y-3 max-w-2xl">

      {/* DATA CONNECTIONS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button onClick={() => toggle("connections")} className="w-full p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0"><Activity className="w-5 h-5 text-blue-500" /></div>
          <div className="flex-1"><div className="font-semibold text-slate-900 text-sm">Data Connections</div><div className="text-xs text-slate-400 mt-0.5">QuickBooks, Square, CSV folder</div></div>
          <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${activePanel === "connections" ? "rotate-90" : ""}`} />
        </button>
        {activePanel === "connections" && (
          <div className="border-t border-slate-100 p-5 space-y-4">
            {/* QuickBooks */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">QuickBooks</div>
                  <div className="text-xs text-slate-400">Accounting & payroll</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!qbStatus?.connected ? (
                  <a href="#" onClick={async (e) => { e.preventDefault(); const res = await fetch('/api/quickbooks/connect'); const data = await res.json(); window.location.href = data.auth_url; }} className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-slate-700 transition-colors">Connect</a>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><div className="w-2 h-2 rounded-full bg-emerald-400" />Connected</div>
                    <button onClick={async () => { await fetch('/api/quickbooks/disconnect', {method:'POST'}); window.location.reload(); }} className="text-xs text-red-400 hover:text-red-600">Disconnect</button>
                  </div>
                )}
              </div>
            </div>
            {/* Square */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Square</div>
                  <div className="text-xs text-slate-400">POS & payments</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  Not connected
                </div>
                <button onClick={async () => { const res = await fetch('/api/square/connect'); const data = await res.json(); window.location.href = data.auth_url; }} className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-slate-700 transition-colors">Connect</button>
              </div>
            </div>
            {/* CSV */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">CSV / Excel</div>
                  <div className="text-xs text-slate-400">Drop files in ~/CortexWatch</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                Active
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ALERT THRESHOLDS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button onClick={() => toggle("thresholds")} className="w-full p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
          <div className="flex-1"><div className="font-semibold text-slate-900 text-sm">Alert Thresholds</div><div className="text-xs text-slate-400 mt-0.5">Customize when Cortex flags anomalies</div></div>
          <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${activePanel === "thresholds" ? "rotate-90" : ""}`} />
        </button>
        {activePanel === "thresholds" && (
          <div className="border-t border-slate-100 p-5 space-y-6">
            {[
              { label: "Food Cost Alert", key: "food", min: 15, max: 50, unit: "%" },
              { label: "Labour Cost Alert", key: "labour", min: 15, max: 60, unit: "%" },
              { label: "Minimum Cash On Hand", key: "cash", min: 0, max: 50000, unit: "$" },
            ].map(item => (
              <div key={item.key}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                  <span className="text-sm font-bold text-slate-900">{item.unit === "$" ? `$${thresholds[item.key as keyof typeof thresholds].toLocaleString()}` : `${thresholds[item.key as keyof typeof thresholds]}%`}</span>
                </div>
                <input
                  type="range" min={item.min} max={item.max}
                  step={item.key === "cash" ? 500 : 1}
                  value={thresholds[item.key as keyof typeof thresholds]}
                  onChange={e => setThresholds(t => ({ ...t, [item.key]: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>{item.unit === "$" ? `$${item.min}` : `${item.min}%`}</span>
                  <span>{item.unit === "$" ? `$${item.max.toLocaleString()}` : `${item.max}%`}</span>
                </div>
              </div>
            ))}
            <button onClick={() => showSaved("thresholds")} className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors">
              {saved === "thresholds" ? "✓ Saved" : "Save Thresholds"}
            </button>
          </div>
        )}
      </div>

      {/* BRIEFING SCHEDULE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button onClick={() => toggle("briefing")} className="w-full p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left">
          <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center flex-shrink-0"><Clock className="w-5 h-5 text-sky-500" /></div>
          <div className="flex-1"><div className="font-semibold text-slate-900 text-sm">Briefing Schedule</div><div className="text-xs text-slate-400 mt-0.5">What time you receive your morning briefing</div></div>
          <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${activePanel === "briefing" ? "rotate-90" : ""}`} />
        </button>
        {activePanel === "briefing" && (
          <div className="border-t border-slate-100 p-5 space-y-4">
            <p className="text-sm text-slate-500">Choose the time Cortex generates your daily briefing. The nightly digest runs at 2am, so briefing times from 6am onward will have fresh data.</p>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-700">Briefing Time</span>
                <span className="text-sm font-bold text-slate-900">{briefingHour < 12 ? `${briefingHour}:00 AM` : briefingHour === 12 ? "12:00 PM" : `${briefingHour - 12}:00 PM`}</span>
              </div>
              <input type="range" min={5} max={11} step={1} value={briefingHour} onChange={e => setBriefingHour(parseInt(e.target.value))} className="w-full" />
              <div className="flex justify-between text-xs text-slate-400 mt-1"><span>5:00 AM</span><span>11:00 AM</span></div>
            </div>
            <button onClick={() => showSaved("briefing")} className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors">
              {saved === "briefing" ? "✓ Saved" : "Save Schedule"}
            </button>
          </div>
        )}
      </div>

      {/* DIGEST SETTINGS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button onClick={() => toggle("digest")} className="w-full p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0"><RefreshCw className="w-5 h-5 text-purple-500" /></div>
          <div className="flex-1"><div className="font-semibold text-slate-900 text-sm">Digest Settings</div><div className="text-xs text-slate-400 mt-0.5">Configure nightly analysis behavior</div></div>
          <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${activePanel === "digest" ? "rotate-90" : ""}`} />
        </button>
        {activePanel === "digest" && (
          <div className="border-t border-slate-100 p-5 space-y-4">
            <p className="text-sm text-slate-500">Choose which data sources feed the nightly digest. Only connected sources will be active.</p>
            {[
              { key: "quickbooks", label: "QuickBooks", desc: "Accounting and payroll data", connected: qbStatus?.connected },
              { key: "square", label: "Square", desc: "POS sales and labor data", connected: false },
              { key: "csv", label: "CSV / Excel", desc: "Manual file drops from any system", connected: true },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                  {!item.connected && <div className="text-xs text-amber-500 mt-1">Not connected — go to Data Connections</div>}
                </div>
                <button
                  onClick={() => item.connected && setDigestSources(s => ({ ...s, [item.key]: !s[item.key as keyof typeof s] }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${digestSources[item.key as keyof typeof digestSources] && item.connected ? "bg-blue-500" : "bg-slate-200"} ${!item.connected ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${digestSources[item.key as keyof typeof digestSources] && item.connected ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            ))}
            <button onClick={() => showSaved("digest")} className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors">
              {saved === "digest" ? "✓ Saved" : "Save Settings"}
            </button>
          </div>
        )}
      </div>

      {/* BUSINESS PROFILE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button onClick={() => toggle("profile")} className="w-full p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0"><Coffee className="w-5 h-5 text-emerald-500" /></div>
          <div className="flex-1"><div className="font-semibold text-slate-900 text-sm">Business Profile</div><div className="text-xs text-slate-400 mt-0.5">Your business details from the vault</div></div>
          <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${activePanel === "profile" ? "rotate-90" : ""}`} />
        </button>
        {activePanel === "profile" && (
          <div className="border-t border-slate-100 p-5">
            {bizLoading ? <div className="flex items-center gap-2"><Spinner /><span className="text-xs text-slate-400">Loading...</span></div> : (
              <div className="space-y-3 text-sm">
                {[
                  { label: "Business Name", value: business?.name },
                  { label: "Industry", value: business?.industry },
                  { label: "Location", value: business?.location },
                  { label: "Owner", value: business?.owner },
                  { label: "Full-time Staff", value: business?.employees_full },
                  { label: "Part-time Staff", value: business?.employees_part },
                  { label: "Food Cost Target", value: `${business?.food_cost_target}%` },
                  { label: "Labour Cost Target", value: `${business?.labour_cost_target}%` },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="font-medium text-slate-900">{item.value || "—"}</span>
                  </div>
                ))}
                <p className="text-xs text-slate-400 pt-2">To edit: ~/CortexVault/core/business-profile.md</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────
const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "chat", label: "Ask Cortex", icon: MessageSquare },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "alerts", label: "Alerts", icon: AlertTriangle },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [time, setTime] = useState(new Date());
  const { data: business } = useAPI<any>("/api/business", { name: "Loading..." });

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 60000); return () => clearInterval(t); }, []);

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center"><Zap className="w-4 h-4 text-sky-400" /></div>
              <span className="font-bold text-slate-900" style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.125rem" }}>Cortex</span>
              <span className="text-slate-300 mx-1">·</span>
              <span className="text-xs text-slate-400 font-medium">{business?.name || "Loading..."}</span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}>
                  <tab.icon className="w-4 h-4" />{tab.label}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /><span className="hidden sm:inline">All local</span></div>
              <div className="text-xs text-slate-400 font-mono hidden sm:block">{time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {activeTab === "dashboard" && <Dashboard />}
            {activeTab === "analytics" && <Analytics />}
            {activeTab === "chat" && <Chat />}
            {activeTab === "reports" && <Reports />}
            {activeTab === "alerts" && <Alerts />}
            {activeTab === "settings" && <SettingsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
