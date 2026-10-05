/**
 * MOTOR DE RENDER - estructura de Elementor.
 *
 * Pinta el arbol de `_elementor_data` con el MISMO marcado que genera
 * Elementor en la web en vivo. Las reglas de aqui no estan inventadas: salen
 * de comparar el HTML real de las 13 paginas de referencia con su arbol, y
 * el script 06 comprueba etiqueta a etiqueta que no nos hemos desviado.
 *
 * Esta version cubre el ARMAZON de la pagina:
 *   section -> column -> widget      (Elementor clasico)
 *   container                        (Elementor nuevo, flexbox)
 * El contenido de cada widget lo pone render-widgets.mjs.
 *
 * Reglas que NO se pueden perder (lecciones de la migracion anterior):
 *   - la seccion con velo lleva DENTRO un <div class="elementor-background-overlay"></div>
 *     vacio; sin el, el velo desaparece
 *   - el ancho de columna sale de _inline_size, que unas veces viene como
 *     diccionario {size:67.28} y otras como numero pelado 67.28
 *   - "ancho completo" es una CLASE, no CSS
 */

/** Las unicas claves que Elementor saca a data-settings en esta web. */
const AL_FRENTE = {
  section: ['background_background', 'shape_divider_top', 'shape_divider_top_negative', 'shape_divider_bottom', 'shape_divider_bottom_negative'],
  container: ['background_background', 'shape_divider_top', 'shape_divider_top_negative', 'shape_divider_bottom', 'shape_divider_bottom_negative'],
  column: ['background_background', 'animation', 'animation_delay'],
  widget: ['_animation', '_animation_delay'],
};

