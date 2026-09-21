/**
 * COMPROBACION 3 — TEXTO INVISIBLE (y su arreglo)
 *
 * Abre cada pagina ya construida en un navegador de verdad y, para cada
 * texto, compara su color con el color de fondo REAL: sube por los padres
 * componiendo todas las capas (fondo propio, el ::before de los contenedores
 * nuevos de Elementor y la veladura .elementor-background-overlay, que es
 * HERMANA del contenido y no padre). Si hay una foto de fondo que SI carga,
 * no juzga: no se puede saber.
 *
 * Ademas de avisar, escribe la hoja que lo arregla:
 *   public/contraste.css   una regla por elemento, con el identificador que
 *                          le puso el constructor. Nada medido a ojo.
 *   informes/contraste.md  el parte, con lo arreglado y lo que hay que mirar.
 *
 * Se ejecuta DESPUES de "npm run build", y luego hay que volver a construir
 * para que la hoja nueva entre en dist/.
 *
 *   node scripts/20-contraste.mjs            todas las paginas
 *   node scripts/20-contraste.mjs --rapido   solo una de cada tipo
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const RAIZ = process.cwd();
const DIST = path.join(RAIZ, 'dist');
const PUERTO = 8123;
const RAPIDO = process.argv.includes('--rapido');
const MUESTRA = ['', 'madrid', 'precios', 'contacto', 'aviso-legal'];

if (!fs.existsSync(DIST)) {
  console.error('No existe dist/. Hay que ejecutar antes:  npm run build');
  process.exit(1);
}

/* ---------------------------------------------------------------- */
/* Un servidor de andar por casa para dist/                          */
/* ---------------------------------------------------------------- */
const TIPOS = { '.html':'text/html;charset=utf-8','.css':'text/css','.js':'text/javascript',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.webp':'image/webp','.svg':'image/svg+xml','.gif':'image/gif','.ico':'image/x-icon',
  '.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.eot':'application/vnd.ms-fontobject' };

const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(DIST, u);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => srv.listen(PUERTO, r));

/* ---------------------------------------------------------------- */
/* Que paginas hay                                                   */
/* ---------------------------------------------------------------- */
const paginas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos', 'paginas.json'), 'utf8'))
  .map((p) => ({ slug: p.slug, id: p.id, ruta: p.ruta || (p.slug ? `/${p.slug}/` : '/') }))
  .filter((p) => (RAPIDO ? MUESTRA.includes(p.slug) : true));

console.log(`Comprobando el contraste en ${paginas.length} paginas...`);

