import type { CrewFrame, Level } from "./types";

export function met(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, "0")).join(":");
}

export function mmss(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export const LEVEL_LABEL: Record<Level, string> = {
  CALIBRATING: "Baseline",
  NOMINAL: "Nominal",
  ADVISORY: "Advisory",
  CAUTION: "Caution",
  WARNING: "Warning",
  CRITICAL: "Critical",
};

export function levelClass(level: Level) {
  // Critical uses the tablet's established red emergency styling throughout.
  return level === "CRITICAL" ? "lv-critical lv-warning" : `lv-${level.toLowerCase()}`;
}

/** Fill {crew}, {spo2}, {base}, {suit}, {hr} in protocol text with live values. */
export function fill(text: string, c: CrewFrame | undefined, crewId: string) {
  if (!c) return text.replace(/\{crew\}/g, crewId);
  const vars: Record<string, string> = {
    crew: c.id,
    spo2: c.spo2_smooth.toFixed(0),
    base: c.baseline ? c.baseline.spo2_mean.toFixed(0) : "—",
    suit: c.suit_psia.toFixed(1),
    hr: String(c.hr),
  };
  return text.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
}
