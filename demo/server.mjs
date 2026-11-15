import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DemoSession, tabletFrame, completedResponse, SCENARIO_START_MS, DEMO_BASELINE } from './session.mjs';
import { allowGetReset } from './resetAccess.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const data = JSON.parse(await readFile(resolve(root, 'apps/tablet/frontend/public/demo/data.json'), 'utf8'));
const session = new DemoSession();
const clients = new Set();
const send = (res, msg) => res.write(`data: ${JSON.stringify(msg)}\n\n`);
function publish(res) {
  const snapshot = currentSnapshot();
  send(res, snapshot);
  send(res, tabletFrame(snapshot, data.config.crew, session.acked));
}
function broadcast(msg) {
  for (const res of clients) send(res, msg);
}
function resetDemo() {
  session.reset();
  broadcast({ type: 'reset', log: [], sessions: {} });
  for (const client of clients) publish(client);
  return { ok: true, sessionId: session.id };
}
function currentSnapshot() {
  const previous = session.log.at(-1);
  const snapshot = session.snapshot();
  for (const entry of session.log.slice(session.log.indexOf(previous) + 1)) broadcast({ type: 'log', entry });
  return snapshot;
}
const json = (res, value, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
};
async function body(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100000) throw new Error('Request too large');
  }
  return JSON.parse(raw || '{}');
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    if (path === '/sync/events' && req.method === 'GET') {
      // First connected interface establishes time zero; reconnects never reset it.
      session.initialize();
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write('retry: 500\n\n');
      clients.add(res);
      send(res, { type: 'history', frames: [], log: session.log, sessions: session.sessions });
      publish(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (path === '/sync/reset') {
      if (req.method === 'POST') return json(res, resetDemo());
      if (req.method === 'GET') {
        if (!allowGetReset(req)) return json(res, { error: 'GET reset is available only through a direct local development connection. Use POST for remote reset.' }, 403);
        resetDemo();
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Demo reset</title></head><body><h1>Demo reset successfully</h1><p>The shared timeline has restarted. Scenario 3 begins at 15 seconds.</p><p><a href="/hud/?sync=1">Open HUD</a> · <a href="/tablet/?sync=1">Open tablet</a></p></body></html>');
      }
      res.setHeader('Allow', 'GET, POST');
      return json(res, { error: 'Method not allowed' }, 405);
    }
    if (path === '/sync/state') return json(res, session.started === null ? { initialized: false } : currentSnapshot());
    if (path.startsWith('/sync/api/')) {
      const api = path.slice('/sync'.length);
      if (req.method === 'GET') {
        if (api === '/api/config') return json(res, { ...data.config, thresholds: { ...data.config.thresholds, baseline_s: 0,
          warning_z: -3, warning_hold_s: DEMO_BASELINE.warningDurationMs / 1000, critical_hold_s: DEMO_BASELINE.criticalDurationMs / 1000 },
          scenarios: { 'synchronized-demo': 'Scenario 3 starts at 15s (use ?sync=0 for manual scenarios)' } });
        if (api === '/api/log') return json(res, session.log);
        if (api.startsWith('/api/protocols/')) return json(res, data.protocols[api.split('/').at(-1)]);
        if (api === '/api/dcs/options') {
          const ts = Number(url.searchParams.get('ts_min') ?? 180), amb = url.searchParams.get('ambulation') !== 'false';
          return json(res, { ts_min: ts, ambulation: amb, site_psia: 4.3,
            options: data.dcs_options.map((o) => {
              const dp = o.total_psia - 4.3;
              return { ...o, dp_psid: Math.round(dp * 10) / 10, p_resolution: dp <= 0 ? 0 : Math.round(100 / (1 + Math.exp(-(Math.log(dp) - 1.51 + 0.795 * Number(amb) - 0.00308 * ts) / 0.478))) / 100 };
            }), source: 'NASA TP-2014-218561', note: 'Scripted demo; prototype guidance only.' });
        }
      }
      if (api.startsWith('/api/sessions/')) {
        const [, , , protocol, crew] = api.split('/');
        const key = `${protocol}:${crew}`;
        if (req.method === 'PUT') {
          const cmd = await body(req);
          if (!session.incident || cmd.demoSessionId !== session.id || cmd.incidentId !== session.incident.id) return json(res, { error: 'Stale demo session. Reopen the response.' }, 409);
          if (key === 'hypoxia:EV1' && session.incident.resolvedAtMs !== null) return json(res, { error: 'This incident is already resolved.' }, 409);
          session.sessions[key] = { ...cmd, protocol, crew, updated: Date.now() / 1000 };
          if (key === 'hypoxia:EV1' && session.beginResponse()) broadcast({ type: 'log', entry: session.log.at(-1) });
        }
        else if (req.method === 'DELETE') {
          if (url.searchParams.get('sessionId') !== session.id) return json(res, { error: 'Stale demo session.' }, 409);
          delete session.sessions[key];
        }
        else return json(res, { error: 'Method not allowed' }, 405);
        broadcast({ type: 'session', key, session: session.sessions[key] ?? null });
        for (const client of clients) publish(client);
        return json(res, { ok: true });
      }
      if (req.method === 'POST') {
        const cmd = await body(req);
        if (api === '/api/sim') return json(res, { error: 'Timed demo is fixed at 1x. Use ?sync=0 for manual scenarios.' }, 409);
        if (api === '/api/resolve') {
          currentSnapshot();
          if (cmd.demoSessionId !== session.id || cmd.incidentId !== session.incident.id) return json(res, { error: 'Stale demo incident.' }, 409);
          if (cmd.crew !== 'EV1' || cmd.protocol !== 'hypoxia' || cmd.completed !== true || cmd.recover !== true) return json(res, { error: 'Successful hypoxia response completion is required.' }, 409);
          // Duplicate completion requests are safe even after the response session is removed.
          if (session.incident.resolvedAtMs !== null) return json(res, { ok: true, resolved: true });
          const response = session.sessions['hypoxia:EV1'];
          const proto = data.protocols.hypoxia;
          if (!completedResponse(proto, response)) return json(res, { error: 'Finish the existing response workflow first.' }, 409);
          if (!session.resolveIncident()) return json(res, { error: 'No active response to complete.' }, 409);
          broadcast({ type: 'log', entry: session.log.at(-1) });
          broadcast({ type: 'incident-resolved', sessionId: session.id, incidentId: session.incident.id, crew: 'EV1' });
          for (const client of clients) publish(client);
          return json(res, { ok: true, resolved: true });
        }
        if (api === '/api/ack') session.acked = cmd.crew === 'EV1' || session.acked;
        if (['/api/ack', '/api/log', '/api/treat'].includes(api)) {
          const entry = session.addLog(cmd.crew, cmd.kind ?? 'sim', cmd.text ?? `Scenario 3 demo: ${api.split('/').at(-1)} recorded; monitoring continues.`, cmd.extra);
          broadcast({ type: 'log', entry });
          for (const client of clients) publish(client);
          return json(res, entry);
        }
      }
      return json(res, { error: 'Unknown API' }, 404);
    }
    const app = path.startsWith('/hud/') ? ['apps/astronaut-eva-hud-ZX/dist', '/hud/'] : path.startsWith('/tablet/') ? ['apps/tablet/frontend/dist', '/tablet/'] : null;
    if (!app) { res.writeHead(302, { Location: '/hud/?sync=1' }); return res.end(); }
    const base = resolve(root, app[0]);
    let file = resolve(base, decodeURIComponent(path.slice(app[1].length)) || 'index.html');
    if (!file.startsWith(base + sep)) return json(res, { error: 'Forbidden' }, 403);
    try { if (!(await stat(file)).isFile()) file = resolve(base, 'index.html'); }
    catch { file = resolve(base, 'index.html'); }
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(content);
  } catch (error) {
    if (!res.headersSent) json(res, { error: error.message }, 500);
    else res.end();
  }
});
// State derives from monotonic elapsed time, never from number of timer callbacks.
// 50 ms snapshots repair missed events; a dedicated deadline starts Scenario 3.
let deadline;
let scheduledSession;
const pulse = setInterval(() => {
  if (session.started === null) return;
  const snapshot = currentSnapshot();
  if (scheduledSession !== session.id) {
    scheduledSession = session.id;
    clearTimeout(deadline);
    const atBoundary = () => {
      const remaining = SCENARIO_START_MS - (session.now() - session.started);
      if (remaining > 0) deadline = setTimeout(atBoundary, remaining);
      else for (const client of clients) publish(client);
    };
    atBoundary();
  }
  for (const client of clients) {
    send(client, snapshot);
    send(client, tabletFrame(snapshot, data.config.crew, session.acked));
  }
}, 50);
server.on('close', () => { clearInterval(pulse); clearTimeout(deadline); });
const port = Number(process.env.PORT ?? 8080);
server.listen(port, '0.0.0.0', () => console.log(`Demo: http://localhost:${port}/hud/?sync=1 and http://localhost:${port}/tablet/?sync=1`));
