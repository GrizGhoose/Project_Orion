import { useEffect, useRef, useState } from "react";
import type { AppConfig, Frame, HistoryPoint, LogEntry, Session } from "./types";

const HISTORY = 360;

export async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

export async function post(path: string, body: unknown) {
  return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export async function saveSession(s: Session) {
  return fetch(`/api/sessions/${s.protocol}/${s.crew}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s),
  });
}

export async function deleteSession(protocol: string, crew: string) {
  return fetch(`/api/sessions/${protocol}/${crew}`, { method: "DELETE" });
}

export function logStep(crew: string, kind: string, text: string, extra?: Record<string, unknown>) {
  return post("/api/log", { crew, kind, text, extra });
}

export function useConfig() {
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  useEffect(() => {
    getJSON<AppConfig>("/api/config").then(setCfg).catch(() => setTimeout(() => location.reload(), 3000));
  }, []);
  return cfg;
}

export interface Telemetry {
  frame: Frame | null;
  history: Record<string, HistoryPoint[]>;
  log: LogEntry[];
  linked: boolean;
  nasaHistory: Record<string, HistoryPoint[]>;
  sessions: Record<string, Session>;
  setSession: (key: string, s: Session | null) => void;
}

/** Live telemetry over WebSocket, with reconnect and loss-of-signal detection. */
export function useTelemetry(): Telemetry {
  const [frame, setFrame] = useState<Frame | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryPoint[]>>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const [linked, setLinked] = useState(false);
  const [sessions, setSessions] = useState<Record<string, Session>>({});
  const setSession = (key: string, s: Session | null) =>
    setSessions((m) => {
      const next = { ...m };
      if (s) next[key] = s;
      else delete next[key];
      return next;
    });
  const [nasaHistory, setNasaHistory] = useState<Record<string, HistoryPoint[]>>({});
  const addNasa = (points: { t: number; crew: { id: string; spo2: number; hr: number; level: HistoryPoint["level"] }[] }[], reset = false) =>
    setNasaHistory((h) => {
      const next: Record<string, HistoryPoint[]> = reset ? {} : { ...h };
      for (const p of points) for (const c of p.crew) (next[c.id] = (next[c.id] ?? []).concat({ t: p.t, spo2: c.spo2, hr: c.hr, level: c.level }));
      for (const id in next) if (next[id].length > HISTORY) next[id] = next[id].slice(next[id].length - HISTORY);
      return next;
    });
  const lastAt = useRef(0);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry: number | undefined;
    let closed = false;

    const handle = (msg: any) => {
        if (msg.type === "frame") {
          lastAt.current = Date.now();
          setLinked(true);
          setFrame(msg);
          setHistory((h) => {
            const next = { ...h };
            for (const c of msg.crew) {
              const arr = (next[c.id] ?? []).concat({ t: msg.t, spo2: c.signal ? c.spo2_smooth : null, hr: c.hr, level: c.level });
              next[c.id] = arr.length > HISTORY ? arr.slice(arr.length - HISTORY) : arr;
            }
            return next;
          });
          if (msg.nasa) {
            // The recording loops: a jump back in time starts a fresh chart.
            const first = msg.nasa.points[0]?.t ?? 0;
            addNasa(msg.nasa.points, first === 0);
          }
        } else if (msg.type === "history") {
          const h: Record<string, HistoryPoint[]> = {};
          for (const f of msg.frames) for (const c of f.crew) (h[c.id] ??= []).push({ t: f.t, ...c });
          setHistory(h);
          setLog(msg.log);
          setSessions(msg.sessions ?? {});
          addNasa(msg.nasa ?? [], true);
        } else if (msg.type === "nasa_reset") {
          setNasaHistory({});
        } else if (msg.type === "reset") {
          setHistory({});
          setLog(msg.log);
          setSessions(msg.sessions ?? {});
        } else if (msg.type === "session") {
          setSession(msg.key, msg.session);
        } else if (msg.type === "log") {
          setLog((l) => l.concat(msg.entry));
        }
    };
    const connect = () => {
      ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
      ws.onmessage = (ev) => handle(JSON.parse(ev.data));
      ws.onclose = () => {
        if (!closed) retry = window.setTimeout(connect, 2000);
      };
    };
    connect();

    const watchdog = window.setInterval(() => setLinked(Date.now() - lastAt.current < 4000), 500);
    return () => {
      closed = true;
      clearTimeout(retry);
      clearInterval(watchdog);
      ws?.close();
    };
  }, []);

  return { frame, history, log, linked, sessions, setSession, nasaHistory };
}
