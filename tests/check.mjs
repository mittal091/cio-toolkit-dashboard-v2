/* Consistency checks. Run with: node tests/check.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as D from '../data-access.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });
const warn = msg => console.log('  warn: ' + msg);

await D.init(async p => read(p));

const kpis = read('config/kpis.json');
const views = read('config/views.json');
const roles = read('config/roles.json');
const ask = read('data/ask.json');
const sources = read('data/sources.json');
const index = read('data/index.json');
const kpiData = Object.fromEntries(index.kpis.map(id => [id, read(`data/${id}.json`)]));
const datasets = Object.fromEntries(index.datasets.map(id => [id, read(`data/datasets/${id}.json`)]));

/* ---------- index matches the files on disk ---------- */
{
  const onDisk = fs.readdirSync(path.join(root, 'data')).filter(f => /^K\d+\.json$/.test(f)).map(f => f.replace('.json', '')).sort();
  const dsOnDisk = fs.readdirSync(path.join(root, 'data/datasets')).map(f => f.replace('.json', '')).sort();
  check('data/index.json lists every KPI file', JSON.stringify(onDisk) === JSON.stringify([...index.kpis].sort()), onDisk.join(','));
  check('data/index.json lists every dataset file', JSON.stringify(dsOnDisk) === JSON.stringify([...index.datasets].sort()), dsOnDisk.join(','));
}

/* ---------- 1. views reference real KPIs, metrics, series ---------- */
const walk = (blocks, fn) => blocks.forEach(b => { fn(b); if (b.blocks) walk(b.blocks, fn); });
{
  const problems = [];
  const kpiIds = new Set(kpis.map(k => k.id));
  const needMetric = (kpi, metric, where) => {
    if (!kpiIds.has(kpi)) problems.push(`${where}: ${kpi} not in kpis.json`);
    if (!kpiData[kpi]) return problems.push(`${where}: no data file for ${kpi}`);
    if (!(kpiData[kpi].metrics || {})[metric]) problems.push(`${where}: ${kpi} has no metric ${metric}`);
  };
  views.forEach(v => walk(v.blocks, b => {
    const where = `view ${v.id}`;
    if (b.type === 'tiles') b.items.forEach(it => needMetric(it.kpi, it.metric, where));
    if (b.type === 'chart' && b.kpi) {
      if (!kpiData[b.kpi]) problems.push(`${where}: no data file for ${b.kpi}`);
      else if (!(kpiData[b.kpi].series || {})[b.series]) problems.push(`${where}: ${b.kpi} has no series ${b.series}`);
    }
    if (b.type === 'chart' && b.options && b.options.target) needMetric(b.options.target.kpi, b.options.target.metric, where);
    if ((b.type === 'table' || (b.type === 'chart' && b.dataset)) && !datasets[b.dataset]) problems.push(`${where}: no dataset ${b.dataset}`);
  }));
  Object.values(kpiData).forEach(k => {
    if (!roles.domains[k.domain]) problems.push(`${k.kpi}: unknown domain ${k.domain}`);
    if (!kpiIds.has(k.kpi)) problems.push(`${k.kpi}: not in kpis.json`);
  });
  check('1. every referenced KPI, metric, series and dataset exists', problems.length === 0, problems.join('; '));
}

/* ---------- 2. dataset rows carry every column key ---------- */
{
  const problems = [];
  Object.values(datasets).forEach(d => {
    if (!d.access && !d.domain) problems.push(`${d.id}: no access or domain`);
    if (d.domain && !roles.domains[d.domain]) problems.push(`${d.id}: unknown domain ${d.domain}`);
    d.rows.forEach((r, i) => d.columns.forEach(c => { if (!(c.key in r)) problems.push(`${d.id} row ${i}: missing ${c.key}`); }));
  });
  check('2. every dataset row has all column keys', problems.length === 0, problems.join('; '));
}

