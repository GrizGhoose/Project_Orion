import type { Baseline, HistoryPoint, Level, Thresholds } from "../types";

const COLOR: Record<Level, string> = {
  CALIBRATING: "var(--muted)",
  NOMINAL: "var(--ok)",
  ADVISORY: "var(--advisory)",
  CAUTION: "var(--caution)",
  WARNING: "var(--warning)",
};

interface Props {
  points: HistoryPoint[];
  baseline: Baseline | null;
  th: Thresholds;
  width: number;
  height: number;
  windowS?: number;
  compact?: boolean;
}

/** SpO₂ over the last few minutes against the crewmember's own baseline band. */
export function TrendChart({ points, baseline, th, width, height, windowS = 300, compact }: Props) {
  const lo = 76, hi = 101.5; // headroom so the 100 label is not clipped
  const padR = compact ? 4 : 30;
  const w = width - padR;
  const tEnd = points.length ? points[points.length - 1].t : windowS;
  const tStart = tEnd - windowS;
  const x = (t: number) => ((t - tStart) / windowS) * w;
  const y = (v: number) => height - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * height;
  const visible = points.filter((p) => p.t >= tStart);

  // Split the line into runs of one level so each run takes its alert colour.
  const runs: { level: Level; d: string }[] = [];
  visible.forEach((p, i) => {
    const prev = runs[runs.length - 1];
    const cmd = `${x(p.t).toFixed(1)},${y(p.spo2).toFixed(1)}`;
    if (!prev || prev.level !== p.level) {
      const start = i > 0 ? `M${x(visible[i - 1].t).toFixed(1)},${y(visible[i - 1].spo2).toFixed(1)} L` : "M";
      runs.push({ level: p.level, d: start + cmd });
    } else prev.d += ` L${cmd}`;
  });

  const band = baseline && {
    top: y(baseline.spo2_mean + 2 * baseline.spo2_sd),
    mean: y(baseline.spo2_mean),
    caution: y(baseline.spo2_mean + th.caution_z * baseline.spo2_sd),
    warning: y(baseline.spo2_mean + th.warning_z * baseline.spo2_sd),
  };

  return (
    <svg width={width} height={height} className="trend" role="img" aria-label="SpO₂ trend, last 5 minutes">
      {band && (
        <>
          <rect x={0} y={band.top} width={w} height={band.caution - band.top} className="band" />
          <line x1={0} x2={w} y1={band.mean} y2={band.mean} className="mean" />
          <line x1={0} x2={w} y1={band.caution} y2={band.caution} className="th th-caution" />
          <line x1={0} x2={w} y1={band.warning} y2={band.warning} className="th th-warning" />
        </>
      )}
      {!compact &&
        [80, 90, 100].map((v) => (
          <g key={v}>
            <line x1={0} x2={w} y1={y(v)} y2={y(v)} className="grid" />
            <text x={w + 6} y={y(v) + 4} className="axis">{v}</text>
          </g>
        ))}
      {runs.map((r, i) => (
        <path key={i} d={r.d} fill="none" stroke={COLOR[r.level]} strokeWidth={compact ? 2 : 2.5}
          strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {visible.length > 0 && (
        <circle cx={x(visible[visible.length - 1].t)} cy={y(visible[visible.length - 1].spo2)} r={4}
          fill={COLOR[visible[visible.length - 1].level]} />
      )}
    </svg>
  );
}
