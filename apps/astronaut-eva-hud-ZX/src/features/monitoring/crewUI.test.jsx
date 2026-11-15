import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../app/App';

let now;
const press = (name) => fireEvent.click(screen.getByRole('button', { name, exact: true }));
const adjust = (name, value) =>
  fireEvent.change(screen.getByLabelText(name), { target: { value: String(value) } });
const advance = (ms) => {
  now += ms;
  act(() => vi.advanceTimersByTime(ms));
};
beforeEach(() => {
  vi.useFakeTimers();
  now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('dual astronaut HUD perspectives', () => {
  it('defaults to EV1 and labels its locator EV2', () => {
    render(<App />);
    expect(screen.getByTestId('Current POV')).toHaveTextContent('EV1');
    expect(screen.getByTestId('Tracking')).toHaveTextContent('EV2');
    expect(document.querySelector('.buddy-locator-side')).toHaveAttribute('data-side', 'right');
    expect(
      screen.getByRole('group', { name: 'Buddy astronaut EV2, NORMAL, simulated' }),
    ).toHaveTextContent('EV2');
  });
  it.each(['Warning', 'Critical'])(
    'shows EV2 %s as buddy distress from EV1 and own distress from EV2',
    (severity) => {
      render(<App />);
      const state = severity.toUpperCase();
      press(`EV2 ${severity}`);
      expect(screen.getByRole('alert')).toHaveAccessibleName(`${state} | BUDDY IN DISTRESS`);
      expect(screen.getByRole('alert')).not.toHaveTextContent('STOP EVA ACTIVITY');
      expect(screen.getByTestId('Current State')).toHaveTextContent('NORMAL');
      expect(
        screen.getByRole('group', { name: `Buddy astronaut EV2, ${state}, simulated` }),
      ).toHaveTextContent('38 m');
      press('View EV2');
      expect(screen.getByTestId('Current State')).toHaveTextContent(state);
      expect(screen.getByLabelText('SpO₂ (%)')).toHaveValue(92);
      expect(
        screen.getByRole('group', { name: 'Buddy astronaut EV1, NORMAL, simulated' }),
      ).toHaveTextContent('EV1');
      expect(screen.getByRole('alert')).toHaveTextContent('OXYGEN SATURATION LOW');
      expect(screen.getByRole('alert')).not.toHaveTextContent('BUDDY IN DISTRESS');
      press('View EV1');
      expect(screen.getByRole('alert')).toHaveAccessibleName(`${state} | BUDDY IN DISTRESS`);
      press('EV2 Normal');
      expect(screen.queryByRole('alert')).toBeNull();
    },
  );
  it('supports EV1 distress from EV2 and gives own critical priority', () => {
    render(<App />);
    press('View EV2');
    expect(document.querySelector('.buddy-locator-side')).toHaveAttribute('data-side', 'left');
    press('EV1 Warning');
    expect(screen.getByRole('alert')).toHaveAccessibleName('WARNING | BUDDY IN DISTRESS');
    press('EV1 Critical');
    expect(screen.getByRole('alert')).toHaveAccessibleName('CRITICAL | BUDDY IN DISTRESS');
    press('EV2 Critical');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('STOP EVA ACTIVITY');
    expect(screen.getByRole('alert')).not.toHaveTextContent('BUDDY IN DISTRESS');
    press('EV2 Normal');
    expect(screen.getByRole('alert')).toHaveAccessibleName('CRITICAL | BUDDY IN DISTRESS');
    press('EV1 Normal');
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('preserves separate telemetry/baselines and the EVA stopwatch across perspective switches', () => {
    const { unmount } = render(<App />);
    const timerCount = vi.getTimerCount();
    adjust('HEART RATE (BPM)', 88);
    adjust('SpO₂ (%)', 97);
    advance(2000);
    const stopwatch = screen.getByRole('timer').textContent;
    press('View EV2');
    expect(screen.getByRole('timer').textContent).toBe(stopwatch);
    expect(screen.getByLabelText('HEART RATE (BPM)')).toHaveValue(72);
    expect(screen.getByLabelText('SpO₂ (%)')).toHaveValue(98);
    adjust('SpO₂ baseline SD (%)', 2);
    press('Apply Baseline');
    expect(screen.getByTestId('SpO₂ Threshold')).toHaveTextContent('92%');
    press('View EV1');
    expect(document.querySelector('.buddy-locator-side')).toHaveAttribute('data-side', 'right');
    expect(screen.getByLabelText('HEART RATE (BPM)')).toHaveValue(88);
    expect(screen.getByLabelText('SpO₂ (%)')).toHaveValue(97);
    expect(screen.getByTestId('SpO₂ Threshold')).toHaveTextContent('95%');
    expect(screen.getByLabelText('SpO₂ baseline SD (%)')).toHaveValue(1);
    press('View EV2');
    expect(screen.getByLabelText('SpO₂ baseline SD (%)')).toHaveValue(2);
    expect(vi.getTimerCount()).toBe(timerCount);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('keeps off-screen automatic SpO₂ detection live and preserves HR-only false-positive prevention', () => {
    render(<App />);
    press('View EV2');
    adjust('HEART RATE (BPM)', 120);
    advance(6000);
    expect(screen.queryByRole('alert')).toBeNull();
    adjust('SpO₂ (%)', 92);
    press('View EV1');
    advance(3000);
    expect(screen.getByRole('alert')).toHaveAccessibleName('WARNING | BUDDY IN DISTRESS');
    advance(2000);
    expect(screen.getByRole('alert')).toHaveAccessibleName('CRITICAL | BUDDY IN DISTRESS');
    press('View EV2');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'OXYGEN SATURATION LOW · ELEVATED HEART RATE',
    );
    adjust('SpO₂ (%)', 98);
    press('View EV1');
    advance(3000);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
