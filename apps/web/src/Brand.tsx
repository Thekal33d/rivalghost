/** Flight Deck brand art: logo, line icons, ships and HOUND, drawn from the Nov 14 redesign. */
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function LogoMark({ size = 52 }: { size?: number }) {
  return <svg className="logo-mark" width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">
    <rect x="3" y="3" width="50" height="50" rx="14" fill="#FF6B4A" stroke="#0B1418" strokeWidth="3"/>
    <path d="M6 17a11 11 0 0111-11h22a11 11 0 0111 11v5H6z" fill="#FFFFFF" opacity=".28"/>
    <path d="M40 24c0 7-6 12-14 12H10l4.5-4-4.5-4 4.5-4-4.5-4 4.5-4-4.5-4h16c8 0 14 5 14 12z" fill="#B79CFF" opacity=".9" transform="translate(-1 -3)"/>
    <path d="M48 30c0 7.2-6.3 13-15 13H15l5-4.3-5-4.4 5-4.3-5-4.3 5-4.4-5-4.3h18c8.7 0 15 5.8 15 13z" fill="#F3ECDC" stroke="#0B1418" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M30 24l11 3.5-1.5 5.5-10.5-3z" fill="#0B1418"/>
    <path d="M33.5 27.3l5 1.6-.6 2-5-1.5z" fill="#7DF5C0"/>
  </svg>;
}

export function Wordmark() {
  return <span className="wordmark-type">RIVAL<span>GHOST</span></span>;
}

const STROKE: Record<string, string> = {
  home: "M3 11l9-8 9 8v10h-6v-6H9v6H3z",
  map: "M3 20a9 9 0 0118 0M7.5 20a4.5 4.5 0 019 0M12 20v-1M12 3v3",
  trophy: "M7 4h10v5a5 5 0 01-10 0zM7 6H3.5v1A3.5 3.5 0 007 10.5M17 6h3.5v1a3.5 3.5 0 01-3.5 3.5M12 14v4M8 20h8",
  wrench: "M15 5a4 4 0 00-5 5l-7 7 3 3 7-7a4 4 0 005-5l-3 3-2-1-1-2z",
  ghost: "M5 21V10a7 7 0 0114 0v11l-3.5-2.5L12 21l-3.5-2.5zM9.5 10v2M14.5 10v2",
  clock: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3.5 2",
  check: "M4 12l5 5L20 6",
  spread: "M3 12h9M12 12l8-7M12 12h9M12 12l8 7",
  shield: "M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z",
  soundOff: "M3 9v6h4l5 4V5L7 9zM16 9l5 6M21 9l-5 6",
  soundOn: "M3 9v6h4l5 4V5L7 9zM16 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12",
  target: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8zM12 1v4M12 19v4M1 12h4M19 12h4",
  lock: "M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 017 0v3",
  arrowLeft: "M19 12H5M11 6l-6 6 6 6",
  expand: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
  pause: "M8 5v14M16 5v14",
};
const FILL: Record<string, string> = {
  crown: "M3 19h18l2-11-6 4-5-8-5 8-6-4z",
  medal: "M12 2l10 10-10 10L2 12z",
  bolt: "M13 2L4 14h6l-1 8 9-12h-6z",
  star: "M12 2l3 7 7 .8-5.3 4.8L18.5 22 12 18l-6.5 4 1.8-7.4L2 9.8 9 9z",
  person: "M12 2a4 4 0 110 8 4 4 0 010-8zM5 22v-4a7 7 0 0114 0v4z",
  play: "M7 3l14 9-14 9z",
  wings: "M12 15L1 6l3 10 8 4 8-4 3-10z",
};
export type IconName = keyof typeof STROKE | keyof typeof FILL;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  const filled = name in FILL;
  return <svg className={className ? `icon ${className}` : "icon"} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
    fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d={filled ? FILL[name] : STROKE[name]}/>
  </svg>;
}

/** Three diamonds, filled for each medal earned (bit mask 1|2|4). */
export function MedalDiamonds({ mask, className }: { mask: number; className?: string }) {
  const count = [1, 2, 4].filter(bit => mask & bit).length;
  return <svg className={className ? `medal-diamonds ${className}` : "medal-diamonds"} viewBox="0 0 64 20" role="img" aria-label={`${count} of 3 medals`}>
    {[1, 2, 4].map((bit, i) => <path key={bit} d={`M${10 + i * 22} 2l8 8-8 8-8-8z`} fill={mask & bit ? "#FFD166" : "none"} stroke="currentColor" strokeWidth="2"/>)}
  </svg>;
}

