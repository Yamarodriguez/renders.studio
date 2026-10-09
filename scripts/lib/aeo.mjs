/**
 * AEO - lo que necesitan los buscadores y las IA (ChatGPT, Claude,
 * Perplexity, Gemini...) para entrar, entender quien es Renders.studio y
 * citar sus paginas. Pedido por el propietario el 9-10-2026.
 *
 *   pintaResumen    recuadro "En resumen" bajo la portada: respuesta directa
 *                   y datos clave (servicio, precio, plazo, entrega, zona)
 *   ajustaJsonLd    datos de empresa completos y un solo nombre de marca;
 *                   quita la busqueda de WordPress, que no existe en estatico
 *   limpiaMarcado   quita del HTML lo que solo usaba Elementor (data-*) y los
 *                   <style> repetidos, que van a /estilo/bloques.css
 *   robots, sitemap, llms   los ficheros de /robots.txt, /sitemap.xml, /llms.txt
 *
 * Todo sale de datos/aeo.json. Solo cifras de la lista blanca: los precios de
 * /precios/ y el plazo de 15 dias.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DOMINIO = 'https://renders.studio';
const esc = (t) =>
  String(t).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const plano = (h) =>
  String(h)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;| /g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/** "70 € – 170 €" -> [70, 170] */
const rango = (t) => (String(t).match(/\d+/g) || []).map(Number);

