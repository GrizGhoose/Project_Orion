import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../../app/App';

const snapshot = (changes = {}) => ({
  broker_connected: true, fresh: true, age_seconds: 1,
  packet: { device_id: 'astro01', boot_id: 'abc', calibration_id: 1, last_command_id: '',
    baseline: { ready: false, count: 4, required: 15, hr: null, spo2: null },
    history: [{ seq: 4, t_ms: 24000, hr: 72, spo2: 98, valid: true, quality: 'good',
      state: 'CALIBRATING', alert: 'NORMAL', hr_elevated: false }] },
  ...changes,
});
function mockData(data) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Pi-backed live HUD', () => {
  it('shows the one-second cadence and full 90-second history for schema 3', async () => {
    const data = snapshot(); data.packet.schema = 3;
    const row = data.packet.history[0];
    data.packet.history = Array.from({ length: 90 }, (_, i) => ({ ...row, seq: i+1, t_ms: (i+1)*1000 }));
    mockData(data); render(<App />);
    expect(await screen.findByText('Last 90 seconds')).toBeInTheDocument();
    expect(screen.getByText(/One result every second/)).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(91);
    expect(screen.getByText(/eligible samples, at least 6 seconds apart/)).toBeInTheDocument();
  });
  it('keeps accepted HR visible when SpO2 is rejected and marks prior alerts as historical', async () => {
    const data = snapshot();
    Object.assign(data.packet.history[0], { hr_valid: true, spo2_valid: false, valid: false,
      spo2: null, acquisition: 'ok', hr_quality: 'accepted', spo2_quality: 'unstable_ratio',
      state: 'PARTIAL_SIGNAL', alert: 'CRITICAL', quality: 'partial' });
    mockData(data); render(<App />);
    expect(await screen.findByText('PARTIAL SIGNAL')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'HEART RATE: 72 BPM' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'SpO₂: —%' })).toBeInTheDocument();
    expect(screen.getByText(/Current oxygen condition unknown/)).toBeInTheDocument();
    expect(screen.queryByText('STOP EVA ACTIVITY')).not.toBeInTheDocument();
  });
  it('shows an accepted oxygen alert even when HR is rejected', async () => {
    const data = snapshot();
    Object.assign(data.packet.history[0], { hr_valid: false, spo2_valid: true, valid: false,
      hr: null, spo2: 80, acquisition: 'ok', hr_quality: 'out_of_range', spo2_quality: 'accepted',
      state: 'CRITICAL', alert: 'CRITICAL', quality: 'partial' });
    mockData(data); render(<App />);
    expect(await screen.findByText('STOP EVA ACTIVITY')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'HEART RATE: — BPM' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'SpO₂: 80%' })).toBeInTheDocument();
  });
  it('distinguishes failed acquisition from rejected optical measurements', async () => {
    const data = snapshot();
    Object.assign(data.packet.history[0], { hr_valid: false, spo2_valid: false, valid: false,
      hr: null, spo2: null, acquisition: 'i2c_error', hr_quality: 'not_evaluated',
      spo2_quality: 'not_evaluated', state: 'ACQUISITION_ERROR', quality: 'not_evaluated' });
    mockData(data); render(<App />);
    expect(await screen.findByText('ACQUISITION ERROR')).toBeInTheDocument();
    expect(screen.getByText(/Acquisition: i2c error. Measurements have not been evaluated/)).toBeInTheDocument();
  });
  it('defaults to live mode and shows measured values plus baseline progress', async () => {
    mockData(snapshot()); render(<App />);
    expect(await screen.findByText(/Startup baseline: 4\/15/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'HEART RATE: 72 BPM' })).toBeInTheDocument();
    expect(screen.queryByText('Developer controls')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'RESPIRATION: — breaths/min' })).toBeInTheDocument();
  });
  it('hides current values when telemetry is stale but keeps history', async () => {
    mockData(snapshot({ fresh: false })); render(<App />);
    expect(await screen.findByText('CONNECTION LOST')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'HEART RATE: — BPM' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '72' })).toBeInTheDocument();
  });
  it('displays the ESP32 alert without recalculating from the numbers', async () => {
    const data = snapshot(); data.packet.history[0].alert = 'CRITICAL';
    data.packet.history[0].state = 'CRITICAL';
    mockData(data); render(<App />);
    expect(await screen.findByText('STOP EVA ACTIVITY')).toBeInTheDocument();
  });
  it('requires device acknowledgement before claiming a restarted baseline', async () => {
    mockData(snapshot()); render(<App />);
    await screen.findByText(/Startup baseline/);
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ command_id: 'test-command' }) });
    fireEvent.click(screen.getByRole('button', { name: 'Start new baseline' }));
    expect(await screen.findByText(/Waiting for the ESP32 to acknowledge/)).toBeInTheDocument();
    expect(screen.queryByText(/ESP32 acknowledged/)).not.toBeInTheDocument();
  });
  it('shows gateway failures without substituting demo measurements', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline'))); render(<App />);
    expect(await screen.findByText('Gateway unavailable')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'SpO₂: —%' })).toBeInTheDocument();
  });
});
