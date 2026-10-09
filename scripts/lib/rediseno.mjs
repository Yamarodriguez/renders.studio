/**
 * REDISENO - la caja nueva alrededor del contenido.
 *
 * Cabecera, franja de cierre y pie nuevos, y un <head> limpio: se quedan las
 * etiquetas de SEO, la verificacion de Google y Bing, los datos estructurados
 * y Analytics; se van las 317 hojas y los scripts de WordPress. El aspecto lo
 * pone public/estilo/diseno.css.
 *
 * El contenido de cada pagina NO cambia: ni un texto, ni un titulo, ni un
 * enlace. Los textos nuevos de aqui (cabecera, cierre y pie) solo dicen lo
 * que la web ya dice: servicios que ya ofrece y el correo que ya publica.
 */

import { parse } from 'node-html-parser';

const DOMINIO = 'https://renders.studio';
const CORREO = 'Renders.studio3D@gmail.com';
const LOGO = '/wp-content/uploads/2025/04/cropped-render.png';
const ESTILO = '/estilo/diseno.css?v=6';

/** Piezas del <head> de WordPress que se conservan. */
function seConserva(p) {
  if (p.tipo === 'titulo') return true;
  if (p.tipo === 'meta') return !/name="generator"/.test(p.html);
  if (p.tipo === 'link') return /rel="(canonical|icon|apple-touch-icon)"/.test(p.html);
  if (p.tipo === 'script') return /googletagmanager\.com\/gtag/.test(p.src || '');
  if (p.tipo === 'scriptEnLinea') {
    const js = String(p.js || '').trim();
    // datos estructurados de Yoast y la configuracion de Analytics
    return js.startsWith('{') && js.includes('schema.org') ? 'jsonld' : /gtag\('config'/.test(js);
  }
  return false;
}

/**
 * El <head> del rediseno.
 *   extra   HTML que se anade al final (JSON-LD de preguntas y servicio)
 *   propia  para las paginas nuevas: su titulo, descripcion, canonica y
 *           JSON-LD. De la ficha solo se toman entonces lo comun a toda la
 *           web: iconos, verificaciones de Google y Bing, y Analytics.
 */
export function pintaCabezaRediseno(ficha, { extra = '', propia = '', ajustaLd = (js) => js, descripcion = '' } = {}) {
  const out = [];
  const comun = (p) =>
    (p.tipo === 'meta' && /charset|viewport|google-site-verification|msvalidate/.test(p.html)) ||
    (p.tipo === 'link' && /rel="(icon|apple-touch-icon)"/.test(p.html)) ||
    p.tipo === 'script' ||
    (p.tipo === 'scriptEnLinea' && /gtag\('config'/.test(String(p.js || '')));
  for (const p of ficha.cabeza) {
    const queda = seConserva(p);
    if (!queda) continue;
    if (propia && !comun(p)) continue;
    if (p.tipo === 'titulo') out.push(`<title>${p.texto}</title>`);
    else if (descripcion && p.tipo === 'meta' && /(name="description"|property="og:description")/.test(p.html))
      // descripcion corregida a mano (datos/aeo.json, "metadatos")
      out.push(p.html.replace(/content="[^"]*"/, `content="${descripcion.replaceAll('"', '&quot;')}"`));
    else if (p.tipo === 'meta' || p.tipo === 'link') out.push(p.html);
    else if (p.tipo === 'script') out.push(`<script async src="${p.src}"></script>`);
    else if (queda === 'jsonld') out.push(`<script type="application/ld+json">${ajustaLd(p.js)}</script>`);
    else out.push(`<script>${p.js}</script>`);
  }
  out.push(
    `<link rel="preload" href="/estilo/fuentes/archivo-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>`,
    `<link rel="preload" href="/estilo/fuentes/ibm-plex-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>`,
    // los iconos de "por que elegirnos" y del proceso de trabajo
    `<link rel="stylesheet" href="/wp-content/themes/oceanwp/assets/fonts/fontawesome/css/all.min.css">`,
    // los <style> que el contenido traia repetidos en cada pagina
    `<link rel="stylesheet" href="/estilo/bloques.css?v=1">`,
    `<link rel="stylesheet" href="${ESTILO}">`
  );
  if (propia) out.splice(2, 0, propia);
  if (extra) out.push(extra);
  return out.join('\n');
}

// ------------------------------------------------------------------ menu

/**
 * El menu principal, sacado de la cabecera capturada de la web real: mismos
 * textos, mismos enlaces y mismo orden. Solo se quitan las flechas de Font
 * Awesome y el boton de busqueda, que no existe en la web estatica.
 */
function leeMenu(cabeceraHtml, destinoDeMenu = () => null) {
  const raiz = parse(cabeceraHtml);
  const ul = raiz.querySelector('ul.main-menu');
  const items = [];
  const lee = (li) => {
    const a = li.childNodes.find((x) => x.tagName === 'A');
    if (!a) return null;
    const texto = a.text.replace(/\s+/g, ' ').trim();
    let href = a.getAttribute('href') || '#';
    const sub = li.childNodes.find((x) => x.tagName === 'UL');
    const hijos = sub ? sub.childNodes.filter((x) => x.tagName === 'LI').map(lee).filter(Boolean) : [];
    // entradas que en WordPress apuntaban a "#" y no abren submenu:
    // su destino sale de datos/enlaces.json
    if (href === '#' && !hijos.length) href = destinoDeMenu(texto) || '#';
    return { texto, href, hijos };
  };
  for (const li of ul.childNodes.filter((x) => x.tagName === 'LI')) {
    if (/search/.test(li.getAttribute('class') || '')) continue;
    const it = lee(li);
    if (it && it.texto && !/b[uú]squeda/i.test(it.texto)) items.push(it);
  }
  return items;
}

const esc = (t) => String(t).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/** Todos los enlaces de un item y sus nietos, en orden. */
function aplana(it) {
  return it.hijos.flatMap((h) => [h, ...aplana(h)]);
}

function pintaMenu(items, ruta) {
  const actual = (href) => href === DOMINIO + ruta;
  const li = (it, nivel) => {
    const hijos = nivel === 0 ? aplana(it) : [];
    const activo = actual(it.href) || hijos.some((h) => actual(h.href));
    const clases = ['r-nav-item', hijos.length ? 'r-con-sub' : '', activo ? 'r-activo' : ''].filter(Boolean).join(' ');
    const enlace =
      it.href === '#'
        ? `<button type="button" class="r-nav-enlace" aria-haspopup="true">${esc(it.texto)}</button>`
        : `<a class="r-nav-enlace" href="${esc(it.href)}"${actual(it.href) ? ' aria-current="page"' : ''}>${esc(it.texto)}</a>`;
    if (!hijos.length) return `<li class="${clases}">${enlace}</li>`;
    const mega = hijos.length > 12 ? ' r-mega' : '';
    return (
      `<li class="${clases}">${enlace}` +
      `<ul class="r-sub${mega}">` +
      hijos.map((h) => `<li><a href="${esc(h.href)}"${actual(h.href) ? ' aria-current="page"' : ''}>${esc(h.texto)}</a></li>`).join('') +
      `</ul></li>`
    );
  };
  return `<ul class="r-nav">${items.map((it) => li(it, 0)).join('')}</ul>`;
}

export function pintaCabecera(cabeceraHtml, ruta, destinoDeMenu, guias = []) {
  const items = leeMenu(cabeceraHtml, destinoDeMenu);
  // Las paginas nuevas entran en el menu (solo en la cabecera, no en el pie):
  // los servicios en "Servicios" y los tipos de render en "Tipos", detras de
  // lo que ya tenia WordPress.
  const anade = (texto, lista) => {
    const it = items.find((i) => i.texto.toLowerCase() === texto);
    if (!it) return;
    const ya = new Set(aplana(it).map((h) => h.href));
    for (const g of lista) {
      const href = `${DOMINIO}/${g.slug}/`;
      if (!ya.has(href)) it.hijos.push({ texto: g.titulo, href, hijos: [] });
    }
  };
  anade('servicios', guias.filter((g) => g.tipo === 'servicio' && !g.grupo));
  anade('tipos', guias.filter((g) => g.grupo === 'tipo'));
  const menu = pintaMenu(items, ruta);
  return `
<a class="r-saltar" href="#main">Ir al contenido</a>
<div class="r-barra">
  <div class="r-caja r-barra-in">
    <span class="r-barra-lema">Visualización arquitectónica y renders 3D</span>
    <a class="r-barra-correo" href="mailto:${CORREO}">${CORREO}</a>
  </div>
</div>
<header class="r-cabecera">
  <div class="r-caja r-cabecera-in">
    <a class="r-logo" href="/" rel="home"><img src="${LOGO}" width="822" height="281" alt="Renders.studio"></a>
    <nav class="r-menu" aria-label="Menú principal">
      <details class="r-menu-movil">
        <summary aria-label="Abrir el menú"><span></span><span></span><span></span></summary>
        ${menu}
      </details>
      <div class="r-menu-escritorio">${menu}</div>
    </nav>
    <a class="r-boton r-boton-acento r-cabecera-cta" href="/presupuesto/">Pedir presupuesto</a>
  </div>
</header>`;
}

// ----------------------------------------------------------------- cierre

export function pintaCierre() {
  return `
<section class="r-cierre" aria-labelledby="r-cierre-titulo">
  <div class="r-caja r-cierre-in">
    <div class="r-cierre-texto">
      <p class="r-etiqueta">Presupuesto a medida</p>
      <p class="r-cierre-titulo" id="r-cierre-titulo">¿Tienes un proyecto que quieras ver antes de construirlo?</p>
      <p class="r-cierre-sub">Envíanos los planos o una referencia y te preparamos un presupuesto para tus renders.</p>
      <div class="r-cierre-botones">
        <a class="r-boton r-boton-acento" href="/presupuesto/">Pedir presupuesto</a>
        <a class="r-boton r-boton-linea" href="mailto:${CORREO}">Escribir un correo</a>
      </div>
    </div>
    <ul class="r-cierre-datos">
      <li><span class="r-etiqueta">Renders</span><a href="/hiperrealistas/">Exteriores e interiores hiperrealistas</a></li>
      <li><span class="r-etiqueta">Modelado</span><a href="/servicios/">Modelado 3D, planos e infografías</a></li>
      <li><span class="r-etiqueta">Precios</span><a href="/precios/">Consulta nuestras tarifas</a></li>
    </ul>
  </div>
</section>`;
}

// -------------------------------------------------------------------- pie

export function pintaPie(cabeceraHtml, { destinoDeMenu, guias = [] } = {}) {
  const items = leeMenu(cabeceraHtml, destinoDeMenu);
  const por = (t) => items.find((i) => i.texto.toLowerCase() === t);
  const columna = (titulo, enlaces) =>
    enlaces.length
      ? `<div class="r-pie-col"><p class="r-etiqueta">${esc(titulo)}</p><ul>${enlaces
          .map((e) => `<li><a href="${esc(e.href)}">${esc(e.texto)}</a></li>`)
          .join('')}</ul></div>`
      : '';
  const sueltos = items.filter((i) => !i.hijos.length && i.href !== '#');
  const cols = [
    columna('Renders.studio', sueltos),
    columna('Tipos', aplana(por('tipos') || { hijos: [] })),
    columna('Servicios', aplana(por('servicios') || { hijos: [] })),
    // los tipos de render (grupo 'tipo') ya se enlazan desde sus tarjetas: no van al pie
    columna('Servicios 3D', guias.filter((g) => g.tipo === 'servicio' && !g.grupo).map((g) => ({ texto: g.titulo, href: `/${g.slug}/` }))),
    columna('Guías', guias.filter((g) => g.tipo !== 'servicio').map((g) => ({ texto: g.titulo, href: `/${g.slug}/` }))),
    columna('Contacto', [
      ...(por('contacto') && por('contacto').href !== '#' ? [por('contacto')] : []),
      ...aplana(por('contacto') || { hijos: [] }),
      { texto: CORREO, href: `mailto:${CORREO}` },
    ]),
  ].join('');
  const anio = new Date().getFullYear();
  return `
<footer class="r-pie">
  <div class="r-caja">
    <div class="r-pie-arriba">
      <a class="r-pie-logo" href="/" aria-label="Renders.studio, inicio">Renders<span>.studio</span></a>
      <p class="r-pie-lema">Renders 3D y visualización arquitectónica para arquitectos, interioristas y promotoras.</p>
    </div>
    <div class="r-pie-cols">${cols}</div>
    <div class="r-pie-abajo">
      <span>© ${anio} Renders.studio</span>
      <span class="r-pie-legal">
        <a href="/aviso-legal/">Aviso legal</a>
        <a href="/politica-de-privacidad/">Política de privacidad</a>
        <a href="/politica-de-cookies/">Política de cookies</a>
      </span>
    </div>
  </div>
</footer>`;
}
