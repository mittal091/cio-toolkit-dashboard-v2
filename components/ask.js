import { escapeHtml as esc } from '../format.js';

export function ask({ viewId, suggested }) {
  return `<div class="panel" data-ask="${esc(viewId)}"><h3>Ask the dashboard</h3><p class="sub">Answers show their sources. No source, no answer.</p>
  <div class="ask"><div class="qs">${suggested.map(x => `<button class="q" data-q="${esc(x.id)}">${esc(x.q)}</button>`).join('')}
  <form class="askf"><input type="text" placeholder="Type a question" aria-label="Type a question"><button type="submit">Ask</button></form></div>
  <div class="ans" aria-live="polite"><div class="h">Answer</div><p style="color:var(--dim)">Pick a question or type your own.</p></div></div></div>`;
}

function showAnswer(box, result, getSource) {
  const a = box.querySelector('.ans');
  const answered = result.status === 'answered';
  a.className = 'ans' + (answered ? '' : ' deny');
  a.innerHTML = `<div class="h">${esc(result.title)}</div><p>${esc(result.text)}</p>` +
    `${result.sources.length ? '<div class="h" style="color:var(--muted)">Sources</div>' : ''}` +
    `<div class="chips">${result.sources.map(s => `<button type="button" class="chip" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>` +
    `<div class="prevbox"></div><div class="verify">${answered ? 'Drafted by AI from the sources above. Check the source before acting.' : ''}</div>`;
  a.querySelectorAll('.chip').forEach(c => {
    c.onclick = () => {
      a.querySelectorAll('.chip').forEach(k => k.classList.remove('on'));
      c.classList.add('on');
      const text = getSource(c.dataset.s) || 'Opens the underlying record.';
      a.querySelector('.prevbox').innerHTML = `<div class="prev"><b>Source preview</b>${esc(text)}</div>`;
    };
  });
}

/* handlers: { ask(viewId, {id}|{text}) -> result, getSource(name) -> string|null }. Components never fetch data. */
export function wireAsk(root, handlers) {
  root.querySelectorAll('[data-ask]').forEach(box => {
    const viewId = box.dataset.ask;
    box.querySelectorAll('.q').forEach(b => {
      b.onclick = () => {
        box.querySelectorAll('.q').forEach(q => q.classList.remove('on'));
        b.classList.add('on');
        showAnswer(box, handlers.ask(viewId, { id: b.dataset.q }), handlers.getSource);
      };
    });
    box.querySelector('form').onsubmit = e => {
      e.preventDefault();
      showAnswer(box, handlers.ask(viewId, { text: box.querySelector('input').value }), handlers.getSource);
    };
  });
}
