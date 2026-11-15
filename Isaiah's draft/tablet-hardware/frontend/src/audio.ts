import type { CrewFrame, Level } from "./types";
import { RANK } from "./types";

/**
 * Cabin alert audio. Distinct tone per level (caution: two-tone chime,
 * warning: fast warble) plus a spoken line from the device's offline voices.
 * Tones repeat until the crewmate acknowledges; a new, higher level re-alarms.
 */
class AlertAudio {
  private ctx: AudioContext | null = null;
  private loop: number | undefined;
  private loopLevel: Level | null = null;
  private lastSpoken: Record<string, { level: Level; at: number }> = {};
  private lastAdvisory: Record<string, number> = {};
  muted = false;

  unlock() {
    if (!this.ctx) this.ctx = new AudioContext();
    void this.ctx.resume();
    speechSynthesis.getVoices();
  }

  private tone(freq: number, start: number, dur: number, gain = 0.18) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    const t0 = this.ctx.currentTime + start;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.02);
    g.gain.setValueAtTime(gain, t0 + dur - 0.04);
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t0);
    o.stop(t0 + dur);
  }

  private pattern(level: Level) {
    if (this.muted) return;
    if (level === "WARNING") {
      for (let i = 0; i < 8; i++) this.tone(i % 2 ? 1250 : 900, i * 0.16, 0.15, 0.22);
    } else if (level === "CAUTION") {
      this.tone(660, 0, 0.22);
      this.tone(880, 0.26, 0.3);
    } else if (level === "ADVISORY") {
      this.tone(1040, 0, 0.12, 0.08);
    }
  }

  speak(text: string) {
    if (this.muted || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.lang = "en-US";
    speechSynthesis.speak(u);
  }

  /** Called on every telemetry frame. */
  update(crew: CrewFrame[]) {
    const open = crew.filter((c) => (c.level === "CAUTION" || c.level === "WARNING") && !c.acked);
    const top = open.sort((a, b) => RANK[b.level] - RANK[a.level])[0];
    const level = top?.level ?? null;

    if (level !== this.loopLevel) {
      clearInterval(this.loop);
      this.loopLevel = level;
      if (level) {
        this.pattern(level);
        this.loop = window.setInterval(() => this.pattern(level), level === "WARNING" ? 3000 : 5000);
      }
    }

    const now = Date.now();
    for (const c of crew) {
      const prev = this.lastSpoken[c.id];
      const alarming = c.level === "CAUTION" || c.level === "WARNING";
      const escalated = !prev || RANK[c.level] > RANK[prev.level];
      const repeat = alarming && !c.acked && prev && now - prev.at > 30000;
      if ((alarming && escalated) || repeat) {
        this.speak(phrase(c));
        this.lastSpoken[c.id] = { level: c.level, at: now };
      } else if (c.level === "ADVISORY" && escalated) {
        if (now - (this.lastAdvisory[c.id] ?? 0) > 60000) this.pattern("ADVISORY");
        this.lastAdvisory[c.id] = now;
        this.lastSpoken[c.id] = { level: c.level, at: now };
      } else if (!prev || RANK[c.level] < RANK[prev.level]) {
        this.lastSpoken[c.id] = { level: c.level, at: now };
      }
    }
  }

  stop() {
    clearInterval(this.loop);
    this.loopLevel = null;
    speechSynthesis.cancel();
  }
}

function phrase(c: CrewFrame) {
  const id = c.id.split("").join(" ");
  const spo2 = Math.round(c.spo2_smooth);
  return c.level === "WARNING"
    ? `Warning. ${id}, hypoxia. Oxygen saturation ${spo2} percent. Start hypoxia response.`
    : `Caution. ${id}. Oxygen saturation ${spo2} percent, below baseline.`;
}

export const alertAudio = new AlertAudio();
