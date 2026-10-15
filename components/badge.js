import { escapeHtml as esc } from '../format.js';

const TONES = ['red', 'green', 'amber', 'blue'];

export function badge({ tone, text }) {
  const t = TONES.includes(tone) ? tone : 'blue';
  return `<span class="b b-${t}">${esc(text)}</span>`;
}
