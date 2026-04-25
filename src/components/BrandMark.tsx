import type { ReactElement } from "react";

export function BrandMark({ className = "" }: { className?: string }): ReactElement {
  return (
    <span aria-hidden="true" className={`brand-mark ${className}`.trim()}>
      <svg className="brand-mark-svg" viewBox="0 0 64 64" role="img">
        <rect width="64" height="64" rx="15" fill="#4F46E5" />
        <circle cx="25.5" cy="20.5" r="12.5" fill="#FFE8A3" />
        <circle cx="38.5" cy="20.5" r="12.5" fill="#FFFFFF" opacity="0.96" />
        <circle cx="25.5" cy="43.5" r="12.5" fill="#FFFFFF" opacity="0.96" />
        <circle cx="38.5" cy="43.5" r="12.5" fill="#FFE8A3" />
        <circle cx="32" cy="32" r="7" fill="#4F46E5" />
      </svg>
    </span>
  );
}
