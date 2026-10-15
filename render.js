import * as D from './data-access.js';
import { fmt } from './format.js';
import { color } from './colors.js';
import { tile, tiles } from './components/tile.js';
import { panel } from './components/panel.js';
import { table } from './components/table.js';
import { line } from './components/line.js';
import { bars } from './components/bars.js';
import { hbars } from './components/hbars.js';
import { note } from './components/note.js';
import { ask } from './components/ask.js';

const text = t => (t ? D.resolveText(t) : '');
const deniedText = domain => `This is not available for your role. Data owner: ${D.domainLabel(domain)}.`;
const deniedPanel = (block, domain) =>
  panel({ title: text(block.title) || 'Not available', subtitle: deniedText(domain), body: '' });

function renderTile(item, role) {
  const m = D.getMetric(item.kpi, item.metric, role);
  if (m.denied) {
    return tile({ label: item.label || item.kpi, valueText: '-', sub: 'Not available for your role', status: '' });
  }
  const sub = item.kpi + (item.sub ? ' · ' + text(item.sub) : '');
  return tile({
    label: item.label || m.label,
    valueText: m.valueText,
    sub,
    status: item.status || m.status,
    aiValue: D.aiValue(item.kpi)
  });
}

function renderChart(block, role) {
  const o = block.options || {};
  if (block.kind === 'hbar') {
    const ds = D.getDataset(block.dataset, role);
    if (ds.denied) return deniedPanel(block, ds.domain);
    const target = o.target ? D.getMetric(o.target.kpi, o.target.metric, role).value : null;
    const body = hbars({
      rows: ds.rows.map(r => [r.service, r.value, color(r.tone)]),
      max: o.max, base: o.base, target,
      fmt: v => fmt(v, o.unit || 'pct', { decimals: o.decimals })
    });
    return panel({ title: text(block.title), subtitle: text(block.subtitle), body });
  }
  const s = D.getSeries(block.kpi, block.series, role);
  if (s.denied) return deniedPanel(block, s.domain);
  const f = v => fmt(v, s.unit, { decimals: s.decimals });
  let body;
  if (block.kind === 'line') {
    const m = o.marker && s.markers[0];
    body = line({
      labels: s.labels, series: [{ name: s.name, color: color(o.color), values: s.values }],
      min: o.min, max: o.max, step: o.step, fmt: f, area: !!o.area,
      marker: m ? { i: m.index, text: m.text } : null, aria: o.aria
    });
  } else {
    const hi = new Set(o.highlight === 'markers' ? s.markers.map(m => m.index) : []);
    const base = color(o.color);
    body = bars({
      labels: s.labels,
      series: [{ name: s.name, color: base, values: s.values, colors: s.values.map((v, i) => (hi.has(i) ? color(o.highlightColor) : base)) }],
      min: o.min, max: o.max, step: o.step, fmt: f, aria: o.aria
    });
  }
  return panel({ title: text(block.title), subtitle: text(block.subtitle), body });
}

export function renderBlock(block, ctx) {
  const { role, viewId } = ctx;
  switch (block.type) {
    case 'tiles': return tiles(block.items.map(it => renderTile(it, role)));
    case 'chart': return renderChart(block, role);
    case 'table': {
      const ds = D.getDataset(block.dataset, role);
      if (ds.denied) return deniedPanel(block, ds.domain);
      return panel({
        title: text(block.title), subtitle: text(block.subtitle),
        body: table({ columns: ds.columns, rows: ds.rows, footnote: text(block.footnote) })
      });
    }
    case 'row': return `<div class="grid2">${block.blocks.map(b => renderBlock(b, ctx)).join('')}</div>`;
    case 'note': return note({ tone: block.tone, text: text(block.text) });
    case 'ask': return ask({ viewId, suggested: D.suggestedFor(viewId) });
    default: throw new Error(`Unknown block type ${block.type}`);
  }
}

export const renderView = (view, role) => view.blocks.map(b => renderBlock(b, { role, viewId: view.id })).join('');
