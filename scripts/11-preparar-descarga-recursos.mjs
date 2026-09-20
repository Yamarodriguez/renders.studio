/**
 * PASO 11 - Prepara la descarga de hojas de estilo y JavaScript.
 *
 * Se bajan a public/ CONSERVANDO SU RUTA, para que la web nueva los cargue
 * igual que la vieja: /wp-content/themes/oceanwp/assets/css/style.min.css
 * sigue estando en esa direccion.
 *
 * Lee:   datos/recursos.json  (lo genera el paso 10)
 * Deja:  descargas/curl-recursos.txt
 *
 * Uso:   node scripts/11-preparar-descarga-recursos.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const DOMINIO = 'https://renders.studio';

const r = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos', 'recursos.json'), 'utf8'));
fs.mkdirSync(path.join(RAIZ, 'descargas'), { recursive: true });

const lineas = [];
const puestos = new Set();
let saltados = 0;

function pide(url) {
  if (!url.startsWith(DOMINIO + '/')) {
    saltados++;
    return;
  }
  const rel = decodeURIComponent(url.slice(DOMINIO.length + 1).split('?')[0]);
  // solo ficheros de verdad, no paginas
  if (!/\.[a-z0-9]{2,5}$/i.test(rel)) {
    saltados++;
    return;
  }
  if (rel.includes('..') || puestos.has(rel)) return;
  puestos.add(rel);
  lineas.push(`url = "${url}"`);
  lineas.push(`output = "public/${rel}"`);
}

[...r.hojas, ...r.scripts, ...r.otros].forEach(pide);

fs.writeFileSync(path.join(RAIZ, 'descargas', 'curl-recursos.txt'), lineas.join('\n') + '\n');

console.log('--- Lista de recursos preparada ---');
console.log(`ficheros a bajar : ${puestos.size}`);
console.log(`descartados      : ${saltados} (de fuera o no son ficheros)`);
console.log('fichero          : descargas/curl-recursos.txt');
