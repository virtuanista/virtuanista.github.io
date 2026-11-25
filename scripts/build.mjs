// node scripts/build.mjs [--sync]   Genera dist/ (web) y dist-profile/README.md (perfil) sin dependencias.
import fs from 'node:fs';
import { projects, TYPES, STAGES } from '../src/content.mjs';
const ROOT = new URL('..', import.meta.url), P = f => new URL(f, ROOT), SNAP = P('data/github.json');
const H = { 'user-agent': 'portfolio-build', accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN && { authorization: 'Bearer ' + process.env.GITHUB_TOKEN }) };
async function api(p) { const r = await fetch('https://api.github.com/' + p, { headers: H }); if (!r.ok) throw new Error(`${r.status} ${p}`); return [await r.json(), r.headers.get('link') || '']; }
async function sync() {
  const out = { at: new Date().toISOString(), repos: {} };
  for (const { repo } of projects) {
    const [r] = await api('repos/' + repo), [lang] = await api(`repos/${repo}/languages`);
    const [c, link] = await api(`repos/${repo}/commits?per_page=1`), [last] = await api(`repos/${repo}/commits?per_page=4`);
    const [rel] = await api(`repos/${repo}/releases?per_page=1`), [runs] = await api(`repos/${repo}/actions/runs?branch=${r.default_branch}&per_page=10`);
    const run = runs.workflow_runs.find(x => x.conclusion && !/^(Graph Update|Dependabot)/i.test(x.name));
    out.repos[repo] = { created: r.created_at, pushed: r.pushed_at, license: r.license?.spdx_id ?? null, lang, commits: +(link.match(/page=(\d+)>; rel="last"/)?.[1] ?? c.length),
      last: last.map(x => ({ d: x.commit.author.date, m: x.commit.message.split('\n')[0].slice(0, 110), u: x.html_url })), release: rel[0]?.tag_name ?? null, ci: run ? { ok: run.conclusion === 'success', name: run.name, u: run.html_url } : null };
  }
  fs.mkdirSync(P('data/'), { recursive: true }); fs.writeFileSync(SNAP, JSON.stringify(out, null, 1));
}
if (process.argv.includes('--sync')) try { await sync(); } catch (e) { if (!fs.existsSync(SNAP)) throw e; console.warn('Se usa la última copia:', e.message); }
const gh = JSON.parse(fs.readFileSync(SNAP)), G = p => gh.repos[p.repo];
const list = [...projects].sort((a, b) => G(a).created.localeCompare(G(b).created));
const e = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const day = d => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const bytes = p => Object.values(G(p).lang).reduce((a, b) => a + b, 0), kb = n => n > 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' kB';
const COL = { JavaScript: '#c9a400', TypeScript: '#3178c6', Python: '#3f7f5f', HTML: '#d8553a', CSS: '#7a5bb5', otros: '#8a8690' };
const top = (lang, n = 3) => { const t = Object.values(lang).reduce((a, b) => a + b, 0), s = Object.entries(lang).sort((a, b) => b[1] - a[1]); return s.slice(0, n).map(([k, v]) => [k, v / t]); };
const bar = p => `<span class="bar" role="img" aria-label="${top(G(p).lang).map(([k, v]) => `${k} ${Math.round(v * 100)} %`).join(', ')}">${top(G(p).lang).map(([k, v]) => `<i style="flex:${v.toFixed(3)};background:${COL[k] ?? COL.otros}"></i>`).join('')}</span>`;
const ci = p => G(p).ci ? `<a class="ci ${G(p).ci.ok ? 'ok' : 'ko'}" href="${G(p).ci.u}">${G(p).ci.ok ? 'Correcta' : 'Con fallo'}</a>` : '<span class="none">Sin CI</span>';
const pend = list.flatMap(p => p.pend.map(t => [p, t]));
const lang = {}; for (const p of list) for (const [k, v] of Object.entries(G(p).lang)) lang[k] = (lang[k] ?? 0) + v;
const sum = { n: list.length, web: list.filter(p => p.web).length, commits: list.reduce((a, p) => a + G(p).commits, 0), code: Object.values(lang).reduce((a, b) => a + b, 0), ci: list.filter(p => G(p).ci), last: list.reduce((a, p) => G(p).pushed > a ? G(p).pushed : a, '') };
const card = p => `<article class="card" data-type="${p.type}" data-q="${e([p.name, p.sum, ...p.stack, TYPES[p.type]].join(' ').toLowerCase())}">
<a class="open" href="#${p.id}">${p.img ? `<img loading="lazy" src="img/${p.img[0]}.webp" alt="Captura de ${e(p.name)}" width="640" height="400">` : ''}<h3>${e(p.name)}</h3></a>
<p>${e(p.sum)}</p>${bar(p)}<p class="meta"><span>${TYPES[p.type]}</span><span>${G(p).commits} ${G(p).commits === 1 ? "commit" : "commits"}</span><span>${day(G(p).pushed)}</span></p></article>`;
const row = p => `<tr data-type="${p.type}" data-q="${e([p.name, p.sum, ...p.stack, TYPES[p.type]].join(' ').toLowerCase())}"><th scope="row" data-v="${e(p.name.toLowerCase())}"><a href="#${p.id}">${e(p.name)}</a></th><td>${TYPES[p.type]}</td><td>${STAGES[p.stage][0]}</td><td data-v="${G(p).created}">${day(G(p).created)}</td><td data-v="${G(p).pushed}">${day(G(p).pushed)}</td><td class="num" data-v="${G(p).commits}">${G(p).commits}</td><td class="num" data-v="${bytes(p)}">${kb(bytes(p))}</td><td>${ci(p)}</td><td>${G(p).license === 'NOASSERTION' ? 'Mixta' : G(p).license ?? 'Sin licencia'}</td></tr>`;
const sheet = p => `<dialog id="${p.id}" aria-labelledby="t-${p.id}"><div class="sheet"><header><div><h2 id="t-${p.id}">${e(p.name)}</h2><p>${e(p.sum)}</p></div><button class="close" type="button">Cerrar</button></header>
${p.img ? `<div class="shots n${Math.min(3, p.img.length)}">${p.img.map((i, k) => `<a href="img/${i}.webp"><img loading="lazy" src="img/${i}.webp" alt="${e(p.name)}, captura ${k + 1}"></a>`).join('')}</div>` : ''}
<p class="act">${p.web ? `<a class="btn" href="${p.web}">Abrir ${e(p.name)}</a>` : ''}<a class="btn alt" href="https://github.com/${p.repo}">Ver código</a>${G(p).release ? `<a class="btn alt" href="https://github.com/${p.repo}/releases/latest">Descargar ${e(G(p).release)}</a>` : ''}</p>
<div class="two"><div><h3>Concepto</h3><p>${e(p.why)}</p><h3>Cómo está hecho</h3><ul>${p.tech.map(t => `<li>${e(t)}</li>`).join('')}</ul><h3>Pendiente y límites</h3>${p.pend.length ? `<ul class="todo">${p.pend.map(t => `<li>${e(t)}</li>`).join('')}</ul>` : '<p>No hay nada anotado.</p>'}</div>
<div><h3>Ficha técnica</h3><dl><dt>Estado</dt><dd>${STAGES[p.stage][0]}</dd><dt>Tecnología</dt><dd>${p.stack.map(e).join(', ')}</dd><dt>Lenguajes</dt><dd>${bar(p)}${top(G(p).lang).map(([k, v]) => `${e(k)} ${Math.round(v * 100)} %`).join(', ')}</dd><dt>Código</dt><dd>${kb(bytes(p))}</dd><dt>Creado</dt><dd>${day(G(p).created)}</dd><dt>Commits</dt><dd>${G(p).commits}</dd><dt>Última ejecución</dt><dd>${ci(p)}</dd></dl><h3>Últimos cambios</h3><ol class="log">${G(p).last.map(c => `<li><time datetime="${c.d}">${day(c.d)}</time><a href="${c.u}">${e(c.m)}</a></li>`).join('')}</ol></div></div></div></dialog>`;
const langs = top(lang, 5);
const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>virtuanista (Pepe Alvar): panel de proyectos</title>
<meta name="description" content="Panel técnico de virtuanista (Pepe Alvar): estado, concepto, tecnología y cambios de ${sum.n} proyectos abiertos.">
<meta property="og:title" content="virtuanista: panel de proyectos"><meta property="og:description" content="Estado, concepto y tecnología de ${sum.n} proyectos abiertos."><meta property="og:image" content="https://virtuanista.github.io/img/panel.png"><meta property="og:url" content="https://virtuanista.github.io/"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="img/avatar.png"><link rel="stylesheet" href="style.css"><script src="app.js" defer></script></head><body>
<a class="skip" href="#panel">Ir al panel</a>
<header class="top"><div class="wrap"><img src="img/avatar.png" alt="" width="72" height="72"><div><h1>virtuanista</h1><p>Soy Pepe Alvar. Hago juegos de navegador, herramientas y cosas que se ven en 3D. Este es el estado real de cada proyecto.</p></div><nav aria-label="Enlaces"><a href="https://github.com/virtuanista">GitHub</a><a href="https://www.linkedin.com/in/pepe-alvar/">LinkedIn</a></nav></div></header>
<main class="wrap" id="panel">
<dl class="sum"><div><dt>Proyectos abiertos</dt><dd>${sum.n}</dd></div><div><dt>Con web propia</dt><dd>${sum.web}</dd></div><div><dt>Commits</dt><dd>${sum.commits.toLocaleString('es-ES')}</dd></div><div><dt>Código</dt><dd>${kb(sum.code)}</dd></div><div><dt>Ejecuciones correctas</dt><dd>${sum.ci.filter(p => G(p).ci.ok).length} de ${sum.ci.length}</dd></div><div class="wide"><dt>Lenguajes</dt><dd><span class="bar">${langs.map(([k, v]) => `<i style="flex:${v.toFixed(3)};background:${COL[k] ?? COL.otros}"></i>`).join('')}</span><span class="leg">${langs.map(([k, v]) => `<span><i style="background:${COL[k] ?? COL.otros}"></i>${e(k)} ${Math.round(v * 100)} %</span>`).join('')}</span></dd></div></dl>
<div class="tools"><div class="seg" role="group" aria-label="Vista">${[['board', 'Tablero'], ['table', 'Tabla'], ['todo', 'Pendientes'], ['log', 'Actividad']].map(([k, n], i) => `<button type="button" data-view="${k}" aria-pressed="${!i}">${n}</button>`).join('')}</div>
<label>Tipo <select id="type"><option value="">Todos</option>${Object.entries(TYPES).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label><label>Buscar <input id="q" type="search" placeholder="three.js, Python…"></label><span id="count" role="status"></span></div>
<section id="board" class="view board" aria-label="Tablero">${Object.entries(STAGES).map(([k, [n, d]]) => `<div class="col"><h2>${n} <span>${list.filter(p => p.stage === k).length}</span></h2><p class="hint">${d}</p>${list.filter(p => p.stage === k).map(card).join('\n')}</div>`).join('')}</section>
<section id="table" class="view" aria-label="Tabla" hidden><div class="scroll"><table><thead><tr>${['Proyecto', 'Tipo', 'Estado', 'Creado', 'Último cambio', 'Commits', 'Código', 'Última ejecución', 'Licencia'].map((h, i) => `<th scope="col"${i === 3 ? ' aria-sort="ascending"' : ''}><button type="button" data-col="${i}">${h}</button></th>`).join('')}</tr></thead><tbody>${list.map(row).join('')}</tbody></table></div></section>
<section id="todo" class="view" aria-label="Pendientes" hidden><h2>Pendientes y límites conocidos</h2><ul class="todo big">${pend.map(([p, t]) => `<li data-type="${p.type}" data-q="${e((p.name + ' ' + t).toLowerCase())}">${e(t)} <a href="#${p.id}">${e(p.name)}</a></li>`).join('')}</ul></section>
<section id="log" class="view" aria-label="Actividad" hidden><h2>Últimos cambios</h2><ol class="log big">${list.flatMap(p => G(p).last.map(c => [p, c])).sort((a, b) => b[1].d.localeCompare(a[1].d)).slice(0, 40).map(([p, c]) => `<li data-type="${p.type}" data-q="${e((p.name + ' ' + c.m).toLowerCase())}"><time datetime="${c.d}">${day(c.d)}</time><a href="#${p.id}">${e(p.name)}</a><a class="msg" href="${c.u}">${e(c.m)}</a></li>`).join('')}</ol></section>
<p id="empty" hidden>Ningún proyecto coincide. Prueba con otro tipo o borra la búsqueda.</p>
</main>
<footer class="wrap"><p>Datos de GitHub del ${day(gh.at)}. Las tareas pendientes salen del README de cada proyecto.</p><p>Hecho por <a href="https://github.com/virtuanista">virtu 🎣</a></p><img src="https://open.soniditos.com/cat_footer.svg" alt="Gatito"><p>Copyright © 2026</p></footer>
${list.map(sheet).join('\n')}
</body></html>`;
fs.rmSync(P('dist/'), { recursive: true, force: true }); fs.mkdirSync(P('dist/'));
fs.writeFileSync(P('dist/index.html'), html); for (const f of ['style.css', 'app.js']) fs.copyFileSync(P('src/' + f), P('dist/' + f)); fs.cpSync(P('img/'), P('dist/img/'), { recursive: true });
// ---------- README del perfil ----------
const sh = p => `![Último cambio](https://img.shields.io/github/last-commit/${p.repo}?label=%C3%BAltimo%20cambio&color=555)` + (G(p).license && G(p).license !== 'NOASSERTION' ? ` ![Licencia](https://img.shields.io/github/license/${p.repo}?label=licencia)` : '');
const feat = list.filter(p => p.img && ['juego', 'motor'].includes(p.type) && p.web || ['atlas', 'vxtop', 'dataminer', 'prisma'].includes(p.id));
const cell = p => `<td width="50%" valign="top">\n<a href="${p.web}"><img src="https://virtuanista.github.io/img/${p.img[0]}.webp" alt="${e(p.name)}"></a>\n<h3><a href="https://github.com/${p.repo}">${e(p.name)}</a></h3>\n<p><b>${e(p.sum)}</b></p>\n<p>${e(p.why)}</p>\n<p><code>${p.stack.map(e).join('</code> <code>')}</code></p>\n<a href="${p.web}"><b>▶ Abrir</b></a> · <a href="https://virtuanista.github.io/#${p.id}">Ficha técnica</a>\n</td>`;
const rows = []; for (let i = 0; i < feat.length; i += 2) rows.push('<tr>\n' + feat.slice(i, i + 2).map(cell).join('\n') + '\n</tr>');
const md = `<div align="center">

# virtuanista 🎣

**Soy Pepe Alvar. Hago juegos de navegador, herramientas y cosas que se ven en 3D.**

[![Ver el panel de proyectos](https://img.shields.io/badge/Ver_el_panel_de_proyectos-virtuanista.github.io-b84a06?style=for-the-badge)](https://virtuanista.github.io/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Pepe_Alvar-0a66c2?style=for-the-badge)](https://www.linkedin.com/in/pepe-alvar/)

[![Panel de proyectos](https://virtuanista.github.io/img/panel.png)](https://virtuanista.github.io/)

</div>

El [panel](https://virtuanista.github.io/) muestra el estado de cada proyecto: concepto, tecnología, lenguajes, últimos cambios y tareas pendientes.

## 🎮 Destacados

Por orden de creación.

<table>
${rows.join('\n')}
</table>

## 📋 Todos los proyectos

| Creado | Proyecto | Qué hace | Estado | Seguimiento |
|---|---|---|---|---|
${list.map(p => `| ${G(p).created.slice(0, 7)} | [**${p.name}**](https://github.com/${p.repo}) | ${p.sum} [Ficha](https://virtuanista.github.io/#${p.id}) | ${STAGES[p.stage][0]} | ${sh(p)} |`).join('\n')}

## 🔧 Pendiente

${pend.map(([p, t]) => `- [ ] **[${p.name}](https://virtuanista.github.io/#${p.id})**: ${t}`).join('\n')}

## 🛠️ Con qué trabajo

${[['JavaScript', 'f7df1e', 'javascript', 'black'], ['TypeScript', '3178c6', 'typescript', 'white'], ['Python', '3776ab', 'python', 'white'], ['Node.js', '339933', 'nodedotjs', 'white'], ['three.js', '000000', 'threedotjs', 'white'], ['Vite', '646cff', 'vite', 'white'], ['Electron', '47848f', 'electron', 'white'], ['Web Audio', 'ff6f00', '', 'white'], ['Ollama', '000000', 'ollama', 'white'], ['Hugging Face', 'ffcc4d', 'huggingface', 'black']].map(([n, c, l, k]) => `![${n}](https://img.shields.io/badge/${n.replace(/ /g, '_')}-${c}${l ? `?logo=${l}&logoColor=${k}` : ''})`).join('\n')}

<p align="center">
	Repositorio generado por <a href="https://github.com/virtuanista" target="_blank">virtu 🎣</a>
</p>

<p align="center">
	<img src="https://open.soniditos.com/cat_footer.svg" alt="Gatito" />
</p>

<p align="center">
	Copyright &copy; 2026
</p>
`;
fs.mkdirSync(P('dist-profile/'), { recursive: true }); fs.writeFileSync(P('dist-profile/README.md'), md);
for (const p of list) for (const i of p.img ?? []) if (!fs.existsSync(P(`img/${i}.webp`))) throw new Error('Falta img/' + i);
console.log(sum.n, 'proyectos,', pend.length, 'pendientes,', sum.commits, 'commits; CI con fallo:', sum.ci.filter(p => !G(p).ci.ok).map(p => p.name).join() || 'ninguna');
