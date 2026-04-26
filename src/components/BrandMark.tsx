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
        <path
          d="M72.1 24.2c11.3-11.3 30.5-3.3 30.5 12.7 0 4.8-1.9 9.3-5.3 12.7L70.4 76.5 45 51.1l27.1-26.9Z"
          fill="#FFFFFF"
        />
        <path
          d="M26.3 72.5 53 45.8c8-8 21.1-8 29.1 0s8 21.1 0 29.1L55.4 101.6c-8 8-21.1 8-29.1 0s-8-21.1 0-29.1Z"
          fill="none"
          stroke="#FFFFFF"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="8"
        />
        <path d="M42.2 57.1 54.5 44.8" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="8" />
        <path d="M30.6 80.1 36.4 74.3" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="8" />
        <path
          d="M69.3 81.6c2.1-11 11.8-19.1 23-19.1h3.1c9.6 0 17.3 7.7 17.3 17.3 0 8.4-6 15.6-14.3 17.1l-18.5 3.4c-7.9 1.4-14.8-5.4-13.5-13.3.3-1.8 1-3.7 2.9-5.4Z"
          fill="#FFFFFF"
        />
        <path
          d="M75.6 81.5c11.8-.4 22.1-3.6 30.8-9.7"
          fill="none"
          stroke="#FF8A00"
          strokeLinecap="round"
          strokeWidth="3.5"
        />
        <path
          d="M87.8 65.8c-1.8 8.1-1.4 15.8 1.3 23.1"
          fill="none"
          stroke="#FF8A00"
          strokeLinecap="round"
          strokeWidth="3.5"
        />
      </svg>
    </span>
  );
}
