import { useEffect, useState } from 'react';
import { HelmetHUD } from '../visor/HelmetHUD';
import './live.css';

export function LiveHUD() {
  const [device] = useState(() => new URLSearchParams(window.location.search).get('device') || 'astro01');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null);
  const [commandError, setCommandError] = useState('');
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const endpoint = `/api/devices/${encodeURIComponent(device)}`;
  useEffect(() => {
    let stopped = false;
    let timer;
    let controller;
    async function poll() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const response = await fetch(endpoint, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(`Gateway returned ${response.status}`);
        const next = await response.json();
        if (!stopped) { setData(next); setError(''); }
      } catch (e) {
        if (!stopped) setError(e.name === 'AbortError' ? 'Gateway timed out' : 'Gateway unavailable');
      } finally {
        clearTimeout(timeout);
        if (!stopped) timer = setTimeout(poll, 1000);
      }
    }
    poll();
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); };
  }, [endpoint]);

  const packet = data?.packet;
  const fastReports = packet?.schema === 3;
  const reading = packet?.history.at(-1);
  const simulated = reading?.source === 'simulated';
  const connected = Boolean(data?.fresh && data?.broker_connected && !error);
  const hrUsable = connected && (reading?.hr_valid ?? reading?.valid);
  const spo2Usable = connected && (reading?.spo2_valid ?? reading?.valid);
  const baseline = packet?.baseline;
  const acknowledged = pending && packet?.last_command_id === pending.id;
  const waiting = pending && !acknowledged && now - pending.at < 20000;
  const timedOut = pending && !acknowledged && !waiting;
  const severity = spo2Usable && ['WARNING', 'CRITICAL'].includes(reading.alert) ? reading.alert : 'NORMAL';
  const status = !connected ? (packet ? 'CONNECTION LOST' : 'WAITING FOR ESP32') : reading.state;

  async function restart() {
    setSending(true); setCommandError('');
    try {
      const response = await fetch(`${endpoint}/baseline/restart`, { method: 'POST' });
      if (!response.ok) throw new Error('Could not send baseline restart. Check the connection.');
      const result = await response.json();
      setPending({ id: result.command_id, at: Date.now() });
    } catch (e) { setCommandError(e.message); }
    finally { setSending(false); }
  }

  return (
    <div className="live-hud">
      <div className="live-visor">
        <HelmetHUD live deviceElapsed={reading?.t_ms ?? 0} severity={severity}
          heartRateElevated={Boolean(hrUsable && reading.hr_elevated)}
          telemetry={{ heartRate: hrUsable ? reading.hr : null, spo2: spo2Usable ? reading.spo2 : null,
            respiration: null, oxygen: null }} />
        <section className="live-status" aria-label="Live sensor status" aria-live="polite">
          <div className="live-eyebrow">{device} · {simulated ? 'ESP32 SIMULATED DATA' : 'ESP32 SENSOR'} · PROTOTYPE</div>
          <h1>{status.replaceAll('_', ' ')}</h1>
          {connected && reading.acquisition && reading.acquisition !== 'ok' && <p>Acquisition: {reading.acquisition.replaceAll('_', ' ')}. Measurements have not been evaluated.</p>}
          {connected && reading.hr_quality && <p>HR: {reading.hr_quality.replaceAll('_', ' ')} · SpO₂: {reading.spo2_quality.replaceAll('_', ' ')}.</p>}
          {connected && !reading.valid && !reading.acquisition && <p>Measurement unavailable: {reading.quality.replaceAll('_', ' ')}.</p>}
          {connected && !baseline.ready && <p>Startup baseline: {baseline.count}/{baseline.required} eligible samples, at least 6 seconds apart. {simulated ? 'Demo baseline collects automatically; allow at least 90 seconds.' : 'Rest and keep your finger still; allow at least 90 seconds.'}</p>}
          {baseline?.ready && <p>Baseline: {baseline.hr.toFixed(1)} BPM · {baseline.spo2.toFixed(1)}% SpO₂</p>}
          {!connected && <p>{error || 'Waiting for fresh telemetry from the Raspberry Pi.'}</p>}
          {(!spo2Usable && reading?.alert !== 'NORMAL' && reading?.alert) && <p>Last reported alert: {reading.alert}. Current oxygen condition unknown.</p>}
          {hrUsable && reading.hr_elevated && <p>Heart rate elevated relative to startup baseline.</p>}
          <p className="live-muted">{simulated ? 'HR and SpO₂ are generated on the ESP32 for demonstration. No sensor measurements.' : 'Respiration and suit oxygen reserve are not measured by this sensor.'}</p>
        </section>
      </div>
      <section className="live-history" aria-label="Measurement history">
        <div className="live-history-header">
          <div><h2>{fastReports ? 'Last 90 seconds' : 'Last 15 measurements'}</h2><p>{fastReports ? (simulated ? 'One simulated result every second · up to 90 results' : 'One result every second · latest 4-second optical window · up to 90 results') : 'One result every 6 seconds'} · stored on Raspberry Pi · invalid results stay in the log</p></div>
          <button onClick={restart} disabled={!connected || sending || waiting}>Start new baseline</button>
        </div>
        {waiting && <p role="status">Restart sent. Waiting for the ESP32 to acknowledge…</p>}
        {acknowledged && <p role="status">ESP32 acknowledged the new baseline session.</p>}
        {timedOut && <p role="alert">No restart acknowledgement received. Check the connection before retrying.</p>}
        {commandError && <p role="alert">{commandError}</p>}
        <p>Calibration session {packet?.calibration_id ?? '—'} · Last sample age: {data?.age_seconds ?? '—'} s{!connected && ' · historical data'}</p>
        <table><thead><tr><th>Sequence</th><th>Device uptime (s)</th><th>Heart rate (BPM)</th><th>SpO₂ (%)</th><th>State from ESP32</th><th>Signal</th></tr></thead>
          <tbody>{packet?.history.slice().reverse().map(r => <tr key={`${packet.boot_id}-${r.seq}`}>
            <td>{r.seq}</td><td>{(r.t_ms / 1000).toFixed(1)}</td><td>{r.hr ?? '—'}</td><td>{r.spo2 ?? '—'}</td>
            <td>{r.state}</td><td>{r.acquisition ? `Acquisition: ${r.acquisition.replaceAll('_', ' ')}; HR: ${r.hr_quality.replaceAll('_', ' ')}; SpO₂: ${r.spo2_quality.replaceAll('_', ' ')}` : r.quality.replaceAll('_', ' ')}</td>
          </tr>)}</tbody>
        </table>
        {!packet && <p>No measurements received yet.</p>}
      </section>
    </div>
  );
}
