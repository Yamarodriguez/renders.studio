/**
 * MOTOR DE RENDER - contenido de cada widget.
 *
 * Lo que va DENTRO de <div class="elementor-widget-container">.
 * Igual que el armazon, cada regla sale de comparar con el HTML de la web en
 * vivo, y el script 06 comprueba que no nos desviamos.
 *
 * Los iconos no son una tipografia: Elementor mete el dibujo (SVG) en el HTML,
 * con los trazados de Font Awesome 5.15.4. Salen de datos/iconos.json.
 */

import { attr, medida } from './render-elementor.mjs';

/** Los tamanos de imagen de WordPress que NO son recortes cuadrados. */
const SIN_SRCSET = new Set(['ocean-thumb-ml', 'ocean-thumb-l']);

/** Cuantas imagenes se sirven sin "lazy" al principio de cada pagina. */
export const IMAGENES_SIN_LAZY = 2;

/**
 * Completa un enlace al que le falta el protocolo.
 * En los ajustes hay enlaces guardados como "renders.studio/arquitectura";
 * WordPress los publica como "https://renders.studio/arquitectura".
 */
export function enlace(url) {
  const u = String(url || '').trim();
  if (!u) return u;
  if (/^(https?:)?\/\//i.test(u) || /^(mailto:|tel:|#|\/)/i.test(u)) return u;
  return 'https://' + u;
}

export function creaPintor({ iconos = {}, adjuntos = {}, dinamicos = {}, dominio = 'https://renders.studio' } = {}) {
  const miniaturas = dinamicos.miniaturas || {};
  const vistas = dinamicos.vistas || {};

  /** La foto recortada a medida que genero Elementor, si la conocemos. */
  function miniaturaAMedida(id, dim) {
    const clave = `${id}-${dim?.width || ''}x${dim?.height || ''}`;
    return miniaturas[clave] || null;
  }

  /** El SVG de un icono, tal cual lo escribe Elementor. */
  function svgIcono(valor) {
    const ico = iconos[String(valor || '').trim()];
    if (!ico) return '';
    return `<svg aria-hidden="true" class="e-font-icon-svg ${ico.clase}" viewBox="${ico.viewBox}" xmlns="http://www.w3.org/2000/svg"><path d="${ico.d}"></path></svg>`;
  }

  /** El icono elegido en un ajuste (Elementor guarda el viejo y el nuevo). */
  function icono(s, campoNuevo = 'selected_icon', campoViejo = 'icon') {
    const nuevo = s[campoNuevo];
    if (nuevo && nuevo.value) return svgIcono(nuevo.value);
    if (typeof s[campoViejo] === 'string' && s[campoViejo]) return svgIcono(s[campoViejo]);
    return '';
  }

  /**
   * Reconstruye una imagen como la escribe WordPress: src, tamano, srcset y
   * sizes. La variante por defecto de Elementor es "large", no el original.
   */
  function imagen(ajuste, { tamano = 'large', clasesExtra = [], perezosa = true } = {}) {
    // WordPress NO pone loading="lazy" a las dos primeras imagenes de la
    // pagina (son las que se ven al entrar). A partir de la tercera, si.
    const id = ajuste?.id;
    const adj = id ? adjuntos[String(id)] : null;
    if (!adj) {
      // imagen que ya no esta en la biblioteca: se deja el enlace tal cual
      if (!ajuste?.url) return '';
      return `<img src="${attr(ajuste.url)}" alt="">`;
    }
    const meta = adj.meta || {};
    const carpeta = (meta.file || adj.fichero || '').split('/').slice(0, -1).join('/');
    const baseUrl = `${dominio}/wp-content/uploads/${carpeta ? carpeta + '/' : ''}`;

    const variante = meta.sizes?.[tamano];
    const ancho = variante ? variante.width : meta.width;
    const alto = variante ? variante.height : meta.height;
    const fichero = variante ? variante.file : (meta.file || '').split('/').pop();
    const proporcion = meta.width && meta.height ? meta.width / meta.height : null;

    // srcset, en el mismo orden que WordPress:
    //   1) la variante que se esta usando
    //   2) las demas variantes, en el orden en que estan guardadas
    //   3) el fichero original, al final, si no ha salido ya
    // y solo las que tienen la MISMA proporcion (WordPress descarta los
    // recortes de otra forma) y no pasan de 1600 px de ancho.
    const original = (meta.file || '').split('/').pop();
    const mismaForma = (w, h) => !proporcion || Math.abs(w / h - proporcion) <= 0.01;
    const trozos = [];
    const puestos = new Set();
    const mete = (f, w, h) => {
      if (!f || puestos.has(f)) return;
      if (w > 1600) return;
      if (!mismaForma(w, h)) return;
      puestos.add(f);
      trozos.push(`${baseUrl}${f} ${w}w`);
    };
    mete(fichero, ancho, alto);
    for (const v of Object.values(meta.sizes || {})) mete(v.file, v.width, v.height);
    mete(original, meta.width, meta.height);

    const clases = [...clasesExtra, `attachment-${tamano}`, `size-${tamano}`, `wp-image-${id}`];
    const attrs = [
      perezosa ? 'loading="lazy"' : null,
      'decoding="async"',
      `width="${ancho}"`,
      `height="${alto}"`,
      `src="${attr(baseUrl + fichero)}"`,
      `class="${clases.join(' ')}"`,
      `alt="${attr(adj.alt || '')}"`,
      trozos.length > 1 ? `srcset="${attr(trozos.join(', '))}"` : null,
      trozos.length > 1 ? `sizes="${attr(`(max-width: ${ancho}px) 100vw, ${ancho}px`)}"` : null,
    ].filter(Boolean);
    return `<img ${attrs.join(' ')} >`;
  }

  // ------------------------------------------------------------- widgets

  const pintores = {
    heading(n) {
      const s = n.settings || {};
      const etiqueta = s.header_size || 'h2';
      const clases = ['elementor-heading-title', `elementor-size-${s.size || 'default'}`];
      let dentro = s.title ?? '';
      if (s.link?.url) {
        const rel = s.link.nofollow ? ' rel="nofollow"' : '';
        const blank = s.link.is_external ? ' target="_blank"' : '';
        dentro = `<a href="${attr(enlace(s.link.url))}"${blank}${rel}>${dentro}</a>`;
      }
      return `<${etiqueta} class="${clases.join(' ')}">${dentro}</${etiqueta}>`;
    },

    'text-editor'(n) {
      // El contenido original NO se toca. Solo dos correcciones, y las dos
      // son lo que hace WordPress al publicar:
      //   - los enlaces internos en http salen en https
      //   - los atajos [pt_view id="..."] se sustituyen por su rejilla
      let t = n.settings?.editor ?? '';
      t = t.replaceAll('http://renders.studio', 'https://renders.studio');
      t = t.replace(/\[pt_view\s+id="?([\w-]+)"?\s*\]/g, (todo, id) =>
        vistas[id] !== undefined ? vistas[id] : `<!-- FALTA la rejilla de Content Views ${id} -->`
      );
      return t;
    },

    spacer() {
      return `<div class="elementor-spacer"><div class="elementor-spacer-inner"></div></div>`;
    },

    divider(n) {
      const s = n.settings || {};
      const vista = s.view || 'line';
      let medio = '';
      if (vista === 'line_text') medio = `<span class="elementor-divider__text elementor-divider__element">${s.text ?? ''}</span>`;
      else if (vista === 'line_icon') medio = `<span class="elementor-divider__element">${icono(s)}</span>`;
      return `<div class="elementor-divider"><span class="elementor-divider-separator">${medio}</span></div>`;
    },

    button(n) {
      const s = n.settings || {};
      const clases = ['elementor-button', 'elementor-button-link', `elementor-size-${s.size || 'sm'}`];
      if (s.hover_animation) clases.push(`elementor-animation-${s.hover_animation}`);
      const href = enlace(s.link?.url) || '#';
      const blank = s.link?.is_external ? ' target="_blank"' : '';
      const rel = s.link?.nofollow ? ' rel="nofollow"' : '';
      const svg = icono(s);
      const trozoIcono = svg ? `<span class="elementor-button-icon">${svg}</span>` : '';
      const trozoTexto = s.text ? `<span class="elementor-button-text">${s.text}</span>` : '';
      return (
        `<div class="elementor-button-wrapper">` +
        `<a class="${clases.join(' ')}" href="${attr(href)}"${blank}${rel}>` +
        `<span class="elementor-button-content-wrapper">${trozoIcono}${trozoTexto}</span>` +
        `</a></div>`
      );
    },

    image(n, ctx) {
      const s = n.settings || {};
      const tamano = s.image_size || 'large';
      // la posicion en la pagina decide si lleva loading="lazy"
      const cuenta = ctx?.contador ? ctx.contador.imagenes++ : 99;
      let img;
      if (tamano === 'custom') {
        // Elementor recorta la foto y la guarda en uploads/elementor/thumbs/
        // con un nombre que no se puede calcular: se saca del HTML real.
        const url = miniaturaAMedida(s.image?.id, s.image_custom_dimension);
        img = url
          ? `<img decoding="async" src="${attr(url)}" >`
          : `<!-- FALTA la miniatura a medida de la imagen ${s.image?.id} -->`;
      } else {
        img = imagen(s.image, {
          tamano,
          perezosa: cuenta >= IMAGENES_SIN_LAZY,
          // la animacion al pasar el raton va como clase de la propia foto
          clasesExtra: s.hover_animation ? [`elementor-animation-${s.hover_animation}`] : [],
        });
      }
      if (s.link_to === 'custom' && s.link?.url) {
        return `<a href="${attr(enlace(s.link.url))}">${img}</a>`;
      }
      return img;
    },

    'icon-list'(n) {
      const s = n.settings || {};
      const enLinea = (s.view || 'traditional') === 'inline';
      const items = (s.icon_list || [])
        .map((it) => {
          const svg = it.selected_icon?.value ? svgIcono(it.selected_icon.value) : it.icon ? svgIcono(it.icon) : '';
          const trozoIcono = svg ? `<span class="elementor-icon-list-icon">${svg}</span>` : '';
          const texto = `<span class="elementor-icon-list-text">${it.text ?? ''}</span>`;
          const dentro = trozoIcono + texto;
          const li = `<li class="elementor-icon-list-item${enLinea ? ' elementor-inline-item' : ''}">`;
          if (it.link?.url) {
            return `${li}<a href="${attr(enlace(it.link.url))}">${dentro}</a></li>`;
          }
          return `${li}${dentro}</li>`;
        })
        .join('');
      return `<ul class="elementor-icon-list-items${enLinea ? ' elementor-inline-items' : ''}">${items}</ul>`;
    },
  };

  /** Devuelve el contenido del widget, o null si ese tipo no esta hecho. */
  function pintaContenido(n, ctx) {
    const f = pintores[n.widgetType];
    if (!f) return null;
    return f(n, ctx);
  }

  return { pintaContenido, imagen, svgIcono, tiposHechos: Object.keys(pintores) };
}
