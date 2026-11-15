import { useLayoutEffect, useRef, useState } from "react";
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
  /** Fixed size; leave either out to fill the parent and follow window resizes. */
  width?: number;
  height?: number;
  metric?: "spo2" | "hr";
  windowS?: number;
  compact?: boolean;
}

/**
 * A vital over the last few minutes against the crewmember's own baseline band.
 * SpO₂ is the alarm signal, so its line takes the alert colour and shows the caution and
 * warning lines. Heart rate only supports the decision: one colour, startle runs in cyan.
 */
export function TrendChart(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: props.width ?? 600, h: props.height ?? 160 });
  const fixed = props.width !== undefined && props.height !== undefined;
  useLayoutEffect(() => {
    if (fixed || !ref.current) return;
    const el = ref.current;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [fixed]);
  if (fixed) return <Chart {...props} width={props.width!} height={props.height!} />;
  return (
    <div ref={ref} className={`trend-wrap ${props.height === undefined ? "grow" : ""}`} style={props.height ? { height: props.height } : undefined}>
      <Chart {...props} width={props.width ?? size.w} height={props.height ?? size.h} />
    </div>
  );
}

function Chart({ points, baseline, th, width, height, metric = "spo2", windowS = 300, compact }: Props & { width: number; height: number }) {
  const isHr = metric === "hr";
  const val = (p: HistoryPoint) => (isHr ? p.hr : p.spo2);
  const padR = compact ? 4 : 30;
  const w = width - padR;
  const tEnd = points.length ? points[points.length - 1].t : windowS;
  const tStart = tEnd - windowS;
  const visible = points.filter((p) => p.t >= tStart);

  let lo = 76, hi = 101.5; // SpO₂: headroom so the 100 label is not clipped
  let ticks = [80, 90, 100];
  if (isHr) {
    const vals = visible.map(val).concat(baseline ? [baseline.hr_mean - 15, baseline.hr_mean + 25] : [60, 110]);
    lo = Math.floor((Math.min(...vals) - 5) / 10) * 10;
    hi = Math.ceil((Math.max(...vals) + 5) / 10) * 10;
    const step = hi - lo > 80 ? 40 : 20;
    ticks = [];
    for (let v = Math.ceil(lo / step) * step; v < hi; v += step) {
      if (v - lo >= (hi - lo) * 0.12) ticks.push(v); // keep labels off the bottom edge
    }
  }
  const x = (t: number) => ((t - tStart) / windowS) * w;
  const y = (v: number) => height - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * height;
  const color = (l: Level) => (isHr ? (l === "ADVISORY" ? COLOR.ADVISORY : "var(--hr)") : COLOR[l]);

  // Split the line into runs of one colour.
  const runs: { c: string; d: string }[] = [];
  visible.forEach((p, i) => {
    const prev = runs[runs.length - 1];
    const c = color(p.level);
    const cmd = `${x(p.t).toFixed(1)},${y(val(p)).toFixed(1)}`;
    if (!prev || prev.c !== c) {
      const start = i > 0 ? `M${x(visible[i - 1].t).toFixed(1)},${y(val(visible[i - 1])).toFixed(1)} L` : "M";
      runs.push({ c, d: start + cmd });
    } else prev.d += ` L${cmd}`;
  });

  const band = baseline && (isHr
    ? { top: y(baseline.hr_mean + 2 * baseline.hr_sd), bottom: y(baseline.hr_mean - 2 * baseline.hr_sd), mean: y(baseline.hr_mean) }
    : {
        top: y(baseline.spo2_mean + 2 * baseline.spo2_sd),
        bottom: y(baseline.spo2_mean + th.caution_z * baseline.spo2_sd),
        mean: y(baseline.spo2_mean),
        warning: y(baseline.spo2_mean + th.warning_z * baseline.spo2_sd),
      });
  const last = visible[visible.length - 1];

  return (
    <svg width={width} height={height} className={`trend ${isHr ? "trend-hr" : ""}`} role="img"
      aria-label={`${isHr ? "Heart rate" : "SpO₂"} trend, last 5 minutes`}>
      {band && (
        <>
          <rect x={0} y={band.top} width={w} height={band.bottom - band.top} className="band" />
          <line x1={0} x2={w} y1={band.mean} y2={band.mean} className="mean" />
          {!isHr && <line x1={0} x2={w} y1={band.bottom} y2={band.bottom} className="th th-caution" />}
          {"warning" in band && <line x1={0} x2={w} y1={band.warning} y2={band.warning} className="th th-warning" />}
        </>
      )}
      {!compact &&
        ticks.map((v) => (
          <g key={v}>
            <line x1={0} x2={w} y1={y(v)} y2={y(v)} className="grid" />
            <text x={w + 6} y={y(v) + 4} className="axis">{v}</text>
          </g>
        ))}
      {runs.map((r, i) => (
        <path key={i} d={r.d} fill="none" stroke={r.c} strokeWidth={compact ? 2 : 2.5} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {last && <circle cx={x(last.t)} cy={y(val(last))} r={4} fill={color(last.level)} />}
    </svg>
  );
}
