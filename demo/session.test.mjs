import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DemoSession, tabletFrame, completedResponse } from './session.mjs';
import { createMonitoringState, monitoringReducer } from '../apps/astronaut-eva-hud-ZX/src/features/monitoring/monitoringState.js';

test('Scenario 3 starts at 15s and progresses through the unchanged detector', () => {
  let now = 100;
  const session = new DemoSession(() => now);
  assert.equal(session.started, null);
  const initial = session.snapshot();
  assert.equal(initial.elapsedMs, 0);
  now += 14999.99;
  assert.equal(session.snapshot().astronauts.EV1.severity, 'NORMAL');
  assert.equal(session.snapshot().scenario, null);
  now = 15100;
  assert.equal(session.snapshot().astronauts.EV1.scenario.startedAt, 15000);
  assert.equal(session.snapshot().astronauts.EV1.spo2, 98, 'Original 2-second baseline is preserved');
  now = 17600;
  assert.equal(session.snapshot().astronauts.EV1.spo2, 96.5);
  assert.equal(session.snapshot().astronauts.EV1.heartRate, 84);
  now = 18100;
  assert.equal(session.snapshot().astronauts.EV1.spo2, 95);
  assert.equal(session.snapshot().astronauts.EV1.engine.breachSince, null, '95% is not strictly below the gate');
  now = 18200;
  assert.equal(session.snapshot().astronauts.EV1.engine.breachSince, 18100);
  now = 21199.99;
  assert.equal(session.snapshot().astronauts.EV1.severity, 'NORMAL');
  now = 21200;
  const warning = session.snapshot();
  assert.equal(warning.astronauts.EV1.severity, 'WARNING');
  assert.equal(tabletFrame(warning, [{id:'EV1'}]).crew[0].level, 'WARNING');
  now = 23199.99;
  assert.equal(session.snapshot().astronauts.EV1.severity, 'WARNING');
  now = 23200;
  const critical = session.snapshot();
  assert.equal(critical.elapsedMs, 23100);
  assert.equal(critical.astronauts.EV1.severity, 'CRITICAL');
  assert.equal(critical.astronauts.EV2.severity, 'NORMAL');
  assert.equal(critical.astronauts.EV1.spo2, 92);
  for (let i = 0; i < 20; i++) session.snapshot();
  assert.equal(session.log.length, 3);
  now += 60000;
  session.initialize(); // another page connecting
  const late = session.snapshot();
  assert.equal(late.sessionId, initial.sessionId);
  assert.equal(late.elapsedMs, 83100);
  assert.equal(late.astronauts.EV1.severity, 'CRITICAL');
  const frame = tabletFrame(late, [{ id: 'EV1' }, { id: 'EV2' }]);
  assert.deepEqual(frame.crew.map(c => c.level), ['CRITICAL', 'NOMINAL']);
  assert.deepEqual(frame.crew.map(c => c.spo2), [92, 98]);
  assert.equal(frame.source, 'scripted-demo');
  session.reset();
  const replay = session.snapshot();
  assert.notEqual(replay.sessionId, initial.sessionId);
  assert.equal(replay.elapsedMs, 0);
  assert.equal(replay.astronauts.EV1.severity, 'NORMAL');
  assert.equal(session.log.length, 0);
});

test('successful response resolves once, keeps time, clears both crew views and never retriggers', () => {
  let now = 0;
  const session = new DemoSession(() => now);
  const initial = session.snapshot();
  assert.equal(session.resolveIncident(), false);
  now = 23100;
  assert.equal(session.snapshot().incident.status, 'CRITICAL');
  assert.equal(session.resolveIncident(), false, 'Opening the incident is not completion');
  assert.equal(session.beginResponse(), true);
  assert.equal(session.beginResponse(), false);
  assert.equal(session.snapshot().astronauts.EV1.severity, 'CRITICAL');
  assert.equal(session.snapshot().incident.status, 'RESPONSE_IN_PROGRESS');
  now = 95000;
  assert.equal(session.resolveIncident(), true);
  assert.equal(session.resolveIncident(), false);
  const resolved = session.snapshot();
  assert.equal(resolved.sessionId, initial.sessionId);
  assert.equal(resolved.elapsedMs, 95000);
  assert.equal(resolved.incident.resolvedAtMs, 95000);
  assert.equal(resolved.scenario, null);
  assert.deepEqual(resolved.incident.transitions.map(t => t.status), ['NORMAL', 'WARNING', 'CRITICAL', 'RESPONSE_IN_PROGRESS', 'RESOLVED', 'NORMAL']);
  assert.deepEqual(Object.values(resolved.astronauts).map(a => a.severity), ['NORMAL', 'NORMAL']);
  assert.deepEqual(tabletFrame(resolved, [{id:'EV1'}, {id:'EV2'}]).crew.map(c => c.level), ['NOMINAL', 'NOMINAL']);
  now = 600000;
  session.initialize();
  assert.equal(session.snapshot().astronauts.EV1.severity, 'NORMAL');
  assert.equal(session.log.filter(e => e.kind === 'resolve').length, 1);
  session.reset();
  now += 23100;
  assert.equal(session.snapshot().astronauts.EV1.severity, 'CRITICAL');
});

