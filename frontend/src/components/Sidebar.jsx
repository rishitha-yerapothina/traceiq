import { NavLink } from "react-router-dom";
import { LayoutDashboard, FileText, GitBranch, GitCommit, Upload, Cpu, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { getProjects, reanalyze } from "../api";

const links = [
  { to: "/",             icon: LayoutDashboard, label: "Dashboard"    },
  { to: "/import",       icon: Upload,          label: "Import"       },
  { to: "/requirements", icon: FileText,        label: "Requirements" },
  { to: "/pipelines",    icon: GitBranch,       label: "Pipelines"    },
  { to: "/commits",      icon: GitCommit,       label: "Commits"      },
];

export default function Sidebar({ project, onProjectSwitch }) {
  const [projects,      setProjects]      = useState([]);
  const [showDropdown,  setShowDropdown]  = useState(false);
  const [reanalyzing,   setReanalyzing]   = useState(false);

  useEffect(() => {
    getProjects().then(r => setProjects(r.data)).catch(() => {});
  }, []);

  async function handleReanalyze() {
    if (!project) return;
    setReanalyzing(true);
    try {
      await reanalyze(project.id);
      window.location.reload();
    } catch {
      setReanalyzing(false);
    }
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-sidebar border-r border-white/5 flex flex-col z-40">
      {/* logo */}
      <div className="px-5 py-6 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Cpu size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight">TraceIQ</div>
            <div className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">ML Engine</div>
          </div>
        </div>
      </div>

      {/* nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-3 mb-3">Navigation</div>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
               ${isActive
                 ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/20"
                 : "text-gray-400 hover:text-gray-200 hover:bg-white/5"}`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* project switcher */}
      <div className="px-3 pb-2 border-t border-white/5 pt-3">
        <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-1 mb-2">Projects</div>

        {/* dropdown trigger */}
        <button
          onClick={() => setShowDropdown(v => !v)}
          className="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/5 rounded-lg px-3 py-2.5 transition"
        >
          <div className="text-left min-w-0">
            <div className="text-xs text-white font-medium truncate">{project?.name ?? "No project"}</div>
            <div className="text-[10px] text-gray-500 truncate">{project?.repo_url?.replace("https://github.com/", "") ?? ""}</div>
          </div>
          {showDropdown ? <ChevronUp size={13} className="text-gray-500 shrink-0 ml-1" /> : <ChevronDown size={13} className="text-gray-500 shrink-0 ml-1" />}
        </button>

        {/* dropdown list */}
        {showDropdown && projects.length > 0 && (
          <div className="mt-1 bg-[#1a1d27] border border-white/10 rounded-lg overflow-hidden shadow-xl">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => { onProjectSwitch(p); setShowDropdown(false); }}
                className={`w-full text-left px-3 py-2.5 text-xs transition hover:bg-white/5
                  ${project?.id === p.id ? "text-indigo-400 bg-indigo-600/10" : "text-gray-300"}`}
              >
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-[10px] text-gray-500 truncate">{p.repo_url?.replace("https://github.com/", "")}</div>
              </button>
            ))}
          </div>
        )}

        {/* re-analyze button */}
        <button
          onClick={handleReanalyze}
          disabled={!project || reanalyzing}
          className="mt-2 w-full flex items-center justify-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/20 text-indigo-400 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw size={12} className={reanalyzing ? "animate-spin" : ""} />
          {reanalyzing ? "Analyzing…" : "Re-analyze"}
        </button>
      </div>

      <div className="pb-4" />
    </aside>
  );
}
