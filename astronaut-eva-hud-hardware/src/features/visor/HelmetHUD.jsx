import { useEffect, useState } from 'react';
import { formatElapsed, TELEMETRY } from './config';
import { CentralAlert } from '../monitoring/CentralAlert';
import { defaultTelemetry } from '../monitoring/scenarioSimulator';

function useTime() {
  const [startedAt] = useState(() => performance.now());
  const [time, setTime] = useState(() => ({ now: new Date(), elapsed: 0 }));
  useEffect(() => {
    const update = () => setTime({ now: new Date(), elapsed: performance.now() - startedAt });
    const interval = window.setInterval(update, 200);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', update);
    };
  }, [startedAt]);
  return time;
}

export function MissionClock({ now }) {
  const value = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
  return (
    <g className="mission-clock" role="group" aria-label={`Mission time ${value}`}>
      <text x="960" y="21" className="hud-label clock-label" textAnchor="middle">
        MISSION TIME
      </text>
      <text x="960" y="49" className="digital clock-value" textAnchor="middle">
        {value}
      </text>
    </g>
  );
}

export function Stopwatch({ elapsed }) {
  return (
    <g role="timer" aria-label="EVA elapsed" aria-live="off">
      <text x="960" y="125" textAnchor="middle" className="digital elapsed-value">
        {formatElapsed(elapsed)}
      </text>
      <text x="960" y="151" textAnchor="middle" className="hud-label elapsed-label">
        EVA ELAPSED
      </text>
    </g>
  );
}

export function TelemetryReadout({ metric, x, y, percentage = false, emphasis = 'NORMAL' }) {
  return (
    <g
      role="group"
      className={emphasis === 'NORMAL' ? undefined : `readout-${emphasis.toLowerCase()}`}
      aria-label={`${metric.label}: ${metric.value}${percentage ? '' : ' '}${metric.unit} simulated`}
    >
      <text x={x} y={y} className="hud-label telemetry-label">
        {metric.label}
      </text>
      <text x={x} y={y + 39} className="digital telemetry-value">
        {metric.value}
        <tspan dx="10" className={percentage ? 'percentage-unit' : 'telemetry-unit'}>
          {metric.unit}
        </tspan>
      </text>
    </g>
  );
}

function Waveform({ kind, d, reserveWideReading = false }) {
  return (
    <g
      className={`waveform waveform-${kind}`}
      aria-hidden="true"
      clipPath={reserveWideReading ? 'url(#wide-heart-wave)' : undefined}
    >
      {reserveWideReading && (
        <defs>
          <clipPath id="wide-heart-wave">
            <rect x="375" y="0" width="300" height="1080" />
          </clipPath>
        </defs>
      )}
      <path
        className="wave-baseline"
        d={kind === 'breath' ? 'M450 214 Q540 225 635 227' : 'M344 307 Q480 332 635 338'}
      />
      <path className="wave-trace" d={d} />
      <path className="wave-sweep" d={d} />
    </g>
  );
}

