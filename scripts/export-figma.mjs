// Hämtar alla ikoner ur Figma-biblioteket och skriver:
//   svg/<namn>.svg   en fil per ikon (fill=currentColor, viewBox 0 0 24 24)
//   sprite.svg       alla ikoner som <symbol id="icon-<namn>"> (för ikonlistan /ikoner)
//   icons.json       { count, icons: [namn...] }
// Kör: FIGMA_TOKEN=... node scripts/export-figma.mjs
// Token: Figma > Settings > Security > Personal access tokens, scope file_content:read. Läggs aldrig i filer.
import fs from 'node:fs';
import path from 'node:path';

const TOKEN = process.env.FIGMA_TOKEN;
const FILE = process.env.FIGMA_FILE || 'SzpDeEBqCZ4s4o1erlitD1';
const ROOT = process.env.FIGMA_ICON_FRAME || '4287:28582'; // frame "icons" i sektionen "Icon library"
if (!TOKEN) { console.error('FIGMA_TOKEN saknas'); process.exit(1); }
const out = new URL('..', import.meta.url).pathname;
const H = { 'X-Figma-Token': TOKEN };

async function api(url, tries = 6) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: H });
    if (r.status === 429) { const w = Number(r.headers.get('retry-after') || 10); console.log('429, väntar', w, 's'); await new Promise(s => setTimeout(s, w * 1000)); continue; }
    if (!r.ok) throw new Error(url + ' -> ' + r.status);
    return r.json();
  }
  throw new Error('för många försök: ' + url);
}

// 1. Lista komponenterna (frame > kategori > komponent)
const tree = await api(`https://api.figma.com/v1/files/${FILE}/nodes?ids=${encodeURIComponent(ROOT)}&depth=3`);
const root = tree.nodes[ROOT].document;
const found = [];
(function walk(n) { for (const c of n.children || []) { if (c.type === 'COMPONENT') found.push({ id: c.id, name: c.name }); else walk(c); } })(root);
const byName = new Map(), bad = [];
for (const c of found) {
  if (!/^[a-z0-9_]+$/.test(c.name)) { bad.push(c.name); continue; }
  if (byName.has(c.name)) { console.warn('dubblett, hoppar över:', c.name); continue; }
  byName.set(c.name, c.id);
}
if (bad.length) console.warn('ogiltiga namn (hoppas över):', bad.join(', '));
console.log('komponenter i Figma:', found.length, '| exporteras:', byName.size);
if (byName.size < 100) throw new Error('misstänkt få ikoner, avbryter');

// 2. Exportera SVG-adresser i omgångar om 100
const names = [...byName.keys()].sort();
const urls = {};
for (let i = 0; i < names.length; i += 100) {
  const ids = names.slice(i, i + 100).map(n => byName.get(n));
  const r = await api(`https://api.figma.com/v1/images/${FILE}?ids=${ids.map(encodeURIComponent).join(',')}&format=svg&svg_include_id=false&svg_outline_text=true`);
  for (const n of names.slice(i, i + 100)) urls[n] = r.images[byName.get(n)];
  console.log('adresser', Math.min(i + 100, names.length), '/', names.length);
}

// 3. Hämta, normalisera, skriv
function inner(svg) { const m = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/); if (!m) throw new Error('ingen svg'); return m[1].trim(); }
function normalize(s) { return s.replace(/\s+fill="(?!none")[^"]*"/g, '').replace(/\s+fill-opacity="[^"]*"/g, ''); }
const dir = path.join(out, 'svg'); fs.mkdirSync(dir, { recursive: true });
const body = {};
let next = 0;
async function worker() {
  while (next < names.length) {
    const n = names[next++];
    let t;
    for (let k = 0; k < 4 && !t; k++) { try { const r = await fetch(urls[n]); if (r.ok) t = await r.text(); } catch {} }
    if (!t) throw new Error('kunde inte hämta ' + n);
    body[n] = normalize(inner(t));
  }
}
await Promise.all(Array.from({ length: 8 }, worker));

for (const n of names) fs.writeFileSync(path.join(dir, n + '.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">${body[n]}</svg>`);
// ta bort ikoner som inte längre finns i Figma
for (const f of fs.readdirSync(dir)) if (f.endsWith('.svg') && !byName.has(f.slice(0, -4))) { fs.unlinkSync(path.join(dir, f)); console.log('borttagen:', f); }

// id:n i <defs> (clipPath m.m.) prefixas per ikon i spriten så att de inte krockar
const sym = n => { const b = body[n].replace(/id="([^"]+)"/g, (_, i) => `id="${n}-${i}"`).replace(/url\(#([^)]+)\)/g, (_, i) => `url(#${n}-${i})`); return `<symbol id="icon-${n}" viewBox="0 0 24 24">${b}</symbol>`; };
fs.writeFileSync(path.join(out, 'sprite.svg'), `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${names.map(sym).join('')}</svg>`);
fs.writeFileSync(path.join(out, 'icons.json'), JSON.stringify({ count: names.length, icons: names }) + '\n');
console.log('klart:', names.length, 'ikoner');
