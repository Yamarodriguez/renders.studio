/**
 * PASO 10 - Captura la cabecera (<head>) y los scripts de cada pagina.
 *
 * La cabecera de la web real lleva el titulo, las etiquetas de SEO, las hojas
 * de estilo EN SU ORDEN y varios bloques de estilo escritos dentro del HTML.
 * Todo eso no se inventa: se copia.
 *
 * Los scripts tambien importan, y mucho: los bloques marcados con
 * "elementor-invisible" estan OCULTOS hasta que el JavaScript de Elementor
 * lanza su animacion. Sin ese fichero, media web no se ve.
 *
 * Lee:   referencia/html-todo/*.html  (o la muestra, si no esta)
 * Deja:  datos/cabecera/<slug>.json   (una por pagina)
 *        datos/recursos.json          (todo lo que hay que descargar)
 *
 * Uso:   node scripts/10-capturar-cabecera.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { paginasDeReferencia } from './lib/referencia.mjs';

const RAIZ = process.cwd();
const DATOS = path.join(RAIZ, 'datos');
const DOMINIO = 'https://renders.studio';

const { mapa: paginasReales, completa } = paginasDeReferencia(RAIZ);
if (!Object.keys(paginasReales).length) {
  console.error('ERROR: no encuentro el HTML de la web real.');
  process.exit(1);
}

fs.mkdirSync(path.join(DATOS, 'cabecera'), { recursive: true });

const hojas = new Set(); // hojas de estilo distintas
const scripts = new Set(); // ficheros de javascript distintos
const otros = new Set(); // iconos del sitio, manifiestos...
const avisos = [];

function absoluta(u) {
  if (!u) return u;
  if (u.startsWith('//')) return 'https:' + u;
  if (u.startsWith('/')) return DOMINIO + u;
  return u;
}

/** Trocea una zona del documento en la lista ordenada de lo que carga. */
function piezas(zona) {
  const out = [];
  for (const el of zona.childNodes) {
    if (el.nodeType !== 1) continue;
    const t = el.rawTagName.toLowerCase();
    if (t === 'link') {
      const rel = (el.getAttribute('rel') || '').toLowerCase();
      const href = absoluta(el.getAttribute('href'));
      if (rel === 'stylesheet' && href) {
        hojas.add(href);
        out.push({ tipo: 'hoja', href, id: el.getAttribute('id') || null });
      } else {
        if (href && href.startsWith(DOMINIO)) otros.add(href);
        out.push({ tipo: 'link', html: el.toString() });
      }
    } else if (t === 'style') {
      out.push({ tipo: 'estilo', id: el.getAttribute('id') || null, css: el.innerHTML });
    } else if (t === 'script') {
      const src = absoluta(el.getAttribute('src'));
      if (src) {
        if (src.startsWith(DOMINIO)) scripts.add(src);
        out.push({ tipo: 'script', src, id: el.getAttribute('id') || null, extra: el.rawAttrs });
      } else {
        out.push({ tipo: 'scriptEnLinea', id: el.getAttribute('id') || null, js: el.innerHTML });
      }
    } else if (t === 'title') {
      out.push({ tipo: 'titulo', texto: el.innerHTML });
    } else if (t === 'meta') {
      out.push({ tipo: 'meta', html: el.toString() });
    } else if (t === 'noscript') {
      out.push({ tipo: 'noscript', html: el.toString() });
    }
  }
  return out;
}

let cuantas = 0;
for (const [slug, ruta] of Object.entries(paginasReales)) {
  const html = fs.readFileSync(ruta, 'utf8');
  const root = parse(html);
  const head = root.querySelector('head');
  const body = root.querySelector('body');
  if (!head || !body) {
    avisos.push(`${slug}: no encuentro <head> o <body>`);
    continue;
  }

  // los scripts del final del documento (los que van despues del pie)
  const alFinal = [];
  for (const el of body.childNodes) {
    if (el.nodeType !== 1) continue;
    const t = el.rawTagName.toLowerCase();
    if (t === 'script' || t === 'style' || t === 'noscript') {
      const src = absoluta(el.getAttribute('src'));
      if (src && src.startsWith(DOMINIO)) scripts.add(src);
      alFinal.push(
        src
          ? { tipo: 'script', src, id: el.getAttribute('id') || null, extra: el.rawAttrs }
          : t === 'script'
            ? { tipo: 'scriptEnLinea', id: el.getAttribute('id') || null, js: el.innerHTML }
            : { tipo: t === 'style' ? 'estilo' : 'noscript', id: el.getAttribute('id') || null, css: el.innerHTML, html: el.toString() }
      );
    }
  }

  const ficha = {
    slug,
    lang: /<html[^>]*lang\s*=\s*["']([^"']+)["']/i.exec(html)?.[1] || 'es-ES',
    bodyClass: /<body[^>]*class\s*=\s*["']([^"']+)["']/i.exec(html)?.[1] || '',
    cabeza: piezas(head),
    alFinal,
  };
  fs.writeFileSync(path.join(DATOS, 'cabecera', `${slug}.json`), JSON.stringify(ficha, null, 1));
  cuantas++;
}

const recursos = {
  fecha: new Date().toISOString(),
  hojas: [...hojas].sort(),
  scripts: [...scripts].sort(),
  otros: [...otros].sort(),
};
fs.writeFileSync(path.join(DATOS, 'recursos.json'), JSON.stringify(recursos, null, 1));

console.log('--- Cabeceras capturadas ---');
console.log(`paginas            : ${cuantas}${completa ? ' (todas)' : ' (solo la muestra)'}`);
console.log(`hojas distintas    : ${hojas.size}`);
console.log(`scripts distintos  : ${scripts.size}`);
console.log(`otros ficheros     : ${otros.size}`);
if (avisos.length) {
  console.log('\nAVISOS:');
  avisos.forEach((a) => console.log('  - ' + a));
}
console.log('\nEn: datos/cabecera/ y datos/recursos.json');
