'use client'

import { useId } from 'react'

import { cn } from '@/lib/utils'

/**
 * VoiceOrb — organic animated sphere inspired by ChatGPT's voice mode.
 * Pure SVG + CSS animations (no WebGL), keeps the vibe soft and human, not "AI-y".
 */
export function VoiceOrb({
  size = 220,
  className
}: {
  size?: number
  className?: string
}) {
  const id = useId().replace(/:/g, '')
  // Sem className, mantem o tamanho fixo via prop (uso simples, ex.: overlay de escuta).
  // Com className, quem chama controla o tamanho via CSS (ex.: preencher um flex-1
  // e encolher de verdade com a altura disponivel) — o inline style venceria qualquer
  // classe, entao so aplicamos ele quando nao ha className.
  const fixedSizeStyle = className
    ? undefined
    : { width: size * 1.6, height: size * 1.6 }
  return (
    <div
      className={cn('relative flex items-center justify-center select-none', className)}
      style={fixedSizeStyle}
      aria-hidden
    >
      {/* Soft diffused aura — sits outside the SVG so it never shows a hard edge */}
      <div className="orb-aura absolute inset-0 pointer-events-none" />
      <div className="orb-aura orb-aura--slow absolute inset-0 pointer-events-none" />

      {/* Orbits + stars — modern, subtle, celestial */}
      <svg viewBox="0 0 400 400" className="orb-orbits absolute inset-0 h-full w-full pointer-events-none">
        <defs>
          <radialGradient id={`star-${id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff5d1" stopOpacity="1" />
            <stop offset="60%" stopColor="#ffd28a" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ffd28a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Orbits — dashed, tilted ellipses */}
        <g className="orb-orbit orb-orbit--1" style={{ transformOrigin: '200px 200px' }}>
          <ellipse cx="200" cy="200" rx="175" ry="70" fill="none" stroke="rgba(255,210,138,0.35)" strokeWidth="0.6" strokeDasharray="1 4" />
        </g>
        <g className="orb-orbit orb-orbit--2" style={{ transformOrigin: '200px 200px' }}>
          <ellipse cx="200" cy="200" rx="160" ry="55" fill="none" stroke="rgba(199,155,255,0.35)" strokeWidth="0.6" strokeDasharray="1 3" transform="rotate(30 200 200)" />
        </g>
        <g className="orb-orbit orb-orbit--3" style={{ transformOrigin: '200px 200px' }}>
          <ellipse cx="200" cy="200" rx="185" ry="90" fill="none" stroke="rgba(180,220,255,0.3)" strokeWidth="0.5" strokeDasharray="1 5" transform="rotate(-25 200 200)" />
        </g>

        {/* Tiny travelling dots on orbits */}
        <g className="orb-satellite orb-satellite--1" style={{ transformOrigin: '200px 200px' }}>
          <circle cx="375" cy="200" r="2" fill={`url(#star-${id})`} />
        </g>
        <g className="orb-satellite orb-satellite--2" style={{ transformOrigin: '200px 200px' }}>
          <circle cx="360" cy="200" r="1.6" fill={`url(#star-${id})`} transform="rotate(30 200 200)" />
        </g>

        {/* Ambient stars */}
        {[
          [60, 80, 1.4, 0], [340, 70, 1.1, 0.8], [50, 320, 1.3, 1.4],
          [355, 310, 1.5, 0.4], [110, 40, 0.9, 1.9], [300, 360, 1, 0.6],
          [30, 200, 1.2, 2.3], [380, 180, 1, 1.2], [200, 20, 1.1, 0.2],
          [200, 380, 1.4, 1.6], [90, 360, 0.9, 2.1], [320, 40, 1.2, 0.9],
        ].map(([cx, cy, r, delay], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill={`url(#star-${id})`}
            className="orb-star"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </svg>

      {/* 62.5% = 1 / 1.6, mesma proporcao entre a bola e a caixa externa que o size*1.6 do wrapper sempre manteve */}
      <svg viewBox="0 0 200 200" className="orb-svg h-[62.5%] w-[62.5%]">
        <defs>
          <radialGradient id={`g1-${id}`} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#f5f0ff" />
            <stop offset="45%" stopColor="#b79bff" />
            <stop offset="100%" stopColor="#6b3fd6" />
          </radialGradient>
          <radialGradient id={`g2-${id}`} cx="30%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#ffd28a" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#c48bff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#4a1e9e" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`g3-${id}`} cx="70%" cy="70%" r="55%">
            <stop offset="0%" stopColor="#7ad0ff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#7ad0ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`hl-${id}`} cx="35%" cy="28%" r="25%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`clip-${id}`}>
            <circle cx="100" cy="100" r="92" />
          </clipPath>
        </defs>

        {/* main sphere */}
        <g clipPath={`url(#clip-${id})`}>
          <circle cx="100" cy="100" r="92" fill={`url(#g1-${id})`} />
          <circle cx="100" cy="100" r="92" fill={`url(#g2-${id})`} className="orb-blob-a" />
          <circle cx="100" cy="100" r="92" fill={`url(#g3-${id})`} className="orb-blob-b" />
          <circle cx="100" cy="100" r="92" fill={`url(#hl-${id})`} className="orb-hl" />
        </g>

        {/* rim */}
        <circle cx="100" cy="100" r="92" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="0.6" />
      </svg>

      <style>{`
        .orb-svg { position: relative; z-index: 1; filter: drop-shadow(0 20px 40px rgba(107,63,214,0.28)); }
        .orb-orbits { z-index: 2; }
        .orb-orbit--1 { animation: orbSpin 40s linear infinite; }
        .orb-orbit--2 { animation: orbSpin 55s linear infinite reverse; }
        .orb-orbit--3 { animation: orbSpin 70s linear infinite; }
        .orb-satellite--1 { animation: orbSpin 12s linear infinite; }
        .orb-satellite--2 { animation: orbSpin 18s linear infinite reverse; }
        @keyframes orbSpin { to { transform: rotate(360deg); } }
        .orb-star { animation: orbTwinkle 3.5s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        @keyframes orbTwinkle {
          0%, 100% { opacity: 0.25; transform: scale(0.7); }
          50%      { opacity: 1;    transform: scale(1.2); }
        }
        .orb-aura {
          border-radius: 9999px;
          background: radial-gradient(circle at 50% 50%,
            rgba(155, 108, 255, 0.55) 0%,
            rgba(155, 108, 255, 0.35) 22%,
            rgba(155, 108, 255, 0.18) 42%,
            rgba(155, 108, 255, 0.06) 62%,
            rgba(155, 108, 255, 0) 78%);
          filter: blur(18px);
          animation: orbAura 4.5s ease-in-out infinite;
          will-change: transform, opacity;
        }
        .orb-aura--slow {
          background: radial-gradient(circle at 50% 50%,
            rgba(255, 200, 130, 0.35) 0%,
            rgba(200, 140, 255, 0.22) 30%,
            rgba(120, 200, 255, 0.12) 55%,
            rgba(120, 200, 255, 0) 78%);
          filter: blur(28px);
          animation: orbAura 7s ease-in-out infinite reverse;
        }
        @keyframes orbAura {
          0%, 100% { transform: scale(0.92); opacity: 0.75; }
          50%      { transform: scale(1.05); opacity: 1; }
        }
        .orb-blob-a { transform-origin: 100px 100px; animation: orbSpinA 11s ease-in-out infinite; mix-blend-mode: screen; }
        .orb-blob-b { transform-origin: 100px 100px; animation: orbSpinB 14s ease-in-out infinite reverse; mix-blend-mode: screen; }
        .orb-hl { transform-origin: 100px 100px; animation: orbHl 7s ease-in-out infinite; }
        @keyframes orbSpinA {
          0%   { transform: rotate(0deg) scale(1.05) translate(0px, 0px); }
          33%  { transform: rotate(120deg) scale(1.15) translate(-6px, 4px); }
          66%  { transform: rotate(240deg) scale(0.98) translate(4px, -3px); }
          100% { transform: rotate(360deg) scale(1.05) translate(0px, 0px); }
        }
        @keyframes orbSpinB {
          0%   { transform: rotate(0deg) scale(1) translate(2px, -2px); }
          50%  { transform: rotate(-180deg) scale(1.1) translate(-3px, 5px); }
          100% { transform: rotate(-360deg) scale(1) translate(2px, -2px); }
        }
        @keyframes orbHl {
          0%, 100% { transform: translate(0,0) scale(1); opacity: 0.9; }
          50% { transform: translate(6px, -4px) scale(1.08); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .orb-aura, .orb-blob-a, .orb-blob-b, .orb-hl,
          .orb-orbit--1, .orb-orbit--2, .orb-orbit--3,
          .orb-satellite--1, .orb-satellite--2, .orb-star { animation: none; }
        }
      `}</style>
    </div>
  )
}
