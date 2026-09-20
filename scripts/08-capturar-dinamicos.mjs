/**
 * PASO 8 - Captura de la web real lo que no se puede reconstruir.
 *
 * Hay tres cosas que un sitio estatico no puede calcular por su cuenta:
 *
 *  1. Las fotos recortadas "a medida". Cuando en Elementor eliges un tamano
 *     propio, el recorte se guarda en uploads/elementor/thumbs/ con un nombre
 *     inventado por Elementor (un codigo largo). No hay forma de adivinarlo:
 *     se copia del HTML real.
 *  2. La rejilla del plugin Content Views ([pt_view id="..."]). La genera el
 *     plugin al vuelo; se copia tal cual.
 *  3. El formulario de Contact Form 7 y el mapa de Google, por lo mismo.
 *
 * Lee:   referencia/html/*.html
 * Deja:  datos/dinamicos.json
 *
 * Uso:   node scripts/08-capturar-dinamicos.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { paginasDeReferencia } from './lib/referencia.mjs';

const RAIZ = process.cwd();
const HTML = path.join(RAIZ, 'referencia', 'html');
const DATOS = path.join(RAIZ, 'datos');

const { mapa: paginasReales, completa } = paginasDeReferencia(RAIZ);

const miniaturas = {}; // "{idFoto}-{ancho}x{alto}" -> url del recorte
const vistas = {}; // id de la vista de Content Views -> su HTML
const formularios = {}; // id del widget -> HTML del formulario
const mapas = {}; // id del widget -> HTML del mapa
const galerias = {}; // id del widget -> HTML de la galeria
const paginasLegales = {}; // slug -> contenido de las 4 paginas legales
const avisos = [];

function indexa(arbol) {
  const idx = {};
  (function anda(ns) {
    for (const n of ns) {
      idx[n.id] = n;
      anda(n.elements || []);
    }
  })(arbol);
  return idx;
}

for (const [slug, ruta] of Object.entries(paginasReales)) {
  const rutaDatos = path.join(DATOS, 'paginas', `${slug}.json`);
  if (!fs.existsSync(rutaDatos)) {
    // Las 4 paginas legales estan VACIAS en el export: las escribe el plugin
    // Complianz al vuelo. Su texto solo existe en la web en vivo.
    const art = parse(fs.readFileSync(ruta, 'utf8')).querySelector('#main article');
    if (art) paginasLegales[slug] = art.innerHTML;
    else avisos.push(`${slug}: no encuentro el <article> de la pagina legal`);
    continue;
  }
  const idx = indexa(JSON.parse(fs.readFileSync(rutaDatos, 'utf8')).elementor);
  const root = parse(fs.readFileSync(ruta, 'utf8'));

  for (const el of root.querySelectorAll('[data-id]')) {
    const n = idx[el.getAttribute('data-id')];
    if (!n || n.elType !== 'widget') continue;
    const caja = el.querySelector('.elementor-widget-container');
    if (!caja) continue;
    const s = n.settings || {};

    // 1. foto recortada a medida
    if (n.widgetType === 'image' && s.image_size === 'custom') {
      const img = caja.querySelector('img');
      const dim = s.image_custom_dimension || {};
      const clave = `${s.image?.id}-${dim.width || ''}x${dim.height || ''}`;
      if (img?.getAttribute('src')) {
        if (miniaturas[clave] && miniaturas[clave] !== img.getAttribute('src')) {
          avisos.push(`La foto a medida ${clave} sale con dos direcciones distintas`);
        }
        miniaturas[clave] = img.getAttribute('src');
      }
    }

    // 2. rejilla de Content Views dentro de un texto
    if (n.widgetType === 'text-editor') {
      const m = /\[pt_view\s+id="?([\w-]+)"?\s*\]/.exec(s.editor || '');
      if (m) {
        const bloque = caja.querySelector('.pt-cv-wrapper');
        if (bloque) {
          // Content Views deja detras una hoja de estilo suelta; sin ella la
          // rejilla se ve distinta, asi que va con el bloque.
          const estilos = caja
            .querySelectorAll('style')
            .filter((e) => (e.getAttribute('id') || '').startsWith('pt-cv-inline-style'))
            .map((e) => e.toString())
            .join('');
          vistas[m[1]] = bloque.toString() + estilos;
        }
        else avisos.push(`En ${slug} hay un [pt_view id="${m[1]}"] pero no encuentro su rejilla en el HTML`);
      }
    }

    // 3. formulario, mapa y galeria
    // Estos tres van por pagina: el formulario lleva dentro el numero de la
    // pagina, y el mapa y la galeria pueden cambiar de una a otra.
    if (n.widgetType === 'eael-contact-form-7') formularios[`${slug}:${n.id}`] = caja.innerHTML;
    if (n.widgetType === 'google_maps') mapas[`${slug}:${n.id}`] = caja.innerHTML;
    if (n.widgetType === 'image-gallery') galerias[`${slug}:${n.id}`] = caja.innerHTML;
  }
}

const salida = { fecha: new Date().toISOString(), miniaturas, vistas, formularios, mapas, galerias, paginasLegales, avisos };
fs.writeFileSync(path.join(DATOS, 'dinamicos.json'), JSON.stringify(salida, null, 1));

console.log('--- Capturado de la web real ---');
console.log(`paginas leidas            : ${Object.keys(paginasReales).length}${completa ? ' (todas)' : ' (solo la muestra)'}`);
console.log(`fotos recortadas a medida : ${Object.keys(miniaturas).length}`);
console.log(`rejillas de Content Views : ${Object.keys(vistas).length}`);
console.log(`formularios               : ${Object.keys(formularios).length}`);
console.log(`mapas                     : ${Object.keys(mapas).length}`);
console.log(`galerias                  : ${Object.keys(galerias).length}`);
console.log(`paginas legales           : ${Object.keys(paginasLegales).length}`);
if (avisos.length) {
  console.log('\nAVISOS:');
  avisos.forEach((a) => console.log('  - ' + a));
}
console.log('\nEn: datos/dinamicos.json');
