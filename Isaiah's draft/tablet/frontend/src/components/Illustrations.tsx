import type { ReactNode } from "react";
import type { CrewFrame } from "../types";

/**
 * Line-art step illustrations, drawn in the app's palette so they work offline.
 * They show the idea of each step; real hardware layouts follow the suit's procedures.
 */

const L = "#cfe0ff";      // line
const F = "#16336b";      // fill
const F2 = "#0b3d91";     // NASA blue
const B = "#2a5bb5";      // body
const A = "#4d8dff";      // accent
const G = "#33c27f";
const Y = "#ffc61a";
const R = "#ff3b30";
const P = "#b07cff";
const DARK = "#04101f";

export interface FigProps {
  crew?: CrewFrame;
  picks?: string[];
}

function Svg({ children, h = 240 }: { children: ReactNode; h?: number }) {
  return <svg viewBox={`0 0 300 ${h}`} className="illu" role="img">{children}</svg>;
}

function Arrow({ x1, y1, x2, y2, c = A }: { x1: number; y1: number; x2: number; y2: number; c?: string }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = (d: number) => `${x2 - 12 * Math.cos(a + d)},${y2 - 12 * Math.sin(a + d)}`;
  return (
    <g stroke={c} strokeWidth={4} strokeLinecap="round" fill="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <polyline points={`${h(0.5)} ${x2},${y2} ${h(-0.5)}`} strokeLinejoin="round" />
    </g>
  );
}

function Astro({ x, y, ring = L }: { x: number; y: number; ring?: string }) {
  return (
    <g strokeLinecap="round">
      <rect x={x - 30} y={y + 14} width={14} height={48} rx={5} fill={F2} stroke={L} strokeWidth={2} />
      <rect x={x - 22} y={y + 16} width={44} height={60} rx={14} fill={F} stroke={ring} strokeWidth={3} />
      <circle cx={x} cy={y} r={22} fill={F} stroke={ring} strokeWidth={3} />
      <ellipse cx={x + 6} cy={y + 1} rx={13} ry={10} fill={DARK} stroke={A} strokeWidth={2} />
      <line x1={x - 10} y1={y + 76} x2={x - 12} y2={y + 108} stroke={B} strokeWidth={12} />
      <line x1={x + 10} y1={y + 76} x2={x + 12} y2={y + 108} stroke={B} strokeWidth={12} />
    </g>
  );
}

const O2Mask = () => (
  <Svg>
    <path d="M85 160 L82 225 M138 162 L146 225" stroke={L} strokeWidth={3} fill="none" />
    <circle cx={110} cy={105} r={58} fill={F} stroke={L} strokeWidth={3} />
    <ellipse cx={92} cy={110} rx={8} ry={13} fill={F2} stroke={L} strokeWidth={2} />
    <path d="M150 108 Q105 62 56 98" stroke={L} strokeWidth={2} strokeDasharray="5 5" fill="none" />
    <path d="M150 102 Q182 110 180 138 Q174 164 146 162 Q136 130 150 102 Z" fill={A} fillOpacity={0.35} stroke={A} strokeWidth={3} />
    <path d="M150 164 Q138 204 164 214 Q192 204 176 160" fill={G} fillOpacity={0.25} stroke={G} strokeWidth={3} />
    <path d="M178 150 C214 158 214 205 236 205" stroke={L} strokeWidth={4} fill="none" />
    <rect x={232} y={118} width={38} height={104} rx={14} fill={F2} stroke={L} strokeWidth={3} />
    <rect x={243} y={102} width={16} height={16} rx={3} fill={F} stroke={L} strokeWidth={2} />
    <text x={251} y={176} textAnchor="middle" className="t-strong" fill={L}>O₂</text>
    <text x={190} y={38} className="t-big" fill={G}>100 % O₂</text>
    <text x={190} y={60} className="t-small">high flow, check the seal</text>
  </Svg>
);

const Oximeter = ({ crew }: FigProps) => {
  const v = crew ? crew.spo2_smooth.toFixed(0) : "94";
  const low = crew ? crew.spo2_smooth < 94 : false;
  return (
    <Svg>
      <path d="M10 100 Q40 90 60 104 L60 170 Q30 182 10 170 Z" fill={F} stroke={L} strokeWidth={3} />
      <rect x={50} y={112} width={180} height={46} rx={23} fill={F} stroke={L} strokeWidth={3} />
      <path d="M110 118 v34 M160 118 v34" stroke={L} strokeOpacity={0.35} strokeWidth={2} />
      <rect x={168} y={84} width={100} height={98} rx={18} fill={F2} stroke={A} strokeWidth={3} />
      <rect x={182} y={98} width={72} height={52} rx={8} fill={DARK} />
      <text x={218} y={134} textAnchor="middle" className="t-mono" fill={low ? Y : G}>{v}</text>
      <text x={218} y={170} textAnchor="middle" className="t-small">SpO₂ %</text>
      <text x={150} y={218} textAnchor="middle" className="t-strong" fill={L}>Target 94 % or above</text>
    </Svg>
  );
};

