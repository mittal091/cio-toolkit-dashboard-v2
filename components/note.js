import { escapeHtml as esc } from '../format.js';

export const note = ({ tone, text }) => `<div class="note${tone === 'info' ? ' info' : ''}">${esc(text)}</div>`;
