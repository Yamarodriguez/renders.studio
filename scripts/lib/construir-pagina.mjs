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

export function creaConstructor(raiz = process.cwd()) {
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
    // FASE 2 — el rediseño. Van las ULTIMAS, despues de OceanWP y de
    // Elementor, para que ganen siempre. Si se quitan estas dos lineas, la
    // web vuelve exactamente a como estaba en la Fase 1.
    out.push('<link rel="stylesheet" id="rs-rediseno" href="/rediseno.css" media="all">');
    out.push('<link rel="stylesheet" id="rs-contraste" href="/contraste.css" media="all">');
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

    let contenido;
    let envoltorio;
    if (pagina.conElementor) {
      const datos = JSON.parse(fs.readFileSync(path.join(DATOS, 'paginas', `${slug}.json`), 'utf8'));
      const ctx = { slug, contador: { imagenes: 0, sinLazy: new Set() } };
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

  return { construye, paginas };
}