const Recovery = () => (
  <Svg>
    <line x1={14} y1={204} x2={286} y2={204} stroke={L} strokeOpacity={0.4} strokeWidth={3} />
    <g stroke={B} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M96 196 L34 198" strokeWidth={12} />
      <path d="M84 182 L170 186" strokeWidth={28} />
      <path d="M170 194 L268 196" strokeWidth={16} />
      <path d="M170 180 L214 146 L244 190" strokeWidth={16} stroke="#3b74d6" />
      <path d="M116 176 L92 150 L74 166" strokeWidth={12} stroke="#3b74d6" />
    </g>
    <circle cx={60} cy={174} r={21} fill={F} stroke={L} strokeWidth={3} />
    <path d="M30 130 Q14 150 30 168" stroke={G} strokeWidth={3} fill="none" />
    <text x={14} y={118} className="t-small" fill={G}>Head tilted back</text>
    <text x={196} y={128} className="t-small">Top knee bent</text>
    <text x={150} y={232} textAnchor="middle" className="t-strong" fill={L}>On their side, airway open</text>
  </Svg>
);

const Cpr = () => (
  <Svg h={250}>
    {/* Floor */}
    <line x1={10} y1={214} x2={290} y2={214} stroke={L} strokeOpacity={0.4} strokeWidth={3} />
    {/* Rescuer kneeling on the far side, shoulders over hands, arms locked straight */}
    <g stroke="#7aa6f5" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M232 212 L196 212 L190 152" strokeWidth={15} />
      <path d="M190 152 L142 104" strokeWidth={24} />
      <path d="M140 104 L124 168" strokeWidth={11} />
    </g>
    <circle cx={128} cy={80} r={16} fill={F} stroke="#7aa6f5" strokeWidth={3} />
    {/* Patient on their back */}
    <g stroke={B} strokeLinecap="round" fill="none">
      <path d="M78 194 L176 194" strokeWidth={30} />
      <path d="M176 198 L282 202" strokeWidth={16} />
      <path d="M176 190 L276 192" strokeWidth={16} />
    </g>
    <circle cx={56} cy={190} r={18} fill={F} stroke={L} strokeWidth={3} />
    {/* Stacked hands on the centre of the chest */}
    <rect x={108} y={166} width={34} height={12} rx={5} fill={A} stroke={L} strokeWidth={2} />
    <rect x={112} y={158} width={26} height={10} rx={4} fill={A} fillOpacity={0.6} stroke={L} strokeWidth={2} />
    {/* Push */}
    <Arrow x1={84} y1={100} x2={84} y2={158} c={Y} />
    <text x={78} y={92} textAnchor="end" className="t-strong" fill={Y}>PUSH</text>
    <text x={78} y={130} textAnchor="end" className="t-small" fill={Y}>5–6 cm</text>
    {/* Inset: where the hands go */}
    <g transform="translate(212 14)">
      <rect width={78} height={86} rx={8} fill={DARK} stroke={L} strokeOpacity={0.4} />
      <path d="M18 14 Q39 6 60 14 L64 76 L14 76 Z" fill={F} stroke={L} strokeWidth={2} />
      <line x1={39} y1={18} x2={39} y2={60} stroke={L} strokeOpacity={0.4} strokeWidth={2} />
      <circle cx={39} cy={40} r={9} fill={A} stroke={L} strokeWidth={2} />
    </g>
    <text x={251} y={116} textAnchor="middle" className="t-small">Centre of chest</text>
    <text x={150} y={242} textAnchor="middle" className="t-mono-sm" fill={A}>100–120 / min</text>
  </Svg>
);

