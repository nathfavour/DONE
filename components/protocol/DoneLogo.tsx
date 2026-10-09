import React from 'react';

export function DoneLogo({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]"
      >
        {/* Hexagonal outer shield */}
        <polygon
          points="20,2 36,11 36,29 20,38 4,29 4,11"
          stroke="url(#doneGradient)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          className="fill-zinc-950/80"
        />
        {/* Internal architectural lines */}
        <path
          d="M20 2V38M4 11L36 29M4 29L36 11"
          stroke="rgba(6,182,212,0.15)"
          strokeWidth="1"
        />
        {/* Glowing Settlement Checkmark */}
        <path
          d="M12 20.5L17.5 26L28.5 14.5"
          stroke="url(#checkGradient)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="doneGradient" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#06b6d4" />
            <stop offset="0.5" stopColor="#3b82f6" />
            <stop offset="1" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="checkGradient" x1="12" y1="14.5" x2="28.5" y2="26" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22d3ee" />
            <stop offset="1" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