/* ---------- 3. roles and views ---------- */
{
  const problems = [];
  const roleIds = roles.roles.map(r => r.id);
  views.forEach(v => {
    if (!v.roles.length) problems.push(`view ${v.id} has no role`);
    v.roles.forEach(r => { if (!roleIds.includes(r)) problems.push(`view ${v.id}: unknown role ${r}`); });
    if (!v.accessText) problems.push(`view ${v.id}: no accessText`);
  });
  roleIds.forEach(r => { if (!D.viewsFor(r).length) problems.push(`role ${r} opens no view`); });
  if (D.viewsFor(roles.default).length !== views.length) problems.push('default role cannot open all views');
  check('3. views and roles are consistent; default role opens all views', problems.length === 0, problems.join('; '));
}

/* ---------- 4. ask sources have previews (warn only) ---------- */
{
  const missing = new Set();
  ask.forEach(e => (e.sources || []).forEach(s => { if (!(s in sources)) missing.add(s); }));
  check('4. ask.json entries are well formed', ask.every(e => e.id && e.q && e.answer && e.domain && (e.suggestedIn || []).length && roles.domains[e.domain]), '');
  const ids = ask.map(e => e.id);
  check('4. ask ids are unique', new Set(ids).size === ids.length, '');
  if (missing.size) warn(`${missing.size} source names have no preview (chips show the default text): ${[...missing].join(' | ')}`);
}

/* ---------- 5. every token resolves ---------- */
{
  const problems = [];
  const texts = [];
  const scan = (o, where) => {
    if (typeof o === 'string') { if (o.includes('{{')) texts.push([where, o]); }
    else if (Array.isArray(o)) o.forEach(x => scan(x, where));
    else if (o && typeof o === 'object') Object.values(o).forEach(x => scan(x, where));
  };
  scan(views, 'views.json'); scan(ask, 'ask.json');
  Object.values(kpiData).forEach(k => scan(k, k.kpi));
  Object.values(datasets).forEach(d => scan(d, d.id));
  texts.forEach(([where, t]) => { try { D.resolveText(t); } catch (e) { problems.push(`${where}: ${e.message}`); } });
  check('5. every {{token}} resolves', problems.length === 0, problems.join('; '));
}

/* ---------- 6. no KPI numbers hard-coded in components or app.js ---------- */
{
  const files = ['app.js', 'render.js', ...fs.readdirSync(path.join(root, 'components')).map(f => 'components/' + f)];
  const banned = /\b(2\.42|99\.88|99\.94|99\.95|265|192|4\.6|3\.1|61\.4|1240|1,240)\b/;
  const bad = files.filter(f => banned.test(fs.readFileSync(path.join(root, f), 'utf8')));
  const importsData = files.filter(f => f.startsWith('components/') && /from\s+['"][^'"]*(data-access|\/data\/)/.test(fs.readFileSync(path.join(root, f), 'utf8')));
  check('6. no KPI values in components or app.js', bad.length === 0, bad.join(', '));
  check('6. components do not import data-access or data files', importsData.length === 0, importsData.join(', '));
}

/* ---------- 7. no em dash anywhere ---------- */
{
  const dash = String.fromCharCode(0x2014);
  const bad = [];
  const scanDir = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).forEach(e => {
    const rel = path.posix.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '.git') scanDir(rel); }
    else if (/\.(json|html|js|mjs|css|md|py)$/.test(e.name) && fs.readFileSync(path.join(root, rel), 'utf8').includes(dash)) bad.push(rel);
  });
  scanDir('.');
  check('7. no em dash in any file', bad.length === 0, bad.join(', '));
}

