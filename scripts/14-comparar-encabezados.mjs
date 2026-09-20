/**
 * COMPROBACION 1 de 4 - Encabezados.
 *
 * Compara la secuencia de H1/H2/H3 de cada pagina generada con la de la web en
 * vivo, EN ORDEN. El objetivo es el 100 % identicas. Cada excepcion se
 * documenta con su motivo; no se pasa por alto ninguna.
 *
 * Tambien avisa si una pagina tiene mas de un H1.
 *
 * Lee:   dist/**\/index.html  y  referencia/html-todo/*.html
 * Deja:  informes/encabezados.md
 *
 * Uso:   node scripts/14-comparar-encabezados.mjs   (despues de npm run build)
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';

const RAIZ = process.cwd();
const DIST = path.join(RAIZ, 'dist');
const REAL = path.join(RAIZ, 'referencia', 'html-todo');

if (!fs.existsSync(DIST)) {
  console.error('ERROR: no existe dist/. Ejecuta antes:  npm run build');
  process.exit(1);
}
if (!fs.existsSync(REAL)) {
  console.error('ERROR: no existe referencia/html-todo/. Descarga antes el HTML de la web real.');
  process.exit(1);
}

const paginas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos', 'paginas.json'), 'utf8'));

function encabezados(html) {
  const root = parse(html);
  const zona = root.querySelector('#main') || root;
  return zona.querySelectorAll('h1,h2,h3').map((h) => ({
    nivel: h.rawTagName.toLowerCase(),
    texto: h.text.replace(/\s+/g, ' ').trim(),
  }));
}

const fallos = [];
const variosH1 = [];
let comparadas = 0;
let identicas = 0;

for (const p of paginas) {
  const nuevo = p.slug === 'renders' ? path.join(DIST, 'index.html') : path.join(DIST, p.slug, 'index.html');
  const real = path.join(REAL, `${p.slug}.html`);
  if (!fs.existsSync(nuevo) || !fs.existsSync(real)) {
    fallos.push({ slug: p.slug, que: 'falta el fichero', detalle: !fs.existsSync(nuevo) ? 'no se ha generado' : 'no esta descargada' });
    continue;
  }
  comparadas++;
  const A = encabezados(fs.readFileSync(nuevo, 'utf8'));
  const B = encabezados(fs.readFileSync(real, 'utf8'));

  const h1 = A.filter((x) => x.nivel === 'h1').length;
  if (h1 !== 1) variosH1.push({ slug: p.slug, cuantos: h1 });

  if (A.length === B.length && A.every((x, i) => x.nivel === B[i].nivel && x.texto === B[i].texto)) {
    identicas++;
    continue;
  }
  const diferencias = [];
  const max = Math.max(A.length, B.length);
  for (let i = 0; i < max; i++) {
    const a = A[i];
    const b = B[i];
    if (!a || !b || a.nivel !== b.nivel || a.texto !== b.texto) {
      diferencias.push({
        pos: i + 1,
        nuevo: a ? `${a.nivel}: ${a.texto}` : '(no hay)',
        real: b ? `${b.nivel}: ${b.texto}` : '(no hay)',
      });
    }
    if (diferencias.length >= 6) break;
  }
  fallos.push({ slug: p.slug, que: 'encabezados distintos', nuevos: A.length, reales: B.length, diferencias });
}

let md = `# Comprobacion 1: encabezados\n\n`;
md += `Paginas comparadas: **${comparadas}**\n`;
md += `Identicas a la web real: **${identicas}**\n`;
md += `Con diferencias: **${fallos.length}**\n`;
md += `Con un numero de H1 distinto de 1: **${variosH1.length}**\n\n`;
if (fallos.length) {
  md += `## Diferencias\n\n`;
  for (const f of fallos) {
    md += `### ${f.slug}\n\n`;
    if (f.que === 'falta el fichero') {
      md += `- ${f.detalle}\n\n`;
      continue;
    }
    md += `Encabezados: ${f.nuevos} en la nueva, ${f.reales} en la real.\n\n`;
    for (const d of f.diferencias) {
      md += `- posicion ${d.pos} — nuevo: \`${d.nuevo}\` / real: \`${d.real}\`\n`;
    }
    md += `\n`;
  }
}
if (variosH1.length) {
  md += `## Paginas que no tienen exactamente un H1\n\n`;
  variosH1.forEach((v) => (md += `- \`${v.slug}\`: ${v.cuantos} H1\n`));
}
fs.mkdirSync(path.join(RAIZ, 'informes'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'informes', 'encabezados.md'), md);

console.log('--- Comprobacion 1: encabezados ---');
console.log(`paginas comparadas : ${comparadas}`);
console.log(`identicas          : ${identicas}`);
console.log(`con diferencias    : ${fallos.length}`);
console.log(`H1 distinto de 1   : ${variosH1.length}${variosH1.length ? ' (' + variosH1.slice(0, 6).map((v) => v.slug + ':' + v.cuantos).join(', ') + ')' : ''}`);
console.log('\nInforme: informes/encabezados.md');
process.exitCode = fallos.length ? 1 : 0;
