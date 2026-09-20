/**
 * PASO 5 - Comprueba que existe la hoja propia de cada pagina.
 *
 * Elementor NO guarda el CSS de una pagina hasta que alguien la visita: lo
 * genera al vuelo y lo deja en /wp-content/uploads/elementor/css/post-{ID}.css.
 * Si nadie ha entrado en esa pagina desde el ultimo cambio, el fichero no
 * existe y la descarga trae una pagina de error de 196 bytes.
 *
 * Este script separa:
 *   - las que estan bien
 *   - las que faltan y HAY que recuperar (paginas con Elementor)
 *   - las que faltan y da igual (las 4 legales, que no usan Elementor)
 *
 * Y deja preparadas las dos listas para arreglarlo:
 *   descargas/curl-visitas.txt        -> visitar esas paginas para que Elementor
 *                                        genere su CSS
 *   descargas/curl-css-faltantes.txt  -> volver a descargar solo las que faltaban
 *
 * Uso:   node scripts/05-revisar-css-de-paginas.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const CSS = path.join(RAIZ, 'referencia', 'css', 'paginas');
const DOMINIO = 'https://renders.studio';

if (!fs.existsSync(CSS)) {
  console.error(`ERROR: no encuentro ${CSS}`);
  console.error('Ejecuta antes (doble clic):  descargas\\03-descargar-css.cmd');
  process.exit(1);
}

const paginas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos', 'paginas.json'), 'utf8'));

/** Un fichero vale si existe, pesa algo y no es una pagina de error. */
function estaBien(ruta) {
  if (!fs.existsSync(ruta)) return false;
  const t = fs.statSync(ruta).size;
  if (t < 400) return false;
  const cabeza = fs.readFileSync(ruta, 'utf8').slice(0, 200).toLowerCase();
  if (cabeza.includes('<!doctype') || cabeza.includes('404 not found')) return false;
  return true;
}

const bien = [];
const faltanImportantes = [];
const faltanSinImportancia = [];

for (const p of paginas) {
  const post = path.join(CSS, `post-${p.id}.css`);
  const eael = path.join(CSS, `eael-${p.id}.css`);
  const okPost = estaBien(post);
  const okEael = estaBien(eael);

  if (p.conElementor) {
    if (okPost) bien.push(p.slug);
    else faltanImportantes.push({ ...p, que: 'post' });
    // eael solo hace falta si la pagina lleva el formulario; si no esta, no pasa nada
    if (!okEael && okPost) {
      // no es bloqueante, se apunta y ya
    }
  } else {
    if (!okPost) faltanSinImportancia.push(p.slug);
  }
}

// --- listas para arreglarlo ----------------------------------------------
fs.mkdirSync(path.join(RAIZ, 'descargas'), { recursive: true });

const visitas = [];
const rescate = [];
for (const p of faltanImportantes) {
  visitas.push(`url = "${DOMINIO}${p.ruta}"`);
  visitas.push(`output = "NUL"`);
  rescate.push(`url = "${DOMINIO}/wp-content/uploads/elementor/css/post-${p.id}.css"`);
  rescate.push(`output = "referencia/css/paginas/post-${p.id}.css"`);
  rescate.push(`url = "${DOMINIO}/wp-content/uploads/essential-addons-elementor/eael-${p.id}.css"`);
  rescate.push(`output = "referencia/css/paginas/eael-${p.id}.css"`);
}
fs.writeFileSync(path.join(RAIZ, 'descargas', 'curl-visitas.txt'), visitas.join('\n') + '\n');
fs.writeFileSync(path.join(RAIZ, 'descargas', 'curl-css-faltantes.txt'), rescate.join('\n') + '\n');

console.log('--- Hojas propias de pagina ---');
console.log(`paginas con Elementor     : ${paginas.filter((p) => p.conElementor).length}`);
console.log(`con su hoja descargada    : ${bien.length}`);
console.log(`SIN su hoja (hay que ir)  : ${faltanImportantes.length}`);
console.log(`sin hoja y da igual       : ${faltanSinImportancia.length}  (${faltanSinImportancia.join(', ')})`);

if (faltanImportantes.length) {
  console.log('\nLes falta la hoja a estas paginas:');
  console.log('  ' + faltanImportantes.map((p) => p.slug).join(', '));
  console.log('\nEs normal: Elementor genera el CSS de una pagina la primera vez');
  console.log('que alguien entra en ella. Hay que visitarlas y volver a descargar.');
  console.log('\nEjecuta ahora:  descargas\\05-recuperar-css-faltante.cmd');
} else {
  console.log('\nTodas las paginas con Elementor tienen su hoja. Nada que hacer.');
}
