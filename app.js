import * as D from './data-access.js';
import { renderView } from './render.js';
import { wireAsk } from './components/ask.js';
import { escapeHtml as esc } from './format.js';

const tabsEl = document.getElementById('tabs');
const viewEl = document.getElementById('view');
const roleEl = document.getElementById('role');
const ROLE_KEY = 'cio-toolkit-role';

let role = null;
let currentId = '';

function storedRole() {
  try { return localStorage.getItem(ROLE_KEY); } catch (e) { return null; }
}
function storeRole(id) {
  try { localStorage.setItem(ROLE_KEY, id); } catch (e) { /* storage unavailable */ }
}

function show(id) {
  const views = D.viewsFor(role);
  const v = views.find(x => x.id === id) || views[0];
  currentId = v.id;
  tabsEl.innerHTML = views.map(x =>
    `<button class="tab${x.id === v.id ? ' on' : ''}" role="tab" data-id="${esc(x.id)}">${esc(x.name)}</button>`).join('');
  tabsEl.querySelectorAll('.tab').forEach(b => {
    b.onclick = () => {
      show(b.dataset.id);
      try { history.replaceState(null, '', '#' + b.dataset.id); } catch (e) { /* ignore */ }
    };
  });
  viewEl.innerHTML =
    `<div class="bar"><span class="pill"><b>Viewing:</b> ${esc(v.name)}</span><span class="pill"><b>Access:</b> ${esc(v.accessText)} · last 12 weeks</span></div>` +
    renderView(v, role);
  viewEl.querySelectorAll('[data-go]').forEach(b => {
    b.onclick = () => { show(b.dataset.go); window.scrollTo(0, 0); };
  });
  wireAsk(viewEl, {
    ask: (viewId, question) => D.answer(question, role, viewId),
    getSource: D.getSource
  });
}

async function main() {
  try {
    await D.init();
  } catch (e) {
    viewEl.innerHTML = '<div class="note">The data files could not be loaded. Open this page from a web server, not directly from the file.</div>';
    return;
  }
  const saved = storedRole();
  role = saved && D.hasRole(saved) ? saved : D.defaultRole();
  roleEl.innerHTML = D.getRoles().map(r => `<option value="${esc(r.id)}"${r.id === role ? ' selected' : ''}>${esc(r.label)}</option>`).join('');
  roleEl.onchange = () => {
    role = roleEl.value;
    storeRole(role);
    show(currentId);
  };
  show((location.hash || '').slice(1));
}

main();
