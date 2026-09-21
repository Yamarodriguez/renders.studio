/**
 * COMPROBACION 3 — TEXTO QUE NO SE LEE (y su arreglo)
 *
 * Abre cada pagina ya construida en un navegador de verdad y, para cada
 * texto, averigua el fondo REAL que tiene debajo. Sube por los padres
 * componiendo todas las capas:
 *   - el fondo del propio elemento
 *   - el ::before de los contenedores nuevos de Elementor (.e-con), que es
 *     donde pintan su color
 *   - la veladura .elementor-background-overlay, que es HERMANA del
 *     contenido y no padre; sin contarla, una tarjeta con foto y velo
 *     negro parece "blanco sobre blanco"
 *
 * DOS CASOS, DOS ARREGLOS DISTINTOS:
 *
 *   A) Fondo plano y el texto no contrasta  -> se cambia el color del
 *      texto, oscureciendo o aclarando EL MISMO tono. Un rotulo dorado
 *      sigue dorado, solo mas oscuro.
 *
 *   B) Fondo de FOTO con letra clara y poco velo -> NO se toca el texto.
 *      Sobre una foto, poner el texto oscuro lo destroza. Lo que se hace
 *      es dar cuerpo al velo que ya existe, con un degradado, para que el
 *      texto tenga cama y la foto siga viendose.
 *
 * Y UNA REGLA QUE COSTO UNA RONDA ENTERA:
 *   si una imagen de fondo NO carga, no se sabe que hay debajo. En ese
 *   caso NO se arregla nada y se apunta como fichero que falta. Dar por
 *   hecho que "no hay imagen, luego es blanco" fue lo que puso el
 *   titular de la portada en negro encima de un render.
 *
 * Salidas:
 *   public/contraste.css    las reglas
 *   informes/contraste.md   el parte
 *
 * Se ejecuta DESPUES de "npm run build", y luego hay que volver a
 * construir para que la hoja entre en dist/.
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

const TIPOS = { '.html':'text/html;charset=utf-8','.css':'text/css','.js':'text/javascript',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.webp':'image/webp','.svg':'image/svg+xml','.gif':'image/gif','.ico':'image/x-icon',
  '.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.eot':'application/vnd.ms-fontobject' };

const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(DIST, u);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => srv.listen(PUERTO, r));

const paginas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos', 'paginas.json'), 'utf8'))
  .map((p) => ({ slug: p.slug, id: p.id, ruta: p.ruta || (p.slug ? `/${p.slug}/` : '/') }))
  .filter((p) => (RAPIDO ? MUESTRA.includes(p.slug) : true));

console.log(`Comprobando ${paginas.length} paginas...`);

/* ================================================================== */
/*  La medida, dentro del navegador                                    */
/* ================================================================== */
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
  const mezcla = (fg,bg) => { const a=fg[3]??1; return [0,1,2].map((i)=>Math.round(fg[i]*a+bg[i]*(1-a))); };
  const urlDe = (bi) => { const u = String(bi).match(/url\(["']?([^)"']+)/); return u ? u[1] : null; };

  const fondoDe = async (el) => {
    const capasTotal = [];          // de arriba (cerca del texto) hacia abajo
    let n = el;
    while (n && n !== document.documentElement) {
      const s = getComputedStyle(n);
      const delNivel = [];
      let foto = null, rota = null;

      const mira = async (est) => {
        const bi = est.backgroundImage;
        if (bi && bi !== 'none') {
          if (/gradient/.test(bi)) { foto = foto || { gradiente: true }; return; }
          const u = urlDe(bi);
          if (u) { if (await carga(u)) foto = foto || { url: u }; else rota = rota || u; }
        }
        const c = rgb(est.backgroundColor);
        const op = Number(est.opacity);
        if (c && (c[3] ?? 1) > 0.01)
          delNivel.push([c[0], c[1], c[2], (c[3] ?? 1) * (isNaN(op) ? 1 : op)]);
      };

      await mira(s);
      for (const ps of ['::before', '::after']) {
        const sp = getComputedStyle(n, ps);
        if (sp && sp.content !== 'none') await mira(sp);
      }
      for (const ov of n.children) {
        const cl = (ov.className || '').toString();
        if (/elementor-background-overlay|elementor-background-slideshow/.test(cl)) await mira(getComputedStyle(ov));
      }

      if (rota && !foto) return { roto: rota };          // no se sabe: no se toca
      if (foto) {
        // velo acumulado por encima de la foto
        const velos = [...delNivel, ...capasTotal];
        let libre = 1;
        for (const L of velos) libre *= (1 - L[3]);
        const caja = n.closest('[data-id]');
        return { foto: true, gradiente: !!foto.gradiente,
                 velo: Math.round((1 - libre) * 100) / 100,
                 seccion: caja ? caja.getAttribute('data-id') : null,
                 conOverlay: !!n.querySelector(':scope > .elementor-background-overlay'),
                 rect: n.getBoundingClientRect().toJSON() };
      }

      capasTotal.push(...delNivel);
      if (delNivel.some((L) => L[3] >= 0.99)) break;
      n = n.parentElement;
    }
    let base = [255, 255, 255];
    for (const L of capasTotal.reverse())
      base = [0,1,2].map((i) => Math.round(L[i]*L[3] + base[i]*(1-L[3])));
    return { color: base };
  };

  const fuera = new Set(['SCRIPT','STYLE','NOSCRIPT','SVG','PATH','IMG','BR','HR','OPTION']);
  const planos = [], sobreFoto = [], rotos = [];

  for (const el of document.querySelectorAll('body *')) {
    if (fuera.has(el.tagName)) continue;
    const propio = [...el.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim().length > 1);
    if (!propio) continue;
    // cabecera, menu y pie los fija la hoja de disenno: aqui no se tocan
    if (el.closest('#site-header, #top-bar-wrap, #footer, #scroll-top, #mobile-dropdown, #searchform-dropdown')) continue;
    const caja = el.closest('[data-id]');
    if (!caja) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) < 0.1) continue;
    const c = rgb(s.color); if (!c) continue;

    const f = await fondoDe(el);
    const clases = (el.className || '').toString().split(/\s+/)
      .filter((x) => x && !/^elementor-invisible$/.test(x)).slice(0, 2);
    const selector = `[data-id="${caja.getAttribute('data-id')}"] ` +
      el.tagName.toLowerCase() + (clases.length ? '.' + clases.join('.') : '');
    const texto = el.textContent.trim().slice(0, 70);

    if (f.roto) { rotos.push({ fichero: f.roto, selector, texto }); continue; }

    if (f.foto) {
      // letra clara sobre foto con poco velo: no se toca el texto, se da
      // cuerpo al velo. Si la letra es oscura sobre foto, tambien avisa.
      const claro = lum([c[0], c[1], c[2]]) > 0.6;
      if (!f.seccion || f.gradiente) continue;
      if (claro && f.velo < 0.32) {
        const r = el.getBoundingClientRect();
        const centro = f.rect.width ? (r.left + r.width/2 - f.rect.left) / f.rect.width : 0.5;
        sobreFoto.push({ seccion: f.seccion, velo: f.velo, conOverlay: f.conOverlay,
                         lado: centro < 0.55 ? 'izquierda' : 'centro', texto });
      }
      continue;
    }

    const mez = mezcla(c, f.color);
    const r = ratio(mez, f.color);
    const grande = parseFloat(s.fontSize) >= 24 ||
      (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700);
    if (r >= (grande ? 3 : 4.5)) continue;
    planos.push({ selector, rgbTexto: mez, rgbFondo: f.color,
                  contraste: Math.round(r*100)/100, minimo: grande ? 3 : 4.5, texto });
  }
  return { planos, sobreFoto, rotos };
};

/* ================================================================== */
/*  Recorrido                                                          */
/* ================================================================== */
const nav = await chromium.launch();
const pg = await (await nav.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();

const TODO = { planos: [], sobreFoto: [], rotos: [] };
let i = 0;
for (const p of paginas) {
  i += 1;
  try {
    await pg.goto(`http://localhost:${PUERTO}${p.ruta}`, { waitUntil: 'load', timeout: 30000 });
    // se apaga la hoja generada o estariamos midiendo la pagina YA corregida
    await pg.evaluate(() => {
      for (const l of document.querySelectorAll('link[href*="contraste.css"]')) l.disabled = true;
    });
    await pg.waitForTimeout(250);
    const r = await pg.evaluate(MIRA);
    for (const k of ['planos','sobreFoto','rotos'])
      for (const m of r[k]) TODO[k].push({ ...m, pagina: p.slug || '(portada)', idPagina: p.id });
    if (i % 10 === 0 || i === paginas.length) console.log(`   ${i}/${paginas.length}`);
  } catch (e) {
    console.log(`   AVISO: no se ha podido abrir ${p.ruta} (${e.message.split('\n')[0]})`);
  }
}
await nav.close();
srv.close();

/* ================================================================== */
/*  A) Texto sobre fondo plano: se corrige el color                    */
/* ================================================================== */
const TINTA = [22,23,27], BLANCO = [255,255,255];
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
  if (s >= 0.08) {
    const oscurecer = lum(fondo) > 0.45;
    for (let k = 1; k <= 100; k++) {
      const l = oscurecer ? Math.max(0, l0 - k/100) : Math.min(1, l0 + k/100);
      const c = aRgb([h, s, l]);
      if (razon(c, fondo) >= objetivo) return c;
    }
  }
  const c = razon(TINTA, fondo) >= razon(BLANCO, fondo) ? TINTA : BLANCO;
  return razon(c, fondo) >= 3 ? c : null;
};
const igual = (a,b) => a && b && a[0]===b[0] && a[1]===b[1] && a[2]===b[2];
const hex = (c) => '#' + c.map((x) => x.toString(16).padStart(2,'0')).join('');

const reglas = new Map(), sinArreglo = [];
for (const m of TODO.planos) {
  const clave = `${m.idPagina}|${m.selector}`;
  if (reglas.has(clave)) continue;
  const nuevo = corrige(m.rgbTexto, m.rgbFondo, m.minimo);
  if (!nuevo) { sinArreglo.push({ ...m, motivo: 'ni el negro ni el blanco se leen sobre ese fondo' }); continue; }
  if (igual(nuevo, m.rgbTexto)) { sinArreglo.push({ ...m, motivo: 'al limite (4,0-4,5); se deja' }); continue; }
  reglas.set(clave, { ...m, nuevo });
}

/* ================================================================== */
/*  B) Texto claro sobre foto: se da cuerpo al velo                    */
/* ================================================================== */
const velos = new Map();
for (const m of TODO.sobreFoto) {
  const clave = `${m.idPagina}|${m.seccion}`;
  const y = velos.get(clave);
  if (!y || m.velo < y.velo) velos.set(clave, m);
}

const cssVelo = [...velos.values()].map((m) => {
  const grad = m.lado === 'izquierda'
    ? 'linear-gradient(95deg, rgba(8,9,12,.34) 0%, rgba(8,9,12,.18) 40%, rgba(8,9,12,0) 70%)'
    : 'linear-gradient(180deg, rgba(8,9,12,.16) 0%, rgba(8,9,12,.38) 100%)';
  const sel = `body.page-id-${m.idPagina} [data-id="${m.seccion}"]`;
  return `/* ${m.pagina}: foto de fondo con velo de solo ${m.velo}; la letra clara se perdia.\n` +
         `   "${m.texto.replace(/\*\//g,'')}" */\n` +
         (m.conOverlay
           ? `${sel} > .elementor-background-overlay{background-image:${grad} !important;background-color:transparent !important;opacity:1 !important}`
           : `${sel}{position:relative}\n` +
             `${sel} > .elementor-container, ${sel} > .e-con-inner{position:relative;z-index:1}\n` +
             `${sel}::after{content:"";position:absolute;inset:0;pointer-events:none;background-image:${grad};z-index:0}`);
});

const cssColor = [...reglas.values()].map((m) =>
  `/* ${m.pagina}  ${m.contraste}:1 -> ${Math.round(razon(m.nuevo,m.rgbFondo)*100)/100}:1   ` +
  `"${m.texto.replace(/\*\//g,'')}" */\n` +
  `body.page-id-${m.idPagina} ${m.selector}{color:${hex(m.nuevo)} !important}`);

fs.writeFileSync(path.join(RAIZ, 'public', 'contraste.css'),
  '/* Generado por scripts/20-contraste.mjs. No editar a mano: se reescribe. */\n\n' +
  '/* --- Texto claro sobre foto: se refuerza el velo --- */\n\n' + cssVelo.join('\n\n') +
  '\n\n/* --- Texto sobre fondo plano: se corrige el color --- */\n\n' + cssColor.join('\n\n') + '\n');

const rotos = [...new Map(TODO.rotos.map((r) => [r.fichero, r])).values()];

fs.mkdirSync(path.join(RAIZ, 'informes'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'informes', 'contraste.md'),
  `# Texto que no se lee\n\nPaginas revisadas: **${paginas.length}**\n\n` +
  `| | |\n|---|---|\n` +
  `| Textos sobre fondo plano corregidos | ${reglas.size} |\n` +
  `| Secciones con foto a las que se les reforzo el velo | ${velos.size} |\n` +
  `| Casos al limite, sin tocar | ${sinArreglo.length} |\n` +
  `| Imagenes de fondo que NO cargan | ${rotos.length} |\n\n` +
  (rotos.length
    ? `## Imagenes de fondo que faltan\n\n` +
      `Aqui no se ha tocado nada: sin la imagen no se sabe que hay debajo del\n` +
      `texto. **Hay que reponer estos ficheros** y volver a pasar la comprobacion.\n\n` +
      rotos.map((r) => `- \`${r.fichero}\`\n  - afecta a: "${r.texto}"`).join('\n') + '\n\n'
    : '') +
  (sinArreglo.length
    ? `## Al limite, sin tocar\n\n` +
      [...new Map(sinArreglo.map((x) => [x.selector + x.motivo, x])).values()].slice(0, 60)
        .map((x) => `- \`${x.pagina}\` **${x.contraste}:1** \`${x.selector}\` — ${x.motivo}`).join('\n') + '\n'
    : ''));

console.log(`\nColor corregido (fondo plano) : ${reglas.size}`);
console.log(`Velo reforzado (sobre foto)   : ${velos.size}`);
console.log(`Al limite, sin tocar          : ${sinArreglo.length}`);
console.log(`IMAGENES QUE NO CARGAN        : ${rotos.length}${rotos.length ? '   <-- mirar informes/contraste.md' : ''}`);
console.log('\nAhora hay que volver a construir:  npm run build');
