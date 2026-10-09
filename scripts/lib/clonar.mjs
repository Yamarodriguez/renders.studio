/**
 * CLONAR - paginas de servicio con la estructura completa de /hiperrealistas/.
 *
 * Pedido por el propietario (7-10-2026): cada servicio nuevo lleva TODAS las
 * secciones de /hiperrealistas/, sin quitar ninguna, con "hiperrealista"
 * cambiado por el servicio, y todos los h2 con la palabra clave.
 *
 * Se trabaja sobre una COPIA del arbol de Elementor de la plantilla; la pagina
 * original no se toca. La clave de cada servicio viene de datos/nuevas/*.json:
 *   clave.plural    "Renders de interiores"
 *   clave.singular  "Render de interiores"
 *   clave.sufijo    "de interiores"  (sustituye a "Hiperrealista" suelto en un h2)
 *
 * Que se cambia:
 *   - h1 de la portada               -> el titulo del servicio
 *   - "render(s) hiperrealista(s)"   -> la clave (en titulos siempre; en el
 *                                       texto, solo cuando la frase lo admite)
 *   - "Hiperrealista" suelto en un h2 -> el sufijo
 *   - h2 que sigan sin la clave       -> se les mete la clave (ver claveEnH2)
 *   - titulos de las tarjetas         -> pasan de h2 a h3, con su texto intacto
 *   - "Hiperrealista" adjetivo        -> en minuscula; sigue siendo verdad
 */

const PARADAS = new Set(['de', 'para', 'los', 'las', 'el', 'la', 'y', 'en', 'del']);

const sinTildes = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const raices = (frase) =>
  sinTildes(frase)
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !PARADAS.has(w))
    .map((w) => w.replace(/(es|s)$/, ''));

/** Lleva la palabra clave (todas sus raices, sin contar "de", "para"...)? */
export function contieneClave(texto, clave) {
  const t = sinTildes(texto);
  return raices(clave).every((r) => t.includes(r));
}

const conCaja = (modelo, texto) =>
  modelo[0] === modelo[0].toUpperCase() ? texto[0].toUpperCase() + texto.slice(1) : texto[0].toLowerCase() + texto.slice(1);

/** "arquitectura Arquitectura" -> "arquitectura"; "3D 3D" -> "3D". */
const sinRepetidas = (t) => t.replace(/(^|\s)(\S+)(\s+\2)+(?=\s|$|[.,:;?!])/gi, '$1$2');

const RX_FRASE = /\b(render)(s)?\s+hiperrealista(s)?\b/gi;

export function creaClonador(clave, titulo) {
  const empiezaPorRender = /^render/i.test(clave.plural);

  /** "render(s) hiperrealista(s)" -> la clave. */
  const frase = (t, { soloTrasDe = false } = {}) =>
    t.replace(RX_FRASE, (todo, _r, s1, s2, pos, entero) => {
      if (soloTrasDe && !/\bde\s+$/i.test(entero.slice(Math.max(0, pos - 4), pos))) return todo;
      return conCaja(todo, s1 || s2 ? clave.plural : clave.singular);
    });

  /** Palabras repetidas fuera, y "Tour virtual 360 3D" -> "Tour virtual 360". */
  const limpia = (t) => {
    const x = sinRepetidas(t);
    if (/3d/i.test(clave.plural)) return x;
    const i = x.toLowerCase().indexOf(clave.plural.toLowerCase() + ' 3d');
    return i < 0 ? x : x.slice(0, i + clave.plural.length) + x.slice(i + clave.plural.length + 3);
  };

  /** Mete la clave en un h2 que no la lleva. */
  function claveEnH2(h) {
    let t = limpia(frase(h).replace(/\bhiperrealistas?\b/gi, clave.sufijo));
    if (contieneClave(t, clave.plural)) return t;
    if (/^\s*renders?\s*$/i.test(t)) return clave.plural;
    if (/render studio/i.test(t)) {
      t = t.replace(/\?\s*$/, '').replace(/render studio/i, 'Renders.studio') + ` para sus proyectos de ${clave.plural.toLowerCase()}?`;
      return t;
    }
    // "Precio Render: Tarifas..." -> "Precio Tour virtual 360: Tarifas..."
    if (/^precio render\b/i.test(t)) return limpia(t.replace(/^(precio )render\b/i, `$1${clave.singular}`));
    // "render(s)" se cambia por la clave; si la clave no es un render, solo
    // cuando el titulo EMPIEZA por "render(s)" (si no, la frase se rompe)
    let hecho = false;
    const rx = empiezaPorRender ? /\b(render)(s)?\b(?!\s+studio)/i : /^(render)(s)?\b(?!\s+studio)/i;
    t = t.replace(rx, (todo, _r, s) => {
      hecho = true;
      return conCaja(todo, s ? clave.plural : clave.singular);
    });
    if (!hecho) t = `${clave.plural}: ${t}`;
    return limpia(t);
  }

  /** Aplica fn solo a los trozos de texto de un HTML (no a etiquetas ni <style>). */
  function enTexto(htmlOriginal, fn) {
    const trozos = String(htmlOriginal).split(/(<[^>]+>)/);
    let vetado = 0;
    for (let i = 0; i < trozos.length; i++) {
      const t = trozos[i];
      if (t.startsWith('<')) {
        const m = /^<(\/?)(script|style)\b/i.exec(t);
        if (m) vetado += m[1] ? -1 : 1;
        continue;
      }
      if (vetado <= 0 && t.trim()) trozos[i] = fn(t);
    }
    return trozos.join('');
  }

  /** Texto corrido: la frase solo donde la gramatica aguanta; el adjetivo en minuscula. */
  const textoCorrido = (t) =>
    sinRepetidas(frase(t, { soloTrasDe: !empiezaPorRender })).replace(/\b(H)(iperrealistas?)\b/g, (x, h, r) => 'h' + r);

  /** Recorre la copia del arbol y la adapta al servicio. */
  function adapta(arbol) {
    let h1Hecho = false;
    const visita = (n, columnaConFoto) => {
      const s = n.settings || {};
      const esColumnaFoto = n.elType === 'column' && Boolean(s.background_image?.url);
      if (n.elType === 'widget') {
        if (n.widgetType === 'heading') {
          const nivel = s.header_size || 'h2';
          if (nivel === 'h1' && !h1Hecho) {
            s.title = titulo;
            h1Hecho = true;
          } else if (columnaConFoto) {
            // tarjeta: el titulo no cambia, solo baja a h3
            if (nivel === 'h2') s.header_size = 'h3';
          } else if (nivel === 'h2') {
            s.title = enTexto(s.title, claveEnH2);
          } else {
            s.title = enTexto(s.title, (t) => sinRepetidas(frase(t)));
          }
        } else if (n.widgetType === 'text-editor' && !columnaConFoto) {
          s.editor = enTexto(s.editor, textoCorrido);
        } else if (n.widgetType === 'button' && s.text) {
          s.text = textoCorrido(s.text);
        }
      }
      (n.elements || []).forEach((h) => visita(h, columnaConFoto || esColumnaFoto));
    };
    arbol.forEach((n) => visita(n, false));
    return arbol;
  }

  return { adapta, claveEnH2 };
}
