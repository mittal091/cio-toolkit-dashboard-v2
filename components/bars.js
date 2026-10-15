import { escapeHtml as esc } from '../format.js';
import { color } from '../colors.js';
import { frame, legend } from './chart-util.js';

/* o: { labels, series[{name,color,colors?,values}], min, max, step, fmt, ref, refLabel, aria } */
export function bars(o) {
  const w = 600, h = 240, l = 48, r = 14, t = 16, b = 28, n = o.labels.length;
  const f = frame(o.min, o.max, o.step, o.fmt, w, h, l, r, t, b);
  const slot = f.iw / n, bw = slot * .6;
  let s = f.s;
  o.labels.forEach((lb, i) => {
    const cx = l + slot * i + slot / 2;
    s += `<text x="${cx}" y="${h - 8}" text-anchor="middle">${esc(lb)}</text>`;
    let base = 0;
    o.series.forEach(se => {
      const v = se.values[i], y0 = f.y(Math.max(base, o.min)), y1 = f.y(base + v);
      s += `<rect x="${cx - bw / 2}" y="${y1}" width="${bw}" height="${y0 - y1}" fill="${(se.colors && se.colors[i]) || se.color}" rx="2"><title>${esc(se.name)} ${esc(lb)}: ${esc(o.fmt(v))}</title></rect>`;
      base += v;
    });
  });
  if (o.ref != null) {
    const amber = color('amber');
    s += `<line x1="${l}" x2="${w - r}" y1="${f.y(o.ref)}" y2="${f.y(o.ref)}" stroke="${amber}" stroke-dasharray="5 4"/><text x="${w - r}" y="${f.y(o.ref) - 5}" text-anchor="end" style="fill:${amber}">${esc(o.refLabel)}</text>`;
  }
  return `<div class="chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(o.aria)}">${s}</svg></div>` +
    (o.series.length > 1 ? legend(o.series) : '');
}