function LeftTelemetry({ telemetry, severity, heartRateElevated }) {
  const heartSeverity = heartRateElevated ? severity : 'NORMAL';
  return (
    <g className="telemetry-wing" aria-label="Simulated respiration and heart rate" role="group">
      <path
        className="panel-outline"
        d="M259 130 Q437 184 650 196 M251 133 Q233 184 217 300 Q211 328 236 334 Q430 378 649 386"
      />
      <path className="panel-rule" d="M244 238 Q430 285 648 298" />
      <TelemetryReadout
        metric={{ ...TELEMETRY.respiration, value: telemetry.respiration }}
        x={275}
        y={163}
      />
      <Waveform
        kind="breath"
        d="M450 214 C462 216 464 197 475 199 C489 201 488 221 502 222 C516 223 517 204 529 205 C543 206 543 225 557 225 C570 226 572 210 584 211 C597 212 598 226 611 227 L635 227"
      />
      <g key={heartSeverity} className="heart-rate-telemetry" data-severity={heartSeverity}>
        <TelemetryReadout
          metric={{ ...TELEMETRY.heartRate, value: telemetry.heartRate }}
          x={254}
          y={271}
          emphasis={heartSeverity}
        />
        <Waveform
          kind="heart"
          reserveWideReading={telemetry.heartRate >= 100}
          d="M344 307 L368 312 L378 308 L386 316 L393 314 L400 290 L408 336 L416 305 L425 321 L454 325 L466 320 L478 329 L491 327 L498 306 L505 349 L513 320 L523 333 L552 336 L564 330 L576 339 L586 337 L594 315 L601 357 L608 330 L618 338 L635 338"
        />
      </g>
      <g className="micro-ticks" aria-hidden="true">
        {Array.from({ length: 13 }, (_, i) => (
          <path key={i} d={`M${284 + i * 27} ${218 + i * 4.6} l-1 5`} />
        ))}
      </g>
    </g>
  );
}

function RightTelemetry({ telemetry, severity }) {
  const segments = 20;
  const active = Math.round((telemetry.oxygen / 100) * segments);
  return (
    <g className="telemetry-wing" aria-label="Simulated oxygen measurements" role="group">
      <path
        className="panel-outline"
        d="M1661 130 Q1483 184 1270 196 M1669 133 Q1687 184 1703 300 Q1709 328 1684 334 Q1490 378 1271 386"
      />
      <path className="panel-rule" d="M1676 238 Q1490 285 1272 298" />
      <g key={severity} className="spo2-telemetry" data-severity={severity}>
        <TelemetryReadout
          metric={{ ...TELEMETRY.spo2, value: telemetry.spo2 }}
          x={1295}
          y={192}
          percentage
          emphasis={severity}
        />
        <path className="status-track" d="M1410 221 Q1525 211 1644 181" />
        <path
          className="status-fill"
          pathLength="100"
          strokeDasharray={`${telemetry.spo2} 100`}
          d="M1410 221 Q1525 211 1644 181"
        />
      </g>
      <TelemetryReadout
        metric={{ ...TELEMETRY.oxygen, value: telemetry.oxygen }}
        x={1295}
        y={300}
        percentage
      />
      <g aria-hidden="true">
        {Array.from({ length: segments }, (_, i) => {
          const x = 1410 + i * 12;
          const y = 333 - i * 2.25 - i * i * 0.028;
          return (
            <path
              key={i}
              className={`oxygen-segment ${i < active ? 'is-filled' : ''}`}
              d={`M${x} ${y} l8 -1.9`}
            />
          );
        })}
      </g>
      <g className="micro-ticks" aria-hidden="true">
        {Array.from({ length: 13 }, (_, i) => (
          <path key={i} d={`M${1636 - i * 27} ${218 + i * 4.6} l1 5`} />
        ))}
      </g>
    </g>
  );
}

