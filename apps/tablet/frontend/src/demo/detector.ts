/**
 * Browser port of backend/app/detector.py (deviation-duration hypoxia detector).
 * Keep the two in step: the Python version is the reference and has the tests.
 */
import type { Level } from "../types";
import { RANK } from "../types";

export interface FullThresholds {
  baseline_s: number;
  spo2_sd_floor: number;
  hr_sd_floor: number;
  smooth_s: number;
  grace_s: number;
  caution_z: number;
  caution_hold_s: number;
  warning_z: number;
  warning_hold_s: number;
  caution_floor: number;
  warning_floor: number;
  immediate_floor: number;
  immediate_hold_s: number;
  recover_z: number;
  recover_hold_s: number;
  startle_hr_z: number;
  startle_spo2_z: number;
  reaction_every_s: number;
}

export interface DetOut {
  level: Level;
  spo2_smooth: number;
  z: number;
  hr_z: number;
  baseline: { spo2_mean: number; spo2_sd: number; hr_mean: number; hr_sd: number } | null;
  below_caution_s: number;
  below_warning_s: number;
  slope_per_min: number;
  startle: boolean;
  reasons: string[];
  calibration_left_s: number;
  signal: boolean;
}

const ALARM = (l: Level) => l === "CAUTION" || l === "WARNING";
const missing = (v: number | null | undefined): v is null | undefined => v == null || Number.isNaN(v);
const fmtZ = (v: number, d = 1) => `${v >= 0 ? "+" : ""}${v.toFixed(d)}`;

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pstdev = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

class Timer {
  held = 0;
  gap = 0;
  constructor(private grace: number) {}
  update(cond: boolean) {
    if (cond) {
      this.held += 1;
      this.gap = 0;
    } else {
      this.gap += 1;
      if (this.gap > this.grace) this.held = 0;
    }
    return this.held;
  }
  reset() {
    this.held = this.gap = 0;
  }
}

export class HypoxiaDetector {
  t = 0;
  calSpo2: number[] = [];
  calHr: number[] = [];
  mu: number | null = null;
  sd = 0;
  hrMu = 0;
  hrSd = 0;
  window: number[] = [];
  trend: number[] = [];
  belowCaution: Timer;
  belowWarning: Timer;
  below93: Timer;
  below90: Timer;
  below85 = new Timer(0);
  recovered = 0;
  latched: Level = "NOMINAL";
  dropout = 0;
  lastHr: number | null = null;
  lastOut: DetOut | null = null;
  graceLeft = 0;
  graceRef: number | null = null;

  constructor(private th: FullThresholds) {
    this.belowCaution = new Timer(th.grace_s);
    this.belowWarning = new Timer(th.grace_s);
    this.below93 = new Timer(th.grace_s);
    this.below90 = new Timer(th.grace_s);
  }

  get calibrated() {
    return this.mu !== null;
  }

  resolve(graceS = 0) {
    [this.belowCaution, this.belowWarning, this.below93, this.below90, this.below85].forEach((t) => t.reset());
    this.recovered = 0;
    this.latched = "NOMINAL";
    this.graceLeft = graceS;
    this.graceRef = this.window.length ? median(this.window) : null;
  }

  private noSignal(): DetOut {
    const out: DetOut = this.lastOut
      ? { ...this.lastOut }
      : { level: "CALIBRATING", spo2_smooth: 0, z: 0, hr_z: 0, baseline: null, below_caution_s: 0, below_warning_s: 0,
          slope_per_min: 0, startle: false, reasons: [], calibration_left_s: this.th.baseline_s, signal: false };
    if (!ALARM(out.level) && out.level !== "CALIBRATING" && this.dropout >= 5) out.level = "ADVISORY";
    out.startle = false;
    out.signal = false;
    out.reasons = [`No SpO₂ signal for ${this.dropout} s: check the forehead sensor`];
    return out;
  }

