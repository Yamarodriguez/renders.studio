/**
 * Monta la pagina entera: cabecera, armazon, contenido y scripts.
 *
 * Todo lo que no sale del constructor se COPIA de la web real (pasos 4, 8, 10
 * y 13). Lo unico que se genera es el contenido de Elementor, y eso ya esta
 * comprobado elemento a elemento.
 *
 * Solo se cambia una cosa: las direcciones absolutas a https://renders.studio
 * pasan a ser relativas, para que la web funcione tanto en local como en
 * Netlify sin tocar nada. Las etiquetas canonicas y las de redes sociales se
 * quedan absolutas, que es lo que Google espera.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pintaArbol } from './render-elementor.mjs';
import { creaPintor } from './render-widgets.mjs';
import { desSerializa } from './php.mjs';
import { pintaCabezaRediseno, pintaCabecera, pintaCierre, pintaPie } from './rediseno.mjs';
import { creaCorrector } from './erratas.mjs';
import { creaAnadidos } from './anadidos.mjs';

const DOMINIO = 'https://renders.studio';

/** El ajuste del tema -> el menu de la cabecera. */
const MENUS = {
  '': 'renders',
  5: 'renders',
  6: 'renders-2',
  7: 'renders-espana',
  8: 'renders-argentina',
  9: 'renders-3',
  10: 'renders-sin-provincias',
};

/**
 * Dos formas de montar la web:
 *   'rediseno' (la de siempre)  cabecera, cierre y pie nuevos y la hoja
 *                               public/estilo/diseno.css
 *   'fiel'                      la copia exacta de WordPress de la Fase 1
 * Se elige con la variable DISENO:  DISENO=fiel npm run build
 */
export const MODO = process.env.DISENO === 'fiel' ? 'fiel' : 'rediseno';

