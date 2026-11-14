import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../app/DemoApp';

let now;
beforeEach(() => {
  vi.useFakeTimers();
  now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
function advance(ms) {
  now += ms;
  act(() => vi.advanceTimersByTime(ms));
}
const press = (name) => fireEvent.click(screen.getByRole('button', { name }));
const setSpo2 = (value) =>
  fireEvent.change(screen.getByLabelText('SpO₂ (%)'), { target: { value: String(value) } });

describe('developer controls and central HUD integration', () => {
  it('places developer controls outside the visor and keeps NORMAL free of alerts', () => {
    render(<App />);
    const hud = screen.getByRole('main');
    const panel = screen.getByRole('region', { name: 'Developer Control Panel' });
    expect(hud).not.toContainElement(panel);
    expect(hud.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(hud).queryByRole('alert')).toBeNull();
    expect(hud.querySelector('button, input, select')).toBeNull();
    expect(screen.getByTestId('Current State')).toHaveTextContent('NORMAL');
  });
  it('manual triggers latch, replace the single alert, and reset immediately', () => {
    render(<App />);
    press('Trigger Warning');
    expect(screen.getByRole('alert')).toHaveTextContent('WARNING');
    expect(screen.getByRole('alert')).not.toHaveTextContent('STOP EVA ACTIVITY');
    expect(screen.getByRole('alert').querySelector('.central-alert-message')).toHaveTextContent(
      /^OXYGEN SATURATION LOW$/,
    );
    expect(screen.getByTestId('Control Mode')).toHaveTextContent('Manual Override');
    advance(12000);
    expect(screen.getByRole('alert')).toHaveTextContent('WARNING');
    press('Trigger Critical');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert').querySelector('.central-alert-message')).toHaveTextContent(
      /^OXYGEN SATURATION LOW$/,
    );
    expect(screen.getByRole('alert').querySelector('.central-alert-action')).toHaveTextContent(
      'STOP EVA ACTIVITY',
    );
    expect(screen.getByRole('alert').querySelector('.central-alert-evidence')).toBeNull();
    setSpo2(98);
    advance(5000);
    expect(screen.getByRole('alert')).toHaveTextContent('CRITICAL');
    const stopwatchBeforeReset = screen.getByRole('timer').textContent;
    press('Normal / Reset');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByLabelText('SpO₂ (%)')).toHaveValue(98);
    expect(screen.getByRole('timer').textContent).toBe(stopwatchBeforeReset);
  });
  it('manual readings trigger timed alerts, highlight HR evidence, and recover', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('HEART RATE (BPM)'), { target: { value: '120' } });
    advance(6000);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByTestId('HR Elevated')).toHaveTextContent('Yes');
    setSpo2(92);
    advance(2000);
    expect(screen.queryByRole('alert')).toBeNull();
    advance(1000);
    expect(screen.getByRole('alert')).toHaveTextContent('WARNING');
    expect(screen.getByRole('alert')).toHaveTextContent('ELEVATED HEART RATE');
    expect(screen.getByRole('alert').querySelector('.central-alert-message')).toHaveTextContent(
      /^OXYGEN SATURATION LOW · ELEVATED HEART RATE$/,
    );
    expect(screen.getByRole('group', { name: 'HEART RATE: 120 BPM simulated' })).toHaveClass(
      'readout-warning',
    );
    advance(2000);
    expect(screen.getByRole('alert')).toHaveTextContent('CRITICAL');
    expect(screen.getByRole('alert').querySelector('.central-alert-message')).toHaveTextContent(
      /^OXYGEN SATURATION LOW · ELEVATED HEART RATE$/,
    );
    setSpo2(98);
    advance(2900);
    expect(screen.getByRole('alert')).toHaveTextContent('CRITICAL');
    advance(100);
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('switches scenarios and cancels them on manual edits without adding timers', () => {
    const { unmount } = render(<App />);
    const timerCount = vi.getTimerCount();
    press('Trigger Critical');
    press('Scenario 2 — SpO₂ Deterioration');
    expect(screen.queryByRole('alert')).toBeNull();
    advance(4000);
    expect(screen.getByLabelText('SpO₂ (%)')).toHaveValue(92);
    press('Scenario 4 — Elevated Heart Rate Only');
    expect(screen.getByLabelText('SpO₂ (%)')).toHaveValue(98);
    expect(vi.getTimerCount()).toBe(timerCount);
    fireEvent.change(screen.getByLabelText('RESPIRATION (breaths/min)'), {
      target: { value: '20' },
    });
    expect(screen.getByTestId('Active Scenario')).toHaveTextContent('None');
    expect(screen.getByTestId('Control Mode')).toHaveTextContent('Automatic');
    expect(
      screen.getByRole('group', { name: 'RESPIRATION: 20 breaths/min simulated' }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('O₂ RESERVE (%)'), { target: { value: '70' } });
    expect(screen.getByRole('group', { name: 'O₂ RESERVE: 70% simulated' })).toBeInTheDocument();
    press('Scenario 1 — Normal Baseline');
    press('Stop Simulation');
    expect(screen.getByTestId('Control Mode')).toHaveTextContent('Automatic');
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('validates baseline settings and applies a new individual threshold', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('SpO₂ baseline SD (%)'), { target: { value: '0' } });
    press('Apply Baseline');
    expect(screen.getByRole('status')).toHaveTextContent('SD must be positive');
    expect(screen.getByTestId('SpO₂ Threshold')).toHaveTextContent('95%');
    fireEvent.change(screen.getByLabelText('SpO₂ baseline SD (%)'), { target: { value: '2' } });
    press('Apply Baseline');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByTestId('SpO₂ Threshold')).toHaveTextContent('92%');
    setSpo2(93);
    advance(6000);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
