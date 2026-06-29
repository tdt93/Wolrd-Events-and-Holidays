import type { ReactNode } from "react";

interface FilterAccordionSectionProps {
  icon: string;
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function FilterAccordionSection({
  icon,
  title,
  summary,
  open,
  onToggle,
  children,
}: FilterAccordionSectionProps) {
  return (
    <section className={`filter-accordion__section ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="filter-accordion__trigger"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="filter-accordion__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="filter-accordion__text">
          <span className="filter-accordion__title">{title}</span>
          <span className="filter-accordion__summary">{summary}</span>
        </span>
        <span className="filter-accordion__chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      <div className="filter-accordion__body-wrap">
        <div className="filter-accordion__body">{children}</div>
      </div>
    </section>
  );
}