/* ---------------------------------------------------------------- */
/* La medida, dentro del navegador                                   */
/* ---------------------------------------------------------------- */
const MIRA = async () => {
  const cache = new Map();
  const carga = async (url) => {
    if (cache.has(url)) return cache.get(url);
    const ok = await fetch(url, { method: 'GET' }).then((r) => r.ok).catch(() => false);
    cache.set(url, ok); return ok;
  };
  const rgb = (s) => { const m = String(s).match(/[\d.]+/g); return m ? m.map(Number) : null; };
  const lum = ([r,g,b]) => { const f=(c)=>{c/=255;return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4;};
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
  const mezcla = (fg,bg) => { const a=fg[3]??1; return [0,1,2].map(i=>Math.round(fg[i]*a+bg[i]*(1-a))); };

  const fondoDe = async (el) => {
    const grupos = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const s = getComputedStyle(n);
      const capas = [];
      const mira = async (est) => {
        const bi = est.backgroundImage;
        if (bi && bi !== 'none') {
          if (/gradient/.test(bi)) return 'foto';
          const u = bi.match(/url\(["']?([^)"']+)/);
          if (u && await carga(u[1])) return 'foto';
        }
        const c = rgb(est.backgroundColor);
        const op = Number(est.opacity);
        if (c && (c[3] ?? 1) > 0.01)
          capas.push([c[0], c[1], c[2], (c[3] ?? 1) * (isNaN(op) ? 1 : op)]);
        return null;
      };
      if (await mira(s) === 'foto') return { imagen: true };
      for (const ps of ['::before', '::after']) {
        const sp = getComputedStyle(n, ps);
        if (!sp || sp.content === 'none') continue;
        if (await mira(sp) === 'foto') return { imagen: true };
      }
      for (const ov of n.children) {
        const cl = (ov.className || '').toString();
        if (!/elementor-background-overlay|elementor-background-slideshow/.test(cl)) continue;
        if (await mira(getComputedStyle(ov)) === 'foto') return { imagen: true };
      }
      grupos.push(capas);
      if (capas.some((L) => L[3] >= 0.99)) break;
      n = n.parentElement;
    }
    let base = [255, 255, 255];
    for (const g of grupos.reverse())
      for (const L of g) base = [0,1,2].map((i) => Math.round(L[i]*L[3] + base[i]*(1-L[3])));
    return { color: base };
  };

  const fuera = new Set(['SCRIPT','STYLE','NOSCRIPT','SVG','PATH','IMG','BR','HR','OPTION']);
  const malos = [];
  for (const el of document.querySelectorAll('body *')) {
    if (fuera.has(el.tagName)) continue;
    const propio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!propio) continue;
    // cabecera, menu y pie los fija la hoja de rediseño: no se tocan aqui
    if (el.closest('#site-header, #top-bar-wrap, #footer, #scroll-top, #mobile-dropdown, #searchform-dropdown')) continue;
    const caja = el.closest('[data-id]');
    if (!caja) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) < 0.1) continue;
    const f = await fondoDe(el);
    if (f.imagen) continue;
    const c = rgb(s.color); if (!c) continue;
    const texto = mezcla(c, f.color);
    const r = ratio(texto, f.color);
    const grande = parseFloat(s.fontSize) >= 24 ||
      (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700);
    if (r >= (grande ? 3 : 4.5)) continue;
    const clases = (el.className || '').toString().split(/\s+/)
      .filter((x) => x && !/^elementor-invisible$/.test(x)).slice(0, 2);
    malos.push({
      selector: `[data-id="${caja.getAttribute('data-id')}"] ` +
                el.tagName.toLowerCase() + (clases.length ? '.' + clases.join('.') : ''),
      rgbTexto: texto, rgbFondo: f.color,
      contraste: Math.round(r * 100) / 100,
      minimo: grande ? 3 : 4.5,
      texto: el.textContent.trim().slice(0, 70),
    });
  }
  return malos;
};

/* ---------------------------------------------------------------- */
/* Recorrido                                                         */
/* ---------------------------------------------------------------- */
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 1400, height: 1000 } });
const pg = await ctx.newPage();

const todos = [];
let n = 0;
for (const p of paginas) {
  n += 1;
  try {
    await pg.goto(`http://localhost:${PUERTO}${p.ruta}`, { waitUntil: 'load', timeout: 30000 });
    // se apaga la hoja generada, o estariamos midiendo la pagina YA corregida
    await pg.evaluate(() => {
      for (const l of document.querySelectorAll('link[href*="contraste.css"]')) l.disabled = true;
    });
    await pg.waitForTimeout(250);
    const malos = await pg.evaluate(MIRA);
    for (const m of malos) todos.push({ ...m, pagina: p.slug || '(portada)', idPagina: p.id });
    if (n % 10 === 0 || n === paginas.length) console.log(`   ${n}/${paginas.length}`);
  } catch (e) {
    console.log(`   AVISO: no se ha podido abrir ${p.ruta} (${e.message.split('\n')[0]})`);
  }
}
await nav.close();
srv.close();

/* ---------------------------------------------------------------- */
/* El arreglo: se oscurece (o aclara) el MISMO color hasta que se lee */
/* ---------------------------------------------------------------- */
const TINTA = [22, 23, 27], BLANCO = [255, 255, 255];
const lum = ([r,g,b]) => { const f=(c)=>{c/=255;return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4;};
  return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
const razon = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
const aHsl = ([r,g,b]) => { r/=255;g/=255;b/=255; const mx=Math.max(r,g,b),mn=Math.min(r,g,b);
  let h=0,s=0; const l=(mx+mn)/2;
  if(mx!==mn){const d=mx-mn; s=l>0.5?d/(2-mx-mn):d/(mx+mn);
    h = mx===r ? (g-b)/d+(g<b?6:0) : mx===g ? (b-r)/d+2 : (r-g)/d+4; h/=6;}
  return [h,s,l]; };
const aRgb = ([h,s,l]) => { const f=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;
  if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p;};
  if(!s) return [l,l,l].map((x)=>Math.round(x*255));
  const q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q;
  return [f(p,q,h+1/3),f(p,q,h),f(p,q,h-1/3)].map((x)=>Math.round(x*255)); };

