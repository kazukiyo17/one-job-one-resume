import type { ReactNode } from "react";

type CollapsibleEntryProps = {
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  removeLabel?: string;
  children: ReactNode;
};

export function CollapsibleEntry({
  title,
  subtitle,
  expanded,
  onToggle,
  onRemove,
  removeLabel = "删除",
  children,
}: CollapsibleEntryProps) {
  return (
    <article className="entry-card">
      <header className="entry-card__head">
        <button
          type="button"
          className="entry-card__toggle"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          <span
            className={
              "entry-card__chevron" + (expanded ? " entry-card__chevron--open" : "")
            }
            aria-hidden
          >
            ▶
          </span>
          <span className="entry-card__titles">
            <span className="entry-card__title">{title}</span>
            {subtitle && !expanded && (
              <span className="entry-card__subtitle">{subtitle}</span>
            )}
          </span>
        </button>
        <button
          type="button"
          className="btn btn--text btn--danger-text"
          onClick={onRemove}
        >
          {removeLabel}
        </button>
      </header>
      {expanded && <div className="entry-card__body">{children}</div>}
    </article>
  );
}
