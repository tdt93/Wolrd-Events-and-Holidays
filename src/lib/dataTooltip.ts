const TOOLTIP_MAX_WIDTH = 220;
const TOOLTIP_FONT = "500 12px ui-sans-serif, system-ui, sans-serif";

let measureEl: HTMLSpanElement | null = null;

function measureTooltipText(text: string): number {
  if (!measureEl) {
    measureEl = document.createElement("span");
    measureEl.style.cssText =
      "position:fixed;left:-9999px;top:0;white-space:nowrap;visibility:hidden;pointer-events:none";
    document.body.appendChild(measureEl);
  }
  measureEl.style.font = TOOLTIP_FONT;
  measureEl.textContent = text;
  return measureEl.offsetWidth;
}

function activateMarquee(el: HTMLElement) {
  const text = el.getAttribute("data-tooltip");
  if (!text) return;

  const width = measureTooltipText(text);
  if (width <= TOOLTIP_MAX_WIDTH - 16) return;

  el.dataset.tooltipMarquee = "true";
  el.style.setProperty(
    "--tooltip-marquee-shift",
    `${-(width - TOOLTIP_MAX_WIDTH + 24)}px`,
  );
}

function deactivateMarquee(el: HTMLElement) {
  delete el.dataset.tooltipMarquee;
  el.style.removeProperty("--tooltip-marquee-shift");
}

function findTooltipHost(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest<HTMLElement>("[data-tooltip]");
}

export function initDataTooltipMarquee() {
  const onEnter = (e: Event) => {
    const el = findTooltipHost(e.target);
    if (el) activateMarquee(el);
  };

  const onLeave = (e: Event) => {
    const el = findTooltipHost(e.target);
    if (el) deactivateMarquee(el);
  };

  document.addEventListener("pointerenter", onEnter, true);
  document.addEventListener("pointerleave", onLeave, true);
  document.addEventListener("focusin", onEnter, true);
  document.addEventListener("focusout", onLeave, true);
}
