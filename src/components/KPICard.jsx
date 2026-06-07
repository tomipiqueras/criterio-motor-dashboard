export default function KPICard({ title, value, subtitle, icon: Icon, color = "blue", trend }) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };

  return (
    <div className={`rounded-xl border-2 p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-70">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {subtitle && <p className="mt-1 text-xs opacity-60">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="rounded-lg bg-white/50 p-2">
            <Icon size={22} />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1 text-xs font-medium">
          <span>{trend > 0 ? "▲" : "▼"}</span>
          <span>{Math.abs(trend)}% vs año anterior</span>
        </div>
      )}
    </div>
  );
}