test('every 100ms physiology and detector state matches the existing manual Scenario 3 reducer', () => {
  let now = 0;
  const session = new DemoSession(() => now);
  session.snapshot();
  let manual = createMonitoringState();
  for (now = 0; now <= 30000; now += 100) {
    if (now === 15000) manual = monitoringReducer(manual, {type:'scenario', id:'combined', now});
    if (now >= 15000) manual = monitoringReducer(manual, {type:'tick', now});
    const a = session.snapshot().astronauts.EV1;
    assert.deepEqual({spo2:a.spo2, heartRate:a.heartRate, respiration:a.respiration, oxygen:a.oxygen}, manual.telemetry, `telemetry at ${now}`);
    assert.deepEqual(a.engine, manual.engine, `detector at ${now}`);
    assert.equal(a.severity, manual.engine.severity);
  }
});

test('late snapshots replay missed samples and retain Warning before Critical in the authoritative history', () => {
  let now = 0;
  const session = new DemoSession(() => now);
  session.snapshot();
  now = 60000;
  const late = session.snapshot();
  assert.deepEqual(late.incident.transitions.map(t=>[t.status,t.elapsedMs]), [['NORMAL',0],['WARNING',21100],['CRITICAL',23100]]);
  assert.equal(late.astronauts.EV1.heartRate, 120);
  assert.equal(session.log.filter(e=>e.text.includes('started at 15')).length, 1);
});

test('a response can start and finish during Warning without later escalation or retrigger', () => {
  let now = 0;
  const session = new DemoSession(() => now);
  session.snapshot();
  now = 21100;
  assert.equal(session.snapshot().astronauts.EV1.severity, 'WARNING');
  assert.equal(session.beginResponse(), true);
  assert.equal(session.snapshot().astronauts.EV1.severity, 'WARNING');
  assert.equal(session.resolveIncident(), true);
  now = 180000;
  assert.equal(session.snapshot().astronauts.EV1.severity, 'NORMAL');
  assert.equal(session.snapshot().astronauts.EV1.heartRate, 72);
  assert.equal(session.log.some(e=>e.extra?.severity==='CRITICAL'), false);
});

test('monitoring continues during a Warning response and escalation re-arms acknowledgement', () => {
  let now = 0;
  const session = new DemoSession(() => now);
  session.snapshot();
  now = 21100;
  session.snapshot();
  session.acked = true;
  assert.equal(session.beginResponse(), true);
  now = 23100;
  const critical = session.snapshot();
  assert.equal(critical.incident.status, 'RESPONSE_IN_PROGRESS');
  assert.equal(critical.astronauts.EV1.severity, 'CRITICAL');
  assert.equal(session.acked, false);
  assert.equal(session.resolveIncident(), true);
  now = 120000;
  assert.equal(session.snapshot().astronauts.EV1.severity, 'NORMAL');
});

test('completion requires a connected protocol path ending at an end node', () => {
  const proto = { start:'call', nodes:{ call:{options:[{next:'aid'}]}, aid:{next:'end'}, end:{type:'end'} } };
  assert.equal(completedResponse(proto, {path:['call']}), false);
  assert.equal(completedResponse(proto, {path:['call','end']}), false);
  assert.equal(completedResponse(proto, {path:['end']}), false);
  assert.equal(completedResponse(proto, {path:['call','aid','end']}), true);
});
