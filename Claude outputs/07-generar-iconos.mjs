/**
 * PASO 7 - Prepara los iconos.
 *
 * Elementor NO pinta los iconos de los widgets con una tipografia: mete el
 * dibujo (un SVG) dentro del HTML. Y los dibujos que usa son los de
 * Font Awesome 5.15.4, NO los de la 6.7.2 que carga el tema OceanWP. Son
 * distintos: el mismo icono tiene otro trazado en cada version.
 *
 * Aqui se recorren las 141 paginas, se apunta cada icono que usan y se saca su
 * dibujo del paquete de npm, que es exactamente el mismo fichero del que tira
 * tu web.
 *
 * Lee:   datos/paginas/*.json  +  node_modules/fa5
 * Deja:  datos/iconos.json
 *
 * Uso:   node scripts/07-generar-iconos.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const DATOS = path.join(RAIZ, 'datos');
const FA5 = path.join(RAIZ, 'node_modules', 'fa5', 'svgs');

const CARPETA = { fas: 'solid', far: 'regular', fab: 'brands', fal: 'light', fad: 'duotone' };

if (!fs.existsSync(FA5)) {
  console.error(`ERROR: no encuentro ${FA5}`);
  console.error('Ejecuta antes:  npm install');
  process.exit(1);
}

// --- recoger todos los iconos que usa la web ------------------------------
const usados = new Map(); // "fas fa-home" -> veces
function apunta(v) {
  if (typeof v !== 'string') return;
  const m = /^(fas|far|fab|fal|fad)\s+fa-([\w-]+)$/.exec(v.trim());
  if (!m) return;
  usados.set(v.trim(), (usados.get(v.trim()) || 0) + 1);
}
function recorre(n) {
  const s = n.settings || {};
  for (const [k, v] of Object.entries(s)) {
    if (v && typeof v === 'object' && typeof v.value === 'string' && v.library) apunta(v.value);
    if (Array.isArray(v)) {
      for (const it of v) {
        if (it && typeof it === 'object') {
          for (const vv of Object.values(it)) {
            if (vv && typeof vv === 'object' && typeof vv.value === 'string' && vv.library) apunta(vv.value);
          }
        }
      }
    }
  }
  (n.elements || []).forEach(recorre);
}

const dir = path.join(DATOS, 'paginas');
for (const f of fs.readdirSync(dir)) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  (j.elementor || []).forEach(recorre);
}

// --- sacar el dibujo de cada uno -----------------------------------------
const iconos = {};
const noEncontrados = [];
for (const clave of [...usados.keys()].sort()) {
  const [prefijo, nombre] = [clave.split(/\s+/)[0], clave.split(/\s+/)[1].replace(/^fa-/, '')];
  const ruta = path.join(FA5, CARPETA[prefijo] || 'solid', `${nombre}.svg`);
  if (!fs.existsSync(ruta)) {
    noEncontrados.push(clave);
    continue;
  }
  const svg = fs.readFileSync(ruta, 'utf8');
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
  const d = /<path[^>]*\sd="([^"]+)"/.exec(svg)?.[1];
  if (!viewBox || !d) {
    noEncontrados.push(clave + ' (no entiendo el fichero)');
    continue;
  }
  iconos[clave] = { clase: `e-${prefijo}-${nombre}`, viewBox, d, veces: usados.get(clave) };
}

fs.writeFileSync(path.join(DATOS, 'iconos.json'), JSON.stringify(iconos, null, 1));

console.log('--- Iconos preparados ---');
console.log(`distintos que usa la web : ${usados.size}`);
console.log(`resueltos                : ${Object.keys(iconos).length}`);
console.log(`usos en total            : ${[...usados.values()].reduce((a, b) => a + b, 0)}`);
if (noEncontrados.length) {
  console.log('\nNO ENCONTRADOS (hay que mirarlos uno a uno):');
  noEncontrados.forEach((x) => console.log('  - ' + x));
} else {
  console.log('\nTodos encontrados en Font Awesome 5.15.4.');
}
console.log('\nEn: datos/iconos.json');
