/* Small named functions for values that are calculated, not typed. */

export const sum = (arr, scale = 1) => arr.reduce((a, b) => a + b, 0) * scale;
export const last = arr => arr[arr.length - 1];
export const first = arr => arr[0];
export const max = arr => Math.max(...arr);
export const at = (arr, i) => arr[i];
export const pctChange = (arr, from, to) => (arr[to] / arr[from] - 1) * 100;
export const diff = (arr, from, to) => arr[to] - arr[from];

const OPS = {
  eq: (a, b) => a === b,
  ne: (a, b) => a !== b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b
};

export const countWhere = (rows, key, op, value) => rows.filter(r => OPS[op](r[key], value)).length;
export const countMeeting = (rows, key, op, target) => `${countWhere(rows, key, op, target)} of ${rows.length}`;
export const ratioText = (parts, sep = ' / ') => parts.join(sep);

/* Evaluate a { derive: "<name>", ... } spec found in a KPI file.
   ctx = { kpi, datasets, metricValue(name) } ; literals are returned unchanged. */
export function evaluate(spec, ctx) {
  if (spec === null || typeof spec !== 'object') return spec;
  const series = n => {
    const s = ctx.kpi.series && ctx.kpi.series[n];
    if (!s) throw new Error(`Unknown series ${n} in ${ctx.kpi.kpi}`);
    return s.values;
  };
  const values = n => {
    const v = ctx.kpi.values && ctx.kpi.values[n];
    if (!v) throw new Error(`Unknown values ${n} in ${ctx.kpi.kpi}`);
    return v;
  };
  const rows = id => {
    const d = ctx.datasets[id];
    if (!d) throw new Error(`Unknown dataset ${id}`);
    return d.rows;
  };
  switch (spec.derive) {
    case 'sum': return sum(series(spec.series), spec.scale ?? 1);
    case 'last': return last(series(spec.series));
    case 'first': return first(series(spec.series));
    case 'max': return max(series(spec.series));
    case 'at': return at(series(spec.series), spec.index);
    case 'pctChange': return pctChange(series(spec.series), spec.from, spec.to);
    case 'diff': return diff(series(spec.series), spec.from, spec.to);
    case 'pctVs': return (sum(series(spec.series)) / sum(series(spec.base)) - 1) * 100;
    case 'countWhere': return countWhere(rows(spec.dataset), spec.key, spec.op, spec.value);
    case 'countMeeting': {
      const target = spec.targetMetric ? ctx.metricValue(spec.targetMetric) : spec.target;
      return countMeeting(rows(spec.dataset), spec.key, spec.op, target);
    }
    case 'rowCount': return rows(spec.dataset).length;
    case 'lookup': {
      const row = rows(spec.dataset).find(r => r[spec.matchKey] === spec.match);
      if (!row) throw new Error(`No row ${spec.match} in ${spec.dataset}`);
      return row[spec.key];
    }
    case 'ratioText': return ratioText(spec.order.map(k => values(spec.values)[k]));
    case 'sumCounts': return sum(Object.values(values(spec.values)));
    case 'pick': return values(spec.values)[spec.key];
    case 'pctChangeBetween': {
      const v = values(spec.values);
      return (v[spec.to] / v[spec.from] - 1) * 100;
    }
    case 'ofText': {
      const v = values(spec.values);
      return `${v[spec.a]} of ${v[spec.b]}`;
    }
    default: throw new Error(`Unknown derive ${spec.derive}`);
  }
}
