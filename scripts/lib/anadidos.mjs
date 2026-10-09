/**
 * ANADIDOS - lo nuevo que el rediseno pone ALREDEDOR del contenido original.
 *
 *   arreglaEnlaces   da destino a los botones que apuntaban a "#"
 *   pintaZonas       bloque de enlaces Espana -> region -> ciudad
 *   datosParaGoogle  JSON-LD: preguntas frecuentes y servicio
 *   pintaGuia        las paginas nuevas de datos/nuevas/*.json
 *
 * Todo sale de ficheros de datos (datos/enlaces.json, datos/zonas.json,
 * datos/nuevas/). El contenido original no se edita, y nada de esto se usa
 * en el modo fiel.
 *
 * El bloque de zonas va DESPUES de <main>: la comprobacion de encabezados
 * (paso 14) solo mira lo de dentro, y sigue comparando con la web real.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';

const DOMINIO = 'https://renders.studio';
const CORREO = 'Renders.studio3D@gmail.com';

const esc = (t) =>
  String(t).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const plano = (h) =>
  String(h)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;| /g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

export function creaAnadidos(raiz, paginas) {
  const DATOS = path.join(raiz, 'datos');
  const lee = (f, porDefecto) => (fs.existsSync(path.join(DATOS, f)) ? JSON.parse(fs.readFileSync(path.join(DATOS, f), 'utf8')) : porDefecto);
  const enlaces = lee('enlaces.json', { botones: {}, menu: {} });
  const zonas = lee('zonas.json', null);
  const porSlug = Object.fromEntries(paginas.map((p) => [p.slug, p]));

  const carpetaNuevas = path.join(DATOS, 'nuevas');
  const guias = fs.existsSync(carpetaNuevas)
    ? fs
        .readdirSync(carpetaNuevas)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((f) => JSON.parse(fs.readFileSync(path.join(carpetaNuevas, f), 'utf8')))
    : [];

  // ---------------------------------------------------------------- enlaces

  /** Da destino a los <a href="#"> y <a href=""> cuyo texto esta en la tabla. */
  function arreglaEnlaces(html, rutaActual = null) {
    const tabla = enlaces.botones || {};
    let salida = String(html).replace(/<a\b([^>]*?)href="(#|)"([^>]*)>([\s\S]*?)<\/a>/g, (todo, antes, _h, despues, dentro) => {
      const destino = tabla[plano(dentro).toLowerCase()];
      if (!destino || destino.startsWith('_')) return todo;
      return `<a${antes}href="${esc(destino)}"${despues}>${dentro}</a>`;
    });
    // enlaces a paginas que no existen
    const rotos = enlaces.rotos || {};
    salida = salida.replace(/href="([^"#?]+)"/g, (todo, h) => (rotos[h] && !h.startsWith('_') ? `href="${esc(rotos[h])}"` : todo));
    // las tarjetas de servicios y de tipos de render enlazan a su pagina
    // nueva (datos/enlaces.json, "tarjetas"); el texto del titulo no cambia
    const tarjetas = enlaces.tarjetas || {};
    // el titulo puede traer negritas dentro ("Modelado 3D <b>Huesca</b>")
    salida = salida.replace(/<(h[23]) class="(elementor-heading-title[^"]*)">((?:(?!<\/h[23]>|<a\b)[\s\S])*?)<\/\1>/g, (todo, n, clase, dentro) => {
      const t = plano(dentro).toLowerCase();
      let destino = tarjetas[t];
      // en las tarjetas de las paginas de lugar el titulo lleva la ciudad
      // detras ("Render Arquitectos Madrid"): vale la clave mas larga que lo
      // empiece, si lo que queda es solo un nombre de lugar (pocas palabras,
      // sin comas ni dos puntos). Asi no se enlazan los titulos de seccion.
      if (!destino) {
        const clave = Object.keys(tarjetas)
          .filter((k) => !k.startsWith('_') && t.startsWith(k + ' '))
          .filter((k) => {
            const resto = t.slice(k.length).trim();
            return !/[,:;?¿]/.test(resto) && resto.split(/\s+/).length <= (n === 'h3' ? 8 : 6);
          })
          .sort((a, b) => b.length - a.length)[0];
        destino = clave && tarjetas[clave];
      }
      if (!destino || destino.startsWith('_') || destino === rutaActual) return todo;
      return `<${n} class="${clase}"><a href="${esc(destino)}">${dentro}</a></${n}>`;
    });
    // el ancla de la galeria de proyectos de la pagina
    salida = salida.replace('<div class="elementor-image-gallery">', '<div class="elementor-image-gallery" id="proyectos">');
    return salida;
  }

  /** Destino de una entrada del menu que apuntaba a "#" y no tiene submenu. */
  function destinoDeMenu(texto) {
    const d = (enlaces.menu || {})[String(texto).toLowerCase()];
    return d && !d.startsWith('_') ? d : null;
  }

  // ------------------------------------------------------------------ zonas

  const nombreDe = (slug) => plano(porSlug[slug]?.titulo || slug);
  const lugarDe = (slug) => nombreDe(slug).replace(/^Renders?\s+/i, '');
  const enlace = (slug, actual) =>
    slug === actual
      ? `<li><span aria-current="page">${esc(nombreDe(slug))}</span></li>`
      : `<li><a href="${porSlug[slug].ruta}">${esc(nombreDe(slug))}</a></li>`;

  /** Donde cae una pagina en la jerarquia: {zona, grupo, papel}. */
  function situa(slug) {
    if (!zonas) return null;
    if (slug === zonas.espana.hub) return { papel: 'pais' };
    for (const zona of ['espana', 'otros']) {
      for (const grupo of zonas[zona].grupos) {
        if (grupo.hub === slug) return { zona, grupo, papel: 'region' };
        if (grupo.paginas.includes(slug)) return { zona, grupo, papel: 'ciudad' };
      }
    }
    return null;
  }

  function listaDeGrupo(grupo, actual) {
    const cabeza = grupo.hub
      ? `<a href="${porSlug[grupo.hub].ruta}">${esc(grupo.nombre)}</a>`
      : esc(grupo.nombre);
    return (
      `<div class="r-zona"><p class="r-zona-nombre">${cabeza}</p>` +
      `<ul>${grupo.paginas.map((s) => enlace(s, actual)).join('')}</ul></div>`
    );
  }

  /** El bloque de zonas de una pagina, o '' si no le toca. */
  function pintaZonas(pagina) {
    if (!zonas) return '';
    const esPortada = pagina.slug === 'renders';
    const sitio = esPortada ? { papel: 'pais' } : situa(pagina.slug);
    if (!sitio) return '';
    const rutaEspana = porSlug[zonas.espana.hub].ruta;
    let titulo;
    let intro;
    let cuerpo;

    if (sitio.papel === 'pais') {
      titulo = 'Renders en toda España, zona a zona';
      intro = 'El servicio es online, así que trabajamos igual para un proyecto de cualquier provincia. Estas son las páginas de cada zona.';
      cuerpo = `<div class="r-zonas-rejilla">${zonas.espana.grupos.map((g) => listaDeGrupo(g, pagina.slug)).join('')}</div>`;
      if (!esPortada) {
        cuerpo += `<p class="r-zonas-otras">También fuera de España: ${zonas.otros.grupos
          .flatMap((g) => [...(g.hub ? [g.hub] : []), ...g.paginas.filter((s) => !g.hub)])
          .map((s) => `<a href="${porSlug[s].ruta}">${esc(nombreDe(s))}</a>`)
          .join(' · ')}</p>`;
      }
    } else {
      const { grupo, zona } = sitio;
      const varios = /^Otros/.test(grupo.nombre);
      titulo = varios
        ? 'Renders en otros países'
        : sitio.papel === 'region'
          ? `Renders en ${grupo.nombre}: todas las zonas`
          : `Renders en ${grupo.nombre}: otras zonas`;
      intro = varios
        ? 'El servicio es online: estas son las demás páginas de fuera de España.'
        : `El servicio es online, así que trabajamos igual para cualquier punto de ${grupo.nombre}. Estas son las páginas de la zona.`;
      const subir = [];
      if (grupo.hub && grupo.hub !== pagina.slug) subir.push(`<a href="${porSlug[grupo.hub].ruta}">${esc(nombreDe(grupo.hub))}</a>`);
      if (zona === 'espana') subir.push(`<a href="${rutaEspana}">${esc(nombreDe(zonas.espana.hub))}</a>`);
      cuerpo =
        `<ul class="r-zonas-lista">${grupo.paginas.map((s) => enlace(s, pagina.slug)).join('')}</ul>` +
        (subir.length ? `<p class="r-zonas-otras">Ver también: ${subir.join(' · ')}</p>` : '');
      if (sitio.papel === 'region' && zona === 'espana') {
        const otras = zonas.espana.grupos.filter((g) => g.hub && g.hub !== pagina.slug);
        cuerpo += `<p class="r-zonas-otras">Otras regiones: ${otras.map((g) => `<a href="${porSlug[g.hub].ruta}">${esc(g.nombre)}</a>`).join(' · ')}</p>`;
      }
    }

    return (
      `\n<section class="r-zonas" aria-labelledby="r-zonas-titulo"><div class="r-caja">` +
      `<p class="r-etiqueta">Zonas</p>` +
      `<h2 id="r-zonas-titulo">${esc(titulo)}</h2>` +
      `<p class="r-zonas-intro">${esc(intro)}</p>` +
      cuerpo +
      `</div></section>`
    );
  }

  // ------------------------------------------------------- datos para Google

  /** JSON-LD de una pagina original: preguntas frecuentes y servicio. */
  function datosParaGoogle(pagina, cuerpo, yaTieneFaq) {
    const out = [];
    // /precios/ ya trae su FAQPage escrito dentro del propio texto
    if (!yaTieneFaq && !cuerpo.includes('"FAQPage"') && cuerpo.includes('faq-item')) {
      const items = parse(cuerpo)
        .querySelectorAll('.faq-item')
        .map((it) => ({ q: plano(it.querySelector('.faq-question')?.text || ''), a: plano(it.querySelector('.faq-answer')?.text || '') }))
        .filter((x) => x.q && x.a);
      if (items.length) {
        out.push({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: items.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })),
        });
      }
    }
    if (pagina.conElementor) {
      const sitio = situa(pagina.slug);
      const zona = !sitio || sitio.papel === 'pais' ? 'España' : sitio.papel === 'region' ? sitio.grupo.nombre : lugarDe(pagina.slug);
      out.push({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: plano(pagina.titulo),
        serviceType: 'Renders 3D y visualización arquitectónica',
        url: DOMINIO + pagina.ruta,
        areaServed: zona,
        provider: { '@type': 'Organization', name: 'Renders.studio', url: DOMINIO + '/', email: CORREO },
      });
    }
    return out.map((d) => `<script type="application/ld+json">${JSON.stringify(d)}</script>`).join('\n');
  }

  // ------------------------------------------------------------------ guias

  /** Una tarjeta con foto (misma pinta que las de servicios y tipos). */
  const tarjeta = (t) =>
    `<div class="r-tarjeta" style="--fondo:url('${esc(t.foto)}')">` +
    (t.href ? `<a class="r-tarjeta-enlace" href="${esc(t.href)}">` : '<div class="r-tarjeta-enlace">') +
    `<span class="r-tarjeta-titulo">${esc(t.titulo)}</span>` +
    (t.texto ? `<span class="r-tarjeta-texto">${esc(t.texto)}</span>` : '') +
    (t.href ? '</a>' : '</div>') +
    `</div>`;

  /** El <main> de una pagina nueva: guia o servicio (datos/nuevas/*.json). */
  function seccionHtml(s) {
      const n = s.nivel === 'h3' ? 'h3' : 'h2';
      let dentro = s.html || '';
      if (s.tarjetas) dentro += `<div class="r-tarjetas">${s.tarjetas.map(tarjeta).join('')}</div>`;
      if (s.pasos) {
        dentro += `<ol class="r-pasos">${s.pasos
          .map((x) => `<li><strong>${esc(x.titulo)}</strong><span>${x.texto}</span></li>`)
          .join('')}</ol>`;
      }
      if (s.precios) {
        dentro +=
          `<table class="r-precios"><thead><tr><th>Servicio</th><th>Precio orientativo</th></tr></thead><tbody>` +
          s.precios.map((x) => `<tr><td>${esc(x.servicio)}</td><td>${esc(x.precio)}</td></tr>`).join('') +
          `</tbody></table>`;
      }
      if (s.galeria) {
        dentro += `<div class="r-galeria">${s.galeria
          .map((x) => `<figure><img src="${esc(x.foto)}" alt="${esc(x.alt)}" loading="lazy" width="800" height="600"></figure>`)
          .join('')}</div>`;
      }
      return `<${n}>${esc(s.titulo)}</${n}>${dentro}`;
  }

  function pintaGuia(g) {
    const esServicio = g.tipo === 'servicio';
    const otras = guias.filter((x) => x.slug !== g.slug && (x.tipo === 'servicio') === esServicio);
    const seccion = seccionHtml;
    return (
      `<div class="r-guia${esServicio ? ' r-servicio' : ''}">` +
      `<div class="r-guia-cabeza"><div class="r-caja r-guia-cabeza-in">` +
      `<div><p class="r-etiqueta">${esc(g.etiqueta || (esServicio ? 'Servicio' : 'Guía'))}</p><h1>${esc(g.titulo)}</h1>` +
      `<h2 class="r-guia-entrada">${esc(g.intro.h2)}</h2>${g.intro.html}` +
      (esServicio ? `<p class="r-guia-botones"><a class="r-boton r-boton-acento" href="/presupuesto/">Pedir presupuesto</a><a class="r-boton r-boton-linea" href="/precios/">Ver precios</a></p>` : '') +
      `</div>` +
      (g.foto ? `<img class="r-guia-foto" src="${esc(g.foto)}" alt="${esc(g.fotoAlt || '')}" width="800" height="600">` : '') +
      `</div></div>` +
      `<div class="r-caja r-guia-cuerpo">${g.secciones.map(seccion).join('\n')}` +
      `<h2>${esc(g.faq.titulo)}</h2><div class="r-guia-faq">${g.faq.items
        .map((it) => `<details><summary><h3>${esc(it.pregunta)}</h3></summary><p>${it.respuesta}</p></details>`)
        .join('')}</div>` +
      (otras.length
        ? `<aside class="r-guia-otras"><p class="r-etiqueta">${esServicio ? 'Otros servicios' : 'Otras guías'}</p><ul>${otras
            .map((x) => `<li><a href="/${x.slug}/">${esc(x.titulo)}</a></li>`)
            .join('')}</ul></aside>`
        : '') +
      `</div></div>`
    );
  }

  /**
   * El bloque SEO propio de un servicio, para meterlo al principio de una
   * pagina clonada de /hiperrealistas/: su h2 de entrada y las secciones de
   * texto (que es, para que sirve, que incluye, tipos). Proceso, precios y
   * ejemplos no van: la plantilla ya trae los suyos.
   */
  function pintaBloqueSeo(g, { sinEntrada = false } = {}) {
    const secciones = g.secciones.filter((x) => !x.pasos && !x.precios && !x.galeria);
    return (
      `<section class="r-seo-servicio"><div class="r-guia r-servicio"><div class="r-caja r-guia-cuerpo">` +
      `<p class="r-etiqueta">${esc(g.etiqueta || 'Servicio')}</p>` +
      (sinEntrada ? '' : `<h2>${esc(g.intro.h2)}</h2>${g.intro.html}`) +
      `<p class="r-guia-botones"><a class="r-boton r-boton-acento" href="/presupuesto/">Pedir presupuesto</a><a class="r-boton r-boton-linea" href="/precios/">Ver precios</a></p>` +
      secciones.map(seccionHtml).join('\n') +
      `</div></div></section>`
    );
  }

  /** Las preguntas del servicio, con el marcado del acordeon de la plantilla. */
  const faqItemsHtml = (g) =>
    g.faq.items
      .map(
        (it) =>
          `<div class="faq-item"><h3 class="faq-question">${esc(it.pregunta)}</h3><div class="faq-answer"><p>${it.respuesta}</p></div></div>`
      )
      .join('');

  /** El <head> propio de una guia (titulo, descripcion, canonica y JSON-LD). */
  function cabezaDeGuia(g, { sinFaq = false } = {}) {
    const url = `${DOMINIO}/${g.slug}/`;
    const ld = [
      g.tipo === 'servicio'
        ? {
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: g.titulo,
            serviceType: g.titulo,
            description: g.descripcion,
            url,
            areaServed: 'España',
            ...(g.actualizado ? { dateModified: g.actualizado } : {}),
            ...(g.foto ? { image: DOMINIO + g.foto } : {}),
            provider: { '@type': 'Organization', name: 'Renders.studio', url: DOMINIO + '/', email: CORREO },
          }
        : {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: g.titulo,
        description: g.descripcion,
        inLanguage: 'es-ES',
        mainEntityOfPage: url,
        ...(g.actualizado ? { dateModified: g.actualizado } : {}),
        ...(g.foto ? { image: DOMINIO + g.foto } : {}),
        author: { '@type': 'Organization', name: 'Renders.studio', url: DOMINIO + '/' },
        publisher: { '@type': 'Organization', name: 'Renders.studio', url: DOMINIO + '/' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Renders', item: DOMINIO + '/' },
          { '@type': 'ListItem', position: 2, name: g.titulo, item: url },
        ],
      },
      !sinFaq && {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: g.faq.items.map((it) => ({
          '@type': 'Question',
          name: it.pregunta,
          acceptedAnswer: { '@type': 'Answer', text: plano(it.respuesta) },
        })),
      },
    ].filter(Boolean);
    return [
      `<title>${esc(g.tituloSeo)}</title>`,
      `<meta name="description" content="${esc(g.descripcion)}">`,
      `<link rel="canonical" href="${url}">`,
      `<meta name="robots" content="index, follow, max-image-preview:large">`,
      `<meta property="og:locale" content="es_ES">`,
      `<meta property="og:type" content="article">`,
      `<meta property="og:title" content="${esc(g.tituloSeo)}">`,
      `<meta property="og:description" content="${esc(g.descripcion)}">`,
      `<meta property="og:url" content="${url}">`,
      `<meta property="og:site_name" content="Renders">`,
      ...(g.foto ? [`<meta property="og:image" content="${DOMINIO + g.foto}">`] : []),
      `<meta name="twitter:card" content="summary_large_image">`,
      ...ld.map((d) => `<script type="application/ld+json">${JSON.stringify(d)}</script>`),
    ].join('\n');
  }

  return { arreglaEnlaces, destinoDeMenu, pintaZonas, datosParaGoogle, pintaGuia, pintaBloqueSeo, faqItemsHtml, cabezaDeGuia, guias, situa, lugarDe, zonas };
}
