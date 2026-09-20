/**
 * PASO 1 - Extrae el export de WordPress a ficheros de datos.
 *
 * Lee:   worpress/renders.WordPress.2026-09-17.xml
 * Deja:  datos/paginas/<slug>.json   (una por pagina, con el arbol de Elementor)
 *        datos/paginas.json          (indice: slug, url, titulo, SEO, tipo)
 *        datos/menus.json            (los 6 menus, ya en arbol)
 *        datos/adjuntos.json         (las 443 imagenes con sus variantes de tamano)
 *        datos/lista-imagenes.txt    (todas las direcciones a descargar, una por linea)
 *        datos/legales.json          (las 4 paginas sin Elementor)
 *
 * Uso:   node scripts/01-extraer-xml.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { readWxr, tag, metas, categories, terms, decodeEntities } from './lib/wxr.mjs';

const RAIZ = process.cwd();
const XML = path.join(RAIZ, 'worpress', 'renders.WordPress.2026-09-17.xml');
const DATOS = path.join(RAIZ, 'datos');
const DOMINIO = 'https://renders.studio';

if (!fs.existsSync(XML)) {
  console.error(`ERROR: no encuentro el export en ${XML}`);
  process.exit(1);
}

fs.mkdirSync(path.join(DATOS, 'paginas'), { recursive: true });

const paginas = [];
const legales = [];
const adjuntos = [];
const navItems = [];
const plantillas = [];
const imagenes = new Set();
let kit = null;
const avisos = [];

function apuntaImagenes(texto) {
  if (!texto) return;
  const limpio = texto.replaceAll('\\/', '/');
  const re = /https?:\/\/[^"'\\ )\]]+?\.(?:jpg|jpeg|png|webp|gif|svg|avif)/gi;
  let m;
  while ((m = re.exec(limpio)) !== null) {
    // La web mezcla http:// y https:// para la misma imagen. Se normaliza,
    // si no descargariamos el mismo fichero dos veces.
    imagenes.add(m[0].replace(/^http:\/\/renders\.studio/i, DOMINIO));
  }
}

function parseaElementor(raw, quien) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    avisos.push(`No se ha podido leer _elementor_data de ${quien}: ${e.message}`);
    return null;
  }
}

const { head, count } = await readWxr(XML, (item) => {
  const tipo = tag(item, 'wp:post_type');
  const id = tag(item, 'wp:post_id');
  const meta = metas(item);

  if (tipo === 'attachment') {
    const url = tag(item, 'wp:attachment_url');
    let metaAdj = null;
    try {
      metaAdj = meta._wp_attachment_metadata || null;
    } catch {}
    adjuntos.push({
      id,
      titulo: tag(item, 'title'),
      url,
      fichero: meta._wp_attached_file || null,
      alt: meta._wp_attachment_image_alt || null,
      metaSerializado: metaAdj,
    });
    if (url) imagenes.add(url);
    return;
  }

  if (tipo === 'nav_menu_item') {
    const cats = categories(item).filter((c) => c.domain === 'nav_menu');
    navItems.push({
      id,
      menu: cats[0] ? cats[0].nicename : null,
      orden: Number(tag(item, 'wp:menu_order') || 0),
      padre: meta._menu_item_menu_item_parent || '0',
      objeto: meta._menu_item_object || null,
      objetoId: meta._menu_item_object_id || null,
      tipoEnlace: meta._menu_item_type || null,
      url: meta._menu_item_url || null,
      titulo: tag(item, 'title'),
      clases: meta._menu_item_classes || null,
      megamenu: meta._menu_item_megamenu || null,
    });
    return;
  }

  if (tipo === 'elementor_library') {
    if (meta._elementor_template_type === 'kit') {
      kit = { id, titulo: tag(item, 'title'), metas: meta };
    } else {
      plantillas.push({ id, titulo: tag(item, 'title'), tipo: meta._elementor_template_type });
    }
    return;
  }

  if (tipo !== 'page') return;

  const slug = tag(item, 'wp:post_name');
  const titulo = tag(item, 'title');
  const enlace = tag(item, 'link');
  const contenido = tag(item, 'content:encoded');
  const datos = parseaElementor(meta._elementor_data, slug);

  apuntaImagenes(meta._elementor_data);
  apuntaImagenes(contenido);

  const ficha = {
    id,
    slug,
    titulo,
    url: enlace,
    ruta: enlace ? enlace.replace(DOMINIO, '') : `/${slug}/`,
    estado: tag(item, 'wp:status'),
    plantillaWp: meta._wp_page_template || null,
    versionElementor: meta._elementor_version || null,
    conElementor: Boolean(datos),
    seo: {
      titulo: meta._yoast_wpseo_title || null,
      descripcion: meta._yoast_wpseo_metadesc || null,
      focus: meta._yoast_wpseo_focuskw || null,
      canonical: meta._yoast_wpseo_canonical || null,
      robotsNoindex: meta._yoast_wpseo_meta_robots_noindex || null,
    },
    miniatura: meta._thumbnail_id || null,
    ajustesPagina: meta._elementor_page_settings || null,
    ajustesOcean: Object.fromEntries(
      Object.entries(meta).filter(([k]) => k.startsWith('ocean_'))
    ),
  };

  if (datos) {
    fs.writeFileSync(
      path.join(DATOS, 'paginas', `${slug}.json`),
      JSON.stringify({ ...ficha, elementor: datos }, null, 1)
    );
  } else {
    legales.push({ ...ficha, contenido });
  }
  paginas.push(ficha);
});

// --- menus en arbol -------------------------------------------------------
const porMenu = {};
for (const it of navItems) {
  if (!it.menu) continue;
  (porMenu[it.menu] ||= []).push(it);
}
const menus = {};
for (const [nombre, items] of Object.entries(porMenu)) {
  const porId = Object.fromEntries(items.map((i) => [i.id, { ...i, hijos: [] }]));
  const raiz = [];
  for (const i of Object.values(porId)) {
    if (i.padre !== '0' && porId[i.padre]) porId[i.padre].hijos.push(i);
    else raiz.push(i);
  }
  const ordena = (l) => {
    l.sort((a, b) => a.orden - b.orden);
    l.forEach((x) => ordena(x.hijos));
  };
  ordena(raiz);
  menus[nombre] = raiz;
}

// --- imagenes del CSS: las anade el paso 2 --------------------------------
const lista = [...imagenes].filter((u) => u.startsWith(DOMINIO)).sort();
const externas = [...imagenes].filter((u) => !u.startsWith(DOMINIO)).sort();

fs.writeFileSync(path.join(DATOS, 'paginas.json'), JSON.stringify(paginas, null, 1));
fs.writeFileSync(path.join(DATOS, 'legales.json'), JSON.stringify(legales, null, 1));
fs.writeFileSync(path.join(DATOS, 'adjuntos.json'), JSON.stringify(adjuntos, null, 1));
fs.writeFileSync(path.join(DATOS, 'menus.json'), JSON.stringify(menus, null, 1));
fs.writeFileSync(path.join(DATOS, 'plantillas-demo.json'), JSON.stringify(plantillas, null, 1));
fs.writeFileSync(path.join(DATOS, 'lista-imagenes.txt'), lista.join('\n') + '\n');
fs.writeFileSync(path.join(DATOS, 'imagenes-externas.txt'), externas.join('\n') + '\n');

const resumen = {
  fecha: new Date().toISOString(),
  itemsLeidos: count,
  paginas: paginas.length,
  paginasConElementor: paginas.filter((p) => p.conElementor).length,
  paginasSinElementor: legales.map((l) => l.slug),
  adjuntos: adjuntos.length,
  entradasDeMenu: navItems.length,
  menus: Object.fromEntries(Object.entries(menus).map(([k, v]) => [k, v.length])),
  plantillasDemo: plantillas.length,
  imagenesPropias: lista.length,
  imagenesExternas: externas.length,
  avisos,
};
fs.writeFileSync(path.join(DATOS, 'resumen-extraccion.json'), JSON.stringify(resumen, null, 1));

console.log('--- Extraccion terminada ---');
console.log(`items leidos          : ${count}`);
console.log(`paginas               : ${paginas.length} (con Elementor: ${resumen.paginasConElementor})`);
console.log(`paginas sin Elementor : ${resumen.paginasSinElementor.join(', ')}`);
console.log(`adjuntos              : ${adjuntos.length}`);
console.log(`entradas de menu      : ${navItems.length} en ${Object.keys(menus).length} menus`);
console.log(`imagenes propias      : ${lista.length}`);
console.log(`imagenes externas     : ${externas.length}  (ver datos/imagenes-externas.txt)`);
if (avisos.length) {
  console.log('\nAVISOS:');
  avisos.forEach((a) => console.log('  - ' + a));
}
console.log('\nTodo en: datos/');