/** Escapa un texto para meterlo en un atributo HTML, como hace WordPress. */
export function attr(v) {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/** El numero que Elementor guarda a veces como {size:n} y a veces como n. */
export function medida(v) {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return v === '' ? null : Number(v);
  if (typeof v === 'object' && v.size !== undefined && v.size !== '') return Number(v.size);
  return null;
}

/** El data-settings de un elemento, o cadena vacia si no lleva. */
function datosAlFrente(n) {
  const s = n.settings || {};
  const claves = AL_FRENTE[n.elType] || [];
  const salida = {};
  // Se recorre el objeto guardado, no la lista: Elementor escribe las claves
  // en el orden en que estan en la base de datos, y el orden se compara.
  for (const k of Object.keys(s)) {
    if (!claves.includes(k)) continue;
    const v = s[k];
    if (v === undefined || v === null || v === '') continue;
    // el retardo solo sale si hay animacion
    if ((k === '_animation_delay' && !s._animation) || (k === 'animation_delay' && !s.animation)) continue;
    salida[k] = v;
  }
  if (!Object.keys(salida).length) return '';
  return ` data-settings="${attr(JSON.stringify(salida))}"`;
}

/** Las clases sueltas que el autor escribio a mano en el elemento. */
function clasesPropias(s) {
  const c = s._css_classes || s.css_classes || '';
  return String(c).split(/\s+/).filter(Boolean);
}

/** Lleva velo de fondo? */
export function tieneVelo(s) {
  return Boolean(
    s.background_overlay_background ||
      s.background_overlay_color ||
      s.background_overlay_image?.url ||
      s.background_overlay_opacity !== undefined
  );
}

/** El div vacio del velo. Sin el, la regla del CSS no tiene a que aplicarse. */
function velo(s) {
  return tieneVelo(s) ? '<div class="elementor-background-overlay"></div>' : '';
}

/** Las formas de separacion (las "olas" de arriba y abajo de una seccion). */
function formas(s) {
  let out = '';
  for (const lado of ['top', 'bottom']) {
    const f = s[`shape_divider_${lado}`];
    if (!f) continue;
    out += `<div class="elementor-shape elementor-shape-${lado}" data-negative="${s[`shape_divider_${lado}_negative`] ? 'true' : 'false'}"></div>`;
  }
  return out;
}


// ------------------------------------------------------- modo rediseno
//
// Con ctx.rediseno = true el armazon lleva, ademas de su marcado de
// Elementor, unas pocas pistas para la hoja nueva (public/estilo/diseno.css):
//   r-tono-*   si el bloque es oscuro, claro, suave o una foto
//   --w        el ancho de la columna o caja, que antes ponia post-ID.css
//   --fondo    la foto de fondo, si la hay
// Los colores de Elementor NO se copian: solo se usan para decidir el tono.
// Sin ctx.rediseno no cambia nada y la copia fiel sigue identica.

/** Un color de Elementor (#rgb, #rrggbb, #rrggbbaa, rgb(a)) -> {r,g,b,a}. */
function color(v) {
  const t = String(v || '').trim();
  let m = /^#([0-9a-f]{3,8})$/i.exec(t);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  m = /^rgba?\(([^)]+)\)$/i.exec(t);
  if (m) {
    const [r, g, b, a = 1] = m[1].split(',').map((x) => Number(x.trim()));
    return { r, g, b, a };
  }
  return null;
}

/** Luminancia relativa (0 negro, 1 blanco). */
function luz({ r, g, b }) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** El tono de un bloque: 'foto', 'oscuro', 'suave', 'claro' o null (hereda). */
function tono(s) {
  const foto = s.background_image?.url;
  let velo = null;
  if (tieneVelo(s) && s.background_overlay_color) {
    velo = color(s.background_overlay_color);
    if (velo) velo.a *= medida(s.background_overlay_opacity) ?? 0.5;
  }
  if (foto) {
    // velo claro encima de la foto = textura de fondo: se trata como claro
    if (velo && luz(velo) > 0.6) return 'suave';
    return 'foto';
  }
  const fondo = color(s.background_color);
  if (fondo && fondo.a >= 0.5) {
    const l = luz(fondo);
    if (l < 0.2) return 'oscuro';
    if (l > 0.97) return 'claro';
    return 'suave';
  }
  if (velo && velo.a >= 0.5 && luz(velo) < 0.2) return 'oscuro';
  return null;
}

/** Hay texto (titulo, parrafo, boton) dentro, a cualquier profundidad? */
function llevaTexto(n) {
  return (n.elements || []).some((h) =>
    h.elType === 'widget'
      ? ['heading', 'text-editor', 'button', 'icon-list', 'eael-contact-form-7'].includes(h.widgetType)
      : llevaTexto(h)
  );
}

/** Texto plano de un widget de texto, para medir si es un antetitulo. */
function textoPlano(html) {
  return String(html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

/**
 * Un parrafo corto justo antes de un titulo es un antetitulo
 * ("RENDERS MADRID" encima de "Renders Madrid"). Se marca para darle la
 * letra pequena de etiqueta. El texto no cambia.
 */
function marcaAntetitulos(hijos) {
  const ws = (hijos || []).filter((h) => !(h.elType === 'widget' && h.widgetType === 'spacer'));
  for (let i = 0; i < ws.length - 1; i++) {
    const a = ws[i];
    const b = ws[i + 1];
    if (a.elType !== 'widget' || a.widgetType !== 'text-editor') continue;
    if (b.elType !== 'widget' || b.widgetType !== 'heading') continue;
    const t = textoPlano(a.settings?.editor);
    if (t && t.length <= 70 && !/<(style|table|ul|img)/i.test(a.settings?.editor || '')) a._antetitulo = true;
  }
}

/** Clases y estilo extra de un bloque en modo rediseno. */
function pistas(n, ctx, { ancho = null, extra = [] } = {}) {
  if (!ctx.rediseno) return { clases: '', estilo: '' };
  const s = n.settings || {};
  const c = [...extra];
  const vars = [];
  const t = tono(s);
  if (t) c.push(`r-tono-${t}`);
  if (t === 'foto') {
    // algunas fotos estan guardadas en http://: se pasan a https para que
    // construir-pagina las convierta en relativas como a las demas
    const url = String(s.background_image.url).replace(/^http:\/\/renders\.studio/, 'https://renders.studio');
    vars.push(`--fondo:url('${url.replaceAll("'", '%27')}')`);
    if (!llevaTexto(n)) c.push('r-foto-sola');
  }
  if (ancho !== null && ancho !== undefined && !Number.isNaN(ancho)) vars.push(`--w:${ancho}%`);
  return {
    clases: c.length ? ' ' + c.join(' ') : '',
    estilo: vars.length ? ` style="${attr(vars.join(';'))}"` : '',
  };
}

// ---------------------------------------------------------------- secciones

function pintaSection(n, ctx, interior) {
  const s = n.settings || {};
  const c = [
    'elementor-section',
    interior ? 'elementor-inner-section' : 'elementor-top-section',
    'elementor-element',
    `elementor-element-${n.id}`,
  ];
  // El orden de estas clases no es decorativo: sale de comparar con la web
  // real, y Elementor las escribe en el orden en que estan GUARDADOS los
  // ajustes, no en un orden fijo.
  const deAjuste = {
    height: (v) => `elementor-section-height-${v}`,
    column_position: (v) => `elementor-section-items-${v}`,
    content_position: (v) => `elementor-section-content-${v}`,
  };
  for (const k of Object.keys(s)) {
    if (deAjuste[k] && s[k]) c.push(deAjuste[k](s[k]));
    // las clases escritas a mano tambien caen donde toque segun el orden
    else if ((k === '_css_classes' || k === 'css_classes') && s[k]) c.push(...String(s[k]).split(/\s+/).filter(Boolean));
  }
  c.push(`elementor-section-${s.layout || 'boxed'}`);
  // Y aqui la rareza: "elementor-section-height-default" sale dos veces,
  // salvo si la seccion tiene altura minima. Se copia tal cual.
  c.push('elementor-section-height-default');
  if (s.height === 'min-height') {
    if (!s.column_position) c.push(`elementor-section-items-${s.content_position || 'middle'}`);
  } else {
    c.push('elementor-section-height-default');
  }

  const hueco = s.gap || 'default';
  const r = pistas(n, ctx, { extra: interior || ctx.enColumna ? ['r-interior'] : [] });
  const dentro = (n.elements || [])
    .map((h, i, a) => pinta(h, { ...ctx, interior: true, hermanos: a.length }))
    .join('');

  return (
    `<section class="${c.join(' ')}${r.clases}" data-id="${n.id}" data-element_type="section" data-e-type="section"${datosAlFrente(n)}${r.estilo}>` +
    velo(s) +
    formas(s) +
    `<div class="elementor-container elementor-column-gap-${hueco}">` +
    dentro +
    `</div></section>`
  );
}

// ---------------------------------------------------------------- columnas

function pintaColumn(n, ctx) {
  const s = n.settings || {};
  // Elementor guarda el ancho en _column_size (entero) y el ajustado en
  // _inline_size. La clase sale del primero.
  const tam = medida(s._column_size) ?? 100;
  const c = [
    'elementor-column',
    `elementor-col-${tam}`,
    ctx.interiorDeSeccionInterior ? 'elementor-inner-column' : 'elementor-top-column',
    'elementor-element',
    `elementor-element-${n.id}`,
  ];
  c.push(...clasesPropias(s));
  if (s.animation && !ctx.rediseno) c.push('elementor-invisible');

  if (ctx.rediseno) marcaAntetitulos(n.elements);
  const r = pistas(n, ctx, { ancho: medida(s._inline_size) ?? tam });
  // lo que va dentro de una columna ya no es de primer nivel (seccion anidada)
  const ctxHijos = ctx.rediseno ? { ...ctx, enColumna: true } : ctx;
  const dentro = (n.elements || []).map((h) => pinta(h, ctxHijos)).join('');

  return (
    `<div class="${c.join(' ')}${r.clases}" data-id="${n.id}" data-element_type="column" data-e-type="column"${datosAlFrente(n)}${r.estilo}>` +
    `<div class="elementor-widget-wrap${dentro ? ' elementor-element-populated' : ''}">` +
    velo(s) +
    dentro +
    `</div></div>`
  );
}

// -------------------------------------------------------------- contenedores

function pintaContainer(n, ctx) {
  const s = n.settings || {};
  const lleno = (s.content_width || 'boxed') === 'full';
  const caja = lleno ? 'e-con-full' : 'e-con-boxed';
  // El orden cambia segun el caso, y asi sale en la web real:
  //   a ancho completo -> "e-con-full e-flex"
  //   en caja          -> "e-flex e-con-boxed"
  const c = [
    'elementor-element',
    `elementor-element-${n.id}`,
    ...clasesPropias(s),
    ...(lleno ? ['e-con-full', 'e-flex'] : ['e-flex', 'e-con-boxed']),
    'e-con',
    ctx.dentroDeContenedor ? 'e-child' : 'e-parent',
  ];

  if (ctx.rediseno) marcaAntetitulos(n.elements);
  const w = s.width && (s.width.unit || '%') === '%' ? medida(s.width) : null;
  const r = pistas(n, ctx, {
    ancho: w,
    extra: [s.flex_direction === 'row' ? 'r-fila' : 'r-pila'],
  });
  const dentro = (n.elements || [])
    .map((h) => pinta(h, { ...ctx, dentroDeContenedor: true }))
    .join('');

  const cuerpo = caja === 'e-con-boxed' ? `<div class="e-con-inner">${dentro}</div>` : dentro;

  return (
    `<div class="${c.join(' ')}${r.clases}" data-id="${n.id}" data-element_type="container" data-e-type="container"${datosAlFrente(n)}${r.estilo}>` +
    velo(s) +
    formas(s) +
    cuerpo +
    `</div>`
  );
}

// ------------------------------------------------------------------ widgets

/** Elementor 4 renombro izquierda/derecha a inicio/fin en algunos widgets. */
const ALINEACION = { left: 'start', right: 'end', center: 'center', justify: 'justify' };

/**
 * Las clases que cada tipo de widget anade por su cuenta.
 * Todas salen de comparar con el HTML de la web en vivo.
 */
function clasesDelWidget(n) {
  const s = n.settings || {};
  const c = [];
  switch (n.widgetType) {
    case 'divider':
      c.push(`elementor-widget-divider--view-${s.view || 'line'}`);
      break;
    case 'button':
      if (s.align) c.push(`elementor-align-${s.align}`);
      if (s.align_tablet) c.push(`elementor-tablet-align-${s.align_tablet}`);
      if (s.align_mobile) c.push(`elementor-mobile-align-${s.align_mobile}`);
      break;
    case 'icon-list':
      c.push(`elementor-icon-list--layout-${s.view || 'traditional'}`);
      if (s.icon_align) c.push(`elementor-align-${ALINEACION[s.icon_align] || s.icon_align}`);
      if (s.icon_align_tablet) c.push(`elementor-tablet-align-${ALINEACION[s.icon_align_tablet] || s.icon_align_tablet}`);
      if (s.icon_align_mobile) c.push(`elementor-mobile-align-${ALINEACION[s.icon_align_mobile] || s.icon_align_mobile}`);
      c.push(`elementor-list-item-link-${s.link_click || 'full_width'}`);
      break;
    case 'image-gallery':
      if (s.image_spacing === 'custom') c.push('gallery-spacing-custom');
      break;
    case 'eael-contact-form-7':
      if (s.button_align) c.push(`eael-contact-form-7-button-align-${s.button_align}`);
      if (s.button_width) c.push('eael-contact-form-7-button-custom');
      break;
    default:
      break;
  }
  return c;
}

function pintaWidget(n, ctx) {
  const s = n.settings || {};
  const c = ['elementor-element', `elementor-element-${n.id}`];
  c.push(...clasesDelWidget(n));
  // ancho propio del widget ("initial" = el que le pongas a mano)
  if (s._element_width) c.push(`elementor-widget__width-${s._element_width}`);
  c.push(...clasesPropias(s));
  if (s._animation && !ctx.rediseno) c.push('elementor-invisible');
  c.push('elementor-widget', `elementor-widget-${n.widgetType}`);
  if (ctx.rediseno && n._antetitulo) c.push('r-antetitulo');

  const contenido = ctx.pintaContenido ? ctx.pintaContenido(n, ctx) : '';

  return (
    `<div class="${c.join(' ')}" data-id="${n.id}" data-element_type="widget" data-e-type="widget"${datosAlFrente(n)} data-widget_type="${n.widgetType}.default">` +
    `<div class="elementor-widget-container">${contenido}</div>` +
    `</div>`
  );
}

// --------------------------------------------- elementos "atomicos" (Elementor 4)

/**
 * Elementor 4 empieza a guardar cajas de otra forma ("atomic elements").
 * En esta web solo hay una, en /precios/, pero hay que pintarla igual.
 */
function pintaFlexbox(n, ctx) {
  const propias = n.settings?.classes?.value || [];
  const c = ['elementor-element', `elementor-element-${n.id}`, 'e-con', 'e-atomic-element', 'e-flexbox-base', ...propias];
  const dentro = (n.elements || []).map((h) => pinta(h, ctx)).join('');
  // El espacio final del atributo class no es un descuido: asi lo escribe
  // Elementor en la web real, y lo copiamos.
  return (
    `<div class="${c.join(' ')} " data-id="${n.id}" data-element_type="e-flexbox" data-e-type="e-flexbox" data-interaction-id="${n.id}">` +
    dentro +
    `</div>`
  );
}

// -------------------------------------------------------------------- reparto

export function pinta(n, ctx = {}) {
  switch (n.elType) {
    case 'section':
      return pintaSection(n, ctx, Boolean(ctx.dentroDeSeccion));
    case 'column':
      return pintaColumn(n, ctx);
    case 'container':
      return pintaContainer(n, ctx);
    case 'widget':
      return pintaWidget(n, ctx);
    case 'e-flexbox':
      return pintaFlexbox(n, ctx);
    default:
      return '';
  }
}

/** Pinta el arbol entero de una pagina. */
export function pintaArbol(arbol, ctx = {}) {
  return (arbol || []).map((n) => pinta(n, ctx)).join('');
}