const SuitGauge = ({ crew }: FigProps) => {
  const v = crew?.suit_psia ?? 4.3;
  const cx = 150, cy = 170, r = 108;
  const ang = (p: number) => Math.PI * (1 - (Math.min(5, Math.max(2, p)) - 2) / 3);
  const pt = (p: number, rr = r) => [cx + rr * Math.cos(ang(p)), cy - rr * Math.sin(ang(p))];
  const arc = (a: number, b: number) => {
    const [x1, y1] = pt(a), [x2, y2] = pt(b);
    return `M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  const [nx, ny] = pt(v, 92);
  return (
    <Svg>
      <path d={arc(2, 4)} stroke={R} strokeWidth={14} fill="none" strokeOpacity={0.75} />
      <path d={arc(4, 4.6)} stroke={G} strokeWidth={14} fill="none" />
      <path d={arc(4.6, 5)} stroke={L} strokeOpacity={0.3} strokeWidth={14} fill="none" />
      {[2, 3, 4, 5].map((p) => {
        const [x, y] = pt(p, r - 28);
        return <text key={p} x={x} y={y + 5} textAnchor="middle" className="t-small">{p}</text>;
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#fff" strokeWidth={5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={9} fill="#fff" />
      <text x={cx} y={214} textAnchor="middle" className="t-mono" fill={v < 4 ? R : G}>{v.toFixed(2)}</text>
      <text x={cx} y={234} textAnchor="middle" className="t-small">psia · nominal 4.3 (green)</text>
    </Svg>
  );
};

const EmergencyO2 = ({ crew }: FigProps) => (
  <Svg>
    <rect x={30} y={30} width={240} height={176} rx={20} fill={F} stroke={L} strokeWidth={3} />
    <rect x={50} y={48} width={124} height={46} rx={7} fill={DARK} />
    <text x={62} y={78} className="t-mono-sm" fill={crew && crew.suit_psia < 4 ? R : G}>
      P {crew ? crew.suit_psia.toFixed(1) : "4.3"}
    </text>
    <circle cx={206} cy={62} r={9} fill={F2} stroke={L} strokeWidth={2} />
    <circle cx={238} cy={62} r={9} fill={F2} stroke={L} strokeWidth={2} />
    <text x={110} y={120} textAnchor="middle" className="t-strong" fill={R}>EMERG O₂</text>
    <circle cx={110} cy={160} r={30} fill={R} fillOpacity={0.18} stroke={R} strokeWidth={4} />
    <line x1={110} y1={160} x2={110} y2={136} stroke="#fff" strokeWidth={5} strokeLinecap="round" />
    <path d="M150 140 A44 44 0 0 1 140 192" stroke={A} strokeWidth={4} fill="none" />
    <polyline points="132,182 140,193 151,186" stroke={A} strokeWidth={4} fill="none" strokeLinecap="round" />
    <rect x={190} y={134} width={56} height={52} rx={10} fill={F2} stroke={L} strokeWidth={2} />
    <text x={218} y={166} textAnchor="middle" className="t-small" fill={L}>OPEN</text>
    <text x={150} y={232} textAnchor="middle" className="t-small">Generic layout: follow the suit's procedure</text>
  </Svg>
);

const Buddy = () => (
  <Svg>
    <Astro x={84} y={56} ring={Y} />
    <Astro x={216} y={56} />
    <path d="M100 120 Q150 150 200 120" stroke={L} strokeWidth={2} strokeDasharray="6 5" fill="none" />
    <Arrow x1={190} y1={96} x2={116} y2={96} />
    <text x={84} y={192} textAnchor="middle" className="t-strong" fill={Y}>EV1</text>
    <text x={216} y={192} textAnchor="middle" className="t-strong" fill={L}>Buddy</text>
    <text x={150} y={230} textAnchor="middle" className="t-small">Arm's reach · check display &amp; helmet</text>
  </Svg>
);

const Airlock = () => (
  <Svg>
    <rect x={30} y={24} width={136} height={186} rx={26} fill={F} stroke={L} strokeWidth={4} />
    <circle cx={98} cy={78} r={26} fill={DARK} stroke={L} strokeWidth={3} />
    <path d="M140 116 v36" stroke={L} strokeWidth={6} strokeLinecap="round" />
    <circle cx={232} cy={94} r={46} fill={F2} stroke={L} strokeWidth={3} />
    <path d="M200 110 A36 36 0 1 1 264 110" stroke={G} strokeWidth={6} fill="none" />
    <text x={232} y={102} textAnchor="middle" className="t-mono-sm" fill={G}>8.2</text>
    <text x={232} y={122} textAnchor="middle" className="t-small">psia</text>
    <Arrow x1={262} y1={176} x2={186} y2={176} c={G} />
    <text x={232} y={204} textAnchor="middle" className="t-strong" fill={G}>Repress</text>
    <text x={98} y={234} textAnchor="middle" className="t-small">Both inside first</text>
  </Svg>
);

const HelmetOff = () => (
  <Svg>
    <path d="M60 236 Q150 176 240 236" fill={F} stroke={L} strokeWidth={3} />
    <circle cx={150} cy={162} r={42} fill={F} stroke={L} strokeWidth={3} />
    <path d="M78 104 A72 72 0 0 1 222 104" stroke={A} strokeWidth={4} strokeDasharray="8 6" fill={A} fillOpacity={0.08} />
    <ellipse cx={150} cy={104} rx={72} ry={10} stroke={A} strokeWidth={3} fill="none" />
    <Arrow x1={50} y1={120} x2={50} y2={60} />
    <Arrow x1={250} y1={120} x2={250} y2={60} />
    <text x={150} y={22} textAnchor="middle" className="t-strong" fill={Y}>Pressure equal first</text>
  </Svg>
);

const BodyMap = ({ picks = [] }: FigProps) => {
  const on = (id: string) => picks.includes(id);
  const dot = (x: number, y: number, c: string, id: string) => (
    <circle key={`${id}${x}${y}`} cx={x} cy={y} r={on(id) ? 10 : 6} fill={on(id) ? c : DARK} stroke={c} strokeWidth={3} />
  );
  return (
    <Svg h={260}>
      <g stroke={B} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M128 72 L104 116 L96 162" />
        <path d="M172 72 L196 116 L204 162" />
        <path d="M138 146 L134 196 L132 240" />
        <path d="M162 146 L166 196 L168 240" />
      </g>
      <rect x={122} y={62} width={56} height={88} rx={18} fill={B} />
      <circle cx={150} cy={38} r={20} fill={B} />
      {on("neuro") && <circle cx={150} cy={38} r={28} fill="none" stroke={R} strokeWidth={3} strokeDasharray="4 4" />}
      {on("mottle") && <path d="M128 112 q10 -8 18 2 q-6 12 -18 4 z M140 128 q8 -6 14 2 q-6 8 -14 2z" fill={P} />}
      {[[128, 72], [172, 72], [104, 116], [196, 116], [134, 196], [166, 196]].map(([x, y]) => dot(x, y, Y, "joint"))}
      {[[96, 162], [204, 162], [132, 240], [168, 240]].map(([x, y]) => dot(x, y, Y, "tingle"))}
      {dot(150, 38, R, "neuro")}
      {dot(150, 88, R, "chokes")}
      {on("itch") && [[170, 104], [176, 120], [166, 132]].map(([x, y]) => <circle key={`i${y}`} cx={x} cy={y} r={3} fill={Y} />)}
      <g className="t-small">
        <circle cx={14} cy={18} r={6} fill={Y} /><text x={26} y={23}>Type I</text>
        <circle cx={14} cy={40} r={6} fill={R} /><text x={26} y={45}>Type II</text>
        <circle cx={14} cy={62} r={6} fill={P} /><text x={26} y={67}>Marbled</text>
      </g>
    </Svg>
  );
};

const Bta = () => (
  <Svg>
    <line x1={14} y1={222} x2={286} y2={222} stroke={L} strokeOpacity={0.4} strokeWidth={3} />
    <g transform="translate(0 14) scale(1.35) translate(-30 -6)">
      <Astro x={110} y={40} ring={G} />
    </g>
    <rect x={196} y={112} width={66} height={50} rx={9} fill={F2} stroke={A} strokeWidth={3} />
    <text x={229} y={143} textAnchor="middle" className="t-strong" fill={L}>BTA</text>
    <path d="M196 138 Q176 140 160 130" stroke={L} strokeWidth={4} fill="none" />
    <text x={228} y={52} textAnchor="middle" className="t-big" fill={G}>+8.0 psid</text>
    <text x={228} y={74} textAnchor="middle" className="t-small">above cabin, 100 % O₂</text>
  </Svg>
);

export const FIGURES: Record<string, { el: (p: FigProps) => JSX.Element; caption: string }> = {
  o2_mask: { el: O2Mask, caption: "100 % O₂ by mask" },
  oximeter: { el: Oximeter, caption: "Pulse oximeter (live value)" },
  recovery: { el: Recovery, caption: "Recovery position" },
  cpr: { el: Cpr, caption: "CPR: chest compressions" },
  suit_gauge: { el: SuitGauge, caption: "Suit pressure (live)" },
  emergency_o2: { el: EmergencyO2, caption: "Emergency O₂ on the suit" },
  buddy: { el: Buddy, caption: "Buddy check" },
  airlock: { el: Airlock, caption: "Airlock repress" },
  helmet_off: { el: HelmetOff, caption: "Helmet off" },
  body_map: { el: BodyMap, caption: "Where the symptoms are" },
  bta: { el: Bta, caption: "Bends Treatment Apparatus" },
};

export function Figure({ id, crew, picks }: { id: string } & FigProps) {
  const fig = FIGURES[id];
  if (!fig) return null;
  const El = fig.el;
  return (
    <figure className="figure">
      <El crew={crew} picks={picks} />
      <figcaption>{fig.caption}</figcaption>
    </figure>
  );
}
