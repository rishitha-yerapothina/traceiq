export default function StatusBadge({ status }) {
  const map = {
    implemented: "bg-emerald-50 text-emerald-700 border-emerald-200",
    missing:     "bg-red-50 text-red-700 border-red-200",
    partial:     "bg-yellow-50 text-yellow-700 border-yellow-200",
    pass:        "bg-emerald-50 text-emerald-700 border-emerald-200",
    fail:        "bg-red-50 text-red-700 border-red-200",
    running:     "bg-blue-50 text-blue-700 border-blue-200",
    pending:     "bg-gray-100 text-gray-600 border-gray-200",
    queued:      "bg-yellow-50 text-yellow-700 border-yellow-200",
  };
  const dot = {
    implemented: "bg-emerald-500", missing: "bg-red-500", partial: "bg-yellow-500",
    pass: "bg-emerald-500", fail: "bg-red-500", running: "bg-blue-500",
    pending: "bg-gray-400", queued: "bg-yellow-500",
  };
  const cls = map[status] || "bg-gray-100 text-gray-600 border-gray-200";
  const d   = dot[status]  || "bg-gray-400";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${d}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
