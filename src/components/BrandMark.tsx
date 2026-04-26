import type { ReactElement } from "react";

export function BrandMark({ className = "" }: { className?: string }): ReactElement {
  return (
    <span aria-hidden="true" className={`brand-mark ${className}`.trim()}>
      <svg className="brand-mark-svg" viewBox="0 0 128 128" role="img">
        <defs>
          <linearGradient id="optiMeBrandGradient" x1="20" x2="108" y1="10" y2="118" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF9F0A" />
            <stop offset="1" stopColor="#FF7A00" />
          </linearGradient>
        </defs>
        <rect width="128" height="128" rx="29" fill="url(#optiMeBrandGradient)" />
        <g transform="translate(61 18) rotate(42 24 34)">
          <rect x="3" y="0" width="42" height="74" rx="21" fill="#FFFFFF" />
        </g>
        <g transform="translate(24 39) rotate(42 31 34)">
          <rect
            x="10"
            y="0"
            width="42"
            height="78"
            rx="21"
            fill="none"
            stroke="#FFFFFF"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="8"
          />
          <path d="M30 4v25" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="8" />
          <path d="M30 51v19" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="8" />
        </g>
        <g transform="translate(75 67) rotate(-9 22 17)">
          <ellipse cx="22" cy="17" rx="27" ry="17" fill="#FFFFFF" />
          <path
            d="M2 21c14 6 29 4 45-6"
            fill="none"
            stroke="#FF8A00"
            strokeLinecap="round"
            strokeWidth="3.4"
          />
          <path
            d="M22 1c-.7 10.4-1.2 19.5-2 31"
            fill="none"
            stroke="#FF8A00"
            strokeLinecap="round"
            strokeWidth="3.4"
          />
        </g>
      </svg>
    </span>
  );
}
