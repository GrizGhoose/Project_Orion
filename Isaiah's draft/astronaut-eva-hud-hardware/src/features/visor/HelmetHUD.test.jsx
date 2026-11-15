import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../app/App';
import { formatElapsed } from './config';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('fresh visual helmet HUD', () => {
  it('renders the requested readouts with an unobstructed, control-free scene', () => {
    render(<App />);
    expect(screen.getByRole('img', { name: /Eye-level view/ })).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: /Mission time \d{2}:\d{2}:\d{2}/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('timer', { name: 'EVA elapsed' })).toHaveTextContent('00:00:00');
    for (const name of [
      'RESPIRATION: 16 breaths/min simulated',
      'HEART RATE: 72 BPM simulated',
      'SpO₂: 98% simulated',
      'O₂ RESERVE: 85% simulated',
    ]) {
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
    }
    expect(
      screen.getByRole('main').querySelector('button, input, select, nav, [role="alert"]'),
    ).toBeNull();
  });

  it('derives elapsed time from the monotonic timestamp after a delayed update', () => {
    vi.useFakeTimers();
    let monotonicTime = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => monotonicTime);
    const { unmount } = render(<App />);
    monotonicTime = 3_661_123;
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByRole('timer')).toHaveTextContent('01:01:01');
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('formats boundaries without wrapping the elapsed hours at midnight', () => {
    expect(formatElapsed(999)).toBe('00:00:00');
    expect(formatElapsed(60_000)).toBe('00:01:00');
    expect(formatElapsed(86_400_000)).toBe('24:00:00');
  });
});
