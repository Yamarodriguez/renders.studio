/**
 * PASO 6 - Compara el marcado que genera el motor con el HTML real.
 *
 * Para cada pagina de referencia, recorre los elementos de Elementor uno a uno
 * y compara, con el de la web en vivo:
 *   - la etiqueta (section / div)
 *   - la lista de clases, en orden
 *   - los atributos data-*
 *
 * No mira el contenido de los widgets todavia: mira el ARMAZON, que es lo que
 * decide donde cae cada cosa.
 *
 * El objetivo es 0 diferencias. Mientras haya, el informe dice exactamente
 * cual es cada una y en que pagina, para poder corregir la regla.
 *
 * Lee:   referencia/html/*.html, datos/paginas/*.json, datos/armazon/armazon.json
 * Deja:  informes/comparacion-marcado.md
 *
 * Uso:   node scripts/06-comparar-marcado.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { pinta } from './lib/render-elementor.mjs';
import { creaPintor } from './lib/render-widgets.mjs';
import { desSerializa } from './lib/php.mjs';

const RAIZ = process.cwd();
const HTML = path.join(RAIZ, 'referencia', 'html');
const INFORMES = path.join(RAIZ, 'informes');
fs.mkdirSync(INFORMES, { recursive: true });

const arm = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos', 'armazon', 'armazon.json'), 'utf8'));

// --- lo que hace falta para pintar el contenido de los widgets ------------
const iconos = fs.existsSync(path.join(RAIZ, 'datos', 'iconos.json'))
  ? JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos', 'iconos.json'), 'utf8'))
  : {};
const adjuntos = {};
for (const a of JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos', 'adjuntos.json'), 'utf8'))) {
  adjuntos[a.id] = { ...a, meta: desSerializa(a.metaSerializado) };
}
const dinamicos = fs.existsSync(path.join(RAIZ, 'datos', 'dinamicos.json'))
  ? JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos', 'dinamicos.json'), 'utf8'))
  : {};
const pintor = creaPintor({ iconos, adjuntos, dinamicos });

let totalComparados = 0;
let contenidosComparados = 0;
const sinHacer = {};
const fallos = [];

/** Deja el HTML en una sola linea, sin espacios de mas, para poder comparar. */
function normaliza(html) {
  return String(html)
    // el lector de HTML no devuelve los comentarios ni el "/" de cierre;
    // se quitan de los dos lados para poder comparar
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s*\/>/g, '>')
    .replace(/\s+>/g, '>')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

function indexaArbol(arbol) {
  const idx = {};
  (function anda(ns, padre, abuelo) {
    for (const n of ns) {
      idx[n.id] = { n, padre, abuelo };
      anda(n.elements || [], n, padre);
    }
  })(arbol, null, null);
  return idx;
}

/** Genera el elemento suelto (sin hijos) para poder comparar su etiqueta. */
function generaSuelto(nodo, padre, abuelo) {
  const copia = { ...nodo, elements: [] };
  const ctx = {
    dentroDeSeccion: padre?.elType === 'column' && abuelo?.elType === 'section',
    interiorDeSeccionInterior: padre?.elType === 'section' && abuelo?.elType === 'column',
    dentroDeContenedor: padre?.elType === 'container',
  };
  return pinta(copia, ctx);
}

function abre(html) {
  const m = /^<([a-z0-9-]+)([^>]*)>/i.exec(html.trim());
  if (!m) return null;
  const attrs = {};
  const re = /([a-zA-Z_:][-\w:.]*)\s*=\s*"([^"]*)"/g;
  let x;
  while ((x = re.exec(m[2])) !== null) attrs[x[1]] = x[2];
  return { tag: m[1].toLowerCase(), attrs };
}

