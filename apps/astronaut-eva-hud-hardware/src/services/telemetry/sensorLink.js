// Live link to the crewmember's ESP32 + MAX30102 (hardware/esp32_crewhealth).
// The board runs a WebSocket server and sends one JSON reading per second, e.g.
//   {"crew":"EV1","seq":812,"t_ms":812345,"spo2":97,"hr":78,"signal":true}
// SpO₂ and heart rate replace the HUD's readings; respiration too if a board sends "rr".
// O₂ reserve has no sensor and keeps its local value.

const params = new URLSearchParams(window.location.search);

export const SENSOR_WS_URL =
  params.get('sensor') ?? import.meta.env.VITE_SENSOR_WS_URL ?? 'ws://crewhealth-ev1.local:81/';
// Off in unit tests (they assert no stray timers) or with VITE_SENSOR_LINK=off to use the HUD on its own.
export const SENSOR_LINK_ENABLED =
  import.meta.env.MODE !== 'test' && import.meta.env.VITE_SENSOR_LINK !== 'off';

// Readings the HUD can use from one sensor message; nothing while the board reports no finger / weak signal.
export function sampleFromSensor(msg) {
  if (!msg || typeof msg !== 'object' || msg.signal === false) return null;
  const sample = {};
  if (Number.isFinite(msg.spo2)) sample.spo2 = Math.round(msg.spo2);
  if (Number.isFinite(msg.hr)) sample.heartRate = Math.round(msg.hr);
  if (Number.isFinite(msg.rr)) sample.respiration = Math.round(msg.rr);
  return Object.keys(sample).length ? sample : null;
}

// Calls onSample with each usable reading; reconnects every 2 s if the board is off. Returns a stop function.
export function connectSensor(onSample, { url = SENSOR_WS_URL } = {}) {
  let socket = null;
  let retry = null;
  let stopped = false;

  const open = () => {
    socket = new WebSocket(url);
    socket.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      const sample = sampleFromSensor(msg);
      if (sample) onSample(sample);
    };
    socket.onclose = () => {
      if (!stopped) retry = window.setTimeout(open, 2000);
    };
  };
  open();

  return () => {
    stopped = true;
    window.clearTimeout(retry);
    socket?.close();
  };
}
