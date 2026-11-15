import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { HelmetPage } from '../features/helmet/pages/HelmetPage';
import { createSnapshot, useTelemetryStore } from '../store/telemetryStore';
import { generateFrame } from '../simulation/telemetrySimulator';
import { useEvaStore } from '../store/evaStore';
import { HUD_DEFAULTS } from '../constants/config';
import { assessedFrame, sample } from './detectionFixtures';
import { advanceDetection } from '../features/health/detectionEngine';
import { act } from 'react';

const command = vi.fn();
vi.mock('../app/providers/TelemetryProvider', () => ({
  useTelemetryCommands: () => ({ command }),
}));
beforeEach(() => {
  command.mockClear();
  useTelemetryStore.getState().applySnapshot(createSnapshot(assessedFrame(generateFrame())));
  useEvaStore.setState({
    mode: 'standard',
    astronautId: 'EV1',
    hud: HUD_DEFAULTS,
    presentation: 'development',
    suitRequested: false,
  });
});
const setFrame = (frame) =>
  act(() => useTelemetryStore.getState().applySnapshot(createSnapshot(frame)));

describe('helmet workflows', () => {
  it('keeps all primary telemetry inside the lowered optical aperture', () => {
    render(<HelmetPage />);
    const field = screen.getByRole('region', { name: 'Illustrative optical display field' });
    expect(parseFloat(field.style.top)).toBeGreaterThan(0);
    for (const placement of ['mission', 'physiology', 'oxygen']) {
      const group = field.querySelector(`[data-placement="${placement}"]`);
      expect(parseFloat(group.style.top)).toBeGreaterThan(0);
    }
    expect(document.querySelector('.visor-window').style.clipPath).toMatch(/^url\(["']?#/);
    expect(document.querySelector('.visor-outline path').getAttribute('d')).toContain('H 0.86');
  });
  it('submits individual baselines and deterministic time advances outside the visor', () => {
    render(<HelmetPage />);
    fireEvent.change(screen.getByLabelText('Baseline SpO₂ (%)'), { target: { value: '97' } });
    fireEvent.change(screen.getByLabelText('Expected HR for current work (BPM)'), {
      target: { value: '145' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply simulated baselines' }));
    expect(command).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'baselines',
        astronautId: 'EV1',
        values: expect.objectContaining({ spo2: 97, expectedHeartRate: 145, hrvRmssdMs: null }),
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Advance +30s' }));
    expect(command).toHaveBeenCalledWith({ type: 'advance', seconds: 30 });
    fireEvent.click(screen.getByRole('button', { name: 'Start reaction check' }));
    expect(command).toHaveBeenCalledWith({ type: 'reaction-start', astronautId: 'EV1' });
  });
  it('shows a brief upper HUD stimulus and forwards the simulated chest-button response', () => {
    const initial = sample(0);
    const result = advanceDetection(null, initial, initial.baselines, [
      { type: 'reaction-start', astronautId: 'EV1' },
    ]);
    setFrame(assessedFrame(sample(1), result.state));
    render(<HelmetPage />);
    expect(screen.getByRole('status', { name: 'Reaction check stimulus' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'j' });
    expect(command).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'reaction-response',
        key: 'J',
        astronautId: 'EV1',
        responseMs: expect.any(Number),
      }),
    );
    setFrame(assessedFrame(sample(2), result.state));
    expect(
      screen.queryByRole('status', { name: 'Reaction check stimulus' }),
    ).not.toBeInTheDocument();
  });
  it('shows only essential readings by default and loads the supplied photograph', () => {
    render(<HelmetPage />);
    for (const label of ['Heart rate', 'SpO₂', 'EVA remaining · est.'])
      expect(screen.getByText(label)).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Primary astronaut telemetry' })).getByText(
        'Nominal',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Suit context' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Buddy context' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Supplied lunar photograph/ })).toHaveAttribute(
      'src',
      '/images/lunar-hud-background.png',
    );
    expect(screen.queryByText(/NOT SUPPLIED|REVIEW PENDING/)).not.toBeInTheDocument();
  });
  it('reveals suit and buddy context on request and returns to a quiet display', () => {
    render(<HelmetPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Suit details' }));
    expect(screen.getByRole('region', { name: 'Suit context' })).toHaveTextContent('Pressure');
    fireEvent.click(screen.getByRole('button', { name: 'Suit details' }));
    expect(screen.queryByRole('region', { name: 'Suit context' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Buddy focus' }));
    expect(screen.getByRole('region', { name: 'Buddy context' })).toHaveTextContent('BUDDY / EV2');
    fireEvent.click(screen.getByRole('button', { name: 'Standard EVA' }));
    expect(screen.queryByRole('region', { name: 'Buddy context' })).not.toBeInTheDocument();
  });
  it('keeps SpO₂ and heart rate visible while excluding legacy temperature in every mode', () => {
    const frame = generateFrame();
    frame.astronauts[0].temperature = 40;
    frame.alerts = [];
    setFrame(frame);
    render(<HelmetPage />);
    for (const label of [
      'Standard EVA',
      'Health focus',
      'Buddy focus',
      'Emergency mode simulation',
    ]) {
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(
        within(screen.getByRole('region', { name: 'Primary astronaut telemetry' })).getByText(
          'Heart rate',
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Body temperature|°C/)).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(
        within(screen.getByRole('region', { name: 'Primary astronaut telemetry' })).getByText(
          'Nominal',
        ),
      ).toBeInTheDocument();
    }
    expect(useTelemetryStore.getState().frame.astronauts[0].temperature).toBe(40);
  });
  it('preserves critical buddy alerts and safety severity across modes and viewpoints', () => {
    render(<HelmetPage />);
    setFrame(assessedFrame(sample(0, { EV2: { spo2: 79 } })));
    for (const label of [
      'Health focus',
      'Buddy focus',
      'Emergency mode simulation',
      'Standard EVA',
    ]) {
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(screen.getByRole('alert')).toHaveTextContent('EV2 · critical');
      expect(screen.getByRole('alert')).toHaveTextContent('Pause activity');
      expect(screen.getByText('critical · 1 active')).toBeInTheDocument();
    }
    fireEvent.change(screen.getByLabelText('Astronaut viewpoint'), { target: { value: 'EV2' } });
    expect(screen.getByRole('alert')).toHaveTextContent('SpO₂');
    expect(screen.queryByRole('region', { name: 'Buddy context' })).not.toBeInTheDocument();
  });
  it('automatically reveals suit context for a hazard and preserves other warnings below critical alerts', () => {
    render(<HelmetPage />);
    setFrame(assessedFrame(generateFrame({ scenario: 'co2', tick: 30 })));
    expect(screen.getByRole('region', { name: 'Suit context' })).toHaveTextContent('CO₂');
    const frame = assessedFrame(
      sample(0, {
        EV2: { spo2: 79 },
        EV1: {
          suitFaults: [
            { code: 'oxygen-flow', active: true, verified: true, message: 'Oxygen flow fault' },
          ],
        },
      }),
    );
    setFrame(frame);
    expect(screen.getByRole('region', { name: 'Suit context' })).toBeInTheDocument();
    const alerts = screen.getByLabelText('Prioritised crew alerts');
    expect(within(alerts).getByRole('alert')).toHaveTextContent('SpO₂');
    expect(within(alerts).getByRole('status')).toHaveTextContent('Oxygen flow fault');
    expect(alerts.querySelector('.alert').textContent).toContain('critical');
  });
  it('keeps controls outside the visor, exposes image failures, and hides calibration by default', () => {
    render(<HelmetPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Health focus' }));
    expect(screen.getByRole('region', { name: 'Physiological context' })).toHaveTextContent(
      'Hypoxia assessment not validated',
    );
    fireEvent.error(screen.getByRole('img', { name: /Supplied lunar photograph/ }));
    expect(screen.getByText(/SCENE IMAGE UNAVAILABLE/)).toBeInTheDocument();
    const field = screen.getByRole('region', { name: 'Illustrative optical display field' });
    expect(field).not.toContainElement(screen.getByRole('button', { name: 'Suit details' }));
    expect(field.querySelector('button, select, input, nav')).toBeNull();
    expect(
      screen.queryByRole('img', { name: 'Development optical calibration overlay' }),
    ).not.toBeInTheDocument();
    act(() => useEvaStore.getState().configureHud({ calibration: true }));
    expect(
      screen.getByRole('img', { name: 'Development optical calibration overlay' }),
    ).toBeInTheDocument();
    act(() => useEvaStore.getState().configureHud({ calibration: false }));
    expect(
      screen.queryByRole('img', { name: 'Development optical calibration overlay' }),
    ).not.toBeInTheDocument();
  });
  it('hides controls and calibration in astronaut view, preserves alerts and returns with Escape', () => {
    render(<HelmetPage />);
    setFrame(assessedFrame(sample(0, { EV2: { spo2: 79 } })));
    fireEvent.click(screen.getByRole('checkbox', { name: /Show calibration/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Astronaut view / Fullscreen' }));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: 'Development optical calibration overlay' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Pause activity');
    expect(screen.getByRole('region', { name: 'Primary astronaut telemetry' })).toHaveTextContent(
      'Heart rate',
    );
    fireEvent.keyDown(window, { key: 'r' });
    expect(command).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Development optical calibration overlay' }),
    ).toBeInTheDocument();
  });
  it('forwards scenario, reset and pause commands from the external panel', () => {
    render(<HelmetPage />);
    fireEvent.change(screen.getByLabelText(/Scenario/), { target: { value: 'buddy' } });
    fireEvent.click(screen.getByRole('button', { name: /Reset/ }));
    fireEvent.click(screen.getByRole('button', { name: /Pause/ }));
    expect(command.mock.calls.map(([value]) => value)).toEqual([
      { type: 'scenario', scenario: 'buddy' },
      { type: 'reset' },
      { type: 'pause' },
    ]);
  });
  it('updates numeric readings and reference markers together and supports absent breathing data', () => {
    render(<HelmetPage />);
    const first = generateFrame({ tick: 1 });
    setFrame(first);
    expect(screen.getByRole('meter', { name: 'Breathing rate' })).toHaveAttribute(
      'aria-valuetext',
      expect.stringContaining('simulated'),
    );
    const updated = generateFrame({ tick: 20, scenario: 'heart' });
    setFrame(updated);
    for (const [label, key] of [
      ['Breathing rate', 'breathingRate'],
      ['Heart rate', 'heartRate'],
      ['SpO₂', 'spo2'],
      ['Oxygen reserve', 'oxygen'],
    ]) {
      expect(screen.getByRole('meter', { name: label })).toHaveAttribute(
        'aria-valuenow',
        String(updated.astronauts[0][key]),
      );
    }
    expect(screen.getByLabelText('EVA countdown')).toHaveAttribute(
      'datetime',
      `PT${updated.remaining}S`,
    );
    expect(screen.getByRole('meter', { name: 'Heart rate' })).toHaveAttribute(
      'aria-valuetext',
      expect.stringContaining('normal'),
    );
    expect(screen.getByRole('meter', { name: 'Heart rate' })).toHaveAttribute(
      'aria-valuenow',
      String(updated.astronauts[0].heartRate),
    );
    expect(
      screen.getByRole('meter', { name: 'Heart rate' }).querySelector('.indicator-marker'),
    ).toHaveStyle({ left: `${((updated.astronauts[0].heartRate - 40) / 160) * 100}%` });
    setFrame({
      ...updated,
      astronauts: updated.astronauts.map((a) =>
        a.id === 'EV1' ? { ...a, breathingRate: null } : a,
      ),
    });
    expect(screen.getByRole('meter', { name: 'Breathing rate' })).not.toHaveAttribute(
      'aria-valuenow',
    );
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
  });
  it('keeps low-SpO2 warnings and critical readings visible across every HUD mode', () => {
    render(<HelmetPage />);
    for (const [value, severity] of [
      [93, null],
      [92.9, 'warning'],
      [90, 'warning'],
      [79, 'critical'],
    ]) {
      const frame = sample(30, { EV1: { spo2: value } });
      frame.baselines.EV1.spo2 = null;
      let state = null;
      for (let t = 0; t <= 30; t++) {
        const result = advanceDetection(
          state,
          sample(t, { EV1: { spo2: value } }),
          frame.baselines,
        );
        state = result.state;
        frame.alerts = result.alerts;
      }
      setFrame(frame);
      for (const mode of [
        'Standard EVA',
        'Health focus',
        'Buddy focus',
        'Emergency mode simulation',
      ]) {
        fireEvent.click(screen.getByRole('button', { name: mode }));
        const meter = screen.getByRole('meter', { name: 'SpO₂' });
        expect(meter).toHaveAttribute(
          'aria-valuetext',
          expect.stringContaining(severity || 'normal'),
        );
        if (severity) expect(screen.getByText(/LOW SpO/)).toHaveTextContent(String(value));
        else expect(screen.queryByText(/LOW SpO/)).not.toBeInTheDocument();
      }
    }
  });
  it('replaces a confirmed low-SpO2 alert with a data warning when delivery becomes stale', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(10000);
      const frame = sample(10);
      frame.astronauts[0] = {
        ...frame.astronauts[0],
        spo2: 79,
        quality: { spo2: { status: 'valid', receivedAt: 10000 } },
      };
      setFrame(assessedFrame(frame));
      render(<HelmetPage />);
      expect(screen.getByRole('alert')).toHaveTextContent('LOW SpO');
      act(() => vi.advanceTimersByTime(6000));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getAllByText(/SpO.*DATA STALE/)).toHaveLength(2);
      expect(screen.getByRole('meter', { name: 'SpO₂' })).not.toHaveAttribute('aria-valuenow');
    } finally {
      vi.useRealTimers();
    }
  });
});