for (const [slug, fichero] of Object.entries(arm.paginasDeReferencia)) {
  const rutaDatos = path.join(RAIZ, 'datos', 'paginas', `${slug}.json`);
  if (!fs.existsSync(rutaDatos)) continue; // las legales no llevan Elementor
  const datos = JSON.parse(fs.readFileSync(rutaDatos, 'utf8'));
  const idx = indexaArbol(datos.elementor);
  const root = parse(fs.readFileSync(path.join(HTML, fichero), 'utf8'));
  // el contador de imagenes va por pagina: decide el loading="lazy"
  const ctxPagina = { contador: { imagenes: 0 } };

  for (const el of root.querySelectorAll('[data-id]')) {
    const id = el.getAttribute('data-id');
    const t = idx[id];
    if (!t) continue; // elementos que no salen del arbol (pt_view, pie...)
    totalComparados++;

    const real = { tag: el.rawTagName.toLowerCase(), attrs: {} };
    const re = /([a-zA-Z_:][-\w:.]*)\s*=\s*"([^"]*)"/g;
    let x;
    while ((x = re.exec(el.rawAttrs)) !== null) real.attrs[x[1]] = x[2];

    const mio = abre(generaSuelto(t.n, t.padre, t.abuelo));
    if (!mio) {
      fallos.push({ slug, id, que: 'no genero nada', real: real.tag });
      continue;
    }

    if (mio.tag !== real.tag) {
      fallos.push({ slug, id, que: 'etiqueta', mio: mio.tag, real: real.tag });
    }

    const clasesMias = (mio.attrs.class || '').split(/\s+/).filter(Boolean);
    const clasesReales = (real.attrs.class || '').split(/\s+/).filter(Boolean);
    const sobran = clasesMias.filter((c) => !clasesReales.includes(c));
    const faltan = clasesReales.filter((c) => !clasesMias.includes(c));
    if (sobran.length || faltan.length) {
      fallos.push({
        slug,
        id,
        tipo: t.n.elType + (t.n.widgetType ? '/' + t.n.widgetType : ''),
        que: 'clases',
        faltan,
        sobran,
      });
    } else if (clasesMias.join(' ') !== clasesReales.join(' ')) {
      fallos.push({ slug, id, tipo: t.n.elType, que: 'orden de clases', mio: clasesMias.join(' '), real: clasesReales.join(' ') });
    }

    // --- contenido del widget ---
    if (t.n.elType === 'widget') {
      const mioDentro = pintor.pintaContenido(t.n, ctxPagina);
      if (mioDentro === null) {
        sinHacer[t.n.widgetType] = (sinHacer[t.n.widgetType] || 0) + 1;
      } else {
        const caja = el.querySelector('.elementor-widget-container');
        const realDentro = caja ? caja.innerHTML : '';
        contenidosComparados++;
        if (normaliza(mioDentro) !== normaliza(realDentro)) {
          fallos.push({
            slug,
            id,
            tipo: 'widget/' + t.n.widgetType,
            que: 'contenido',
            mio: normaliza(mioDentro),
            real: normaliza(realDentro),
          });
        }
      }
    }

    for (const k of ['data-element_type', 'data-e-type', 'data-widget_type', 'data-settings']) {
      const a = mio.attrs[k] || '';
      const b = real.attrs[k] || '';
      if (a !== b) {
        fallos.push({ slug, id, tipo: t.n.elType + (t.n.widgetType ? '/' + t.n.widgetType : ''), que: k, mio: a, real: b });
      }
    }
  }
}

// --- informe --------------------------------------------------------------
const porQue = {};
for (const f of fallos) (porQue[`${f.tipo || '?'} | ${f.que}`] ||= []).push(f);

let md = `# Comparacion del marcado con la web real\n\n`;
md += `Elementos comparados: **${totalComparados}**\n`;
md += `Diferencias: **${fallos.length}**\n\n`;
if (!fallos.length) {
  md += `Sin diferencias. El armazon que genera el motor es identico al de la web en vivo.\n`;
} else {
  md += `## Resumen por tipo de diferencia\n\n`;
  for (const [k, v] of Object.entries(porQue).sort((a, b) => b[1].length - a[1].length)) {
    md += `- **${k}**: ${v.length}\n`;
  }
  md += `\n## Detalle (primeras 40 de cada tipo)\n`;
  for (const [k, v] of Object.entries(porQue).sort((a, b) => b[1].length - a[1].length)) {
    md += `\n### ${k} (${v.length})\n\n`;
    for (const f of v.slice(0, 40)) {
      if (f.que === 'clases') {
        md += `- \`${f.slug}\` id ${f.id}` + (f.faltan.length ? ` — faltan: \`${f.faltan.join(' ')}\`` : '') + (f.sobran.length ? ` — sobran: \`${f.sobran.join(' ')}\`` : '') + `\n`;
      } else {
        md += `- \`${f.slug}\` id ${f.id} — mio: \`${(f.mio || '').slice(0, 120)}\` / real: \`${(f.real || '').slice(0, 120)}\`\n`;
      }
    }
  }
}
fs.writeFileSync(path.join(INFORMES, 'comparacion-marcado.md'), md);

console.log('--- Comparacion del marcado ---');
console.log(`elementos comparados : ${totalComparados}`);
console.log(`contenidos comparados: ${contenidosComparados}`);
if (Object.keys(sinHacer).length) {
  console.log(`widgets sin motor    : ${Object.entries(sinHacer).map(([k, v]) => `${k} (${v})`).join(', ')}`);
}
console.log(`diferencias          : ${fallos.length}`);
if (fallos.length) {
  console.log('\nPor tipo:');
  for (const [k, v] of Object.entries(porQue).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${String(v.length).padStart(5)}  ${k}`);
  }
  console.log('\nDetalle en: informes/comparacion-marcado.md');
} else {
  console.log('\nSin diferencias.');
}
process.exitCode = fallos.length ? 1 : 0;
