export type Level = "CALIBRATING" | "NOMINAL" | "ADVISORY" | "CAUTION" | "WARNING";

export const RANK: Record<Level, number> = { CALIBRATING: 0, NOMINAL: 0, ADVISORY: 1, CAUTION: 2, WARNING: 3 };

export interface Baseline {
  spo2_mean: number;
  spo2_sd: number;
  hr_mean: number;
  hr_sd: number;
}

export interface CrewFrame {
  id: string;
  name: string;
  role: string;
  distance_m: number;
  spo2: number;
  spo2_smooth: number;
  hr: number;
  hr_delta: number;
  hrv: number | null;
  resp: number | null;
  suit_psia: number;
  eq_alt_m: number;
  level: Level;
  z: number;
  hr_z: number;
  baseline: Baseline | null;
  below_caution_s: number;
  below_warning_s: number;
  slope_per_min: number;
  startle: boolean;
  reasons: string[];
  calibration_left_s: number;
  reaction: { t: number; ms: number | null; missed: boolean } | null;
  acked: boolean;
  phase: "PRE-EVA" | "EVA";
  treated: boolean;
}

export interface Frame {
  type: "frame";
  t: number;
  speed: number;
  paused: boolean;
  scenario: string;
  length: number;
  crew: CrewFrame[];
}

export interface HistoryPoint {
  t: number;
  spo2: number;
  hr: number;
  level: Level;
}

export interface LogEntry {
  utc: string;
  met_s: number;
  crew: string;
  kind: string;
  text: string;
  extra?: Record<string, unknown>;
}

export interface Thresholds {
  baseline_s: number;
  caution_z: number;
  caution_hold_s: number;
  warning_z: number;
  warning_hold_s: number;
  caution_floor: number;
  warning_floor: number;
  immediate_floor: number;
}

export interface AppConfig {
  crew: { id: string; name: string; role: string; distance_m: number }[];
  thresholds: Thresholds;
  scenarios: Record<string, string>;
  sources: Record<string, string>;
}

export type Tone = "good" | "caution" | "warning";

export interface Why {
  text: string;
  source: string;
}

export interface Option {
  id?: string;
  label: string;
  sub?: string;
  next?: string;
  tone?: Tone;
  group?: string;
  set?: Record<string, boolean>;
}

export interface ProtoNode {
  title?: string;
  phase: string;
  type: "question" | "action" | "select" | "number" | "dcs_model" | "end";
  prompt: string;
  detail?: string;
  options?: Option[];
  steps?: string[];
  timer_s?: number;
  confirm?: string;
  next?: string;
  next_if?: Record<string, string>;
  alt?: { label: string; next: string };
  link?: { label: string; protocol: string };
  rules?: Record<string, string>;
  field?: string;
  unit?: string;
  min?: number;
  max?: number;
  why?: Why[];
  treat?: boolean;
  image?: string;
}

export interface Protocol {
  id: string;
  title: string;
  phases: { id: string; title: string }[];
  start: string;
  nodes: Record<string, ProtoNode>;
}

export interface Session {
  protocol: string;
  crew: string;
  path: string[];
  flags: Record<string, boolean>;
  values: Record<string, number>;
  picks: Record<string, string[]>;
}
