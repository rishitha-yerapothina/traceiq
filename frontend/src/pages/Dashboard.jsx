import { useEffect, useState } from "react";
import { FileText, CheckCircle, XCircle, GitCommit, GitBranch, AlertTriangle, Cpu, ArrowRight, Download } from "lucide-react";
import { getSummary, getPipelineStats, getCommitStats, getRequirements } from "../api";
import MetricCard from "../components/MetricCard";
import { SkeletonCard } from "../components/Skeleton";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";

const PRINT_STYLE = `
@media print {
  body { background: #fff !important; color: #111 !important; }
  aside, nav, button { display: none !important; }
  main { margin: 0 !important; padding: 0 !important; }
  .no-print { display: none !important; }
  .print-card { border: 1px solid #e5e7eb !important; background: #fff !important; color: #111 !important; break-inside: avoid; margin-bottom: 16px; }
}
`;

function injectPrintStyle() {
  if (document.getElementById("traceiq-print-style")) return;
  const s = document.createElement("style");
  s.id = "traceiq-print-style";
  s.textContent = PRINT_STYLE;
  document.head.appendChild(s);
}

function DonutLabel({ cx, cy, implemented, total }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-6" fontSize="22" fontWeight="700" fill="#111827">{implemented}</tspan>
      <tspan x={cx} dy="18" fontSize="12" fill="#6b7280">/ {total}</tspan>
    </text>
  );
}

