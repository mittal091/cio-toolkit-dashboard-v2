import { escapeHtml as esc } from '../format.js';

export function frame(min, max, step, fmt, w, h, l, r, t, b) {
  const iw = w - l - r, ih = h - t - b;
  const y = v => t + ih * (1 - (v - min) / (max - min));
  let s = '';
  for (let v = min; v <= max + 1e-9; v += step) {
    s += `<line x1="${l}" x2="${w - r}" y1="${y(v)}" y2="${y(v)}" stroke="#16273f"/><text x="${l - 6}" y="${y(v) + 4}" text-anchor="end">${esc(fmt(v))}</text>`;
  }
  return { s, y, iw, ih };
}

export const legend = series =>
  '<div class="legend">' + series.map(x => `<span><i style="background:${esc(x.color)}"></i>${esc(x.name)}</span>`).join('') + '</div>';
