/**
 * PASO 9 - Prepara la descarga del HTML de LAS 145 paginas.
 *
 * Hasta ahora teniamos 13 paginas de muestra. Con las 145 podemos:
 *   - comparar los encabezados (H1/H2/H3) de todas, no de una muestra
 *   - capturar las tres piezas que genera un plugin y no se pueden calcular
 *     (galeria, formulario y mapa) en todas las paginas donde salen
 *   - medir la geometria contra la pagina real que toque
 *
 * Son unos 55 MB en total.
 *
 * Lee:   datos/paginas.json
 * Deja:  descargas/curl-html-todo.txt
 *
 * Uso:   node scripts/09-preparar-descarga-html.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const DOMINIO = 'https://renders.studio';

const paginas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos', 'paginas.json'), 'utf8'));
fs.mkdirSync(path.join(RAIZ, 'descargas'), { recursive: true });

const lineas = [];
for (const p of paginas) {
  lineas.push(`url = "${DOMINIO}${p.ruta}"`);
  lineas.push(`output = "referencia/html-todo/${p.slug}.html"`);
}
fs.writeFileSync(path.join(RAIZ, 'descargas', 'curl-html-todo.txt'), lineas.join('\n') + '\n');

console.log('--- Lista preparada ---');
console.log(`paginas a descargar : ${paginas.length}`);
console.log('fichero             : descargas/curl-html-todo.txt');
console.log('\nAhora ejecuta:  descargas\\06-descargar-todo-el-html.cmd');
