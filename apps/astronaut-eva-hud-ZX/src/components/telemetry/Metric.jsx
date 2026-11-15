export function Metric({ label, value, unit, note, compact = false }) {
  return (
    <div className={compact ? 'metric metric-compact' : 'metric'}>
      <div className="eyebrow">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <strong className="metric-value">{value}</strong>
        <span className="text-xs text-slate-400">{unit}</span>
      </div>
      {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
    </div>
  );
}
