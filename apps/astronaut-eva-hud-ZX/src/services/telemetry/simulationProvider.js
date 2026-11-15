import { generateFrame } from '../../simulation/telemetrySimulator';
import { advanceDetection } from '../../features/health/detectionEngine';
import { normaliseBaseline } from '../../features/health/detectionConfig';
import { SCENARIOS } from '../../simulation/scenarios';
import { createSnapshot } from '../../store/telemetryStore';

/**
 * Provider contract: start(onSnapshot, onConnection), command(command), stop().
 * BroadcastChannel transports commands and authoritative snapshots, not store mutations.
 * Lowest live peer ID wins; heartbeat expiry permits failover. No server required.
 */
export function createSimulationProvider({
  Channel = globalThis.BroadcastChannel,
  now = Date.now,
  id = globalThis.crypto.randomUUID(),
  seed = 42,
  tickMs = 1000,
} = {}) {
  let channel,
    timer,
    listener,
    connectionListener,
    stopped = true,
    counter = 0;
  let current = {
    frame: generateFrame({ seed }),
    history: [],
    events: [],
    paused: false,
    detectorState: null,
  };
  let lastTick = 0,
    started = 0;
  const peers = new Map();
  const handled = new Set();
  const leader = () =>
    [id, ...[...peers].filter(([, time]) => now() - time < 3500).map(([peer]) => peer)].sort()[0];
  const send = (message) => channel?.postMessage({ ...message, sender: id });
  const publish = () => {
    listener(current);
    send({ type: 'snapshot', snapshot: current });
  };
  function step({
    tick = current.frame.tick + 1,
    scenario = current.frame.scenario,
    baselines = current.frame.baselines,
    reset = false,
    resetCrew,
    commands = [],
  } = {}) {
    const raw = generateFrame({
      seed,
      scenario,
      tick,
      baselines,
      elapsedBase: current.frame.elapsed - current.frame.tick,
    });
    let previous = reset ? null : current.detectorState;
    if (resetCrew && previous) {
      previous = structuredClone(previous);
      delete previous.crew[resetCrew];
    }
    if (scenario === 'reaction' && tick === 0)
      commands = [...commands, { type: 'reaction-start', astronautId: 'EV1' }];
    const reaction = previous?.crew.EV1?.reaction;
    if (
      scenario === 'reaction' &&
      reaction?.status === 'waiting' &&
      raw.timestampMs >= reaction.stimulusAt + 1000
    )
      commands = [
        ...commands,
        {
          type: 'reaction-response',
          astronautId: 'EV1',
          reactionId: reaction.id,
          key: 'K',
          responseMs: 650,
        },
      ];
    const result = advanceDetection(previous, raw, baselines, commands);
    const frame = {
      ...raw,
      detectionVersion: 1,
      alerts: result.alerts,
      assessments: result.assessments,
      reactionChecks: Object.fromEntries(
        Object.entries(result.state.crew).map(([id, c]) => [id, c.reaction]),
      ),
      detectionEvents: result.events,
    };
    current = {
      ...createSnapshot(frame, current),
      paused: current.paused,
      detectorState: result.state,
    };
  }
  step({ tick: 0 });
  const record = (text, kind = 'configuration') => {
    current.events = [
      {
        id: `${id}-${kind}-${counter++}-${current.frame.timestampMs}`,
        time: current.frame.elapsed,
        text,
        kind,
        severity: 'normal',
        source: 'simulated',
      },
      ...current.events,
    ].slice(0, 40);
  };
  const apply = (command) => {
    if (command.type === 'pause') current = { ...current, paused: !current.paused };
    if (command.type === 'scenario' && SCENARIOS.some((s) => s.id === command.scenario)) {
      current = { ...current, frame: { ...current.frame, tick: 0 } };
      step({ scenario: command.scenario, tick: 0, reset: true });
      record(`Scenario · ${command.scenario}`, 'scenario');
    }
    if (command.type === 'advance')
      for (let i = 0; i < Math.min(600, Math.max(0, Math.floor(command.seconds || 0))); i++) step();
    if (
      command.type === 'baselines' &&
      current.frame.astronauts.some((a) => a.id === command.astronautId)
    ) {
      const id = command.astronautId;
      const baseline = normaliseBaseline(
        command.values || {},
        (current.frame.baselines[id]?.revision || 0) + 1,
      );
      step({
        tick: current.frame.tick,
        baselines: { ...current.frame.baselines, [id]: baseline },
        resetCrew: id,
      });
      record(`${id}: simulated pre-EVA baselines changed; crew detector history restarted.`);
    }
    if (['reaction-start', 'reaction-response', 'reaction-ack'].includes(command.type))
      step({ tick: current.frame.tick, commands: [command] });
    if (command.type === 'reset') {
      current = {
        frame: generateFrame({ seed }),
        history: [],
        events: [],
        paused: false,
        detectorState: null,
      };
      step({ tick: 0, reset: true });
    }
    lastTick = now();
    publish();
  };
  return {
    start(onSnapshot, onConnection) {
      if (!stopped) return;
      stopped = false;
      listener = onSnapshot;
      connectionListener = onConnection;
      started = now();
      lastTick = started;
      try {
        channel = Channel ? new Channel('eva-telemetry-v2') : null;
      } catch {
        channel = null;
      }
      if (channel) {
        channel.onmessage = ({ data }) => {
          if (!data?.sender || data.sender === id) return;
          peers.set(data.sender, now());
          if (data.type === 'hello') {
            send({ type: 'heartbeat' });
            send({ type: 'welcome', target: data.sender, snapshot: current });
          }
          // A joining tab must inherit the active session before it can win election.
          if (
            data.type === 'welcome' &&
            data.target === id &&
            now() - started < 800 &&
            data.snapshot.frame.elapsed >= current.frame.elapsed
          ) {
            current = data.snapshot;
            listener(current);
          }
          if (data.type === 'snapshot' && data.sender === leader()) {
            current = data.snapshot;
            listener(current);
          }
          if (data.type === 'command' && leader() === id && !handled.has(data.commandId)) {
            handled.add(data.commandId);
            if (handled.size > 256) handled.delete(handled.values().next().value);
            apply(data.command);
          }
        };
        send({ type: 'hello' });
      }
      listener(current);
      const pulse = () => {
        for (const [peer, time] of peers) if (now() - time > 3500) peers.delete(peer);
        send({ type: 'heartbeat' });
        const authority = leader() === id;
        connectionListener(channel ? (authority ? 'source' : 'synced') : 'standalone');
        if (authority && now() - started >= 800 && now() - lastTick >= tickMs) {
          if (!current.paused) step();
          publish();
          lastTick = now();
        }
      };
      pulse();
      timer = setInterval(pulse, 500);
    },
    command(command) {
      if (stopped) return;
      if (leader() === id) apply(command);
      else send({ type: 'command', commandId: `${id}-${counter++}`, command });
    },
    stop() {
      stopped = true;
      clearInterval(timer);
      channel?.close();
      channel = null;
      peers.clear();
      handled.clear();
    },
  };
}
