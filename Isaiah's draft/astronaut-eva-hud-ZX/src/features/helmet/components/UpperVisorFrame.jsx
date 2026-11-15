/** A shallow curved projection frame; the scene and central task area stay untouched. */
export function UpperVisorFrame({ width, height }) {
  const brow =
    'M 25 10 Q 115 44 245 51 C 266 52 268 9 303 9 Q 400 1 497 9 C 532 9 534 52 555 51 Q 685 44 775 10';
  return (
    <svg
      className="upper-visor-frame"
      width={width}
      height={height}
      viewBox={`0 0 800 ${(height / width) * 800}`}
      aria-hidden="true"
      focusable="false"
    >
      <path className="visor-brow-halo" d={brow} />
      <path className="visor-brow-line" d={brow} />
      <path className="visor-brow-echo" d={brow} transform="translate(0 5)" />
      <path
        className="visor-wing-bracket"
        d="M 20 23 Q 13 62 22 113 Q 24 124 35 127 L 218 151 M 780 23 Q 787 62 778 113 Q 776 124 765 127 L 582 151"
      />
      <path className="visor-timer-rule" d="M 312 101 Q 400 111 488 101" />
    </svg>
  );
}
