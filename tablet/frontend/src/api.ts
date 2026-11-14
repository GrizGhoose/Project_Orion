import { useEffect, useRef, useState } from "react";
import type { AppConfig, Frame, HistoryPoint, LogEntry } from "./types";

const HISTORY = 360;

export async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

export function post(path: string, body: unknown) {
  return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
}

/** Live telemetry over WebSocket, with reconnect and loss-of-signal detection. */
export function useTelemetry(): Telemetry {
  const [frame, setFrame] = useState<Frame | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryPoint[]>>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const [linked, setLinked] = useState(false);
  const lastAt = useRef(0);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry: number | undefined;
    let closed = false;

    const connect = () => {
      ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === "frame") {
          lastAt.current = Date.now();
          setLinked(true);
          setFrame(msg);
          setHistory((h) => {
            const next = { ...h };
            for (const c of msg.crew) {
              const arr = (next[c.id] ?? []).concat({ t: msg.t, spo2: c.spo2_smooth, hr: c.hr, level: c.level });
              next[c.id] = arr.length > HISTORY ? arr.slice(arr.length - HISTORY) : arr;
            }
            return next;
          });
        } else if (msg.type === "history") {
          const h: Record<string, HistoryPoint[]> = {};
          for (const f of msg.frames) for (const c of f.crew) (h[c.id] ??= []).push({ t: f.t, ...c });
          setHistory(h);
          setLog(msg.log);
        } else if (msg.type === "reset") {
          setHistory({});
          setLog(msg.log);
        } else if (msg.type === "log") {
          setLog((l) => l.concat(msg.entry));
        }
      };
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

  return { frame, history, log, linked };
}
