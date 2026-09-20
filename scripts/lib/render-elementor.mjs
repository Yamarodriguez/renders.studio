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
  const dentro = (n.elements || [])
    .map((h, i, a) => pinta(h, { ...ctx, interior: true, hermanos: a.length }))
    .join('');

  return (
    `<section class="${c.join(' ')}" data-id="${n.id}" data-element_type="section" data-e-type="section"${datosAlFrente(n)}>` +
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
  if (s.animation) c.push('elementor-invisible');

  const dentro = (n.elements || []).map((h) => pinta(h, ctx)).join('');

  return (
    `<div class="${c.join(' ')}" data-id="${n.id}" data-element_type="column" data-e-type="column"${datosAlFrente(n)}>` +
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

  const dentro = (n.elements || [])
    .map((h) => pinta(h, { ...ctx, dentroDeContenedor: true }))
    .join('');

  const cuerpo = caja === 'e-con-boxed' ? `<div class="e-con-inner">${dentro}</div>` : dentro;

  return (
    `<div class="${c.join(' ')}" data-id="${n.id}" data-element_type="container" data-e-type="container"${datosAlFrente(n)}>` +
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
  if (s._animation) c.push('elementor-invisible');
  c.push('elementor-widget', `elementor-widget-${n.widgetType}`);

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
