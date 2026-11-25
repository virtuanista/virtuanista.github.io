// node scripts/build.mjs [--sync]   Genera dist/ (web) y dist-profile/README.md (perfil) sin dependencias.
import fs from 'node:fs';
import { projects, TYPES as TYPES_ES, STAGES as STAGES_ES } from '../src/content.mjs';
import * as EN from '../src/content.en.mjs';
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
for (const p of projects) if (!EN.projects[p.id]) throw new Error('Falta la traducción de ' + p.id);
fs.rmSync(P('dist/'), { recursive: true, force: true }); fs.mkdirSync(P('dist/en/'), { recursive: true }); fs.mkdirSync(P('dist-profile/'), { recursive: true });
for (const f of ['style.css', 'app.js']) fs.copyFileSync(P('src/' + f), P('dist/' + f));
fs.cpSync(P('img/'), P('dist/img/'), { recursive: true });
const CARDS = [];
for (const L of ['es', 'en']) build(L); // español en la raíz; inglés en /en/ y README.en.md
fs.writeFileSync(P('dist-profile/tarjetas.json'), JSON.stringify(CARDS));
function build(L) {
const en = L === 'en', LOC = en ? 'en-GB' : 'es-ES', A = en ? '../' : '', PC = en ? '%' : ' %';
const t = k => { if (!en) return k; if (!(k in EN.UI)) throw new Error('Sin traducir: ' + k); return EN.UI[k]; };
const TYPES = en ? EN.TYPES : TYPES_ES, STAGES = en ? Object.fromEntries(Object.entries(EN.STAGES).map(([k, n]) => [k, [n]])) : STAGES_ES;
const list = projects.map(p => en ? { ...p, ...EN.projects[p.id], ...(EN.LANG_PARAM.includes(p.id) && { web: p.web + '?lang=en' }) } : p).sort((a, b) => b.since.localeCompare(a.since) || G(b).created.localeCompare(G(a).created)); // nuevos primero
const e = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const day = d => new Date(d).toLocaleDateString(LOC, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const bytes = p => Object.values(G(p).lang).reduce((a, b) => a + b, 0), kb = n => n > 1e6 ? (n / 1e6).toLocaleString(LOC, { maximumFractionDigits: 1 }) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' kB';
const COL = { JavaScript: '#c9a400', TypeScript: '#3178c6', Python: '#3f7f5f', HTML: '#d8553a', CSS: '#7a5bb5', otros: '#8a8690' };
const top = (lang, n = 3) => { const t = Object.values(lang).reduce((a, b) => a + b, 0), s = Object.entries(lang).sort((a, b) => b[1] - a[1]); return s.slice(0, n).map(([k, v]) => [k, v / t]).filter(([, v]) => v >= .005); };
const bar = p => `<span class="bar" role="img" aria-label="${top(G(p).lang).map(([k, v]) => `${k} ${Math.round(v * 100)}${PC}`).join(', ')}">${top(G(p).lang).map(([k, v]) => `<i style="flex:${v.toFixed(3)};background:${COL[k] ?? COL.otros}"></i>`).join('')}</span>`;
const ci = p => G(p).ci ? `<a class="ci ${G(p).ci.ok ? 'ok' : 'ko'}" href="${G(p).ci.u}">${G(p).ci.ok ? t('Correcta') : t('Con fallo')}</a>` : `<span class="none">${t('Sin CI')}</span>`;
const pend = list.flatMap(p => p.pend.map(t => [p, t]));
const lang = {}; for (const p of list) for (const [k, v] of Object.entries(G(p).lang)) lang[k] = (lang[k] ?? 0) + v;
const sum = { n: list.length, web: list.filter(p => p.web).length, commits: list.reduce((a, p) => a + G(p).commits, 0), code: Object.values(lang).reduce((a, b) => a + b, 0), ci: list.filter(p => G(p).ci), last: list.reduce((a, p) => G(p).pushed > a ? G(p).pushed : a, '') };
const month = d => new Date(d).toLocaleDateString(LOC, { month: 'long', year: 'numeric', timeZone: 'UTC' });
const attrs = (p, q) => `data-type="${p.type}" data-stage="${p.stage}" data-q="${e(q.toLowerCase())}"`;
const card = p => `<article class="card" ${attrs(p, [p.name, p.sum, ...p.stack, TYPES[p.type]].join(' '))}>
<a class="open" href="#${p.id}"><img loading="lazy" src="${A}img/t/${p.id}.webp" alt="" width="800" height="450"><time datetime="${p.since}">${month(p.since)}</time><h3>${e(p.name)}</h3></a>
<p>${e(p.sum)}</p>${bar(p)}<p class="meta"><span>${TYPES[p.type]}</span><span>${STAGES[p.stage][0]}</span>${p.web ? `<a class="go" href="${p.web}">${p.type === 'juego' ? t('Jugar') : p.stage === 'web' ? t('Abrir') : t('Web')} ↗</a>` : ''}</p></article>`;
const row = p => `<tr ${attrs(p, [p.name, p.sum, ...p.stack, TYPES[p.type]].join(' '))}><th scope="row" data-v="${e(p.name.toLowerCase())}"><a href="#${p.id}">${e(p.name)}</a></th><td>${TYPES[p.type]}</td><td>${STAGES[p.stage][0]}</td><td data-v="${p.since}">${day(p.since)}</td><td data-v="${G(p).pushed}">${day(G(p).pushed)}</td><td class="num" data-v="${G(p).commits}">${G(p).commits}</td><td class="num" data-v="${bytes(p)}">${kb(bytes(p))}</td><td>${ci(p)}</td><td>${G(p).license === 'NOASSERTION' ? t('Mixta') : G(p).license ?? t('Sin licencia')}</td></tr>`;
const sheet = p => `<dialog id="${p.id}" aria-labelledby="t-${p.id}"><div class="sheet"><header><div><h2 id="t-${p.id}">${e(p.name)}</h2><p>${e(p.sum)}</p></div><button class="close" type="button">${t('Cerrar')}</button></header>
${p.img ? `<div class="shots n${Math.min(3, p.img.length)}">${p.img.map((i, k) => `<a href="${A}img/${i}.webp"><img loading="lazy" src="${A}img/${i}.webp" alt="${e(p.name)}, ${t('captura')} ${k + 1}"></a>`).join('')}</div>` : ''}
<p class="act">${p.web ? `<a class="btn" href="${p.web}">${t('Abrir')} ${e(p.name)}</a>` : ''}<a class="btn alt" href="https://github.com/${p.repo}">${t('Ver código')}</a>${G(p).release ? `<a class="btn alt" href="https://github.com/${p.repo}/releases/latest">${t('Descargar')} ${e(G(p).release)}</a>` : ''}</p>
<div class="two"><div><h3>${t('Concepto')}</h3><p>${e(p.why)}</p><h3>${t('Cómo está hecho')}</h3><ul>${p.tech.map(t => `<li>${e(t)}</li>`).join('')}</ul><h3>${t('Pendiente y límites')}</h3>${p.pend.length ? `<ul class="todo">${p.pend.map(t => `<li>${e(t)}</li>`).join('')}</ul>` : `<p>${t('No hay nada anotado.')}</p>`}</div>
<div><h3>${t('Ficha técnica')}</h3><dl><dt>${t('Estado')}</dt><dd>${STAGES[p.stage][0]}</dd><dt>${t('Tecnología')}</dt><dd>${p.stack.map(e).join(', ')}</dd><dt>${t('Lenguajes')}</dt><dd>${bar(p)}${top(G(p).lang).map(([k, v]) => `${e(k)} ${Math.round(v * 100)}${PC}`).join(', ')}</dd><dt>${t('Código')}</dt><dd>${kb(bytes(p))}</dd><dt>${t('Empezado')}</dt><dd>${day(p.since)}</dd><dt>${t('Repositorio')}</dt><dd>${day(G(p).created)}</dd><dt>Commits</dt><dd>${G(p).commits}</dd><dt>${t('Última ejecución')}</dt><dd>${ci(p)}</dd></dl><h3>${t('Últimos cambios')}</h3><ol class="log">${G(p).last.map(c => `<li><time datetime="${c.d}">${day(c.d)}</time><a href="${c.u}">${e(c.m)}</a></li>`).join('')}</ol></div></div></div></dialog>`;
const langs = top(lang, 5);
const html = `<!doctype html>
<html lang="${L}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t('virtuanista: proyectos')}</title>
<meta name="description" content="${t('Juegos de navegador, herramientas, IA y 3D')}: ${sum.n} ${t('proyectos abiertos con su estado, tecnología y cambios')}.">
<meta property="og:title" content="${t('virtuanista: proyectos')}"><meta property="og:description" content="${t('Estado, concepto y tecnología de')} ${sum.n} ${t('proyectos abiertos')}."><meta property="og:image" content="https://virtuanista.github.io/img/perfil/portada.png"><meta property="og:url" content="https://virtuanista.github.io/${en ? 'en/' : ''}"><link rel="canonical" href="https://virtuanista.github.io/${en ? 'en/' : ''}"><link rel="alternate" hreflang="es" href="https://virtuanista.github.io/"><link rel="alternate" hreflang="en" href="https://virtuanista.github.io/en/"><link rel="alternate" hreflang="x-default" href="https://virtuanista.github.io/"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${A}img/avatar.png"><link rel="stylesheet" href="${A}style.css"><script src="${A}app.js" defer></script></head><body>
<a class="skip" href="#panel">${t('Ir al panel')}</a>
<header class="top"><div class="wrap"><nav aria-label="${t('Enlaces')}"><span class="lang">${en ? '<a href="../" lang="es" hreflang="es">ES</a><b aria-current="true">EN</b>' : '<b aria-current="true">ES</b><a href="en/" lang="en" hreflang="en">EN</a>'}</span><a href="https://github.com/virtuanista">GitHub</a><a href="https://www.linkedin.com/in/pepe-alvar/">LinkedIn</a><a href="https://github.com/vxtop">vxtop</a><a href="https://github.com/soniditos">Soniditos</a></nav>
<h1><picture><source media="(prefers-reduced-motion: reduce)" srcset="${A}img/perfil/virtuanista-fija.webp"><img src="${A}img/perfil/virtuanista.webp" alt="virtuanista" width="860" height="230"></picture></h1>
<p>${t('Desarrollo · Tecnología · Inteligencia Artificial')}</p><p class="made">${t('El nombre está escrito con las 60.000 partículas de')} <a href="#vision">Vision</a>.</p></div></header>
<main class="wrap" id="panel">
<dl class="sum"><div><dt>${t('Proyectos abiertos')}</dt><dd>${sum.n}</dd></div><div><dt>${t('Con web propia')}</dt><dd>${sum.web}</dd></div><div><dt>Commits</dt><dd>${sum.commits.toLocaleString(LOC)}</dd></div><div><dt>${t('Código')}</dt><dd>${kb(sum.code)}</dd></div><div><dt>${t('Ejecuciones correctas')}</dt><dd>${sum.ci.filter(p => G(p).ci.ok).length} ${t('de')} ${sum.ci.length}</dd></div><div class="wide"><dt>${t('Lenguajes')}</dt><dd><span class="bar">${langs.map(([k, v]) => `<i style="flex:${v.toFixed(3)};background:${COL[k] ?? COL.otros}"></i>`).join('')}</span><span class="leg">${langs.map(([k, v]) => `<span><i style="background:${COL[k] ?? COL.otros}"></i>${e(k)} ${Math.round(v * 100)}${PC}</span>`).join('')}</span></dd></div></dl>
<div class="chips" role="group" aria-label="${t('Tipo')}">${[['', t('Todos')], ...Object.entries(TYPES)].map(([k, n]) => `<button type="button" data-kind="${k}" aria-pressed="${!k}">${n} <span>${k ? list.filter(p => p.type === k).length : list.length}</span></button>`).join('')}</div>
<div class="tools"><div class="seg" role="group" aria-label="${t('Vista')}">${[['board', t('Tablero')], ['table', t('Tabla')], ['todo', t('Pendientes')], ['log', t('Actividad')]].map(([k, n], i) => `<button type="button" data-view="${k}" aria-pressed="${!i}">${n}</button>`).join('')}</div>
<label>${t('Estado')} <select id="stage"><option value="">${t('Todos')}</option>${Object.entries(STAGES).map(([k, [n]]) => `<option value="${k}">${n}</option>`).join('')}</select></label><label>${t('Orden')} <select id="order"><option value="new">${t('Nuevos primero')}</option><option value="old">${t('Antiguos primero')}</option></select></label><label>${t('Buscar')} <input id="q" type="search" placeholder="three.js…"></label><span id="count" role="status"></span></div>
<section id="board" class="view board" aria-label="${t('Tablero')}">${list.map(card).join('\n')}</section>
<section id="table" class="view" aria-label="${t('Tabla')}" hidden><div class="scroll"><table><thead><tr>${['Proyecto', 'Tipo', 'Estado', 'Empezado', 'Último cambio', 'Commits', 'Código', 'Última ejecución', 'Licencia'].map(h => h === 'Commits' ? h : t(h)).map((h, i) => `<th scope="col"${i === 3 ? ' aria-sort="descending"' : ''}><button type="button" data-col="${i}">${h}</button></th>`).join('')}</tr></thead><tbody>${list.map(row).join('')}</tbody></table></div></section>
<section id="todo" class="view" aria-label="${t('Pendientes')}" hidden><h2>${t('Pendientes y límites conocidos')}</h2><ul class="todo big">${pend.map(([p, t]) => `<li ${attrs(p, (p.name + ' ' + t))}>${e(t)} <a href="#${p.id}">${e(p.name)}</a></li>`).join('')}</ul></section>
<section id="log" class="view" aria-label="${t('Actividad')}" hidden><h2>${t('Últimos cambios')}</h2><ol class="log big">${list.flatMap(p => G(p).last.map(c => [p, c])).sort((a, b) => b[1].d.localeCompare(a[1].d)).slice(0, 40).map(([p, c]) => `<li ${attrs(p, (p.name + ' ' + c.m))}><time datetime="${c.d}">${day(c.d)}</time><a href="#${p.id}">${e(p.name)}</a><a class="msg" href="${c.u}">${e(c.m)}</a></li>`).join('')}</ol></section>
<p id="empty" hidden>${t('Ningún proyecto coincide. Prueba con otro tipo o borra la búsqueda.')}</p>
</main>
<footer class="wrap"><p>${t('Datos de GitHub del')} ${day(gh.at)}. ${t('Las fechas de inicio salen del primer commit o del código más antiguo conservado. Las tareas pendientes salen del README de cada proyecto.')}</p><p>${t('Hecho por')} <a href="https://github.com/virtuanista">virtu 🎣</a></p><img src="https://open.soniditos.com/cat_footer.svg" alt="${t('Gatito')}"><p>Copyright © 2026</p></footer>
${list.map(sheet).join('\n')}
</body></html>`;
fs.writeFileSync(P(en ? 'dist/en/index.html' : 'dist/index.html'), html);
// ---------- Cifras del perfil: SVG propio, en claro y en oscuro ----------
const svg = (ink, soft) => {
  const W = 846, nums = [[en ? 'Projects' : 'Proyectos', sum.n], [t('Con web propia'), sum.web], ['Commits', sum.commits.toLocaleString(LOC)], [t('Código'), kb(sum.code)]], tot = langs.reduce((a, [, v]) => a + v, 0);
  let x = 0;
  const bars = langs.map(([k, v]) => { const w = v / tot * W, r = `<rect x="${x.toFixed(1)}" y="86" width="${Math.max(2, w - 2).toFixed(1)}" height="10" fill="${COL[k] ?? COL.otros}"/>`; x += w; return r; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="140" viewBox="0 0 ${W} 140" role="img" aria-label="${nums.map(([k, v]) => `${k}: ${v}`).join(', ')}. ${langs.map(([k, v]) => `${k} ${Math.round(v * 100)}${PC}`).join(', ')}"><g font-family="Segoe UI,-apple-system,system-ui,sans-serif">${nums.map(([k, v], i) => `<text x="${i * 212}" y="34" font-size="30" font-weight="650" fill="${ink}">${v}</text><text x="${i * 212}" y="58" font-size="14" fill="${soft}">${k}</text>`).join('')}${langs.map(([k, v], i) => `<circle cx="${i * 169 + 5}" cy="122" r="5" fill="${COL[k] ?? COL.otros}"/><text x="${i * 169 + 17}" y="127" font-size="14" fill="${soft}">${k} ${Math.round(v * 100)} %</text>`).join('')}</g><clipPath id="r"><rect y="86" width="${W}" height="10" rx="5"/></clipPath><g clip-path="url(#r)">${bars}</g></svg>`;
};
const S = en ? '-en' : '';
fs.writeFileSync(P(`dist/img/perfil/cifras-oscuro${S}.svg`), svg('#f0f6fc', '#9198a1')); fs.writeFileSync(P(`dist/img/perfil/cifras-claro${S}.svg`), svg('#1f2328', '#59636e'));
// ---------- README del perfil ----------
// El encabezado (lema, botones y frase) lo escribió a mano su autor: no cambiarlo. Sin captura del panel ni presentación personal.
const I = 'https://virtuanista.github.io/img/', HUB = `https://virtuanista.github.io/${en ? 'en/' : ''}#`;
const PLAY = ['parkour', 'ceniza', 'retro', 'myrmex', 'isleta', 'neon'], TOOLS = ['dataminer', 'atlas', 'prisma', 'gamehub', 'vxtop', 'soniditos'];
const SUF = en ? '-en' : '';
const go = p => p.type === 'juego' && p.web ? t('Jugar') : p.stage === 'web' ? t('Abrir') : p.stage === 'release' && !p.web ? t('Descargar') : p.web ? t('Web') : t('Código');
const to = p => p.web ?? (G(p).release ? `https://github.com/${p.repo}/releases/latest` : `https://github.com/${p.repo}`);
// 400 px: dos por fila en el ordenador y una en el móvil
const cell = p => `<a href="${to(p)}"><picture><source media="(prefers-color-scheme: dark)" srcset="img/${p.id}-oscuro${SUF}.webp"><img src="img/${p.id}-claro${SUF}.webp" width="400" alt="${e(p.name)}: ${e(p.sum)} ${go(p)}"></picture></a>`;
const grid = ids => '<p align="center">\n' + list.filter(p => ids.includes(p.id)).map(cell).join('\n') + '\n</p>';
CARDS.push({ id: 'vision-pro', suf: SUF, name: 'Vision', sum: en ? 'An interface made only of Gaussian points.' : 'Una interfaz hecha solo de puntos gaussianos.', go: en ? 'Try it free' : 'Pruébala gratis' });
for (const p of list) if ([...PLAY, ...TOOLS].includes(p.id)) CARDS.push({ id: p.id, suf: SUF, name: p.name, sum: p.sum, go: go(p) });
const B = (n, c, l, k = 'white') => `<img alt="${n}" src="https://img.shields.io/badge/${n.replace(/ /g, '_')}-${c}?style=flat-square${l ? `&logo=${l}&logoColor=${k}` : ''}">`;
const md = `<div align="center">

<p>${en ? '<a href="README.md">Español</a> · <b>English</b>' : '<b>Español</b> · <a href="README.en.md">English</a>'}</p>

<a href="https://virtuanista.github.io/${en ? 'en/' : ''}"><picture><source media="(prefers-reduced-motion: reduce)" srcset="img/virtuanista-fija.webp"><img src="img/virtuanista.webp" alt="virtuanista" width="100%"></picture></a>

### ${t('Desarrollo · Tecnología · Inteligencia Artificial')}

${en ? '[![Explore the projects](https://img.shields.io/badge/🚀_EXPLORE_THE_PROJECTS-virtuanista.github.io-b84a06?style=for-the-badge)](https://virtuanista.github.io/en/)' : '[![Explorar panel de proyectos](https://img.shields.io/badge/🚀_EXPLORAR_PANEL_DE_PROYECTOS-virtuanista.github.io-b84a06?style=for-the-badge)](https://virtuanista.github.io/)'}
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Pepe_Alvar-0a66c2?style=for-the-badge)](https://www.linkedin.com/in/pepe-alvar/)
[![itch.io](https://img.shields.io/badge/itch.io-virtuanista-fa5c5c?style=for-the-badge)](https://virtuanista.itch.io)

${en ? 'Explore my projects, technologies, developments, latest progress and next tasks.' : 'Explora mis proyectos, tecnologías, desarrollos, últimos avances y próximas tareas.'}

## 🎮 ${en ? 'Featured' : 'Destacados'}

${en ? 'Newest to oldest.' : 'Del más nuevo al más antiguo.'}

<p align="center"><a href="https://virtuanista.github.io/vision/"><img src="img/vision-pro${SUF}.webp" width="820" alt="Vision: ${en ? 'an interface made only of Gaussian points. Try it free' : 'una interfaz hecha solo de puntos gaussianos. Pruébala gratis'}"></a></p>

[![Vision](https://img.shields.io/badge/${en ? 'Free_demo' : 'Demo_gratis'}-Vision-3fa9ff?style=for-the-badge)](https://virtuanista.github.io/vision/${en ? '?lang=en' : ''}) [![Vision Pro](https://img.shields.io/badge/${en ? 'Buy' : 'Comprar'}-Vision_Pro-8b3fd9?style=for-the-badge)](https://virtuanista.github.io/vision/pro/${en ? '?lang=en' : ''}#precios)

${grid(PLAY)}

## 🧊 ${en ? 'Tools, AI and 3D' : 'Herramientas, IA y 3D'}

${grid(TOOLS)}

<details>
<summary><b>🧰 ${en ? 'All projects, with code' : 'Todos los proyectos, con su código'}</b></summary>
<br>

| ${en ? 'Since | Project | What it does' : 'Desde | Proyecto | Qué hace'} | |
|:--|:--|:--|:--|
${list.map(p => `| ${p.since.slice(0, 7).replace('-', '&#8209;')} | [**${p.name}**](https://github.com/${p.repo}) | ${p.sum} | [${en ? 'Details' : 'Ficha'}](${HUB}${p.id}) |`).join('\n')}

</details>

## 📊 ${en ? 'In numbers' : 'En cifras'}

<picture>
<source media="(prefers-color-scheme: dark)" srcset="${I}perfil/cifras-oscuro${S}.svg">
<img src="${I}perfil/cifras-claro${S}.svg" alt="${en ? 'Projects, websites, commits and languages' : 'Proyectos, webs, commits y reparto de lenguajes'}" width="100%">
</picture>

<p>
${[B('three.js', '000000', 'threedotjs'), B('WebGL', '990000', 'webgl'), B('Canvas 2D', 'c2410c', 'html5'), B('Web Audio', 'b45309'), B('WebSocket', '444444'), B('WebRTC', '333333', 'webrtc'), B('Node.js', '339933', 'nodedotjs'), B('Vite', '646cff', 'vite'), B('Electron', '47848f', 'electron'), B('Flask', '3b7a8c', 'flask'), B('FastAPI', '009688', 'fastapi'), B('MCP', '111111'), B('Ollama', '000000', 'ollama'), B('Hugging Face', 'ffcc4d', 'huggingface', 'black')].join('\n')}
</p>

<p align="center">
	${en ? 'Repository made by' : 'Repositorio generado por'} <a href="https://github.com/virtuanista" target="_blank">virtu 🎣</a>
</p>

<p align="center">
	<img src="https://open.soniditos.com/cat_footer.svg" alt="${t('Gatito')}" />
</p>

<p align="center">
	Copyright &copy; 2026
</p>

</div>
`;
fs.writeFileSync(P(en ? 'dist-profile/README.en.md' : 'dist-profile/README.md'), md);
for (const p of list) for (const i of [`t/${p.id}`, ...p.img ?? []]) if (!fs.existsSync(P(`img/${i}.webp`))) throw new Error('Falta img/' + i);
console.log(sum.n, 'proyectos,', pend.length, 'pendientes,', sum.commits, 'commits; CI con fallo:', sum.ci.filter(p => !G(p).ci.ok).map(p => p.name).join() || 'ninguna');
}
