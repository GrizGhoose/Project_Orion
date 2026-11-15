import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../../app/App';
import { DemoSession } from '../../../../../demo/session.mjs';

let receive;
const close = vi.fn();
vi.mock('./demoSync', () => ({
  SYNC_DEMO: true,
  subscribeDemo: (onSnapshot, onConnection) => {
    receive = onSnapshot;
    onConnection(true);
    return close;
  },
}));

describe('synchronized HUD', () => {
  it('renders shared Scenario 3 Warning/Critical, elevated HR, resolution and replay', () => {
    let now = 0;
    const session = new DemoSession(() => now);
    const { unmount } = render(<App />);
    act(() => receive(session.snapshot()));
    expect(screen.getByTestId('Current State')).toHaveTextContent('NORMAL');
    now = 19999.99;
    act(() => receive(session.snapshot()));
    expect(screen.getByTestId('Current State')).toHaveTextContent('NORMAL');
    expect(screen.queryByRole('alert')).toBeNull();
    now = 21100;
    act(() => receive(session.snapshot()));
    expect(screen.getByTestId('Current State')).toHaveTextContent('WARNING');
    expect(document.querySelector('.central-alert-warning')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('ELEVATED HEART RATE');
    fireEvent.click(screen.getByRole('button', {name:'View EV2',exact:true}));
    expect(screen.getByRole('alert')).toHaveAccessibleName('WARNING | BUDDY IN DISTRESS');
    fireEvent.click(screen.getByRole('button', {name:'View EV1',exact:true}));
    now = 23100;
    act(() => receive(session.snapshot()));
    expect(screen.getByTestId('Current State')).toHaveTextContent('CRITICAL');
    expect(screen.getByRole('alert')).toHaveTextContent('OXYGEN SATURATION LOW');
    expect(screen.getByRole('alert')).toHaveTextContent('STOP EVA ACTIVITY');
    expect(document.querySelector('.central-alert-critical')).toBeInTheDocument();
    expect(document.querySelector('.central-alert-warning')).toBeNull();
    expect(screen.getByLabelText('HEART RATE (BPM)')).toHaveValue(120);
    expect(screen.getByRole('timer')).toHaveTextContent('00:00:23');
    expect(screen.getByLabelText('SpO₂ (%)')).toHaveValue(92);
    expect(screen.getByRole('group', { name: 'Buddy astronaut EV2, NORMAL, simulated' })).toBeInTheDocument();
    expect(screen.getByTestId('Control Mode')).toHaveTextContent('Scripted Demo');
    fireEvent.click(screen.getByRole('button', { name: 'View EV2', exact: true }));
    expect(screen.getByTestId('Current State')).toHaveTextContent('NORMAL');
    expect(screen.getByRole('alert')).toHaveAccessibleName('CRITICAL | BUDDY IN DISTRESS');
    expect(screen.getByRole('group', { name: 'Buddy astronaut EV1, CRITICAL, simulated' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View EV1', exact: true }));
    now = 65000;
    act(() => receive(session.snapshot()));
    expect(screen.getByTestId('Current State')).toHaveTextContent('CRITICAL');
    expect(screen.getByRole('timer')).toHaveTextContent('00:01:05');
    session.beginResponse();
    act(() => receive(session.snapshot()));
    expect(screen.getByTestId('Current State')).toHaveTextContent('CRITICAL');
    session.resolveIncident();
    act(() => receive(session.snapshot()));
    expect(screen.getByTestId('Current State')).toHaveTextContent('NORMAL');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByLabelText('SpO₂ (%)')).toHaveValue(98);
    fireEvent.click(screen.getByRole('button', { name:'View EV2', exact:true }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('group', {name:'Buddy astronaut EV1, NORMAL, simulated'})).toBeInTheDocument();
    now = 120000;
    act(() => receive(session.snapshot()));
    expect(screen.queryByRole('alert')).toBeNull();
    session.reset();
    act(() => receive(session.snapshot()));
    expect(screen.getByTestId('Current State')).toHaveTextContent('NORMAL');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('timer')).toHaveTextContent('00:00:00');
    unmount();
    expect(close).toHaveBeenCalled();
  });
});
