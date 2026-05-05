import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, MessageSquare, FileText, AlertTriangle,
  TrendingUp, TrendingDown, Users, DollarSign, BarChart3,
  ShieldCheck, Settings, ChevronRight, Activity,
  Package, Clock, Zap, CheckCircle2, ArrowUpRight,
  ArrowDownRight, X, Send, Bot, RefreshCw,
  Calendar, Coffee
} from "lucide-react";

type Tab = "dashboard" | "analytics" | "chat" | "reports" | "alerts" | "settings";

const weekRevenue = [18200, 21400, 19800, 24500, 22100, 28900, 26400];
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthRevenue = [62000, 71000, 68000, 74000, 80000, 77000, 85000, 82000, 91000, 87000, 94000, 89000];
const monthLabels = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];

const laborBreakdown = [
  { role: "Kitchen Staff", hours: 184, cost: 3680, pct: 42 },
  { role: "Front of House", hours: 140, cost: 2800, pct: 32 },
  { role: "Management", hours: 80, cost: 2400, pct: 16 },
  { role: "Delivery / Other", hours: 44, cost: 880, pct: 10 },
];

const alerts = [
  { id: 1, level: "critical", title: "Labor Cost Spike", desc: "Tuesday closing shift overstaffed by 23%. Recommend cutting 2 hours — saves $180 this week.", time: "2h ago" },
  { id: 2, level: "critical", title: "Supplier Price Increase", desc: "Acosta Foods raised bulk flour prices 14%. Pastry margin now below 30% target. Raise pastry prices $0.50.", time: "5h ago" },
  { id: 3, level: "warning", title: "Unusual Refund Volume", desc: "4 refunds on Register 2 in the last hour — 300% above normal. Check in with staff on shift.", time: "1h ago" },
  { id: 4, level: "warning", title: "Inventory Low", desc: "Signature blend coffee beans at 12% stock level. Reorder threshold is 20%. Place order now.", time: "3h ago" },
  { id: 5, level: "info", title: "Strong Weekend Performance", desc: "Saturday revenue $28,900 — 18% above 4-week average. Weekend promotion is working, keep running.", time: "Yesterday" },
];

const chatHistory = [
  { role: "user", text: "What was my best day last week?" },
  { role: "ai", text: "Saturday was your strongest day — $28,900 in revenue, which is 18% above your 4-week Saturday average of $24,500. The weekend promotion drove a 14% increase in foot traffic and average ticket size grew by $3.40 to $22.80." },
  { role: "user", text: "Should I be worried about food costs?" },
  { role: "ai", text: "Yes — worth watching closely. Acosta Foods raised flour prices 14% last month, and your pastry margin has slipped to 27.3%, below your 30% target. I'd recommend raising pastry prices by $0.50 across the board, which would restore margin to ~31% without meaningfully impacting volume based on your price elasticity history." },
];

const weeklyReport = {
  period: "May 4 – May 10, 2026",
  headline: "Strong revenue week, margin under pressure",
  summary: "Weekly revenue hit $161,500 — up 11.4% vs the prior week. However, net margin compressed from 20.1% to 18.4% due to labor overage on Tuesday and the Acosta Foods price increase hitting pastry costs.",
  wins: ["Weekend promotion drove 14% more foot traffic on Saturday", "Average ticket size grew $3.40 — highest in 6 weeks", "Register 1 throughput up 8% after the new POS layout"],
  concerns: ["Overtime pay hit $420 — Wednesday closing had 3 staff for low volume hours", "Food cost % at 32.5%, above 28% target — flour and dairy both up", "Tuesday evening revenue consistently 40% below Saturday — consider reduced hours"],
  actions: ["Cut Wednesday closing shift by 1 employee (saves ~$140/week)", "Raise pastry prices by $0.50 across all items", "Reorder Acosta Foods flour before Friday to lock in current price"],
};

function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
}
function pct(a: number, b: number) {
  const d = ((a - b) / b) * 100;
  return { val: Math.abs(d).toFixed(1), up: d >= 0 };
}

function MetricCard({ label, value, sub, trend, trendLabel, icon: Icon, accent }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent || "bg-slate-50"}`}>
          <Icon className="w-4 h-4 text-slate-600" />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
      {sub && <div className="text-xs text-slate-500 mb-2">{sub}</div>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${trend ? "text-emerald-600" : "text-red-500"}`}>
          {trend ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trendLabel}
        </div>
      )}
    </div>
  );
}

