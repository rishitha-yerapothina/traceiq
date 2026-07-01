import { useEffect, useState } from "react";
import { getPipelines, getPipelineStats } from "../api";
import StatusBadge from "../components/StatusBadge";
import { GitBranch, ChevronRight } from "lucide-react";

const STAGE_ICONS = { Source:"📦", Build:"🔨", Test:"🧪", Deploy:"🚀", Verify:"✅" };

function fmt(s) {
  if (!s || s === 0) return "-";
  if (s < 60) return `${s.toFixed(0)}s`;
  return `${Math.floor(s/60)}m ${(s%60).toFixed(0)}s`;
}

export default function Pipelines({ project }) {
  const [pipelines, setPipelines] = useState([]);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!project) return;
    Promise.all([
      getPipelines(project.id).then(r => setPipelines(r.data)),
      getPipelineStats(project.id).then(r => setStats(r.data)),
    ]).finally(() => setLoading(false));
  }, [project?.id]);

  if (!project) return <div className="text-gray-500 text-sm">No project loaded.</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Pipelines</h1>
        <p className="text-gray-400 text-sm mt-1">
          Pipeline runs predicted by ML — each commit is analyzed for failure risk
        </p>
      </div>

      {/* stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            ["Total Runs",   stats.total,                          "text-white"],
            ["Passed",       stats.passed,                         "text-emerald-400"],
            ["Failed",       stats.failed,                         "text-red-400"],
            ["Pass Rate",    `${stats.pass_rate}%`,                "text-indigo-400"],
          ].map(([label, val, color]) => (
            <div key={label} className="bg-panel border border-white/5 rounded-xl p-4">
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* pipeline list */}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading pipelines…</div>
      ) : pipelines.length === 0 ? (
        <div className="text-gray-500 text-sm py-12 text-center">No pipeline data yet.</div>
      ) : (
        <div className="space-y-3">
          {pipelines.map(p => (
            <div key={p.id} className="bg-panel border border-white/5 rounded-xl p-5">
              {/* header row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <GitBranch size={14} className="text-gray-500" />
                  <div>
                    <div className="text-sm font-semibold text-white truncate max-w-xs">{p.message}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {p.sha} &nbsp;·&nbsp; {p.author} &nbsp;·&nbsp; {p.date ? p.date.slice(0,10) : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {p.fail_probability != null && (
                    <span className="text-xs text-gray-500">
                      Fail risk: <span className={`font-semibold ${p.fail_probability > 0.5 ? "text-red-400" : "text-emerald-400"}`}>
                        {(p.fail_probability * 100).toFixed(0)}%
                      </span>
                    </span>
                  )}
                  <StatusBadge status={p.status} />
                </div>
              </div>

              {/* stage pipeline */}
              <div className="flex items-center gap-2">
                {(p.stages || []).map((stage, i) => (
                  <div key={stage.name} className="flex items-center gap-2">
                    <div className={`flex flex-col items-center px-3 py-2 rounded-lg border text-center min-w-[72px]
                      ${stage.status === "pass"    ? "bg-emerald-500/10 border-emerald-500/20"
                      : stage.status === "fail"    ? "bg-red-500/10 border-red-500/20"
                      : stage.status === "pending" ? "bg-white/3 border-white/5"
                      : "bg-blue-500/10 border-blue-500/20"}`}>
                      <span className="text-base">{STAGE_ICONS[stage.name] || "⚙️"}</span>
                      <span className={`text-[11px] font-semibold mt-1
                        ${stage.status === "pass"    ? "text-emerald-400"
                        : stage.status === "fail"    ? "text-red-400"
                        : stage.status === "pending" ? "text-gray-600"
                        : "text-blue-400"}`}>
                        {stage.name}
                      </span>
                      <span className="text-[10px] text-gray-600 mt-0.5">{fmt(stage.duration_s)}</span>
                    </div>
                    {i < (p.stages.length - 1) && (
                      <ChevronRight size={14} className="text-gray-700 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
