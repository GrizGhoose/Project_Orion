import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { readFile } from 'node:fs/promises';
import { request } from 'node:http';

test('production disables GET reset while preserving POST JSON reset', { timeout: 10000 }, async () => {
  const base = 'http://127.0.0.1:18083';
  const server = spawn(process.execPath, ['demo/server.mjs'], { env: { ...process.env, NODE_ENV:'production', PORT:'18083' }, stdio:'pipe' });
  try {
    await new Promise((resolve,reject) => { server.stdout.once('data',resolve); server.once('error',reject); server.once('exit',code=>reject(new Error(`Server exited: ${code}`))); });
    assert.equal((await fetch(`${base}/sync/reset`)).status, 403);
    assert.equal((await (await fetch(`${base}/sync/state`)).json()).initialized, false);
    const response = await fetch(`${base}/sync/reset`, {method:'POST'});
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);
    const snapshot = await (await fetch(`${base}/sync/state`)).json();
    assert.equal(snapshot.astronauts.EV1.severity, 'NORMAL');
    assert.ok(snapshot.elapsedMs < 500);
  } finally {
    server.kill();
  }
});

for (const method of ['GET', 'POST']) test(`${method} reset: shared Scenario 3 progression, bidirectional resolution and replay`, { timeout: 40000 }, async () => {
  const port = method === 'GET' ? 18082 : 18081;
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['demo/server.mjs'], { env: { ...process.env, NODE_ENV: 'development', PORT: String(port) }, stdio: 'pipe' });
  const controllers = [];
  try {
    await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', (code) => reject(new Error(`Server exited: ${code}`))); });
    const before = await (await fetch(`${base}/sync/state`)).json();
    assert.equal(before.initialized, false);
    for (const headers of [{ host: 'external.example' }, { origin: 'https://external.example' }, { 'sec-fetch-site': 'cross-site' }, { 'x-forwarded-for': '127.0.0.1' }]) {
      // Use raw HTTP: fetch normalizes restricted Host / Fetch Metadata headers.
      const status = await new Promise((resolve,reject) => {
        request(`${base}/sync/reset`, { headers }, res => { res.resume(); resolve(res.statusCode); }).on('error',reject).end();
      });
      assert.equal(status, 403, JSON.stringify(headers));
      assert.equal((await (await fetch(`${base}/sync/state`)).json()).initialized, false);
    }
    const unsupported = await fetch(`${base}/sync/reset`, { method:'PUT' });
    assert.equal(unsupported.status, 405);
    assert.equal(unsupported.headers.get('allow'), 'GET, POST');
    const firstReset = await fetch(`${base}/sync/reset`, { method });
    assert.equal(firstReset.status, 200);
    assert.equal(firstReset.headers.get('cache-control'), 'no-store');
    if (method === 'GET') {
      assert.match(firstReset.headers.get('content-type'), /text\/html/);
      const html = await firstReset.text();
      assert.match(html, /Demo reset successfully/);
      assert.match(html, /href="\/hud\/\?sync=1"/);
      assert.match(html, /href="\/tablet\/\?sync=1"/);
    } else assert.equal((await firstReset.json()).ok, true);
    async function connect() {
      const controller = new AbortController();
      controllers.push(controller);
      const res = await fetch(`${base}/sync/events`, { signal: controller.signal });
      assert.equal(res.headers.get('content-type'), 'text/event-stream');
      const messages = [];
      const reader = res.body.getReader();
      let buffer = '';
      const task = (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += new TextDecoder().decode(value);
            let index;
            while ((index = buffer.indexOf('\n\n')) !== -1) {
              const chunk = buffer.slice(0, index);
              buffer = buffer.slice(index + 2);
              if (chunk.startsWith('data: ')) messages.push(JSON.parse(chunk.slice(6)));
            }
          }
        } catch (error) { if (error.name !== 'AbortError') throw error; }
      })();
      await delay(75);
      return { messages, controller, task };
    }
    const hud = await connect();
    const tablet = await connect();
    const initial = hud.messages.find(m => m.type === 'demo');
    assert.equal(initial.astronauts.EV1.severity, 'NORMAL');
    assert.equal(tablet.messages.find(m => m.type === 'demo').sessionId, initial.sessionId);
    // Observe the real 15s scenario start and its natural Warning/Critical progression.
    await delay(23500);
    for (const client of [hud, tablet]) {
      const states = client.messages.filter(m => m.type === 'demo');
      assert.ok(states.some(m => m.elapsedMs < 15000));
      assert.ok(states.filter(m => m.elapsedMs < 15000).every(m => m.scenario === null && m.astronauts.EV1.spo2 === 98 && m.astronauts.EV1.heartRate === 72));
      const started = states.find(m => m.scenario === 'combined');
      assert.ok(started.elapsedMs >= 15000 && started.elapsedMs < 15200);
      assert.ok(states.some(m=>m.astronauts.EV1.spo2 < 98 && m.astronauts.EV1.spo2 > 92));
      assert.ok(states.filter(m => m.elapsedMs < 21100).every(m => m.astronauts.EV1.severity === 'NORMAL'));
      const warning = states.find(m => m.astronauts.EV1.severity === 'WARNING');
      assert.ok(warning.elapsedMs >= 21100 && warning.elapsedMs < 21300);
      assert.ok(states.filter(m => m.elapsedMs >= 21100 && m.elapsedMs < 23100).every(m => m.astronauts.EV1.severity === 'WARNING'));
      const critical = states.find(m => m.astronauts.EV1.severity === 'CRITICAL');
      assert.ok(critical.elapsedMs >= 23100 && critical.elapsedMs < 23300, `Critical published at ${critical.elapsedMs}`);
      assert.equal(critical.astronauts.EV1.heartRate, 120);
      assert.ok(states.every(m => m.astronauts.EV2.severity === 'NORMAL'));
      const frames = client.messages.filter(m => m.type === 'frame');
      assert.ok(frames.some(m => m.crew[0].level === 'CRITICAL'));
      assert.ok(frames.some(m=>m.crew[0].level === 'WARNING'));
      assert.ok(frames.every(m => m.crew[1].level === 'NOMINAL'));
      assert.ok(frames.filter(m=>m.crew[0].level === 'CRITICAL').every(m=>m.crew[0].spo2 === 92 && m.crew[0].hr === 120));
    }
    const hudAt = hud.messages.find(m => m.type === 'demo' && m.astronauts.EV1.severity === 'CRITICAL');
    const tabletAt = tablet.messages.find(m => m.type === 'demo' && m.astronauts.EV1.severity === 'CRITICAL');
    assert.ok(Math.abs(hudAt.elapsedMs - tabletAt.elapsedMs) < 50);
    hud.controller.abort();
    await hud.task;
    const reopened = await connect();
    const recovered = reopened.messages.find(m => m.type === 'demo');
    assert.equal(recovered.sessionId, initial.sessionId);
    assert.equal(recovered.astronauts.EV1.severity, 'CRITICAL');
    const proto = JSON.parse(await readFile('apps/tablet/frontend/public/demo/data.json', 'utf8')).protocols.hypoxia;
    const context = { demoSessionId: initial.sessionId, incidentId: initial.incident.id };
    const command = { ...context, crew:'EV1', protocol:'hypoxia', completed:true, recover:true };
    const post = (path, body) => fetch(`${base}/sync/api/${path}`, { method:'POST', body:JSON.stringify(body) });
    const state = async () => (await fetch(`${base}/sync/state`)).json();
    assert.equal((await post('ack', {crew:'EV1'})).status, 200);
    assert.equal((await state()).incident.status, 'CRITICAL');
    assert.equal((await post('resolve', command)).status, 409, 'Cannot resolve before a response exists');
    const save = response => fetch(`${base}/sync/api/sessions/hypoxia/EV1`, {method:'PUT', body:JSON.stringify({...context, ...response})});
    const put = await save({ path: [proto.start] });
    assert.equal(put.status, 200);
    const late = await connect();
    assert.deepEqual(late.messages.find(m => m.type === 'history').sessions['hypoxia:EV1'].path, [proto.start]);
    assert.equal((await state()).incident.status, 'RESPONSE_IN_PROGRESS');
    assert.equal((await post('treat', {crew:'EV1'})).status, 200);
    assert.equal((await state()).astronauts.EV1.severity, 'CRITICAL');
    assert.equal((await post('resolve', command)).status, 409, 'Starting or treating is not completion');
    assert.equal((await post('resolve', {...command, recover:false})).status, 409);
    assert.equal((await post('resolve', {...command, crew:'EV2'})).status, 409);
    assert.equal((await post('resolve', {...command, demoSessionId:'old'})).status, 409);
    // Follow actual edges to an end node; the browser uses this same protocol graph.
    const queue = [[proto.start]];
    let endPath;
    while (queue.length) {
      const path = queue.shift();
      const node = proto.nodes[path.at(-1)];
      if (path.at(-1) === 'end_ok') { endPath = path; break; }
      const next = [node.next, node.alt?.next, ...Object.values(node.next_if ?? {}), ...(node.options ?? []).map(o=>o.next), ...Object.values(node.rules ?? {})];
      for (const id of next.filter(id=>id && !path.includes(id))) queue.push([...path,id]);
    }
    assert.ok(endPath);
    assert.equal((await save({path:endPath})).status, 200);
    assert.equal((await state()).astronauts.EV1.severity, 'CRITICAL', 'Reaching end is not the Finish action');
    assert.equal((await post('resolve', {...command, completed:false})).status, 409);
    assert.equal((await post('resolve', command)).status, 200);
    assert.equal((await post('resolve', command)).status, 200, 'Completion retries are idempotent');
    await delay(1000);
    for (const client of [tablet, reopened]) {
      const snapshot = client.messages.filter(m=>m.type==='demo').at(-1);
      assert.equal(snapshot.incident.status, 'NORMAL');
      assert.ok(snapshot.incident.resolvedAtMs >= 20000);
      assert.equal(snapshot.astronauts.EV1.severity, 'NORMAL');
      assert.equal(client.messages.filter(m=>m.type==='frame').at(-1).crew[0].level, 'NOMINAL');
    }
    assert.equal(tablet.messages.filter(m=>m.type==='incident-resolved').length, 1);
    const refreshed = await connect();
    assert.equal(refreshed.messages.find(m=>m.type==='demo').astronauts.EV1.severity, 'NORMAL');
    assert.deepEqual((await state()).incident.transitions.map(t=>t.status), ['NORMAL','WARNING','CRITICAL','RESPONSE_IN_PROGRESS','RESOLVED','NORMAL']);
    assert.equal((await (await fetch(`${base}/sync/api/log`)).json()).filter(e => e.extra?.severity === 'CRITICAL').length, 1);
    const reset = await fetch(`${base}/sync/reset`, { method });
    assert.equal(reset.status, 200);
    await delay(75);
    const replay = tablet.messages.filter(m => m.type === 'demo').at(-1);
    assert.notEqual(replay.sessionId, initial.sessionId);
    assert.equal(replay.astronauts.EV1.severity, 'NORMAL');
    assert.ok(replay.elapsedMs < 500);
    const resetMessage = tablet.messages.filter(m=>m.type==='reset').at(-1);
    assert.deepEqual(resetMessage.log, []);
    assert.deepEqual(resetMessage.sessions, {});
    assert.deepEqual(await (await fetch(`${base}/sync/api/log`)).json(), []);
    const resetClient = await connect();
    assert.deepEqual(resetClient.messages.find(m=>m.type==='history').sessions, {});
    assert.equal((await post('resolve', command)).status, 409, 'Previous incident cannot resolve a replay');
  } finally {
    controllers.forEach(c => c.abort());
    server.kill();
  }
});
