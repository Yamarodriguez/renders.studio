/**
 * PASO 4 - Saca el armazon de la web (lo que NO esta en Elementor).
 *
 * La barra superior, la cabecera con el megamenu, el pie y el boton de subir
 * los pinta el tema OceanWP, no Elementor: no estan en el XML. Asi que se
 * COPIAN del HTML de la web en vivo, tal cual, sin reescribir nada.
 *
 * OJO CON LA CABECERA: no hay una, hay SEIS. Cada pagina elige su menu con el
 * ajuste del tema `ocean_header_custom_menu`:
 *
 *    (sin ajuste) y 5 -> menu "Renders"            32 paginas
 *    6                -> menu "renders 2"          82 paginas
 *    7                -> menu "Renders Espana"     14 paginas
 *    8                -> menu "Renders Argentina"  12 paginas
 *    9                -> menu "Renders 3"           5 paginas
 *
 * Por eso hace falta una pagina de referencia descargada por cada menu.
 *
 * Lo unico que se toca del HTML es quitar las marcas de "pagina actual", para
 * poder ponerlas luego en la pagina que toque:
 *   - aria-current="page" en el enlace del logo (solo en la portada)
 *   - las clases current-menu-item / current_page_item / page_item page-item-{ID}
 *   - fetchpriority / loading, que WordPress pone segun la pagina
 *
 * Lee:   referencia/html/*.html  +  datos/paginas.json
 * Deja:  datos/armazon/barra-superior.html
 *        datos/armazon/cabecera-<menu>.html   (una por menu)
 *        datos/armazon/pie.html
 *        datos/armazon/scroll-top.html
 *        datos/armazon/armazon.json
 *
 * Uso:   node scripts/04-extraer-armazon.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { paginasDeReferencia } from './lib/referencia.mjs';

const RAIZ = process.cwd();
const HTML = path.join(RAIZ, 'referencia', 'html');
const SALIDA = path.join(RAIZ, 'datos', 'armazon');

/** El ajuste del tema -> el menu que sale en la cabecera. */
const MENUS = {
  '': 'renders',
  5: 'renders',
  6: 'renders-2',
  7: 'renders-espana',
  8: 'renders-argentina',
  9: 'renders-3',
  10: 'renders-sin-provincias',
};

const { mapa: ficherosReales } = paginasDeReferencia(RAIZ);
if (!Object.keys(ficherosReales).length) {
  console.error('ERROR: no encuentro el HTML de la web real.');
  console.error('Ejecuta antes (doble clic):  descargas\\01-descargar-html-referencia.cmd');
  process.exit(1);
}
fs.mkdirSync(SALIDA, { recursive: true });

const paginas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos', 'paginas.json'), 'utf8'));
const avisos = [];

/** El menu que le toca a una pagina. */
function menuDe(p) {
  const v = (p.ajustesOcean || {}).ocean_header_custom_menu || '';
  const m = MENUS[v];
  if (!m) {
    avisos.push(`La pagina ${p.slug} pide el menu ${v}, que no conozco`);
    return 'renders';
  }
  return m;
}

/**
 * Quita de un trozo de HTML las marcas que dependen de la pagina concreta,
 * para que sirva de plantilla en todas.
 */
function neutraliza(html) {
  return html
    .replace(/\s+aria-current="page"/g, '')
    .replace(/\s+fetchpriority="high"/g, '')
    .replace(/\s+loading="lazy"/g, '')
    // WordPress solo pone page_item page-item-{ID} en la entrada de la pagina
    // en la que estas, asi que tambien es una marca, no una clase fija
    .replace(/\s*page_item\s+page-item-\d+/g, '')
    .replace(/\s*current-menu-item/g, '')
    .replace(/\s*current_page_item/g, '')
    .replace(/\s*current-menu-ancestor/g, '')
    .replace(/\s*current-menu-parent/g, '')
    .replace(/\s*current_page_parent/g, '')
    .replace(/\s*current_page_ancestor/g, '');
}

// --- que pagina de referencia corresponde a cada slug ---------------------
// Que pagina es cada fichero se saca de la clase page-id-{ID} del <body>.
// El enlace canonico no vale: las paginas legales de Complianz no lo llevan,
// y entonces todas parecerian la portada.
const porSlug = {};
for (const [slug, ruta] of Object.entries(ficherosReales)) {
  porSlug[slug] = { fichero: path.basename(ruta), html: fs.readFileSync(ruta, 'utf8') };
}