const corrige = (texto, fondo, minimo) => {
  const objetivo = Math.max(minimo, 4.5);
  const [h, s, l0] = aHsl(texto);
  if (s >= 0.08) {                       // tiene tono: se conserva, solo cambia el brillo
    const oscurecer = lum(fondo) > 0.45;
    for (let i = 1; i <= 100; i++) {
      const l = oscurecer ? Math.max(0, l0 - i/100) : Math.min(1, l0 + i/100);
      const c = aRgb([h, s, l]);
      if (razon(c, fondo) >= objetivo) return c;
    }
  }
  const c = razon(TINTA, fondo) >= razon(BLANCO, fondo) ? TINTA : BLANCO;
  return razon(c, fondo) >= 3 ? c : null;
};
const igual = (a,b) => a && b && a[0]===b[0] && a[1]===b[1] && a[2]===b[2];
const hex = (c) => '#' + c.map((x) => x.toString(16).padStart(2,'0')).join('');

const reglas = new Map(); const sinArreglo = []; const porPagina = new Map();
for (const m of todos) {
  porPagina.set(m.pagina, (porPagina.get(m.pagina) || 0) + 1);
  const clave = `${m.idPagina}|${m.selector}`;
  if (reglas.has(clave)) continue;
  const nuevo = corrige(m.rgbTexto, m.rgbFondo, m.minimo);
  if (!nuevo) { sinArreglo.push({ ...m, motivo: 'ni el negro ni el blanco se leen sobre ese fondo' }); continue; }
  if (igual(nuevo, m.rgbTexto)) { sinArreglo.push({ ...m, motivo: 'al limite (4,0-4,5); se deja como esta' }); continue; }
  reglas.set(clave, { ...m, nuevo });
}

const css = [...reglas.values()].map((m) =>
  `/* ${m.pagina}  ${m.contraste}:1 -> ${Math.round(razon(m.nuevo, m.rgbFondo)*100)/100}:1   ` +
  `"${m.texto.replace(/\*\//g, '')}" */\n` +
  `body.page-id-${m.idPagina} ${m.selector}{color:${hex(m.nuevo)} !important}`);

fs.writeFileSync(path.join(RAIZ, 'public', 'contraste.css'),
  '/* Generado por scripts/20-contraste.mjs. No editar a mano: se reescribe. */\n\n' +
  css.join('\n\n') + '\n');

fs.mkdirSync(path.join(RAIZ, 'informes'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'informes', 'contraste.md'),
  `# Texto invisible\n\n` +
  `Paginas revisadas: **${paginas.length}**\n\n` +
  `| | |\n|---|---|\n` +
  `| Textos que no se leian | ${todos.length} |\n` +
  `| Reglas de arreglo escritas | ${reglas.size} |\n` +
  `| Casos sin arreglar | ${sinArreglo.length} |\n\n` +
  (sinArreglo.length
    ? `## Sin arreglar — hay que mirarlos\n\n` +
      [...new Map(sinArreglo.map((x) => [x.selector + x.motivo, x])).values()]
        .map((x) => `- \`${x.pagina}\` **${x.contraste}:1** \`${x.selector}\` — ${x.motivo}\n  - "${x.texto}"`)
        .join('\n') + '\n\n'
    : '') +
  `## Por pagina\n\n` +
  [...porPagina.entries()].sort((a,b)=>b[1]-a[1]).slice(0,40)
    .map(([p,c]) => `- ${p}: ${c}`).join('\n') + '\n');

console.log(`\nTextos que no se leian : ${todos.length}`);
console.log(`Reglas escritas        : ${reglas.size}   -> public/contraste.css`);
console.log(`Sin arreglar           : ${sinArreglo.length}   -> informes/contraste.md`);
console.log('\nAhora hay que volver a construir:  npm run build');
