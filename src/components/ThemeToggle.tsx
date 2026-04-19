import type { ReactElement } from "react";
import type { ThemeMode } from "../types";

export function ThemeToggle({
  onToggle,
  theme,
}: {
  onToggle: () => void;
  theme: ThemeMode;
}): ReactElement {
  return (
    <button aria-label="화면 테마 변경" className="theme-toggle" onClick={onToggle} type="button">
      <span className="theme-toggle-track">
        <span className="theme-toggle-knob" />
      </span>
      <span>{theme === "light" ? "Light" : "Dark"}</span>
    </button>
  );
}
