/* Chart colours come from the CSS tokens in styles.css (:root), read once at start-up.
   FALLBACK is used only where there is no browser (the Node tests) and must mirror :root. */
const FALLBACK = {
  cyan: '#3cc0e8', blue: '#2d8fe0', purple: '#8c6fdc',
  amber: '#e0a840', green: '#34c27a', red: '#e5645f'
};
let cache = null;

export function color(name) {
  if (!cache) {
    cache = { ...FALLBACK };
    try {
      const cs = getComputedStyle(document.documentElement);
      for (const k of Object.keys(FALLBACK)) {
        const v = cs.getPropertyValue('--' + k).trim();
        if (v) cache[k] = v;
      }
    } catch (e) { /* no browser: keep fallback */ }
  }
  return cache[name] || name;
}
