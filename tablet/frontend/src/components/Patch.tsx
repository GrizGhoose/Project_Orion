/** Team mission patch: NASA-palette, deliberately not the NASA insignia. */
export function Patch({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="14 14 92 92" aria-label="Crew Health patch" role="img">
      <circle cx="60" cy="60" r="44" fill="#0B3D91" stroke="#fff" strokeWidth="4" />
      <path d="M22 84a46 46 0 0 0 76 0a60 60 0 0 1-76 0z" fill="#C9D1DC" />
      <path d="M24 60h22l6-14 8 30 7-22 4 6h25" fill="none" stroke="#FC3D21" strokeWidth="6"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="40" cy="36" r="2" fill="#fff" />
      <circle cx="78" cy="30" r="2.5" fill="#fff" />
      <circle cx="88" cy="46" r="1.6" fill="#fff" />
    </svg>
  );
}
