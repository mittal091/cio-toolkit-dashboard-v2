import { escapeHtml as esc } from '../format.js';

/* body is HTML built by other components; title and subtitle are plain text. */
export const panel = ({ title, subtitle, body }) =>
  `<div class="panel"><h3>${esc(title)}</h3>${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ''}${body}</div>`;
