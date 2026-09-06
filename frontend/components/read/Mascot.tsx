"use client";

/**
 * Sparkle — the SpeakFlow mascot. A soft rounded star character drawn in the
 * design-system palette (lavender body, pink cheeks, ink outline), replacing
 * the emoji placeholder everywhere a mascot appears in Story Mode.
 *
 * Moods:
 *   happy     — checkpoint passed
 *   encourage — checkpoint missed ("nice try")
 *   thinking  — Phase-2 feedback pending/ready
 *   celebrate — rewards interstitial + story complete
 */

export type MascotMood = "happy" | "encourage" | "thinking" | "celebrate";

const INK = "#1A1A1A";
const BODY = "#C9BFF0";
const BODY_SHADE = "#A89EDB";
const CHEEK = "#F5C6D8";
const GOLD = "#FFB020";

// 5-point star polygon, center (50,54), outer r=44, inner r=19
const STAR =
  "50,10 61.2,38.6 91.9,40.4 68.1,59.9 75.9,89.6 50,73 24.1,89.6 31.9,59.9 8.2,40.4 38.8,38.6";

function Sparkle({ x, y, size = 5, color = GOLD }: { x: number; y: number; size?: number; color?: string }) {
  return (
    <path
      d={`M${x} ${y - size} L${x + size * 0.32} ${y - size * 0.32} L${x + size} ${y}
          L${x + size * 0.32} ${y + size * 0.32} L${x} ${y + size}
          L${x - size * 0.32} ${y + size * 0.32} L${x - size} ${y}
          L${x - size * 0.32} ${y - size * 0.32} Z`}
      fill={color}
    />
  );
}

export default function Mascot({
  mood = "happy",
  className = "h-20 w-20",
}: {
  mood?: MascotMood;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} select-none`} role="img"
      aria-label={`SpeakFlow mascot (${mood})`}>
      {/* dark outline pass (slightly larger, rounded joins) */}
      <polygon points={STAR} fill={INK} stroke={INK} strokeWidth={17} strokeLinejoin="round" />
      {/* body */}
      <polygon points={STAR} fill={BODY} stroke={BODY} strokeWidth={11} strokeLinejoin="round" />
      {/* soft bottom shading inside the body */}
      <polygon points={STAR} fill={BODY_SHADE} opacity={0.18} stroke="none"
        clipPath="url(#mascot-lower)" />
      <defs>
        <clipPath id="mascot-lower">
          <rect x="0" y="58" width="100" height="42" />
        </clipPath>
      </defs>

      {/* face */}
      {mood === "celebrate" ? (
        // closed happy eyes ^^
        <>
          <path d="M37 49 Q40.5 45.5 44 49" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <path d="M56 49 Q59.5 45.5 63 49" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <path d="M42 56 Q50 67 58 56 Q50 59.5 42 56 Z" fill={INK} />
        </>
      ) : (
        <>
          <circle cx={40.5} cy={48} r={3.4} fill={INK} />
          <circle cx={59.5} cy={48} r={3.4} fill={INK} />
          {mood === "thinking" ? (
            <circle cx={50} cy={60} r={2.8} fill={INK} />
          ) : mood === "encourage" ? (
            <path d="M44 59.5 Q50 64 56 59.5" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
          ) : (
            <path d="M42 57 Q50 66 58 57" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
          )}
        </>
      )}

      {/* cheeks */}
      <circle cx={33} cy={56.5} r={4.4} fill={CHEEK} opacity={0.9} />
      <circle cx={67} cy={56.5} r={4.4} fill={CHEEK} opacity={0.9} />

      {/* sparkles */}
      <Sparkle x={12} y={18} size={6} color={GOLD} />
      <Sparkle x={88} y={14} size={5} color={CHEEK} />
      {mood === "celebrate" && <Sparkle x={90} y={68} size={4.5} color={BODY_SHADE} />}
    </svg>
  );
}