  update(spo2: number | null, hr: number | null): DetOut {
    const th = this.th;
    this.t += 1;
    if (missing(hr)) hr = this.lastHr ?? 80;
    this.lastHr = hr;
    if (missing(spo2)) {
      this.dropout += 1;
      return this.noSignal();
    }
    this.dropout = 0;
    this.window.push(spo2);
    if (this.window.length > th.smooth_s) this.window.shift();
    const smooth = median(this.window);
    this.trend.push(smooth);
    if (this.trend.length > 30) this.trend.shift();

    if (!this.calibrated) {
      this.calSpo2.push(spo2);
      this.calHr.push(hr);
      if (this.calSpo2.length >= th.baseline_s) {
        this.mu = mean(this.calSpo2);
        this.sd = Math.max(pstdev(this.calSpo2), th.spo2_sd_floor);
        this.hrMu = mean(this.calHr);
        this.hrSd = Math.max(pstdev(this.calHr), th.hr_sd_floor);
      }
      const left = th.baseline_s - this.calSpo2.length;
      this.lastOut = {
        level: "CALIBRATING", spo2_smooth: smooth, z: 0, hr_z: 0, baseline: null, below_caution_s: 0, below_warning_s: 0,
        slope_per_min: 0, startle: false, signal: true, reasons: [`Recording personal baseline: ${left} s left`], calibration_left_s: left,
      };
      return this.lastOut;
    }

    const mu = this.mu!;
    const z = (smooth - mu) / this.sd;
    const hrZ = (hr - this.hrMu) / this.hrSd;
    const bc = this.belowCaution.update(z <= th.caution_z);
    const bw = this.belowWarning.update(z <= th.warning_z);
    const b93 = this.below93.update(smooth < th.caution_floor);
    const b90 = this.below90.update(smooth < th.warning_floor);
    const b85 = this.below85.update(smooth < th.immediate_floor);
    const slope = ((this.trend[this.trend.length - 1] - this.trend[0]) * 60) / Math.max(this.trend.length - 1, 1);

    let reasons: string[] = [];
    let level: Level = "NOMINAL";
    if (b85 >= th.immediate_hold_s) {
      level = "WARNING";
      reasons.push(`SpO₂ ${smooth.toFixed(0)} % is below the ${th.immediate_floor.toFixed(0)} % floor`);
    }
    if (bw >= th.warning_hold_s) {
      level = "WARNING";
      reasons.push(`${fmtZ(z)} σ from baseline for ${bw} s (warning: ${fmtZ(th.warning_z, 0)} σ for ${th.warning_hold_s} s)`);
    }
    if (b90 >= th.warning_hold_s) {
      level = "WARNING";
      reasons.push(`SpO₂ under ${th.warning_floor.toFixed(0)} % for ${b90} s`);
    }
    if (level !== "WARNING") {
      if (bc >= th.caution_hold_s) {
        level = "CAUTION";
        reasons.push(`${fmtZ(z)} σ from baseline for ${bc} s (caution: ${fmtZ(th.caution_z, 0)} σ for ${th.caution_hold_s} s)`);
      }
      if (b93 >= th.caution_hold_s) {
        level = "CAUTION";
        reasons.push(`SpO₂ under ${th.caution_floor.toFixed(0)} % for ${b93} s`);
      }
    }

    // Latch: an alert stays until SpO2 has been back near baseline for a while.
    this.recovered = z > th.recover_z && smooth >= th.caution_floor ? this.recovered + 1 : 0;
    if (RANK[level] >= RANK[this.latched]) this.latched = level;
    else if (ALARM(this.latched) && this.recovered < th.recover_hold_s)
      reasons.push(`Holding ${this.latched.toLowerCase()} until SpO₂ is back near baseline for ${th.recover_hold_s} s (${this.recovered} s so far)`);
    else this.latched = level;

    const startle = hrZ >= th.startle_hr_z && z > th.startle_spo2_z;
    if (startle && this.latched === "NOMINAL") this.latched = "ADVISORY";
    if (this.latched === "ADVISORY" && !startle) this.latched = "NOMINAL";
    if (startle) reasons.push(`HR ${fmtZ(hr - this.hrMu, 0)} bpm with SpO₂ holding: startle or exertion, no hypoxia alarm`);
    if (!reasons.length) reasons.push(`SpO₂ within ${Math.abs(z).toFixed(1)} σ of personal baseline`);

    if (this.graceLeft > 0) {
      this.graceLeft -= 1;
      const floor = (this.graceRef ?? smooth) - 1.0;
      if (smooth < floor || smooth < th.immediate_floor) this.graceLeft = 0;
      else if (ALARM(this.latched)) {
        this.latched = "NOMINAL";
        reasons = [`Resolved by crew, watching recovery for ${this.graceLeft} s more; alarms again if SpO₂ drops below ${floor.toFixed(0)} %`];
      }
    }

    this.lastOut = {
      level: this.latched, spo2_smooth: smooth, z, hr_z: hrZ,
      baseline: { spo2_mean: mu, spo2_sd: this.sd, hr_mean: this.hrMu, hr_sd: this.hrSd },
      below_caution_s: bc, below_warning_s: bw, slope_per_min: slope, startle, reasons, calibration_left_s: 0, signal: true,
    };
    return this.lastOut;
  }
}
