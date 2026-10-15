import { escapeHtml as esc } from '../format.js';

const AI = {
  High: ['AI: high', 'hi'],
  Medium: ['AI: medium', 'md'],
  Low: ['AI: low', ''],
  None: ['Metric only', '']
};

export function tile({ label, valueText, sub, status, aiValue }) {
  const tone = status && status !== 'neutral' ? status : '';
  const ai = AI[aiValue];
  return `<div class="tile">${ai ? `<span class="ai ${ai[1]}">${ai[0]}</span>` : ''}<div class="l">${esc(label)}</div><div class="v">${esc(valueText)}</div><div class="s ${tone}">${esc(sub)}</div></div>`;
}

export const tiles = items => `<div class="tiles">${items.join('')}</div>`;