function MiniBarChart({ data, labels, highlight }: { data: number[]; labels: string[]; highlight?: number }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex items-end" style={{ height: 64 }}>
            <div className={`w-full rounded-t-md transition-all duration-700 ${i === highlight ? "bg-blue-500" : "bg-slate-100"}`} style={{ height: `${(v / max) * 100}%` }} />
          </div>
          <span className="text-[9px] text-slate-400 font-medium">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function AlertBadge({ level }: { level: string }) {
  if (level === "critical") return <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Critical</span>;
  if (level === "warning") return <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Warning</span>;
  return <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Info</span>;
}

function Dashboard() {
  const thisWeek = weekRevenue.reduce((a, b) => a + b, 0);
  const lastWeek = 144900;
  const revTrend = pct(thisWeek, lastWeek);
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <Coffee className="w-5 h-5 text-sky-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Morning Briefing</span>
            <span className="text-xs text-slate-500">May 5, 2026 · 7:02 AM</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">Strong week — revenue up 11.4%. <span className="text-white font-semibold">Watch your margins:</span> labor overtime hit $420 and Acosta Foods raised flour prices 14%. Two actions will recover $560/week if taken today.</p>
        </div>
        <button className="text-slate-500 hover:text-slate-300 flex-shrink-0"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Weekly Revenue" value={fmt(thisWeek)} sub="May 4–10" trend={revTrend.up} trendLabel={`${revTrend.val}% vs last week`} icon={DollarSign} accent="bg-blue-50" />
        <MetricCard label="Net Margin" value="18.4%" sub="Target: 22%" trend={false} trendLabel="−2.1% vs last week" icon={TrendingUp} accent="bg-red-50" />
        <MetricCard label="Labor Cost %" value="24.5%" sub="$7,760 total" trend={false} trendLabel="Above 22% target" icon={Users} accent="bg-amber-50" />
        <MetricCard label="Transactions" value="847" sub="Avg ticket $22.80" trend={true} trendLabel="+6% vs avg" icon={Activity} accent="bg-emerald-50" />
      </div>
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div><div className="font-semibold text-slate-900">Revenue This Week</div><div className="text-xs text-slate-400 mt-0.5">Daily breakdown · May 4–10</div></div>
            <div className="text-right"><div className="text-lg font-bold text-slate-900">{fmt(thisWeek)}</div><div className="text-xs text-emerald-600 font-semibold flex items-center justify-end gap-0.5"><ArrowUpRight className="w-3 h-3" />+{revTrend.val}%</div></div>
          </div>
          <MiniBarChart data={weekRevenue} labels={weekDays} highlight={5} />
        </div>
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold text-slate-900">Active Alerts</div>
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">2 Critical</span>
          </div>
          <div className="space-y-3">
            {alerts.slice(0, 3).map(a => (
              <div key={a.id} className={`rounded-xl p-3 flex items-start gap-3 ${a.level === "critical" ? "bg-red-50 border border-red-100" : "bg-amber-50 border border-amber-100"}`}>
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${a.level === "critical" ? "text-red-500" : "text-amber-500"}`} />
                <div className="min-w-0"><div className="text-xs font-bold text-slate-800">{a.title}</div><div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.desc}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4"><div className="font-semibold text-slate-900">Labor Cost Breakdown</div><span className="text-xs text-slate-400">This week · $9,760</span></div>
          <div className="space-y-3">
            {laborBreakdown.map(item => (
              <div key={item.role}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-slate-700 font-medium">{item.role}</span>
                  <div className="text-right"><span className="text-sm font-bold text-slate-900">${item.cost.toLocaleString()}</span><span className="text-xs text-slate-400 ml-2">{item.hours}h</span></div>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.pct}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs"><span className="text-slate-500">Labor as % of revenue</span><span className="font-bold text-amber-600">24.5% <span className="text-slate-400 font-normal">(target: 22%)</span></span></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="font-semibold text-slate-900 mb-1">{weeklyReport.headline}</div>
          <div className="text-xs text-slate-400 mb-4">{weeklyReport.period}</div>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">{weeklyReport.summary}</p>
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Actions this week</div>
            {weeklyReport.actions.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">{i + 1}</div>{a}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Analytics() {
  const max = Math.max(...monthRevenue);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Monthly Revenue" value="$89,400" sub="April 2026" trend={true} trendLabel="+7.2% vs March" icon={DollarSign} accent="bg-blue-50" />
        <MetricCard label="Avg Daily Revenue" value="$2,980" sub="30-day avg" trend={true} trendLabel="+4.1% vs prior month" icon={BarChart3} accent="bg-emerald-50" />
        <MetricCard label="Food Cost %" value="32.5%" sub="Target: 28%" trend={false} trendLabel="Above target — rising" icon={Package} accent="bg-red-50" />
        <MetricCard label="Avg Ticket Size" value="$22.80" sub="Per transaction" trend={true} trendLabel="+$3.40 vs last month" icon={TrendingUp} accent="bg-purple-50" />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div><div className="font-semibold text-slate-900">Revenue Trend — 12 Months</div><div className="text-xs text-slate-400 mt-0.5">Jun 2025 – May 2026</div></div>
          <div className="text-right"><div className="text-xs text-slate-400">YTD Total</div><div className="font-bold text-slate-900">$976,000</div></div>
        </div>
        <div className="flex items-end gap-2 h-40">
          {monthRevenue.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex items-end" style={{ height: 128 }}>
                <div className={`w-full rounded-t-md transition-all ${i === 11 ? "bg-blue-500" : i >= 9 ? "bg-blue-200" : "bg-slate-100"}`} style={{ height: `${(v / max) * 100}%` }} />
              </div>
              <span className="text-[9px] text-slate-400 font-medium">{monthLabels[i]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="font-semibold text-slate-900 mb-4">Cost Structure</div>
          <div className="space-y-4">
            {[
              { label: "Food & Beverage", pct: 32.5, target: 28, color: "bg-red-400" },
              { label: "Labor", pct: 24.5, target: 22, color: "bg-amber-400" },
              { label: "Rent & Utilities", pct: 12.0, target: 12, color: "bg-blue-400" },
              { label: "Supplies & Other", pct: 5.2, target: 5, color: "bg-slate-300" },
              { label: "Net Profit", pct: 25.8, target: 33, color: "bg-emerald-400" },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-700 font-medium">{item.label}</span>
                  <div><span className={`font-bold ${item.pct > item.target ? "text-red-600" : "text-emerald-600"}`}>{item.pct}%</span><span className="text-slate-400 text-xs ml-1">/ {item.target}% target</span></div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${item.color} rounded-full`} style={{ width: `${Math.min(item.pct * 2, 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="font-semibold text-slate-900 mb-4">Revenue by Day of Week</div>
          <div className="space-y-2.5">
            {[
              { day: "Saturday", rev: 28900, pct: 100 },
              { day: "Friday", rev: 26400, pct: 91 },
              { day: "Sunday", rev: 24500, pct: 85 },
              { day: "Thursday", rev: 22100, pct: 76 },
              { day: "Wednesday", rev: 21400, pct: 74 },
              { day: "Monday", rev: 19800, pct: 68 },
              { day: "Tuesday", rev: 18200, pct: 63 },
            ].map(item => (
              <div key={item.day} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-20 font-medium">{item.day}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.pct}%` }} /></div>
                <span className="text-xs font-bold text-slate-700 w-14 text-right">{fmt(item.rev)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">Tuesday revenue is <span className="font-semibold text-slate-700">37% below Saturday</span> — consider reduced Tuesday hours.</div>
        </div>
      </div>
    </div>
  );
}

function Chat() {
  const [messages, setMessages] = useState(chatHistory);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const send = () => {
    if (!input.trim()) return;
    setMessages(m => [...m, { role: "user", text: input }]);
    setInput("");
    setLoading(true);
    setTimeout(() => { setMessages(m => [...m, { role: "ai", text: "Analyzing your vault data now. Based on your recent transactions and cost history, here's what I found based on data stored locally on this device." }]); setLoading(false); }, 1200);
  };
  return (
    <div className="flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" style={{ height: "calc(100vh - 180px)" }}>
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center"><Bot className="w-4 h-4 text-sky-400" /></div>
        <div><div className="text-sm font-bold text-slate-900">Ask Cortex</div><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-xs text-slate-400">Running locally · no data leaves this device</span></div></div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center text-xs text-slate-400 py-2">Today · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}</div>
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
          {["What's my food cost this week?", "Which day should I close early?", "How's my margin trending?"].map(q => (
            <button key={q} onClick={() => setInput(q)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full transition-colors">{q}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask anything about your business..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white transition-all" />
          <button onClick={send} className="w-10 h-10 bg-slate-900 hover:bg-slate-700 text-white rounded-xl flex items-center justify-center transition-colors"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

function Reports() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div><div className="font-semibold text-slate-900">Weekly Briefing</div><div className="text-xs text-slate-400 mt-0.5">{weeklyReport.period}</div></div>
          <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-3 py-1 rounded-full">Latest</span>
        </div>
        <div className="p-5 space-y-6">
          <div><div className="text-lg font-bold text-slate-900 mb-2">{weeklyReport.headline}</div><p className="text-sm text-slate-600 leading-relaxed">{weeklyReport.summary}</p></div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-emerald-600" /><span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Wins</span></div>
              <ul className="space-y-2">{weeklyReport.wins.map((w, i) => <li key={i} className="text-xs text-emerald-800 flex gap-2 leading-relaxed"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />{w}</li>)}</ul>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3"><TrendingDown className="w-4 h-4 text-red-600" /><span className="text-xs font-bold text-red-700 uppercase tracking-wider">Concerns</span></div>
              <ul className="space-y-2">{weeklyReport.concerns.map((c, i) => <li key={i} className="text-xs text-red-800 flex gap-2 leading-relaxed"><AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />{c}</li>)}</ul>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-blue-600" /><span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Actions</span></div>
              <ul className="space-y-2">{weeklyReport.actions.map((a, i) => <li key={i} className="text-xs text-blue-800 flex gap-2 leading-relaxed"><span className="w-4 h-4 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>{a}</li>)}</ul>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="font-semibold text-slate-900 mb-4">Past Reports</div>
        <div className="space-y-2">
          {["Apr 27 – May 3", "Apr 20 – Apr 26", "Apr 13 – Apr 19", "Apr 6 – Apr 12"].map((period, i) => (
            <button key={i} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors text-left">
              <div className="flex items-center gap-3"><Calendar className="w-4 h-4 text-slate-400" /><span className="text-sm text-slate-700 font-medium">{period}, 2026</span></div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Alerts() {
  const [dismissed, setDismissed] = useState<number[]>([]);
  const visible = alerts.filter(a => !dismissed.includes(a.id));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div className="text-sm text-slate-500">{visible.length} active alert{visible.length !== 1 ? "s" : ""}</div><button onClick={() => setDismissed(alerts.map(a => a.id))} className="text-xs text-slate-400 hover:text-slate-600">Dismiss all</button></div>
      <AnimatePresence>
        {visible.map(a => (
          <motion.div key={a.id} initial={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0, marginBottom: 0 }} transition={{ duration: 0.2 }}>
            <div className={`bg-white rounded-2xl border shadow-sm p-5 flex gap-4 ${a.level === "critical" ? "border-red-200" : a.level === "warning" ? "border-amber-200" : "border-blue-100"}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${a.level === "critical" ? "bg-red-100" : a.level === "warning" ? "bg-amber-100" : "bg-blue-100"}`}>
                <AlertTriangle className={`w-4 h-4 ${a.level === "critical" ? "text-red-600" : a.level === "warning" ? "text-amber-600" : "text-blue-600"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1"><span className="font-semibold text-slate-900 text-sm">{a.title}</span><AlertBadge level={a.level} /></div>
                <p className="text-sm text-slate-600 leading-relaxed">{a.desc}</p>
                <span className="text-xs text-slate-400 mt-2 block">{a.time}</span>
              </div>
              <button onClick={() => setDismissed(d => [...d, a.id])} className="text-slate-300 hover:text-slate-500 flex-shrink-0"><X className="w-4 h-4" /></button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {visible.length === 0 && (
        <div className="text-center py-16"><CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" /><div className="font-semibold text-slate-700">All clear</div><div className="text-sm text-slate-400 mt-1">No active alerts. Cortex is watching.</div></div>
      )}
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="space-y-4 max-w-2xl">
      {[
        { label: "Business Profile", desc: "Name, type, operating hours, seasonal patterns", icon: Coffee },
        { label: "Data Connections", desc: "QuickBooks, Square, Shopify, CSV folder", icon: Activity },
        { label: "Alert Thresholds", desc: "Customize when Cortex flags anomalies", icon: AlertTriangle },
        { label: "Briefing Schedule", desc: "What time you receive morning reports", icon: Clock },
        { label: "Digest Settings", desc: "Configure nightly analysis behavior", icon: RefreshCw },
      ].map(item => (
        <button key={item.label} className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow text-left">
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0"><item.icon className="w-5 h-5 text-slate-500" /></div>
          <div className="flex-1"><div className="font-semibold text-slate-900 text-sm">{item.label}</div><div className="text-xs text-slate-400 mt-0.5">{item.desc}</div></div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </button>
      ))}
    </div>
  );
}

const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "chat", label: "Ask Cortex", icon: MessageSquare },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "alerts", label: "Alerts", icon: AlertTriangle, badge: 2 },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [time, setTime] = useState(new Date());
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
              <span className="text-xs text-slate-400 font-medium">Rosario's Italian Kitchen</span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}>
                  <tab.icon className="w-4 h-4" />{tab.label}
                  {tab.badge && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{tab.badge}</span>}
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
