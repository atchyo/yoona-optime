import type { ReactElement } from "react";

export function BrandMark({ className = "" }: { className?: string }): ReactElement {
  return (
    <span aria-hidden="true" className={`brand-mark ${className}`.trim()}>
      <svg className="brand-mark-svg" viewBox="0 0 64 64" role="img">
        <rect width="64" height="64" rx="15" fill="#FF8A00" />
        <g fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M23.4 35.8 43.9 15.3c5.1-5.1 13.4-1.5 13.4 5.7 0 2.1-.8 4.2-2.3 5.7L34.5 47.2c-5.1 5.1-13.4 1.5-13.4-5.7 0-2.1.8-4.2 2.3-5.7Z"
            fill="#FFFFFF"
            strokeWidth="0"
            opacity="0.98"
          />
          <path
            d="M9.2 36.9 27.9 18.2c4.6-4.6 12.5-1.3 12.5 5.2 0 2-.8 3.8-2.1 5.2L19.6 47.3C15 51.9 7.1 48.6 7.1 42.1c0-2 .8-3.8 2.1-5.2Z"
            strokeWidth="4.1"
          />
          <path d="M21.2 25.1 28.6 17.7" strokeWidth="4.1" />
          <path d="M14.1 38.8 17.9 35" strokeWidth="4.1" />
          <path
            d="M34.4 38.4c1.7-5.8 7.1-10 13.4-10h1.4c4.8 0 8.7 3.9 8.7 8.7 0 4.2-3 7.8-7.1 8.5l-9.8 1.6c-3.8.6-7.3-2.4-7.3-6.2 0-.9.3-1.8.7-2.6Z"
            fill="#FFFFFF"
            strokeWidth="0"
            opacity="0.98"
          />
          <path d="M37.9 38.4c5.8-.2 11.1-1.9 15.5-5" stroke="#FF8A00" strokeWidth="1.7" />
          <path d="M43.1 31.1c-.9 4.2-.8 8.2.5 12" stroke="#FF8A00" strokeWidth="1.7" />
        </g>
      </svg>
    </span>
  );
}
