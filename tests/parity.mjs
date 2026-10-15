/* Compares the modular build with the original single-file dashboard.
   Run with: node tests/parity.mjs [path-to-original.html] */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import * as D from '../data-access.js';
import { renderView } from '../render.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origPath = process.argv[2] || path.join(root, '..', 'CIO Toolkit Dashboard.html');
const html = fs.readFileSync(origPath, 'utf8');
const script = /<script>([\s\S]*?)<\/script>/.exec(html)[1];

const el = () => ({ innerHTML: '', querySelectorAll: () => [], querySelector: () => null });
const sandbox = {
  document: { getElementById: () => el(), querySelectorAll: () => [] },
  location: { hash: '' }, history: { replaceState() {} }, window: { scrollTo() {} }, console
};
vm.createContext(sandbox);
const orig = vm.runInContext(script + ';({VIEWS,ASK})', sandbox);

await D.init(async p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')));

const norm = s => s
  .replace(/ data-i="\d+"/g, '').replace(/ data-q="[^"]*"/g, '')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();

let failed = 0;
const fail = msg => { failed++; console.log('FAIL  ' + msg); };
const pass = msg => console.log('PASS  ' + msg);

const newHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
/<title>(.*?)<\/title>/.exec(html)[1] === /<title>(.*?)<\/title>/.exec(newHtml)[1] ? pass('page title') : fail('page title');

if (orig.VIEWS.length === D.viewsFor('cio').length) pass('same number of views (6)'); else fail('view count');

for (const ov of orig.VIEWS) {
  const nv = D.getView(ov.id);
  if (!nv) { fail(`view ${ov.id} missing`); continue; }
  if (nv.name !== ov.name) fail(`${ov.id}: tab name "${nv.name}" vs "${ov.name}"`);
  if (nv.accessText !== ov.access) fail(`${ov.id}: access text "${nv.accessText}" vs "${ov.access}"`);

  const a = norm(ov.render()), b = norm(renderView(nv, 'cio'));
  if (a === b) pass(`${ov.id}: rendered HTML identical (${a.length} chars)`);
  else {
    let i = 0; while (i < a.length && a[i] === b[i]) i++;
    fail(`${ov.id}: HTML differs at char ${i}\n   original: ...${a.slice(Math.max(0, i - 60), i + 90)}\n   modular:  ...${b.slice(Math.max(0, i - 60), i + 90)}`);
  }

  /* Ask: same questions, same order, same answers and sources */
  const list = orig.ASK[ov.id];
  const mine = D.suggestedFor(ov.id);
  if (list.map(x => x.q).join('|') !== mine.map(x => x.q).join('|')) { fail(`${ov.id}: suggested questions differ`); continue; }
  list.forEach((o, i) => {
    const e = mine[i];
    if (!o.deny) {
      const r = D.answer({ id: e.id }, 'cio', ov.id);
      const same = r.status === 'answered' && r.text === o.a && JSON.stringify(r.sources) === JSON.stringify(o.src);
      same ? pass(`${ov.id}: answer "${o.q}"`) : fail(`${ov.id}: answer "${o.q}"\n   original: ${o.a}\n   modular:  ${r.text}`);
    } else {
      const role = nv.roles.find(x => x !== 'cio');
      const r = D.answer({ id: e.id }, role, ov.id);
      const same = r.status === 'denied' && r.text === o.a;
      same ? pass(`${ov.id}: refusal for role ${role} "${o.q}"`) : fail(`${ov.id}: refusal "${o.q}" for ${role}\n   original: ${o.a}\n   modular:  ${r.text} (${r.status})`);
      const asCio = D.answer({ id: e.id }, 'cio', ov.id);
      asCio.status === 'answered' ? pass(`${ov.id}: same question is answered for cio`) : fail(`${ov.id}: cio should be able to see "${o.q}"`);
    }
  });
}

/* Typed question that matches nothing */
D.answer({ text: 'zzzz qqqq' }, 'cio', 'fin').status === 'no_source' ? pass('unmatched typed question gives "No answer"') : fail('no_source');

console.log(failed ? `\n${failed} parity check(s) failed` : '\nAll parity checks passed');
process.exit(failed ? 1 : 0);
