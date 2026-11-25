const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
let kind = '';
const stage = $('#stage'), order = $('#order'), q = $('#q');
let view = 'board';
function filter() {
  const t = kind, s = q.value.trim().toLowerCase();
  for (const el of $$('[data-q]')) el.hidden = (t && el.dataset.type !== t) || (stage.value && el.dataset.stage !== stage.value) || !el.dataset.q.includes(s);
  const n = $$(`#${view} [data-q]:not([hidden])`).length;
  $('#count').textContent = `${n} ${view === 'todo' ? 'pendientes' : view === 'log' ? 'cambios' : 'proyectos'}`;
  $('#empty').hidden = n > 0;
}
for (const b of $$('[data-kind]')) b.onclick = () => {
  kind = b.dataset.kind;
  for (const x of $$('[data-kind]')) x.setAttribute('aria-pressed', x === b);
  filter();
};
stage.onchange = q.oninput = filter;
// El HTML llega del más nuevo al más antiguo; invertirlo entero mantiene los empates coherentes.
const lists = ['#board', '#table tbody', '#todo ul', '#log ol'].map(s => [$(s), [...$(s).children]]);
order.onchange = () => {
  const old = order.value === 'old';
  for (const [el, kids] of lists) el.append(...(old ? [...kids].reverse() : kids));
  for (const x of $$('thead th')) x.removeAttribute('aria-sort');
  $$('thead th')[3].setAttribute('aria-sort', old ? 'ascending' : 'descending');
};
for (const b of $$('[data-view]')) b.onclick = () => {
  view = b.dataset.view;
  for (const x of $$('[data-view]')) x.setAttribute('aria-pressed', x === b);
  for (const v of $$('.view')) v.hidden = v.id !== view;
  filter();
};
for (const b of $$('[data-col]')) b.onclick = () => {
  const th = b.parentElement, dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending', i = +b.dataset.col, body = $('tbody');
  for (const x of $$('thead th')) x.removeAttribute('aria-sort');
  th.setAttribute('aria-sort', dir);
  const v = r => r.children[i].dataset.v ?? r.children[i].textContent;
  body.append(...[...body.rows].sort((a, z) => v(a).localeCompare(v(z), 'es', { numeric: i === 5 || i === 6 }) * (dir === 'ascending' ? 1 : -1)));
};
// Fichas: cada proyecto tiene su enlace (#id) y el botón atrás la cierra.
function route() {
  for (const d of $$('dialog[open]')) if ('#' + d.id !== location.hash) d.close();
  const d = location.hash && document.getElementById(location.hash.slice(1));
  if (d?.tagName === 'DIALOG' && !d.open) { d.showModal(); d.scrollTop = 0; }
}
for (const d of $$('dialog')) {
  d.addEventListener('close', () => { if (location.hash === '#' + d.id) history.pushState(null, '', location.pathname); });
  d.addEventListener('click', e => { if (e.target === d || e.target.closest('.close')) d.close(); });
}
addEventListener('hashchange', route); addEventListener('popstate', route);
filter(); route();
