export default function MetricCard({ icon: Icon, label, value, sub, color = "indigo" }) {
  const colors = {
    indigo:  { bg: "bg-indigo-50",  icon: "text-indigo-500"  },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-500" },
    red:     { bg: "bg-red-50",     icon: "text-red-500"     },
    yellow:  { bg: "bg-yellow-50",  icon: "text-yellow-500"  },
    blue:    { bg: "bg-blue-50",    icon: "text-blue-500"    },
    purple:  { bg: "bg-purple-50",  icon: "text-purple-500"  },
  };
  const c = colors[color] || colors.indigo;
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{label}</div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg}`}>
          <Icon size={19} className={c.icon} />
        </div>
      </div>
      <div className="text-4xl font-bold text-gray-900 tracking-tight leading-none">{value}</div>
      {sub && <div className="text-sm text-gray-400 mt-2">{sub}</div>}
    </div>
  );
}
