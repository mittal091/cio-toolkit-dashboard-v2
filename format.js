const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ESC[c]);
}

/* Format a number by unit. Strings (for example "2 of 4") pass through unchanged.
   opts.decimals fixes the number of decimals; opts.signed adds a leading + to positive percentages. */
export function fmt(value, unit, opts = {}) {
  if (typeof value === 'string') return value;
  const d = opts.decimals;
  const num = (v, def) => (d == null ? String(Number(v.toFixed(def))) : v.toFixed(d));
  switch (unit) {
    case 'usd_k': return '$' + num(value, 2) + 'k';
    case 'usd_m': return '$' + (d == null ? value.toFixed(2) : value.toFixed(d)) + 'M';
    case 'pct': return (opts.signed && value > 0 ? '+' : '') + num(value, 2) + '%';
    case 'hours': return num(value, 2) + 'h';
    case 'count': return Number(value).toLocaleString('en-US');
    default: return String(value);
  }
}

/* Replace {{...}} tokens in text. resolve(expr) returns the replacement for one token. */
export function applyTokens(text, resolve) {
  return String(text).replace(/\{\{([^}]+)\}\}/g, (_, expr) => resolve(expr.trim()));
}