export function VisorOverlay({ children, severity = 'NORMAL' }) {
  const side = 'M225 34 C94 122 36 297 39 520 C42 730 136 912 307 1040';
  const brow =
    'M244 27 C362 74 534 108 654 117 C706 121 725 70 768 64 C847 53 1073 53 1152 64 C1195 70 1214 121 1266 117 C1386 108 1558 74 1676 27';
  return (
    <svg
      className="visor-overlay"
      viewBox="0 0 1920 1080"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Astronaut helmet heads-up display"
    >
      <defs>
        <linearGradient id="edge-stroke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cce5ff" stopOpacity=".65" />
          <stop offset=".5" stopColor="#8cbfff" stopOpacity=".27" />
          <stop offset="1" stopColor="#d8eaff" stopOpacity=".7" />
        </linearGradient>
        <linearGradient id="brow-wash" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#78aeed" stopOpacity=".065" />
          <stop offset="1" stopColor="#78aeed" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g fill="none" aria-hidden="true">
        <path
          className="brow-wash"
          d={`${brow} L1654 96 Q1430 168 1260 172 Q1210 170 1171 119 Q1160 103 1125 104 L795 104 Q760 103 749 119 Q710 170 660 172 Q490 168 266 96 Z`}
        />
        <path className="brow-halo" d={brow} />
        <path key={`${severity}-brow`} className="brow-primary visor-alert-border" d={brow} />
        <path
          className="brow-secondary"
          d="M252 43 Q446 112 656 135 Q697 140 720 114 M1200 114 Q1223 140 1264 135 Q1474 112 1668 43"
        />
        <path className="brow-track" d="M264 73 Q457 136 651 151 M1269 151 Q1463 136 1656 73" />
        <path
          className="brow-track-inner"
          d="M270 88 Q457 149 651 163 M1269 163 Q1463 149 1650 88"
        />
        <path className="timer-rule" d="M749 153 Q822 164 869 163 M1051 163 Q1098 164 1171 153" />
        <path key={`${severity}-left`} className="peripheral-edge visor-alert-border" d={side} />
        <path
          key={`${severity}-right`}
          className="peripheral-edge visor-alert-border"
          d={side}
          transform="translate(1920 0) scale(-1 1)"
        />
        <path
          className="edge-echo"
          d="M216 27 C73 117 18 309 22 529 C27 756 133 946 293 1051 M1704 27 C1847 117 1902 309 1898 529 C1893 756 1787 946 1627 1051"
        />
        <path
          className="corner-bracket"
          d="M225 34 Q237 30 233 49 L207 153 Q202 176 218 183 M1695 34 Q1683 30 1687 49 L1713 153 Q1718 176 1702 183"
        />
        <g className="peripheral-ticks">
          {Array.from({ length: 39 }, (_, i) => {
            const angle = ((-139 + i * 7.3) * Math.PI) / 180;
            const x = 411 + 368 * Math.cos(angle);
            const y = 527 + 553 * Math.sin(angle);
            if (x > 270 || y < 60 || y > 1025) return null;
            const dx = (i % 5 === 0 ? 12 : 6) * -Math.cos(angle);
            const dy = (i % 5 === 0 ? 12 : 6) * -Math.sin(angle);
            return (
              <g key={i}>
                <path d={`M${x} ${y} l${dx} ${dy}`} />
                <path d={`M${1920 - x} ${y} l${-dx} ${dy}`} />
              </g>
            );
          })}
        </g>
        <path className="edge-terminal" d="M295 1024 l12 13 l15 -16 M1625 1024 l-12 13 l-15 -16" />
      </g>
      {children}
    </svg>
  );
}

export function LunarBackground() {
  return (
    <div
      className="lunar-background"
      role="img"
      aria-label="Eye-level view across a sunlit lunar surface, scattered rocks and distant hills beneath a black sky"
    />
  );
}

export function HelmetHUD({
  telemetry = defaultTelemetry(),
  severity = 'NORMAL',
  heartRateElevated = false,
}) {
  const { now, elapsed } = useTime();
  return (
    <main className="helmet-hud" data-alert-state={severity} aria-label="Lunar EVA helmet HUD">
      <LunarBackground />
      <div className="visor-shading" aria-hidden="true" />
      <div className="visor-scatter" aria-hidden="true" />
      <div className="visor-reflection" aria-hidden="true" />
      <VisorOverlay severity={severity}>
        <MissionClock now={now} />
        <Stopwatch elapsed={elapsed} />
        <LeftTelemetry
          telemetry={telemetry}
          severity={severity}
          heartRateElevated={heartRateElevated}
        />
        <RightTelemetry telemetry={telemetry} severity={severity} />
      </VisorOverlay>
      <CentralAlert key={severity} severity={severity} heartRateElevated={heartRateElevated} />
    </main>
  );
}
