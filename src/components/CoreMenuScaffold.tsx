import type { ReactElement, ReactNode } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

export type CoreTone = "neutral" | "primary" | "danger" | "success" | "warning";

export interface CoreMetric {
  icon: IconName;
  label: string;
  value: string;
  helper?: string;
  tone?: CoreTone;
}

interface CoreMenuPageProps {
  action?: ReactNode;
  children: ReactNode;
  description: string;
  eyebrow?: string;
  summary?: CoreMetric[];
  title: string;
}

interface CoreCardProps {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  meta?: string;
  title: string;
}

interface CoreToolbarProps {
  children?: ReactNode;
  filters?: string[];
  searchPlaceholder?: string;
}

interface CoreListRowProps {
  action?: ReactNode;
  children?: ReactNode;
  eyebrow?: string;
  fields?: ReactNode[];
  icon?: IconName;
  meta?: string;
  status?: ReactNode;
  title: string;
  tone?: CoreTone;
}

interface CoreBadgeProps {
  children: ReactNode;
  tone?: CoreTone;
}

interface CoreAvatarProps {
  label?: string;
  tone?: CoreTone;
  type?: "person" | "pet" | "document";
}

interface CoreChatBubbleProps {
  children: ReactNode;
  side: "user" | "assistant";
}

export function CoreMenuPage({
  action,
  children,
  description,
  eyebrow,
  summary,
  title,
}: CoreMenuPageProps): ReactElement {
  return (
    <div className="core-menu-page">
      <header className="core-menu-header">
        <div>
          {eyebrow && <p className="core-eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {action && <div className="core-menu-header-action">{action}</div>}
      </header>
      {summary && summary.length > 0 && <CoreSummaryGrid items={summary} />}
      {children}
    </div>
  );
}

export function CoreSummaryGrid({ items }: { items: CoreMetric[] }): ReactElement {
  return (
    <section className="core-summary-grid" aria-label="요약">
      {items.map((item) => (
        <article className={`core-summary-card tone-${item.tone || "neutral"}`} key={`${item.label}-${item.value}`}>
          <CoreIconCircle icon={item.icon} tone={item.tone || "neutral"} />
          <div>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            {item.helper && <small>{item.helper}</small>}
          </div>
        </article>
      ))}
    </section>
  );
}

export function CoreCard({ action, children, className, meta, title }: CoreCardProps): ReactElement {
  return (
    <section className={["core-card", className].filter(Boolean).join(" ")}>
      <div className="core-card-header">
        <div>
          <h3>{title}</h3>
          {meta && <p>{meta}</p>}
        </div>
        {action && <div className="core-card-action">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function CoreToolbar({ children, filters, searchPlaceholder }: CoreToolbarProps): ReactElement {
  return (
    <div className="core-toolbar">
      {searchPlaceholder && (
        <label className="core-search">
          <Icon name="scan" />
          <input aria-label={searchPlaceholder} placeholder={searchPlaceholder} readOnly />
        </label>
      )}
      {filters && (
        <div className="core-filter-group" aria-label="필터">
          {filters.map((filter, index) => (
            <button className={index === 0 ? "active" : ""} key={filter} type="button">
              {filter}
            </button>
          ))}
        </div>
      )}
      {children && <div className="core-toolbar-extra">{children}</div>}
    </div>
  );
}

export function CoreListRow({
  action,
  children,
  eyebrow,
  fields,
  icon = "pill",
  meta,
  status,
  title,
  tone = "neutral",
}: CoreListRowProps): ReactElement {
  return (
    <article className="core-list-row">
      <CoreIconCircle icon={icon} tone={tone} />
      <div className="core-list-copy">
        {eyebrow && <span>{eyebrow}</span>}
        <strong>{title}</strong>
        {meta && <small>{meta}</small>}
        {children}
      </div>
      {(fields || []).slice(0, 3).map((field, index) => (
        <div className="core-list-field" key={index}>
          {field}
        </div>
      ))}
      {Array.from({ length: Math.max(0, 3 - (fields?.length || 0)) }).map((_, index) => (
        <div className="core-list-field empty" key={`empty-${index}`} aria-hidden="true" />
      ))}
      {status && <div className="core-list-status">{status}</div>}
      {action && <div className="core-list-action">{action}</div>}
    </article>
  );
}

export function CoreBadge({ children, tone = "neutral" }: CoreBadgeProps): ReactElement {
  return <span className={`core-badge tone-${tone}`}>{children}</span>;
}

export function CoreChip({ children }: { children: ReactNode }): ReactElement {
  return <span className="core-chip">{children}</span>;
}

export function CoreIconCircle({ icon, tone = "neutral" }: { icon: IconName; tone?: CoreTone }): ReactElement {
  return (
    <span className={`core-icon-circle tone-${tone}`} aria-hidden="true">
      <Icon name={icon} />
    </span>
  );
}

export function CoreAvatar({ label, tone = "neutral", type = "person" }: CoreAvatarProps): ReactElement {
  const iconName: IconName = type === "pet" ? "paw" : type === "document" ? "file" : "user";
  return (
    <span className={`core-avatar tone-${tone}`} aria-hidden="true">
      <Icon name={iconName} />
      {label && <small>{label}</small>}
    </span>
  );
}

export function CoreEmptyState({
  action,
  description,
  icon = "clipboard",
  title,
}: {
  action?: ReactNode;
  description: string;
  icon?: IconName;
  title: string;
}): ReactElement {
  return (
    <div className="core-empty-state">
      <CoreIconCircle icon={icon} tone="primary" />
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function CoreChatBubble({ children, side }: CoreChatBubbleProps): ReactElement {
  return (
    <div className={`core-chat-row ${side}`}>
      {side === "assistant" && <CoreAvatar type="document" tone="primary" />}
      <div className={`core-chat-bubble ${side}`}>{children}</div>
    </div>
  );
}

export function CoreToggle({ checked = true }: { checked?: boolean }): ReactElement {
  return (
    <span className={checked ? "core-toggle checked" : "core-toggle"} aria-hidden="true">
      <span />
    </span>
  );
}
