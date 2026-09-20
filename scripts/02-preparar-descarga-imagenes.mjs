/**
 * PASO 2 - Prepara la descarga de las imagenes.
 *
 * No descarga nada: escribe una "lista de encargos" para curl, de forma que
 * una sola llamada a curl se baje las 1.600 imagenes reutilizando la conexion.
 * Lanzar un curl por imagen tardaria media hora; asi tarda unos minutos.
 *
 * Lee:   datos/lista-imagenes.txt   (lo genera el paso 1)
 * Deja:  descargas/curl-imagenes.txt
 *
 * Las imagenes conservan su ruta y su nombre: /wp-content/uploads/...
 * van a public/wp-content/uploads/... No se renombra nada: estan indexadas
 * en Google Imagenes.
 *
 * Uso:   node scripts/02-preparar-descarga-imagenes.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const LISTA = path.join(RAIZ, 'datos', 'lista-imagenes.txt');
const SALIDA = path.join(RAIZ, 'descargas', 'curl-imagenes.txt');
const DOMINIO = 'https://renders.studio';

if (!fs.existsSync(LISTA)) {
  console.error(`ERROR: no encuentro ${LISTA}`);
  console.error('Ejecuta antes:  node scripts/01-extraer-xml.mjs');
  process.exit(1);
}

const urls = fs
  .readFileSync(LISTA, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);

fs.mkdirSync(path.dirname(SALIDA), { recursive: true });

const lineas = [];
const yaVistas = new Set();
let saltadas = 0;

for (const url of urls) {
  if (!url.startsWith(DOMINIO + '/')) {
    saltadas++;
    continue;
  }
  const rel = decodeURIComponent(url.slice(DOMINIO.length + 1).split('?')[0]);
  if (rel.includes('..')) {
    saltadas++;
    continue;
  }
  if (yaVistas.has(rel)) continue;
  yaVistas.add(rel);
  // curl acepta un fichero de configuracion con pares url/output.
  lineas.push(`url = "${url}"`);
  lineas.push(`output = "public/${rel}"`);
}

fs.writeFileSync(SALIDA, lineas.join('\n') + '\n');

console.log('--- Lista de descarga preparada ---');
console.log(`imagenes a bajar : ${yaVistas.size}`);
console.log(`descartadas      : ${saltadas} (externas o con ruta rara)`);
console.log(`fichero          : descargas/curl-imagenes.txt`);
console.log('\nAhora ejecuta:  descargas\\02-descargar-imagenes.cmd');
