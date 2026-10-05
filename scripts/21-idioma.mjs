/**
 * PASO 21 - Comprobar el paso del texto a español de España.
 *
 * No escribe nada: pinta las 145 paginas en memoria con y sin las
 * correcciones de datos/erratas.json y dice
 *   - cuantas veces se aplica cada cambio
 *   - 5 ejemplos de antes y despues
 *   - que una segunda pasada no cambia nada
 *   - que formas de voseo quedan sin corregir
 *
 * Uso:  node scripts/21-idioma.mjs
 */

import { creaConstructor } from './lib/construir-pagina.mjs';
import { creaCorrector } from './lib/erratas.mjs';

const texto = (h) =>
  h
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

process.env.IDIOMA = 'original';
const sin = creaConstructor(process.cwd(), { modo: 'rediseno' });
delete process.env.IDIOMA;
const con = creaConstructor(process.cwd(), { modo: 'rediseno' });
const repaso = creaCorrector(process.cwd());

const ejemplos = [];
let tocadas = 0;
let segunda = 0;
const quedan = {};
// formas de voseo que se buscan DESPUES de corregir
const VOSEO = /(?<![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])(necesitás|tenés|querés|podés|contás|contactás|obtené|pedí|descubrí|completá|escribinos|contactanos|envianos|llamanos|sabés|buscás|hacé|mirá|elegí|consultá|solicitá|visitá|vos)(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ-])/gi;

for (const p of con.paginas) {
  const antes = sin.construye(p.slug);
  const despues = con.construye(p.slug);
  if (antes !== despues) tocadas++;
  if (repaso.corrige(despues) !== despues) segunda++;
  // el main, que es lo unico que cambia
  const cuerpo = (despues.match(/<main[\s\S]*<\/main>/) || [''])[0];
  for (const m of texto(cuerpo).matchAll(VOSEO)) quedan[m[0].toLowerCase()] = (quedan[m[0].toLowerCase()] || 0) + 1;
  if (ejemplos.length < 5 && antes !== despues) {
    const a = texto(antes);
    const d = texto(despues);
    let i = 0;
    while (i < a.length && a[i] === d[i]) i++;
    const desde = Math.max(0, a.lastIndexOf(' ', i - 40));
    ejemplos.push({ pagina: p.ruta, antes: a.slice(desde, i + 70).trim(), despues: d.slice(desde, i + 70).trim() });
  }
}

const total = Object.values(con.erratas).reduce((x, y) => x + y, 0);
console.log('\n--- Paso 21: español de España ---');
console.log(`paginas con cambios : ${tocadas} de ${con.paginas.length}`);
console.log(`cambios en total    : ${total}`);
for (const [de, n] of Object.entries(con.erratas).sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(5)}  ${de}`);
console.log(`segunda pasada      : ${segunda} paginas cambian (tiene que ser 0)`);
console.log(`voseo que queda     : ${Object.keys(quedan).length ? JSON.stringify(quedan) : 'ninguno'}`);
console.log('\nEjemplos:');
for (const e of ejemplos) console.log(`  ${e.pagina}\n    antes  : …${e.antes}…\n    despues: …${e.despues}…`);