/* ---------- 8. golden facts ---------- */
{
  const role = 'cio';
  const S = (k, s) => D.getSeries(k, s, role);
  const M = (k, m) => D.getMetric(k, m, role);
  const weekly = S('K07', 'weekly').values;
  const sum = a => a.reduce((x, y) => x + y, 0);
  const inc = S('K17', 'incidents').values, mttr = S('K17', 'mttr').values;
  const avail = datasets.availability.rows;
  const drivers = datasets['cloud-drivers'].rows.map(r => Number(/\d+/.exec(r.change)[0]));
  const facts = [
    ['K07 sum of weekly series is 2,423', sum(weekly) === 2423],
    ['K07 spend tile reads $2.42M', M('K07', 'spend12w').valueText === '$2.42M'],
    ['K07 W9 265, W8 192, spike +38% and +$73k', weekly[8] === 265 && weekly[7] === 192 && M('K07', 'spikeW9').valueText === '38%' && M('K07', 'spikeAmt').valueText === '$73k'],
    ['K07 W12 vs W8 is 6.8%, shown as 7%', Math.round((weekly[11] / weekly[7] - 1) * 1000) / 10 === 6.8 && M('K07', 'vsW8').valueText === '7%'],
    ['K07 W9 driver split 61 + 12 = 73', drivers.length === 2 && sum(drivers) === weekly[8] - weekly[7]],
    ['K17 W9 incidents 19, W12 incidents 14', inc[8] === 19 && inc[11] === 14 && M('K17', 'incidentsW12').valueText === '14'],
    ['K17 MTTR W9 4.6h, W8 2.8h, W12 3.1h', mttr[8] === 4.6 && mttr[7] === 2.8 && mttr[11] === 3.1 && M('K17', 'mttrW12').valueText === '3.1h'],
    ['K17 W9 stays at index 8 (week 9)', S('K17', 'incidents').labels[8] === 'W9' && S('K17', 'incidents').markers[0].index === 8],
    ['K16 services meeting 99.95%: 2 of 4', M('K16', 'servicesMeetingSla').valueText === '2 of 4' && avail.filter(r => r.value >= 99.95).map(r => r.service).sort().join() === 'Core ERP,Email'],
    ['K14 RAG 21 + 6 + 3 = 30, flagged 2', M('K14', 'ragCounts').valueText === '21 / 6 / 3' && M('K14', 'total').valueText === '30' && M('K14', 'flagged').valueText === '2'],
    ['K06 YTD 61.4 vs 60.0 gives +2.3%', M('K06', 'budgetYtd').valueText === '+2.3%' && D.resolveText('{{K06:monthlyActual:sum}} vs {{K06:monthlyBudget:sum}}') === '$61.4M vs $60.0M'],
    ['K20 critical vulnerabilities open 17', M('K20', 'criticalOpen').valueText === '17'],
    ['K24 overdue 5 (2 high, 3 medium)', M('K24', 'overdue').valueText === '5' && M('K24', 'high').valueText === '2' && M('K24', 'medium').valueText === '3'],
    ['K31 use cases 41 with 6 live; K32 live count agrees', M('K31', 'useCases').valueText === '41' && kpiData.K31.values.stages.live === kpiData.K32.values.benefit.live],
    ['K32 active users 1,240, +9%', M('K32', 'activeUsers').valueText === '1,240' && M('K32', 'growth').valueText === '+9%'],
    ['K35 last week $48k', M('K35', 'llmSpendWeek').valueText === '$48k'],
    ['K11 deployments 46, previous week 41', M('K11', 'deploysLastWeek').valueText === '46' && S('K11', 'deploysWeekly').values[10] === 41],
    ['K03 on time 82%', M('K03', 'onTime').valueText === '82%']
  ];
  facts.forEach(([name, ok]) => check('8. ' + name, ok));
}

/* ---------- catalogue (generated from the Excel) ---------- */
{
  const full = kpis.length === 38 && kpis.every(k => !k.partial);
  check('catalogue has 38 KPIs generated from the Excel (run tools/build-kpis.py)', full,
    `config/kpis.json has ${kpis.length} entries and is a partial stub`);
  const mvp = kpis.filter(k => k.mvp).map(k => k.id).sort().join();
  const expected = 'K01,K03,K05,K06,K07,K09,K11,K14,K16,K17,K20,K21,K24,K31,K32';
  check('catalogue MVP set is the 15 agreed KPIs', mvp === expected, mvp);
  const high = kpis.filter(k => k.mvp && k.aiValue === 'High').map(k => k.id).sort().join();
  check('catalogue High AI value in MVP is K07, K09, K14, K17, K24', high === 'K07,K09,K14,K17,K24', high);
  if (full) {
    const withComments = kpis.filter(k => k.leaderComments).map(k => k.id).sort().join();
    check('catalogue leader comments on K01, K03, K11, K15, K27, K28, K29, K30',
      withComments === 'K01,K03,K11,K15,K27,K28,K29,K30', withComments);
  }
}

let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok || !r.detail ? '' : '\n        ' + r.detail}`);
  if (!r.ok) failed++;
}
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
