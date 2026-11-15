import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../app/App';
import { BuddyGeolocator } from './BuddyGeolocator';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('independent buddy locator', () => {
  it('changes buddy colour state without changing primary physiology or hiding distance', () => {
    render(<App />);
    for (const [label, severity] of [
      ['EV2 Warning', 'WARNING'],
      ['EV2 Critical', 'CRITICAL'],
      ['EV2 Normal', 'NORMAL'],
    ]) {
      fireEvent.click(screen.getByRole('button', { name: label }));
      const buddy = screen.getByRole('group', {
        name: `Buddy astronaut EV2, ${severity}, simulated`,
      });
      expect(buddy).toHaveTextContent('EV2');
      expect(buddy).toHaveTextContent('38 m');
      expect(screen.getByTestId('Current State')).toHaveTextContent('NORMAL');
      if (severity === 'NORMAL') expect(screen.queryByRole('alert')).toBeNull();
      else
        expect(screen.getByRole('alert')).toHaveAccessibleName(`${severity} | BUDDY IN DISTRESS`);
    }
    fireEvent.click(screen.getByRole('button', { name: 'EV2 Warning' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trigger Critical' }));
    expect(
      screen.getByRole('group', { name: 'Buddy astronaut EV2, WARNING, simulated' }),
    ).toHaveTextContent('38 m');
    fireEvent.click(screen.getByRole('button', { name: 'Normal / Reset' }));
    expect(
      screen.getByRole('group', { name: 'Buddy astronaut EV2, WARNING, simulated' }),
    ).toBeInTheDocument();
  });
  it('continues the same motion/distance timeline through severity changes and cleans up RAF', () => {
    let pending;
    let frameId = 0;
    const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      pending = callback;
      return ++frameId;
    });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    vi.spyOn(performance, 'now').mockReturnValue(0);
    vi.spyOn(Math, 'random').mockReturnValue(0.75);
    const { container, rerender, unmount } = render(
      <svg>
        <BuddyGeolocator />
      </svg>,
    );
    act(() => pending(6000));
    const marker = container.querySelector('.buddy-geolocator');
    const position = marker.getAttribute('transform');
    const distance = marker.querySelector('.buddy-distance').textContent;
    const scheduled = request.mock.calls.length;
    expect(distance).not.toBe('38 m');
    rerender(
      <svg>
        <BuddyGeolocator severity="CRITICAL" trackedId="EV1" side="left" />
      </svg>,
    );
    expect(marker.getAttribute('transform')).toBe(position);
    expect(marker.querySelector('.buddy-distance').textContent).toBe(distance);
    expect(marker.querySelector('.buddy-label')).toHaveTextContent('EV1');
    expect(marker.closest('.buddy-locator-side')).toHaveAttribute('data-side', 'left');
    expect(marker.closest('.buddy-locator-side')).toHaveAttribute(
      'transform',
      'translate(1920 0) scale(-1 1)',
    );
    expect(request.mock.calls.length).toBe(scheduled);
    act(() => pending(7000));
    expect(marker.getAttribute('transform')).not.toBe(position);
    unmount();
    expect(cancel).toHaveBeenCalledWith(frameId);
  });
  it('holds position under reduced motion while keeping independent distance updates', () => {
    let pending;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      pending = callback;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const remove = vi.fn();
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: remove,
    }));
    vi.spyOn(performance, 'now').mockReturnValue(0);
    vi.spyOn(Math, 'random').mockReturnValue(0.75);
    const { container, unmount } = render(
      <svg>
        <BuddyGeolocator />
      </svg>,
    );
    const marker = container.querySelector('.buddy-geolocator');
    const position = marker.getAttribute('transform');
    act(() => pending(6000));
    expect(marker.getAttribute('transform')).toBe(position);
    expect(marker.querySelector('.buddy-distance').textContent).not.toBe('38 m');
    unmount();
    expect(remove).toHaveBeenCalled();
  });
});
