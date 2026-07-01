import { useEffect, useState } from "react";
import { getCommits, getCommitStats } from "../api";
import StatusBadge from "../components/StatusBadge";
import { GitCommit, User, Calendar, FileDiff } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Commits({ project }) {
  const [commits, setCommits] = useState([]);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!project) return;
    Promise.all([
      getCommits(project.id).then(r => setCommits(r.data)),
      getCommitStats(project.id).then(r => setStats(r.data)),
    ]).finally(() => setLoading(false));
  }, [project?.id]);

  if (!project) return <div className="text-gray-500 text-sm">No project loaded.</div>;

  const chartData = (stats?.by_day || []).slice().reverse().map(d => ({
    date: d.date?.slice(5) || "",
    commits: d.count,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Commits</h1>
        <p className="text-gray-400 text-sm mt-1">Full commit history from GitHub with ML-predicted pipeline outcome</p>
      </div>

      {/* top stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-panel border border-white/5 rounded-xl p-4">
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Total Commits</div>
          <div className="text-3xl font-bold text-white">{stats?.total ?? 0}</div>
        </div>
        <div className="col-span-2 bg-panel border border-white/5 rounded-xl p-5">
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Top Contributors</div>
          <div className="flex flex-wrap gap-2">
            {(stats?.by_author || []).slice(0, 6).map(a => (
              <div key={a.author} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                <User size={11} className="text-gray-500" />
                <span className="text-xs text-gray-300 font-medium">{a.author}</span>
                <span className="text-xs text-gray-600">{a.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* commit chart */}
      <div className="bg-panel border border-white/5 rounded-xl p-5 mb-6">
        <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-4">Commits Over Time</div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#1a1d27", border: "1px solid #ffffff10", borderRadius: 8, fontSize: 12 }}
                       labelStyle={{ color: "#e5e7eb" }} itemStyle={{ color: "#818cf8" }} />
              <Bar dataKey="commits" fill="#6366f1" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-gray-600 text-sm">No commit history available</div>
        )}
      </div>

      {/* commit list */}
      {loading ? (
        <div className="text-gray-500 text-sm">Loading commits…</div>
      ) : (
        <div className="bg-panel border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {["Commit", "Author", "Date", "Changes", "Pipeline"].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {commits.map((c, i) => (
                <tr key={c.id} className={`border-b border-white/5 hover:bg-white/2 transition ${i === commits.length-1 ? "border-0" : ""}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-start gap-2">
                      <GitCommit size={13} className="text-gray-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm text-gray-200 leading-snug line-clamp-1 max-w-xs">{c.message}</div>
                        <div className="text-xs text-gray-600 font-mono mt-0.5">{c.sha}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-gray-600" />
                      <span className="text-sm text-gray-400">{c.author}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-gray-600" />
                      <span className="text-xs text-gray-500">{c.date?.slice(0,10)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <FileDiff size={12} className="text-gray-600" />
                      <span className="text-xs text-gray-400">{c.files_changed} files</span>
                      <span className="text-xs text-emerald-500">+{c.lines_added}</span>
                      <span className="text-xs text-red-500">-{c.lines_deleted}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={c.pipeline_status} />
                      <span className="text-xs text-gray-600">
                        {c.fail_probability != null ? `${(c.fail_probability*100).toFixed(0)}% risk` : ""}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
