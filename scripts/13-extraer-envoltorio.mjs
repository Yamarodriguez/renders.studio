/**
 * PASO 13 - Saca el envoltorio del contenido.
 *
 * Entre la cabecera y las secciones de Elementor hay varias capas que pone el
 * tema: <main>, #content-wrap, #primary, #content, <article>, .entry y el div
 * .elementor. Tambien se copian, no se inventan.
 *
 * Se guarda con dos huecos:
 *   {{ID}}          -> el numero de la pagina
 *   {{CONTENIDO}}   -> donde van las secciones
 *
 * Y se comprueba que el envoltorio es el MISMO en todas las paginas.
 *
 * Lee:   referencia/html-todo/*.html
 * Deja:  datos/armazon/envoltorio.html         (paginas de Elementor)
 *        datos/armazon/envoltorio-legal.html   (las 4 paginas legales)
 *        datos/armazon/envoltorio.json
 *
 * Uso:   node scripts/13-extraer-envoltorio.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { paginasDeReferencia } from './lib/referencia.mjs';

const RAIZ = process.cwd();
const SALIDA = path.join(RAIZ, 'datos', 'armazon');
fs.mkdirSync(SALIDA, { recursive: true });

const { mapa: paginasReales } = paginasDeReferencia(RAIZ);
const paginas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos', 'paginas.json'), 'utf8'));
const porSlug = Object.fromEntries(paginas.map((p) => [p.slug, p]));

const avisos = [];
const conElementor = {};
const legales = {};

for (const [slug, ruta] of Object.entries(paginasReales)) {
  const p = porSlug[slug];
  if (!p) continue;
  const html = fs.readFileSync(ruta, 'utf8');
  const root = parse(html);
  const main = root.querySelector('#main');
  if (!main) {
    avisos.push(`${slug}: no encuentro <main id="main">`);
    continue;
  }

  const elem = main.querySelector('[data-elementor-type]');
  if (elem) {
    // se vacia el div de Elementor y se deja el hueco
    const entero = main.toString();
    const dentro = elem.innerHTML;
    const plantilla = entero
      .replace(dentro, '{{CONTENIDO}}')
      .replaceAll(`data-elementor-id="${p.id}"`, 'data-elementor-id="{{ID}}"')
      .replaceAll(`elementor elementor-${p.id}`, 'elementor elementor-{{ID}}');
    (conElementor[plantilla] ||= []).push(slug);
  } else {
    // pagina legal: el contenido es el del <article>
    const art = main.querySelector('article');
    const entero = main.toString();
    const dentro = art ? art.innerHTML : '';
    const plantilla = dentro ? entero.replace(dentro, '{{CONTENIDO}}') : entero;
    (legales[plantilla] ||= []).push(slug);
  }
}

function guarda(grupos, fichero, nombre) {
  const orden = Object.entries(grupos).sort((a, b) => b[1].length - a[1].length);
  if (!orden.length) {
    avisos.push(`No he podido sacar el envoltorio de ${nombre}`);
    return null;
  }
  const [plantilla, slugs] = orden[0];
  fs.writeFileSync(path.join(SALIDA, fichero), plantilla);
  if (orden.length > 1) {
    for (const [, otros] of orden.slice(1)) {
      avisos.push(`El envoltorio de ${nombre} NO es igual en: ${otros.slice(0, 8).join(', ')}${otros.length > 8 ? '...' : ''}`);
    }
  }
  return { fichero, paginas: slugs.length, variantes: orden.length, caracteres: plantilla.length };
}

const a = guarda(conElementor, 'envoltorio.html', 'las paginas de Elementor');
const b = guarda(legales, 'envoltorio-legal.html', 'las paginas legales');

fs.writeFileSync(
  path.join(SALIDA, 'envoltorio.json'),
  JSON.stringify({ fecha: new Date().toISOString(), elementor: a, legal: b, avisos }, null, 1)
);

console.log('--- Envoltorio del contenido ---');
if (a) console.log(`paginas de Elementor : ${a.paginas} iguales, ${a.caracteres} caracteres`);
if (b) console.log(`paginas legales      : ${b.paginas} iguales, ${b.caracteres} caracteres`);
if (avisos.length) {
  console.log('\nAVISOS:');
  avisos.forEach((x) => console.log('  - ' + x));
} else {
  console.log('\nSin avisos: el envoltorio es el mismo en todas.');
}
