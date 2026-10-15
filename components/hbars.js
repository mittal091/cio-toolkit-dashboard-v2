import { escapeHtml as esc } from '../format.js';

/* rows: [[name, value, color]] ; target and base are optional numbers. */
export function hbars({ rows, max, fmt, target, base }) {
  base = base || 0;
  return rows.map(r => {
    const width = Math.max(0, Math.min(100, (r[1] - base) / (max - base) * 100));
    const mark = target != null ? `<div class="tg" style="left:${(target - base) / (max - base) * 100}%"></div>` : '';
    return `<div class="hb"><div>${esc(r[0])}</div><div class="t"><div class="f" style="width:${width}%;background:${esc(r[2])}"></div>${mark}</div><div class="n">${esc(fmt(r[1]))}</div></div>`;
  }).join('');
}
