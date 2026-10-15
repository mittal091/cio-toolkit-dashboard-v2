import { escapeHtml as esc } from '../format.js';
import { color } from '../colors.js';
import { frame, legend } from './chart-util.js';

/* o: { labels, series[{name,color,values}], min, max, step, fmt, area, marker{i,text}, ref, aria } */
export function line(o) {
  const w = 600, h = 240, l = 48, r = 14, t = 16, b = 28, n = o.labels.length;
  const f = frame(o.min, o.max, o.step, o.fmt, w, h, l, r, t, b);
  const x = i => l + f.iw * i / (n - 1);
  const amber = color('amber');
  let s = f.s;
  o.labels.forEach((lb, i) => { s += `<text x="${x(i)}" y="${h - 8}" text-anchor="middle">${esc(lb)}</text>`; });
  if (o.marker) {
    const mx = x(o.marker.i);
    s += `<line x1="${mx}" x2="${mx}" y1="${t}" y2="${t + f.ih}" stroke="${amber}" stroke-dasharray="4 3"/><text x="${mx + 5}" y="${t + 10}" style="fill:${amber}">${esc(o.marker.text)}</text>`;
  }
  if (o.ref != null) s += `<line x1="${l}" x2="${w - r}" y1="${f.y(o.ref)}" y2="${f.y(o.ref)}" stroke="#8fa2c3" stroke-dasharray="5 4"/>`;
  o.series.forEach(se => {
    const pts = se.values.map((v, i) => [x(i), f.y(v)]);
    const d = 'M' + pts.map(p => p.join(' ')).join('L');
    if (o.area) s += `<path d="${d}L${x(n - 1)} ${f.y(o.min)}L${x(0)} ${f.y(o.min)}Z" fill="${se.color}" opacity=".14"/>`;
    s += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="2.2"/>`;
    pts.forEach((p, i) => {
      s += `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${se.color}"><title>${esc(se.name)} ${esc(o.labels[i])}: ${esc(o.fmt(se.values[i]))}</title></circle>`;
    });
  });
  return `<div class="chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(o.aria)}">${s}</svg></div>` +
    (o.series.length > 1 ? legend(o.series) : '');
}
