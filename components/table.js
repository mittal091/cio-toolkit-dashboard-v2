import { escapeHtml as esc } from '../format.js';
import { badge } from './badge.js';

/* Column types: text (default), badge {text,tone}, link {text,view}, badge_text {badge,tone,text}. */
function cell(col, v) {
  switch (col.type) {
    case 'badge': return badge(v);
    case 'link': return `<button class="link" data-go="${esc(v.view)}">${esc(v.text)}</button>`;
    case 'badge_text': return badge({ tone: v.tone, text: v.badge }) + ' ' + esc(v.text);
    default: return esc(v);
  }
}

export function table({ columns, rows, footnote }) {
  const cls = c => (c.align === 'right' ? 'r' : '');
  const head = columns.map(c => `<th class="${cls(c)}">${esc(c.label)}</th>`).join('');
  const body = rows.map(r => `<tr>${columns.map(c => `<td class="${cls(c)}">${cell(c, r[c.key])}</td>`).join('')}</tr>`).join('');
  return `<div class="tw"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>` +
    (footnote ? `<p class="src" style="margin:12px 0 0">${esc(footnote)}</p>` : '');
}