// --- trozos que no dependen del menu -------------------------------------
const baseSlug = porSlug['renders'] ? 'renders' : Object.keys(porSlug)[0];
const raizBase = parse(porSlug[baseSlug].html);
const medidas = {};
for (const [nombre, sel] of Object.entries({
  'barra-superior': '#top-bar-wrap',
  pie: '#footer',
  'scroll-top': '#scroll-top',
})) {
  const el = raizBase.querySelector(sel);
  if (!el) {
    avisos.push(`No encuentro ${sel} en ${porSlug[baseSlug].fichero}`);
    continue;
  }
  const limpio = neutraliza(el.toString());
  fs.writeFileSync(path.join(SALIDA, `${nombre}.html`), limpio);
  medidas[nombre] = limpio.length;

  // el mismo en todas las paginas de referencia?
  for (const [slug, d] of Object.entries(porSlug)) {
    if (slug === baseSlug) continue;
    const otro = neutraliza(parse(d.html).querySelector(sel)?.toString() || '');
    if (otro !== limpio) avisos.push(`El trozo ${sel} NO es igual en ${d.fichero}`);
  }
}

// --- una cabecera por menu ------------------------------------------------
const cuantasPorMenu = {};
for (const p of paginas) {
  const m = menuDe(p);
  (cuantasPorMenu[m] ||= []).push(p.slug);
}

const cabeceras = {};
const menusSinReferencia = [];
for (const [menu, slugs] of Object.entries(cuantasPorMenu)) {
  // busca entre las paginas descargadas una que use este menu
  const candidato = slugs.find((s) => porSlug[s]);
  if (!candidato) {
    menusSinReferencia.push({ menu, paginas: slugs.length, ejemplos: slugs.slice(0, 5) });
    continue;
  }
  const el = parse(porSlug[candidato].html).querySelector('#site-header');
  if (!el) {
    avisos.push(`No encuentro #site-header en ${porSlug[candidato].fichero}`);
    continue;
  }
  const limpio = neutraliza(el.toString());
  fs.writeFileSync(path.join(SALIDA, `cabecera-${menu}.html`), limpio);

  // que menu aparece de verdad dentro? (comprobacion, no suposicion)
  const uls = parse(limpio)
    .querySelectorAll('ul[id^="menu-"]')
    .map((u) => u.getAttribute('id'));

  cabeceras[menu] = {
    sacadaDe: porSlug[candidato].fichero,
    slugReferencia: candidato,
    paginasQueLoUsan: slugs.length,
    caracteres: limpio.length,
    ulEncontrados: uls,
  };

  // comprobar contra las demas paginas descargadas que usan el mismo menu
  for (const s of slugs) {
    if (!porSlug[s] || s === candidato) continue;
    const otro = neutraliza(parse(porSlug[s].html).querySelector('#site-header')?.toString() || '');
    if (otro !== limpio) {
      avisos.push(`La cabecera de ${s} no coincide con la de ${candidato} y usan el mismo menu (${menu})`);
    }
  }
}

for (const m of menusSinReferencia) {
  avisos.push(
    `FALTA descargar una pagina con el menu "${m.menu}" (lo usan ${m.paginas} paginas, por ejemplo ${m.ejemplos.join(', ')})`
  );
}

// --- clases del <body> ----------------------------------------------------
const listas = Object.values(porSlug).map((d) =>
  (/<body[^>]*class\s*=\s*["']([^"']+)["']/i.exec(d.html)?.[1] || '').split(/\s+/)
);
const fijas = listas[0].filter((c) => listas.every((l) => l.includes(c)));
const variables = [...new Set(listas.flat().filter((c) => !fijas.includes(c)))];

const resumen = {
  fecha: new Date().toISOString(),
  paginasDeReferencia: Object.fromEntries(Object.entries(porSlug).map(([s, d]) => [s, d.fichero])),
  medidas,
  cabeceras,
  menusSinReferencia,
  reparto: Object.fromEntries(Object.entries(cuantasPorMenu).map(([m, s]) => [m, s.length])),
  menuPorPagina: Object.fromEntries(paginas.map((p) => [p.slug, menuDe(p)])),
  bodyClassFijas: fijas,
  bodyClassVariables: variables,
  avisos,
};
fs.writeFileSync(path.join(SALIDA, 'armazon.json'), JSON.stringify(resumen, null, 1));

console.log('--- Armazon extraido ---');
for (const [n, c] of Object.entries(medidas)) console.log(`${n.padEnd(16)}: ${c} caracteres`);
console.log('\nCabeceras (una por menu):');
for (const [m, d] of Object.entries(cabeceras)) {
  console.log(
    `  ${m.padEnd(22)} ${String(d.paginasQueLoUsan).padStart(3)} paginas  ${String(d.caracteres).padStart(6)} car  de ${d.sacadaDe}  [${d.ulEncontrados.join(', ')}]`
  );
}
console.log(`\nbody fijo    : ${fijas.join(' ')}`);
console.log(`body variable: ${variables.join(' ')}`);
if (avisos.length) {
  console.log('\nAVISOS:');
  avisos.forEach((a) => console.log('  - ' + a));
} else {
  console.log('\nSin avisos: el armazon esta completo y es coherente.');
}
console.log('\nTodo en: datos/armazon/');
