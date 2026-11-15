import { useEffect, useRef, useState } from "react";
import { demoEngine } from "./demo/engine";
import type { AppConfig, Frame, HistoryPoint, LogEntry, Session } from "./types";

const HISTORY = 360;

/** Hosted build (Vercel): no server, the detector and mission sim run in the browser (src/demo). */
export const DEMO = import.meta.env.VITE_DEMO === "1";
export const SYNC_DEMO = new URLSearchParams(location.search).get("sync") === "1";
const apiPath = (path: string) => SYNC_DEMO ? `/sync${path}` : path;

export async function getJSON<T>(path: string): Promise<T> {
  if (DEMO && !SYNC_DEMO) return (await demoEngine().get(path)) as T;
  const r = await fetch(apiPath(path));
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

export async function post(path: string, body: unknown) {
  if (DEMO && !SYNC_DEMO) return demoEngine().post(path, body as Record<string, unknown>);
  return fetch(apiPath(path), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export async function saveSession(s: Session) {
  if (DEMO && !SYNC_DEMO) return demoEngine().putSession(s);
  return fetch(apiPath(`/api/sessions/${s.protocol}/${s.crew}`), {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s),
  });
}

export async function deleteSession(protocol: string, crew: string, demoSessionId?: string) {
  if (DEMO && !SYNC_DEMO) return demoEngine().deleteSession(protocol, crew);
  return fetch(apiPath(`/api/sessions/${protocol}/${crew}`) + (SYNC_DEMO ? `?sessionId=${encodeURIComponent(demoSessionId ?? '')}` : ''), { method: "DELETE" });
}

/** Finish only after the server stores the final response node and accepts resolution. */
export async function completeSyncedResponse(s: Session) {
  const saved = await saveSession(s);
  // A previous completion may have succeeded before its HTTP acknowledgement was lost.
  // In that case the idempotent resolve endpoint accepts the same incident again.
  if (saved instanceof Response && !saved.ok && saved.status !== 409) throw new Error('Could not save the response. Check the connection and retry.');
  const result = await post('/api/resolve', {
    crew: s.crew, protocol: s.protocol, demoSessionId: s.demoSessionId, incidentId: s.incidentId,
    completed: true, reason: 'Response complete', recover: true,
  });
  if (result instanceof Response && !result.ok) throw new Error('Could not complete the response. Check the connection and retry.');
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
  sessions: Record<string, Session>;
  setSession: (key: string, s: Session | null) => void;
}

/** Live telemetry over WebSocket (or from the in-browser engine), with reconnect and loss-of-signal detection. */
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
              const previous = next[c.id] ?? [];
              const earlier = SYNC_DEMO && Math.floor(previous[previous.length - 1]?.t ?? -1) === Math.floor(msg.t) ? previous.slice(0, -1) : previous;
              const arr = earlier.concat({ t: msg.t, spo2: c.spo2_smooth, hr: c.hr, level: c.level });
              next[c.id] = arr.length > HISTORY ? arr.slice(arr.length - HISTORY) : arr;
            }
            return next;
          });
        } else if (msg.type === "history") {
          const h: Record<string, HistoryPoint[]> = {};
          for (const f of msg.frames) for (const c of f.crew) (h[c.id] ??= []).push({ t: f.t, ...c });
          setHistory(h);
          setLog(msg.log);
          setSessions(msg.sessions ?? {});
        } else if (msg.type === "reset") {
          setFrame(null);
          setHistory({});
          setLog(msg.log);
          setSessions(msg.sessions ?? {});
        } else if (msg.type === "session") {
          setSession(msg.key, msg.session);
        } else if (msg.type === "log") {
          setLog((l) => l.concat(msg.entry));
        }
    };
    let unsubscribe: (() => void) | undefined;
    let source: EventSource | undefined;
    const connect = () => {
      ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
      ws.onmessage = (ev) => handle(JSON.parse(ev.data));
      ws.onclose = () => {
        if (!closed) retry = window.setTimeout(connect, 2000);
      };
    };
    if (SYNC_DEMO) {
      source = new EventSource('/sync/events');
      source.onmessage = (event) => handle(JSON.parse(event.data));
      source.onerror = () => setLinked(false);
    }
    else if (DEMO) unsubscribe = demoEngine().subscribe(handle);
    else connect();

    const watchdog = window.setInterval(() => setLinked(Date.now() - lastAt.current < 4000), 500);
    return () => {
      closed = true;
      clearTimeout(retry);
      clearInterval(watchdog);
      ws?.close();
      source?.close();
      unsubscribe?.();
    };
  }, []);

  return { frame, history, log, linked, sessions, setSession };
}