export function Ship({ color = "#7DF5C0", label, ghost = false, className }: { color?: string; label?: string; ghost?: boolean; className?: string }) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const };
  if (ghost) return <svg className={className} viewBox="0 0 134 100" {...a11y}>
    <path d="M126 50L54 8l10 30H36L22 50l14 12h28L54 92z" fill="rgba(183,156,255,.16)" stroke="#B79CFF" strokeWidth="4" strokeDasharray="8 6" strokeLinejoin="round"/>
  </svg>;
  return <svg className={className} viewBox="0 0 134 100" {...a11y}>
    <path d="M24 50L2 38l8 12-8 12z" fill="#FFD166"/>
    <path d="M126 50L54 8l10 30H36L22 50l14 12h28L54 92z" fill={color} stroke="#0B1418" strokeWidth="5" strokeLinejoin="round"/>
    <path d="M116 48L62 17l6 19z" fill="#FFFFFF" opacity=".4"/>
    <path d="M96 50L70 40v20z" fill="#0B1418"/>
    <path d="M57 24h8v9h-8zM57 67h8v9h-8z" fill="#FF6B4A"/>
  </svg>;
}

export function EnemyDart({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
    <path d="M6 50L62 14l-6 24h28l12 12-12 12H56l6 24z" fill="#FF6B4A" stroke="#0B1418" strokeWidth="5" strokeLinejoin="round"/>
    <path d="M16 49l40-25-5 20z" fill="#FFFFFF" opacity=".35"/>
    <path d="M40 50l22-9v18z" fill="#0B1418"/>
  </svg>;
}

/** HOUND, the masked rival pilot. */
export function Hound({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 300 330" role="img" aria-label="HOUND, a masked dog pilot">
    <path d="M72 124L50 38l72 50zM228 124l22-86-72 50z" fill="#B4462F" stroke="#0B1418" strokeWidth="8" strokeLinejoin="round"/>
    <path d="M70 96L62 60l30 22zM230 96l8-36-30 22z" fill="#F3ECDC" stroke="#0B1418" strokeWidth="5" strokeLinejoin="round"/>
    <path d="M44 330l14-62 52-14 40 28 40-28 52 14 14 62z" fill="#FF6B4A" stroke="#0B1418" strokeWidth="8" strokeLinejoin="round"/>
    <path d="M118 286h64l-8 30h-48z" fill="#F3ECDC" stroke="#0B1418" strokeWidth="6" strokeLinejoin="round"/>
    <path d="M78 96h144l30 56-14 86-88 44-88-44-14-86z" fill="#FF6B4A" stroke="#0B1418" strokeWidth="8" strokeLinejoin="round"/>
    <path d="M88 104h62l-78 52z" fill="#FFFFFF" opacity=".3"/>
    <path d="M66 142h168l8 50-92 26-92-26z" fill="#0B1418"/>
    <path d="M90 160l42 8-6 20-30-6zM210 160l-42 8 6 20 30-6z" fill="#FFD166"/>
    <path d="M108 218l42-20 42 20-10 46-32 14-32-14z" fill="#F3ECDC" stroke="#0B1418" strokeWidth="7" strokeLinejoin="round"/>
    <path d="M138 208h24l-12 14z" fill="#0B1418"/>
    <path d="M124 246l12 6 14-6 14 6 12-6M136 244v12M150 240v12M164 244v12" fill="none" stroke="#0B1418" strokeWidth="4" strokeLinecap="round"/>
    <path d="M120 72l10-28 12 16 8-24 8 24 12-16 10 28z" fill="#FFD166" stroke="#0B1418" strokeWidth="6" strokeLinejoin="round"/>
  </svg>;
}

/** Skewed, glossy arcade button; `tone` picks coral (primary) or steel. */
export function ArcadeButton({ tone = "coral", size = "md", children, className, ...rest }:
  { tone?: "coral" | "steel" | "mint"; size?: "sm" | "md" | "xl"; children: ReactNode; className?: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...rest} className={`arcade-button arcade-${tone} arcade-${size}${className ? ` ${className}` : ""}`}>
    <span className="arcade-shine" aria-hidden="true"/>
    <span className="arcade-label">{children}</span>
  </button>;
}

export function Keycap({ children }: { children: ReactNode }) {
  return <kbd className="keycap">{children}</kbd>;
}