export default function Dashboard({ project }) {
  const [summary,  setSummary]  = useState(null);
  const [pStats,   setPStats]   = useState(null);
  const [cStats,   setCStats]   = useState(null);
  const [allReqs,  setAllReqs]  = useState([]);
  const [missing,  setMissing]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const navigate = useNavigate();

  useEffect(() => { injectPrintStyle(); }, []);

  useEffect(() => {
    if (!project) return;
    setLoading(true);
    Promise.all([
      getSummary(project.id).then(r => setSummary(r.data)),
      getPipelineStats(project.id).then(r => setPStats(r.data)),
      getCommitStats(project.id).then(r => setCStats(r.data)),
      getRequirements(project.id).then(r => {
        setAllReqs(r.data);
        setMissing(r.data.filter(req => req.status === "missing"));
      }),
    ]).finally(() => setLoading(false));
  }, [project?.id]);

  if (!project) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
      <Cpu size={40} className="text-indigo-400 opacity-50" />
      <div className="text-gray-400 text-sm">No project loaded.<br />Go to <b className="text-gray-700">Import</b> to add one.</div>
    </div>
  );

  if (loading) return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Pipeline health and requirement traceability overview</p>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );

  const health = summary?.health_score ?? 0;
  const hColor  = health >= 75 ? "text-emerald-500" : health >= 50 ? "text-yellow-500" : "text-red-500";
  const hBarCol = health >= 75 ? "bg-emerald-500"   : health >= 50 ? "bg-yellow-500"   : "bg-red-500";

  const chartData = (cStats?.by_day || []).slice().reverse().map(d => ({
    date: d.date?.slice(5) || "",
    commits: d.count,
  }));

  const alerts = [];
  if (summary?.missing > 0)
    alerts.push({ level: "red",    msg: `${summary.missing} requirement${summary.missing > 1 ? "s" : ""} not implemented yet` });
  if (pStats?.failed > 0)
    alerts.push({ level: "red",    msg: `${pStats.failed} pipeline run${pStats.failed > 1 ? "s" : ""} predicted to fail` });
  if (summary?.impl_pct < 50)
    alerts.push({ level: "yellow", msg: "Less than 50% of requirements are implemented" });
  if (alerts.length === 0)
    alerts.push({ level: "green",  msg: "All systems operational — no active alerts" });

  const funcImpl  = allReqs.filter(r => r.type === "F"  && r.status === "implemented").length;
  const funcMiss  = allReqs.filter(r => r.type === "F"  && r.status === "missing").length;
  const nfImpl    = allReqs.filter(r => r.type !== "F"  && r.status === "implemented").length;
  const nfMiss    = allReqs.filter(r => r.type !== "F"  && r.status === "missing").length;
  const totalImpl = funcImpl + nfImpl;
  const totalAll  = allReqs.length;
  const donutData = [
    { name: "Implemented", value: totalImpl || 0 },
    { name: "Missing",     value: (totalAll - totalImpl) || 0 },
  ];

  function handleMissingClick(req) {
    localStorage.setItem("traceiq_focus_req", String(req.id));
    navigate("/requirements");
  }

  return (
    <div>
      {/* header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Pipeline health and requirement traceability overview</p>
        </div>
        <div className="flex items-center gap-3 no-print">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-indigo-400 text-gray-600 hover:text-indigo-600 rounded-xl px-4 py-2.5 text-sm font-medium transition shadow-sm"
          >
            <Download size={14} />
            Export Report
          </button>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
            <span className={`w-2 h-2 rounded-full ${health >= 75 ? "bg-emerald-500" : health >= 50 ? "bg-yellow-500" : "bg-red-500"}`} />
            <span className="text-sm text-gray-600 font-medium">
              {health >= 75 ? "All Systems Operational" : health >= 50 ? "Needs Attention" : "Critical Issues"}
            </span>
          </div>
        </div>
      </div>

      {/* metric cards */}
      <div className="grid grid-cols-4 gap-4 mb-6 print-card">
        <MetricCard icon={FileText}    label="Total Requirements" value={summary?.total_requirements ?? 0} sub="Extracted from PDF"              color="indigo"  />
        <MetricCard icon={CheckCircle} label="Implemented"        value={summary?.implemented ?? 0}        sub={`${summary?.impl_pct ?? 0}% coverage`} color="emerald" />
        <MetricCard icon={GitCommit}   label="Total Commits"      value={summary?.total_commits ?? 0}      sub="From GitHub history"            color="blue"    />
        <MetricCard icon={GitBranch}   label="Pipeline Pass Rate" value={`${summary?.pipeline_pass_rate ?? 0}%`} sub={`${pStats?.failed ?? 0} predicted failures`} color="purple" />
      </div>

      {/* health score + chart */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center shadow-sm print-card">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Health Score</div>
          <div className={`text-6xl font-bold tracking-tight ${hColor}`}>{health.toFixed(0)}</div>
          <div className="text-gray-400 text-sm mt-1">/100</div>
          <div className="w-full bg-gray-100 rounded-full h-2 mt-5">
            <div className={`h-2 rounded-full transition-all ${hBarCol}`} style={{ width: `${health}%` }} />
          </div>
          <div className={`text-sm font-semibold mt-3 ${hColor}`}>
            {health >= 75 ? "Healthy" : health >= 50 ? "Warning" : "Critical"}
          </div>
        </div>

        <div className="col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print-card">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Commit Activity (30 Days)</div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                         labelStyle={{ color: "#111827" }} itemStyle={{ color: "#16a34a" }} />
                <Area type="monotone" dataKey="commits" stroke="#22c55e" strokeWidth={2.5} fill="url(#grad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No commit data yet</div>
          )}
        </div>
      </div>

      {/* requirements donut */}
      {totalAll > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-center shadow-sm print-card">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Requirements Coverage</div>
            <PieChart width={160} height={160}>
              <Pie data={donutData} cx={80} cy={80} innerRadius={52} outerRadius={72} dataKey="value" strokeWidth={0}>
                <Cell fill="#10b981" />
                <Cell fill="#ef4444" />
              </Pie>
            </PieChart>
            <DonutLabel cx={80} cy={80} implemented={totalImpl} total={totalAll} />
            <div className="flex items-center gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Implemented
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Missing
              </span>
            </div>
          </div>

          <div className="col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print-card">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Breakdown by Type</div>
            <div className="space-y-3">
              {[
                { label: "Functional — Implemented",     value: funcImpl, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
                { label: "Functional — Missing",         value: funcMiss, color: "text-red-600",     bg: "bg-red-50 border-red-100"         },
                { label: "Non-Functional — Implemented", value: nfImpl,   color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
                { label: "Non-Functional — Missing",     value: nfMiss,   color: "text-red-600",     bg: "bg-red-50 border-red-100"         },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  <span className={`text-sm font-bold px-3 py-0.5 rounded-full border ${item.bg} ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* alerts */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm print-card">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Alerts &amp; Incidents</div>
        <div className="space-y-3">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border
              ${a.level === "red"    ? "bg-red-50 border-red-100"
              : a.level === "yellow" ? "bg-yellow-50 border-yellow-100"
              : "bg-emerald-50 border-emerald-100"}`}>
              {a.level === "red"    && <XCircle       size={16} className="text-red-500 mt-0.5 shrink-0" />}
              {a.level === "yellow" && <AlertTriangle  size={16} className="text-yellow-500 mt-0.5 shrink-0" />}
              {a.level === "green"  && <CheckCircle    size={16} className="text-emerald-500 mt-0.5 shrink-0" />}
              <span className={`text-sm font-medium ${a.level === "red" ? "text-red-700" : a.level === "yellow" ? "text-yellow-700" : "text-emerald-700"}`}>
                {a.msg}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* unimplemented requirements */}
      {missing.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Unimplemented Requirements</span>
              <span className="bg-red-50 text-red-600 border border-red-100 text-xs font-bold px-2 py-0.5 rounded-full">{missing.length}</span>
            </div>
            <button onClick={() => navigate("/requirements")}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 transition font-medium no-print">
              View all <ArrowRight size={13} />
            </button>
          </div>
          <div className="space-y-2">
            {missing.map(req => (
              <div key={req.id} onClick={() => handleMissingClick(req)}
                className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 cursor-pointer hover:bg-red-100 transition">
                <XCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 leading-relaxed">{req.text}</p>
                  <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md
                    ${req.type === "F" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"}`}>
                    {req.type === "F" ? "Functional" : "Non-Functional"}
                  </span>
                </div>
                <ArrowRight size={13} className="text-gray-400 mt-0.5 shrink-0 ml-auto no-print" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
