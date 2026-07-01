import { useEffect, useState, useRef } from "react";
import { getRequirements, getRequirement } from "../api";
import StatusBadge from "../components/StatusBadge";
import { SkeletonRow } from "../components/Skeleton";
import { FileText, X, Code, Link, Shield, TestTube, GitCommit } from "lucide-react";

export default function Requirements({ project }) {
  const [reqs,     setReqs]     = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail,   setDetail]   = useState(null);
  const [filter,   setFilter]   = useState("all");
  const [loading,  setLoading]  = useState(true);
  const focusHandled = useRef(false);

  useEffect(() => {
    if (!project) return;
    setLoading(true);
    getRequirements(project.id).then(r => {
      setReqs(r.data);
      setLoading(false);
    });
  }, [project?.id]);

  /* Feature 7: auto-open focused requirement from dashboard click */
  useEffect(() => {
    if (loading || focusHandled.current || reqs.length === 0) return;
    const focusId = localStorage.getItem("traceiq_focus_req");
    if (!focusId) return;
    focusHandled.current = true;
    localStorage.removeItem("traceiq_focus_req");
    const req = reqs.find(r => String(r.id) === focusId);
    if (req) openDetail(req);
  }, [loading, reqs]);

  async function openDetail(req) {
    setSelected(req);
    setDetail(null);
    const r = await getRequirement(project.id, req.id);
    setDetail(r.data);
  }

  const filtered = reqs.filter(r =>
    filter === "all" ? true : r.status === filter
  );

  const counts = {
    all:         reqs.length,
    implemented: reqs.filter(r => r.status === "implemented").length,
    missing:     reqs.filter(r => r.status === "missing").length,
  };

  if (!project) return <div className="text-gray-500 text-sm">No project loaded.</div>;

  return (
    <div className="flex gap-5 h-full">
      {/* list */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Requirements</h1>
            <p className="text-gray-500 text-sm mt-1">Extracted from your PDF — click any row to see traceability details</p>
          </div>
        </div>

        {/* filter tabs */}
        <div className="flex gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          {[["all","All"], ["implemented","Implemented"], ["missing","Missing"]].map(([val, lbl]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition
                ${filter === val ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
              {lbl} <span className="opacity-60 ml-1">{counts[val]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-400 text-sm py-12 text-center">No requirements found.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(req => (
              <div key={req.id} onClick={() => openDetail(req)}
                className={`bg-white border rounded-xl px-5 py-4 cursor-pointer transition shadow-sm hover:border-indigo-300
                  ${selected?.id === req.id ? "border-indigo-400 bg-indigo-50" : "border-gray-200"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <FileText size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">{req.text}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium border
                      ${req.type === "F" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-purple-50 text-purple-600 border-purple-100"}`}>
                      {req.type === "F" ? "Functional" : "Non-Func"}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                </div>
                {req.status === "implemented" && req.linked_function && (
                  <div className="flex items-center gap-1.5 mt-2 ml-5">
                    <Code size={11} className="text-gray-400" />
                    <span className="text-xs text-gray-500 font-mono">{req.linked_function}</span>
                    <span className="text-xs text-gray-400 ml-2">conf: {(req.confidence * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* detail panel */}
      {selected && (
        <div className="w-80 shrink-0 bg-white border border-gray-200 rounded-2xl p-5 self-start sticky top-0 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Detail</div>
            <button onClick={() => { setSelected(null); setDetail(null); }}
              className="text-gray-400 hover:text-gray-700 transition">
              <X size={16} />
            </button>
          </div>

          <p className="text-sm text-gray-700 leading-relaxed mb-5">{selected.text}</p>

          <div className="space-y-3">
            <DetailRow icon={Shield} label="Status" value={<StatusBadge status={selected.status} />} />
            <DetailRow icon={FileText} label="Type"
              value={<span className="text-xs text-blue-600 font-medium">{selected.type === "F" ? "Functional" : "Non-Functional"}</span>} />

            {detail?.linked_function && <>
              <div className="border-t border-gray-100 my-3" />
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Code Traceability</div>
              <DetailRow icon={Code}   label="Function" value={<span className="font-mono text-xs text-indigo-600">{detail.linked_function}</span>} />
              <DetailRow icon={Link}   label="File"     value={<span className="font-mono text-xs text-gray-500 break-all">{detail.linked_file}</span>} />
              <DetailRow icon={Shield} label="ML Confidence"
                value={
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${(detail.confidence||0)*100}%` }} />
                    </div>
                    <span className="text-xs text-indigo-600 font-semibold">{((detail.confidence||0)*100).toFixed(0)}%</span>
                  </div>
                } />
              <DetailRow icon={TestTube}  label="Tested"  value={<span className={`text-xs font-semibold ${detail.is_tested ? "text-emerald-600" : "text-gray-400"}`}>{detail.is_tested ? "Yes" : "No"}</span>} />
              <DetailRow icon={GitCommit} label="Commits" value={<span className="text-xs text-gray-600">{detail.commit_count} total</span>} />
            </>}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 text-gray-500 shrink-0">
        <Icon size={12} />
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-right">{value}</div>
    </div>
  );
}
