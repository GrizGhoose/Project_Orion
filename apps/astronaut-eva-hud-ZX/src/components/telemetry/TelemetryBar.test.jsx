import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TelemetryBar } from './TelemetryBar';
import { INDICATOR_SCALES } from '../../constants/telemetryIndicators';

describe('telemetry reference indicators', () => {
  it('keeps values and scale positions intact on the curved visor track', () => {
    const { container, rerender } = render(
      <TelemetryBar curved value={95} scale={INDICATOR_SCALES.spo2} />,
    );
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '95');
    expect(container.querySelector('.indicator-marker')).toHaveStyle({
      left: '75%',
      top: '-0.5px',
    });
    expect(container.querySelector('.indicator-curve-track')).toBeInTheDocument();
    rerender(<TelemetryBar curved value={24} scale={INDICATOR_SCALES.oxygen} />);
    expect(container.querySelector('.indicator-curve-fill')).toHaveAttribute(
      'stroke-dasharray',
      '24 100',
    );
  });
  it('uses a labelled SpO2 axis marker rather than a percentage safety fill', () => {
    const { container } = render(<TelemetryBar value={95} scale={INDICATOR_SCALES.spo2} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuemin', '80');
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuemax', '100');
    expect(container.querySelector('.indicator-marker')).toHaveStyle({ left: '75%' });
    expect(container.querySelector('.indicator-fill')).toBeNull();
    expect(screen.getByRole('meter')).toHaveAttribute(
      'aria-valuetext',
      expect.stringContaining('not a safety assessment'),
    );
  });
  it('fills oxygen reserve proportionally while preserving warning text', () => {
    const { container } = render(
      <TelemetryBar value={24} severity="warning" scale={INDICATOR_SCALES.oxygen} />,
    );
    expect(container.querySelector('.indicator-fill')).toHaveStyle({ width: '24%' });
    expect(screen.getByText('WARNING')).toBeInTheDocument();
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '24');
  });
  it('preserves an out-of-scale reading while bounding its marker', () => {
    const { container } = render(
      <TelemetryBar value={240} severity="critical" scale={INDICATOR_SCALES.heartRate} />,
    );
    expect(screen.getByText('240')).toBeInTheDocument();
    expect(screen.getByRole('meter')).toHaveAttribute(
      'aria-valuetext',
      expect.stringContaining('240 BPM'),
    );
    expect(container.querySelector('.indicator-marker')).toHaveStyle({ left: '100%' });
    expect(screen.getByText('ABOVE DISPLAY SCALE')).toBeInTheDocument();
  });
  it('shows unavailable breathing rate without substituting a normal reading', () => {
    const { container } = render(
      <TelemetryBar value={null} scale={INDICATOR_SCALES.breathingRate} />,
    );
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
    expect(screen.getByRole('meter')).not.toHaveAttribute('aria-valuenow');
    expect(container.querySelector('.indicator-marker')).toBeNull();
  });
  it('shows the actual critical SpO2 below the visual scale', () => {
    const { container } = render(
      <TelemetryBar value={79} severity="critical" scale={INDICATOR_SCALES.spo2} />,
    );
    expect(screen.getByText('79.0')).toBeInTheDocument();
    expect(screen.getByText('BELOW DISPLAY SCALE')).toBeInTheDocument();
    expect(container.querySelector('.indicator-marker')).toHaveStyle({ left: '0%' });
    expect(container.querySelector('.telemetry-bar')).toHaveClass('status-critical');
  });
});