export function creaConstructor(raiz = process.cwd(), { modo = MODO } = {}) {
  const DATOS = path.join(raiz, 'datos');
  const lee = (p) => JSON.parse(fs.readFileSync(path.join(DATOS, p), 'utf8'));
  const leeTexto = (p) => fs.readFileSync(path.join(DATOS, p), 'utf8');

  const paginas = lee('paginas.json');
  const legales = lee('legales.json');
  const iconos = fs.existsSync(path.join(DATOS, 'iconos.json')) ? lee('iconos.json') : {};
  const dinamicos = fs.existsSync(path.join(DATOS, 'dinamicos.json')) ? lee('dinamicos.json') : {};
  const adjuntos = {};
  for (const a of lee('adjuntos.json')) adjuntos[a.id] = { ...a, meta: desSerializa(a.metaSerializado) };
  const pintor = creaPintor({ iconos, adjuntos, dinamicos });
  // Solo para el rediseno: enlaces arreglados, zonas, datos para Google y guias.
  const anadidos = creaAnadidos(raiz, paginas);
  // Solo para el rediseno: paso del texto a español de España.
  // Con IDIOMA=original se pinta el texto tal cual, para comparar.
  const corrector =
    process.env.IDIOMA === 'original' ? { corrige: (h) => h, recuento: {} } : creaCorrector(raiz);

  const armazon = {
    barraSuperior: leeTexto('armazon/barra-superior.html'),
    pie: leeTexto('armazon/pie.html'),
    scrollTop: leeTexto('armazon/scroll-top.html'),
    envoltorio: leeTexto('armazon/envoltorio.html'),
    envoltorioLegal: fs.existsSync(path.join(DATOS, 'armazon/envoltorio-legal.html'))
      ? leeTexto('armazon/envoltorio-legal.html')
      : null,
  };
  const cabeceras = {};
  for (const f of fs.readdirSync(path.join(DATOS, 'armazon'))) {
    const m = /^cabecera-(.+)\.html$/.exec(f);
    if (m) cabeceras[m[1]] = leeTexto(path.join('armazon', f));
  }

  /**
   * Direcciones absolutas -> relativas, para que valga en local y en Netlify.
   * OJO: esto se aplica al CUERPO y a las hojas y scripts, nunca a las
   * etiquetas de SEO. El enlace canonico y las de redes sociales tienen que
   * seguir siendo absolutas o Google se pierde.
   */
  function aRelativas(html) {
    return String(html).replaceAll(`${DOMINIO}/`, '/').replaceAll(DOMINIO, '/');
  }

  /** Marca en el menu la pagina en la que estamos. */
  function marcaMenu(html, pagina) {
    const marcas = `current-menu-item page_item page-item-${pagina.id} current_page_item`;
    const destino = `href="${DOMINIO}${pagina.ruta}"`;
    let hecho = false;
    // se recorren los <li> y se marca el que lleva a esta pagina
    return html.replace(/<li([^>]*class="([^"]*)"[^>]*)>([\s\S]{0,400}?)<\/a>/g, (todo, attrs, clases, dentro) => {
      if (hecho && !todo.includes(destino)) return todo;
      if (!todo.includes(destino)) return todo;
      const nuevas = clases.includes('menu-item-home')
        ? clases.replace('menu-item-home', `menu-item-home ${marcas}`)
        : clases.replace('menu-item-object-page', `menu-item-object-page ${marcas}`);
      hecho = true;
      return todo.replace(`class="${clases}"`, `class="${nuevas}"`);
    });
  }

  /** Reconstruye el <head> pieza a pieza, en el mismo orden que la web real. */
  function pintaCabeza(ficha) {
    const out = [];
    for (const p of ficha.cabeza) {
      switch (p.tipo) {
        case 'titulo':
          out.push(`<title>${p.texto}</title>`);
          break;
        case 'meta':
        case 'link':
        case 'noscript':
          out.push(p.html);
          break;
        case 'hoja':
          out.push(`<link rel="stylesheet"${p.id ? ` id="${p.id}"` : ''} href="${aRelativas(p.href)}" media="all">`);
          break;
        case 'estilo':
          out.push(`<style${p.id ? ` id="${p.id}"` : ''}>${p.css}</style>`);
          break;
        case 'script':
          out.push(`<script src="${aRelativas(p.src)}"${p.id ? ` id="${p.id}"` : ''}></script>`);
          break;
        case 'scriptEnLinea':
          out.push(`<script${p.id ? ` id="${p.id}"` : ''}>${p.js}</script>`);
          break;
        default:
          break;
      }
    }
    return out.join('\n');
  }

  function pintaFinal(ficha) {
    const out = [];
    for (const p of ficha.alFinal) {
      if (p.tipo === 'script') out.push(`<script src="${aRelativas(p.src)}"${p.id ? ` id="${p.id}"` : ''}></script>`);
      else if (p.tipo === 'scriptEnLinea') out.push(`<script${p.id ? ` id="${p.id}"` : ''}>${p.js}</script>`);
      else if (p.tipo === 'estilo') out.push(`<style${p.id ? ` id="${p.id}"` : ''}>${p.css}</style>`);
      else if (p.html) out.push(p.html);
    }
    return out.join('\n');
  }

  /** Monta la pagina entera. */
  function construye(slug) {
    const pagina = paginas.find((p) => p.slug === slug);
    if (!pagina) throw new Error(`No conozco la pagina ${slug}`);

    const ficha = JSON.parse(fs.readFileSync(path.join(DATOS, 'cabecera', `${slug}.json`), 'utf8'));
    const menu = MENUS[(pagina.ajustesOcean || {}).ocean_header_custom_menu || ''] || 'renders';
    const cabecera = cabeceras[menu];
    if (!cabecera) throw new Error(`Me falta la cabecera del menu ${menu}`);

    const rediseno = modo === 'rediseno';
    let contenido;
    let envoltorio;
    if (pagina.conElementor) {
      const datos = JSON.parse(fs.readFileSync(path.join(DATOS, 'paginas', `${slug}.json`), 'utf8'));
      const ctx = { slug, rediseno, contador: { imagenes: 0, sinLazy: new Set() } };
      if (rediseno) meteVistaEnTipos(datos.elementor);
      contenido = pintaArbol(datos.elementor, {
        ...ctx,
        pintaContenido: (n, c) => pintor.pintaContenido(n, c ?? ctx),
      });
      envoltorio = armazon.envoltorio;
    } else {
      // El texto de las legales no esta en el export (lo pone un plugin):
      // se copia el capturado de la web real.
      const capturado = (dinamicos.paginasLegales || {})[slug];
      const l = legales.find((x) => x.slug === slug);
      contenido = capturado || l?.contenido || '';
      envoltorio = armazon.envoltorioLegal || armazon.envoltorio;
    }

    if (rediseno) return construyeRediseno({ pagina, ficha, cabecera, contenido });

    const cuerpoContenido = envoltorio
      .replaceAll('{{ID}}', pagina.id)
      .replace('{{CONTENIDO}}', contenido);

    const html =
      `<!DOCTYPE html>\n<html lang="${ficha.lang}">\n<head>\n` +
      pintaCabeza(ficha) +
      `\n</head>\n<body class="${ficha.bodyClass}">\n` +
      `<div id="outer-wrap" class="site clr">\n` +
      `<a class="skip-link screen-reader-text" href="#main">Ir al contenido</a>\n` +
      `<div id="wrap" class="clr">\n` +
      aRelativas(armazon.barraSuperior) +
      aRelativas(marcaMenu(cabecera, pagina)) +
      aRelativas(cuerpoContenido) +
      aRelativas(armazon.pie) +
      `\n</div>\n</div>\n` +
      aRelativas(armazon.scrollTop) +
      '\n' +
      pintaFinal(ficha) +
      `\n</body>\n</html>`;

    return html;
  }

  /**
   * Solo en el rediseno: la ficha de Content Views ("Renders hiperrealistas")
   * que va suelta justo despues de la rejilla "Tipos de render" se mete
   * dentro de esa rejilla, delante de su boton "Mas tipos de renders".
   * No cambia ningun texto ni el orden de los encabezados: entre la rejilla
   * y la ficha solo habia un espaciador y un boton.
   */
  function meteVistaEnTipos(arbol) {
    const esVista = (n) =>
      n.elType === 'container' &&
      (n.elements || []).length === 1 &&
      n.elements[0].widgetType === 'text-editor' &&
      /\[pt_view/.test(n.elements[0].settings?.editor || '');
    const i = arbol.findIndex(esVista);
    if (i < 1) return;
    const anterior = arbol[i - 1];
    // la rejilla: una seccion con una sola columna que acaba en boton
    const col = anterior.elType === 'section' && anterior.elements?.length === 1 ? anterior.elements[0] : null;
    if (!col) return;
    const hijos = col.elements || [];
    const boton = hijos.findIndex((h) => h.widgetType === 'button');
    if (boton < 0 || !hijos.slice(boton).every((h) => ['button', 'spacer'].includes(h.widgetType))) return;
    // delante del boton suele ir un espaciador: la ficha va antes de el
    let destino = boton;
    while (destino > 0 && hijos[destino - 1].widgetType === 'spacer') destino--;
    const vista = arbol.splice(i, 1)[0].elements[0];
    vista.settings = { ...(vista.settings || {}), _css_classes: 'r-vista-en-rejilla' };
    hijos.splice(destino, 0, vista);
  }

  /** La pagina con la caja nueva. El contenido es el mismo de la copia fiel. */
  function construyeRediseno({ pagina, ficha, cabecera, contenido }) {
    let cuerpo;
    if (pagina.conElementor) {
      // el primer bloque de cada pagina hace de portada
      cuerpo = contenido.replace(/^<(section|div) class="/, '<$1 class="r-heroe ');
      cuerpo = `<div class="elementor elementor-${pagina.id} r-contenido">${cuerpo}</div>`;
    } else {
      cuerpo =
        // el titulo va en <p>: la pagina real no tiene H1 y los encabezados no cambian
        `<div class="r-legal-cabeza"><div class="r-caja"><p class="r-legal-titulo">${pagina.titulo}</p></div></div>` +
        `<div class="r-caja r-legal">${contenido}</div>`;
    }
    const cuerpoFinal = anadidos.arreglaEnlaces(corrector.corrige(aRelativas(cuerpo)));
    const yaTieneFaq = ficha.cabeza.some((p) => p.tipo === 'scriptEnLinea' && String(p.js || '').includes('FAQPage'));
    // El <head> NO pasa por aRelativas: canonical y og:url siguen absolutas.
    return (
      `<!DOCTYPE html>\n<html lang="${ficha.lang}">\n<head>\n` +
      pintaCabezaRediseno(ficha, { extra: anadidos.datosParaGoogle(pagina, cuerpoFinal, yaTieneFaq) }) +
      `\n</head>\n<body class="r-cuerpo r-pagina-${pagina.slug}">\n` +
      // Toda la web va en una caja de ancho fijo y centrada: al alejar el
      // zoom o en pantallas grandes no se estira.
      `<div class="r-pagina">\n` +
      aRelativas(pintaCabecera(cabecera, pagina.ruta, anadidos.destinoDeMenu)) +
      `\n<main id="main">\n` +
      cuerpoFinal +
      `\n</main>\n` +
      anadidos.pintaZonas(pagina) +
      pintaCierre() +
      aRelativas(pintaPie(cabecera, { destinoDeMenu: anadidos.destinoDeMenu, guias: anadidos.guias })) +
      `\n</div>\n</body>\n</html>`
    );
  }

  /** Una pagina nueva (datos/nuevas/<slug>.json). Solo existe en el rediseno. */
  function construyeNueva(slug) {
    const g = anadidos.guias.find((x) => x.slug === slug);
    if (!g) throw new Error(`No conozco la guia ${slug}`);
    // lo comun a toda la web (iconos, verificaciones, Analytics) sale de la portada
    const ficha = JSON.parse(fs.readFileSync(path.join(DATOS, 'cabecera', 'renders.json'), 'utf8'));
    const cabecera = cabeceras.renders;
    return (
      `<!DOCTYPE html>\n<html lang="${ficha.lang}">\n<head>\n` +
      pintaCabezaRediseno(ficha, { propia: anadidos.cabezaDeGuia(g) }) +
      `\n</head>\n<body class="r-cuerpo r-pagina-guia">\n<div class="r-pagina">\n` +
      aRelativas(pintaCabecera(cabecera, `/${g.slug}/`, anadidos.destinoDeMenu)) +
      `\n<main id="main">\n` +
      anadidos.pintaGuia(g) +
      `\n</main>\n` +
      pintaCierre() +
      aRelativas(pintaPie(cabecera, { destinoDeMenu: anadidos.destinoDeMenu, guias: anadidos.guias })) +
      `\n</div>\n</body>\n</html>`
    );
  }

  // las guias solo existen en el rediseno
  const nuevas = modo === 'rediseno' ? anadidos.guias.map((g) => g.slug) : [];
  return { construye, construyeNueva, nuevas, paginas, erratas: corrector.recuento };
}
