import { formatCharCount } from "../limits.js";

/**
 * @param {HTMLTextAreaElement} textarea
 * @param {HTMLElement} display
 * @param {number} max
 */
export function initCharCounter(textarea, display, max) {
  function update() {
    const len = textarea.value.length;
    display.textContent = formatCharCount(len, max);
    display.classList.toggle("is-over", len >= max);
    display.classList.toggle(
      "is-warn",
      len >= Math.floor(max * 0.9) && len < max,
    );
  }

  textarea.addEventListener("input", update);
  update();

  return { refresh: update };
}
