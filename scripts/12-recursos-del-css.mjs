/**
 * PASO 12 - Busca lo que piden las hojas de estilo por dentro.
 *
 * Esta es la leccion mas cara de la migracion anterior: las fotos de fondo de
 * las franjas de color NO estan en el contenido, estan dentro del CSS, en
 * url(...). Y las tipografias y los iconos son ficheros .woff2 que tambien
 * salen de ahi. Si no se descargan, los iconos salen como cuadrados vacios y
 * las franjas quedan de color liso.
 *
 * Recorre TODAS las hojas ya descargadas en public/, saca cada url(...) y
 * prepara la descarga de lo que falte.
 *
 * Lee:   public/**\/*.css
 * Deja:  descargas/curl-css-recursos.txt
 *        informes/recursos-del-css.md
 *
 * Uso:   node scripts/12-recursos-del-css.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const PUBLIC = path.join(RAIZ, 'public');
const DOMINIO = 'https://renders.studio';

if (!fs.existsSync(PUBLIC)) {
  console.error('ERROR: no existe la carpeta public/. Descarga antes los recursos.');
  process.exit(1);
}

/** Todas las hojas .css que hay bajo public/ */
function buscaCss(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) buscaCss(p, out);
    else if (e.name.endsWith('.css')) out.push(p);
  }
  return out;
}

const hojas = buscaCss(PUBLIC);
const pedidos = new Map(); // ruta relativa -> url
const yaEstan = [];
const fuera = new Set();

for (const hoja of hojas) {
  const css = fs.readFileSync(hoja, 'utf8');
  const carpetaHoja = path.dirname(hoja);
  const re = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    let u = m[2].trim();
    if (!u || u.startsWith('data:') || u.startsWith('#')) continue;
    u = u.split('?')[0].split('#')[0];

    let url;
    let destino;
    if (/^https?:\/\//i.test(u)) {
      if (!u.startsWith(DOMINIO + '/')) {
        fuera.add(u);
        continue;
      }
      url = u;
      destino = path.join(PUBLIC, decodeURIComponent(u.slice(DOMINIO.length + 1)));
    } else if (u.startsWith('/')) {
      url = DOMINIO + u;
      destino = path.join(PUBLIC, decodeURIComponent(u.slice(1)));
    } else {
      // relativa a la propia hoja
      destino = path.resolve(carpetaHoja, decodeURIComponent(u));
      const rel = path.relative(PUBLIC, destino).split(path.sep).join('/');
      if (rel.startsWith('..')) continue;
      url = `${DOMINIO}/${rel}`;
    }

    const rel = path.relative(PUBLIC, destino).split(path.sep).join('/');
    if (rel.startsWith('..')) continue;
    if (fs.existsSync(destino)) {
      yaEstan.push(rel);
      continue;
    }
    pedidos.set(rel, url);
  }
}

const lineas = [];
for (const [rel, url] of [...pedidos.entries()].sort()) {
  lineas.push(`url = "${url}"`);
  lineas.push(`output = "public/${rel}"`);
}
fs.mkdirSync(path.join(RAIZ, 'descargas'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'descargas', 'curl-css-recursos.txt'), lineas.join('\n') + '\n');

fs.mkdirSync(path.join(RAIZ, 'informes'), { recursive: true });
let md = `# Lo que piden las hojas de estilo\n\n`;
md += `Hojas revisadas: **${hojas.length}**\n`;
md += `Ficheros que ya estaban: **${new Set(yaEstan).size}**\n`;
md += `Ficheros que faltan: **${pedidos.size}**\n\n`;
const porTipo = {};
for (const rel of pedidos.keys()) {
  const ext = (rel.split('.').pop() || '?').toLowerCase();
  (porTipo[ext] ||= []).push(rel);
}
for (const [ext, v] of Object.entries(porTipo).sort((a, b) => b[1].length - a[1].length)) {
  md += `- **.${ext}**: ${v.length}\n`;
}
if (fuera.size) {
  md += `\n## De otros dominios (no se descargan)\n\n`;
  [...fuera].forEach((u) => (md += `- ${u}\n`));
}
md += `\n## Los que faltan\n\n`;
[...pedidos.keys()].sort().forEach((r) => (md += `- \`${r}\`\n`));
fs.writeFileSync(path.join(RAIZ, 'informes', 'recursos-del-css.md'), md);

console.log('--- Lo que piden las hojas de estilo ---');
console.log(`hojas revisadas  : ${hojas.length}`);
console.log(`ya descargados   : ${new Set(yaEstan).size}`);
console.log(`faltan           : ${pedidos.size}`);
for (const [ext, v] of Object.entries(porTipo).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`   .${ext.padEnd(6)} ${v.length}`);
}
if (fuera.size) console.log(`de otros dominios: ${fuera.size} (ver el informe)`);
console.log('\nInforme: informes/recursos-del-css.md');