export function creaAeo(raiz, paginas, anadidos) {
  const DATOS = path.join(raiz, 'datos');
  const aeo = JSON.parse(fs.readFileSync(path.join(DATOS, 'aeo.json'), 'utf8'));
  const fBloques = path.join(DATOS, 'bloques-css.json');
  const bloques = new Set(fs.existsSync(fBloques) ? JSON.parse(fs.readFileSync(fBloques, 'utf8')).hashes : []);
  const ORG_ID = `${DOMINIO}/#organization`;

  // ------------------------------------------------------------- resumen

  /** "Comunidad de Madrid" -> "la Comunidad de Madrid"; "Andalucía" se queda igual. */
  const conArticulo = (n) =>
    /^(Comunidad|Región)/.test(n) ? `la ${n}` : /^Islas/.test(n) ? `las ${n}` : /^País/.test(n) ? `el ${n}` : n;
  const deArticulo = (n) => `de ${conArticulo(n)}`.replace(/^de el /, 'del ');
  // "toda la Comunidad", "todas las Islas", "todo el País Vasco", "toda Andalucía"
  const toda = (n) => {
    const c = conArticulo(n);
    return c.startsWith('las ') ? `todas ${c}` : c.startsWith('el ') ? `todo ${c}` : `toda ${c}`;
  };

  function zonaDe(slug) {
    const s = anadidos.situa(slug);
    if (!s || s.papel === 'pais') return { texto: 'Online, para toda España', frase: 'en toda España' };
    if (s.papel === 'region') return { texto: `Online, para ${toda(s.grupo.nombre)}`, frase: `en ${toda(s.grupo.nombre)}` };
    const lugar = anadidos.lugarDe(slug);
    const varios = /^Otros/.test(s.grupo.nombre);
    return {
      texto: `Online, para ${lugar}${s.zona === 'espana' ? ' y toda España' : ''}`,
      frase: varios || s.zona !== 'espana' ? `en ${lugar}` : `en ${lugar} y el resto ${deArticulo(s.grupo.nombre)}`,
    };
  }

  /** La respuesta de una pagina original: escrita a mano o, si es de lugar, por plantilla. */
  function respuestaOriginal(pagina) {
    if (aeo.respuestas[pagina.slug]) return aeo.respuestas[pagina.slug];
    if (!anadidos.situa(pagina.slug)) return null;
    const z = zonaDe(pagina.slug);
    return (
      `${aeo.marca} hace renders 3D de arquitectura, interiores y exteriores para proyectos ${z.frase}. ` +
      `El servicio es online: nos envías los planos o el modelo 3D, revisas una vista previa y recibes el render final. ` +
      `El plazo habitual es de 15 días y un render interior cuesta entre 70 y 170 €.`
    );
  }

  /** La respuesta de una pagina nueva: el primer parrafo de su "¿Que son...?". */
  function respuestaNueva(g) {
    const s = g.secciones.find((x) => /^¿Qu[eé] (es|son)\b/.test(x.titulo)) || g.secciones[0];
    const p = plano((s.html.match(/<p>(.*?)<\/p>/s) || [null, s.html])[1]);
    const primera = (p.match(/^.*?[.!?](?=\s|$)/) || [p])[0];
    return `${primera} El plazo habitual es de 15 días y puede ser menor si el proyecto es urgente.`;
  }

  function pintaResumen({ servicio, respuesta, precio, zona }) {
    if (!respuesta) return '';
    const fila = (k, v) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`;
    return (
      `<aside class="r-resumen" aria-label="En resumen"><div class="r-caja r-resumen-in">` +
      `<div class="r-resumen-texto"><p class="r-etiqueta">En resumen</p><p class="r-resumen-respuesta">${esc(respuesta)}</p>` +
      `<p class="r-resumen-enlaces"><a href="/precios/">Ver todos los precios</a> · <a href="/presupuesto/">Pedir presupuesto</a></p></div>` +
      `<dl class="r-resumen-datos">` +
      fila('Servicio', servicio) +
      fila('Precio orientativo', precio) +
      fila('Plazo', aeo.plazo) +
      fila('Entrega', aeo.entrega) +
      fila('Zona', zona) +
      `</dl></div></aside>`
    );
  }

  const resumenOriginal = (pagina) =>
    pintaResumen({
      servicio: plano(pagina.titulo),
      respuesta: respuestaOriginal(pagina),
      precio: aeo.precios[pagina.slug] || aeo.precioPorDefecto,
      zona: zonaDe(pagina.slug).texto,
    });

  const resumenNueva = (g) =>
    g.tipo === 'servicio'
      ? pintaResumen({
          servicio: g.titulo,
          respuesta: respuestaNueva(g),
          precio: aeo.precios[g.slug] || aeo.precioPorDefecto,
          zona: 'Online, para toda España',
        })
      : '';

  // ------------------------------------------------------- datos de empresa

  const catalogo = () => ({
    '@type': 'OfferCatalog',
    name: `Servicios de ${aeo.marca}`,
    itemListElement: aeo.tabla.map(([nombre, precio]) => {
      const [min, max] = rango(precio);
      return {
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: nombre },
        priceSpecification: { '@type': 'PriceSpecification', priceCurrency: 'EUR', minPrice: min, maxPrice: max },
      };
    }),
  });

  /** La empresa, completa. Mismo @id que el de Yoast para que se fundan. */
  const organizacion = () => ({
    '@type': 'Organization',
    '@id': ORG_ID,
    name: aeo.marca,
    alternateName: ['Renders', 'Renders 3D', 'Renders Studio'],
    url: `${DOMINIO}/`,
    email: aeo.correo,
    description: aeo.lema,
    logo: { '@type': 'ImageObject', url: `${DOMINIO}/wp-content/uploads/2025/04/cropped-render.png`, width: 822, height: 281 },
    areaServed: { '@type': 'Country', name: 'España' },
    knowsAbout: aeo.servicios,
    contactPoint: { '@type': 'ContactPoint', contactType: 'presupuestos', email: aeo.correo, areaServed: 'ES', availableLanguage: 'es' },
    hasOfferCatalog: catalogo(),
  });

  /** Retoca el JSON-LD de Yoast que trae cada pagina original. */
  function ajustaJsonLd(js) {
    let d;
    try {
      d = JSON.parse(js);
    } catch {
      return js;
    }
    const nodos = d['@graph'] || [d];
    for (let i = 0; i < nodos.length; i++) {
      const n = nodos[i];
      if (n['@type'] === 'Organization') nodos[i] = { ...n, ...organizacion() };
      if (n['@type'] === 'WebSite') {
        delete n.potentialAction; // el buscador de WordPress (?s=) no existe en la web estatica
        n.name = aeo.marca;
        n.alternateName = 'Renders 3D';
        n.inLanguage = 'es';
      }
    }
    return JSON.stringify(d);
  }

  /** Empresa y sitio para las paginas nuevas, que no traen JSON-LD de Yoast. */
  const jsonLdEmpresa = () =>
    `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        organizacion(),
        { '@type': 'WebSite', '@id': `${DOMINIO}/#website`, url: `${DOMINIO}/`, name: aeo.marca, inLanguage: 'es', publisher: { '@id': ORG_ID } },
      ],
    })}</script>`;

  // ---------------------------------------------------------- marcado ligero

  const md5 = (t) => crypto.createHash('md5').update(t).digest('hex');

  /** Quita lo que solo servia a Elementor y los <style> que ya estan en bloques.css. */
  function limpiaMarcado(html) {
    return String(html)
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, (st) => (bloques.has(md5(st)) ? '' : st))
      .replace(/ data-(?:id|element_type|e-type|widget_type|settings|start|end|interaction-id)="[^"]*"/g, '');
  }

  // ------------------------------------------------- robots, sitemap y llms

  const indexables = () => paginas.filter((p) => !/^(aviso-legal|personalizar-cookies|politica-de-cookies|politica-de-privacidad)$/.test(p.slug));

  function robots() {
    return [
      '# Renders.studio',
      '# Todos los buscadores y asistentes de IA pueden leer la web.',
      '',
      'User-agent: *',
      'Allow: /',
      '',
      '# Asistentes de IA que buscan y citan (y los que entrenan modelos):',
      '# permitidos de forma explicita.',
      ...[
        'OAI-SearchBot', 'ChatGPT-User', 'GPTBot',
        'Claude-SearchBot', 'Claude-User', 'ClaudeBot',
        'PerplexityBot', 'Perplexity-User',
        'Google-Extended', 'Applebot-Extended', 'Bingbot', 'CCBot', 'meta-externalagent', 'MistralAI-User',
      ].flatMap((ua) => [`User-agent: ${ua}`, 'Allow: /', '']),
      `Sitemap: ${DOMINIO}/sitemap.xml`,
      '',
      `# Resumen para IA: ${DOMINIO}/llms.txt`,
      '',
    ].join('\n');
  }

  /** Fecha de modificacion de una pagina original (la de Yoast). */
  function fechaOriginal(p) {
    const f = path.join(DATOS, 'cabecera', `${p.slug}.json`);
    const ficha = JSON.parse(fs.readFileSync(f, 'utf8'));
    const m = ficha.cabeza.find((x) => x.tipo === 'meta' && /article:modified_time/.test(x.html));
    const v = m && /content="([^"]+)"/.exec(m.html);
    return v ? v[1].slice(0, 10) : null;
  }

  function sitemap() {
    const url = (loc, fecha) => `  <url><loc>${loc}</loc>${fecha ? `<lastmod>${fecha}</lastmod>` : ''}</url>`;
    const filas = [
      ...indexables().map((p) => url(DOMINIO + p.ruta, fechaOriginal(p))),
      ...anadidos.guias.map((g) => url(`${DOMINIO}/${g.slug}/`, g.actualizado)),
    ];
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${filas.join('\n')}\n</urlset>\n`;
  }

  function llms() {
    const linea = (titulo, ruta, desc) => `- [${titulo}](${DOMINIO}${ruta})${desc ? `: ${desc}` : ''}`;
    const servicios = anadidos.guias.filter((g) => g.tipo === 'servicio' && g.grupo !== 'tipo');
    const tipos = anadidos.guias.filter((g) => g.grupo === 'tipo');
    const guias = anadidos.guias.filter((g) => g.tipo !== 'servicio');
    const porSlug = Object.fromEntries(paginas.map((p) => [p.slug, p]));
    const generales = Object.keys(aeo.respuestas).filter((s) => porSlug[s]);
    const zonas = anadidos.zonas;
    return [
      `# ${aeo.marca}`,
      '',
      `> ${aeo.lema} Renders 3D de arquitectura, interiorismo y producto para ${aeo.clientes}.`,
      '',
      '## Datos clave',
      '',
      `- Empresa: ${aeo.marca} (${DOMINIO})`,
      `- Servicio: online, para toda España. También proyectos de otros países.`,
      `- Plazo: ${aeo.plazo}.`,
      `- Entrega: ${aeo.entrega.toLowerCase()}.`,
      `- Proceso: envías planos o modelo 3D y referencias, recibes una propuesta de precio y plazo, revisas una vista previa y recibes el render final.`,
      `- Contacto: ${aeo.correo} · ${DOMINIO}/presupuesto/`,
      '',
      '## Precios orientativos',
      '',
      ...aeo.tabla.map(([n, p]) => `- ${n}: ${p}`),
      `- Tabla completa: ${DOMINIO}/precios/`,
      '',
      '## Servicios',
      '',
      ...servicios.map((g) => linea(g.titulo, `/${g.slug}/`, g.descripcion)),
      '',
      '## Tipos de render',
      '',
      ...tipos.map((g) => linea(g.titulo, `/${g.slug}/`, g.descripcion)),
      '',
      '## Guías',
      '',
      ...guias.map((g) => linea(g.titulo, `/${g.slug}/`, g.descripcion)),
      '',
      '## Páginas principales',
      '',
      ...generales.map((s) => linea(plano(porSlug[s].titulo), porSlug[s].ruta, aeo.respuestas[s].split('. ')[0] + '.')),
      '',
      '## Zonas',
      '',
      linea('Renders en España', porSlug.espana.ruta, 'todas las regiones y ciudades'),
      ...zonas.espana.grupos.map((gr) =>
        gr.hub
          ? linea(`Renders en ${gr.nombre}`, porSlug[gr.hub].ruta, gr.paginas.map((s) => anadidos.lugarDe(s)).join(', '))
          : `- ${gr.nombre}: ${gr.paginas.map((s) => `[${anadidos.lugarDe(s)}](${DOMINIO}${porSlug[s].ruta})`).join(', ')}`
      ),
      ...zonas.otros.grupos.map((gr) => `- ${gr.nombre}: ${[...(gr.hub ? [gr.hub] : []), ...gr.paginas].map((s) => `[${anadidos.lugarDe(s)}](${DOMINIO}${porSlug[s].ruta})`).join(', ')}`),
      '',
      '## Para rastreadores',
      '',
      `- Mapa del sitio: ${DOMINIO}/sitemap.xml`,
      '',
    ].join('\n');
  }

  return { resumenOriginal, resumenNueva, ajustaJsonLd, jsonLdEmpresa, limpiaMarcado, robots, sitemap, llms, aeo };
}
