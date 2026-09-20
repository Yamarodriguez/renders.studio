/**
 * Lector del export de WordPress (WXR).
 *
 * No usa librerias externas a proposito: el fichero pesa 75 MB y lo unico que
 * necesitamos es recorrer los <item> uno a uno. Va por trozos, asi que no se
 * come la memoria.
 *
 * IMPORTANTE: la maquetacion sale de la meta `_elementor_data`, nunca de
 * `content:encoded`.
 */

import fs from 'node:fs';

/** Deshace el truco que usa WordPress para meter "]]>" dentro de un CDATA. */
function undoCdataSplit(s) {
  return s.replaceAll(']]]]><![CDATA[>', ']]>');
}

/** Devuelve el texto de una etiqueta, venga en CDATA o en texto plano. */
export function tag(xml, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`);
  const m = re.exec(xml);
  if (!m) return null;
  let v = m[1];
  const cdata = /^\s*<!\[CDATA\[([\s\S]*)\]\]>\s*$/.exec(v);
  if (cdata) return undoCdataSplit(cdata[1]);
  return decodeEntities(v);
}

export function decodeEntities(s) {
  return s
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}

/** Saca todas las postmeta de un <item> como objeto { clave: valor }. */
export function metas(itemXml) {
  const out = {};
  const re = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/g;
  let m;
  while ((m = re.exec(itemXml)) !== null) {
    const k = tag(m[1], 'wp:meta_key');
    const v = tag(m[1], 'wp:meta_value');
    if (k !== null) out[k] = v;
  }
  return out;
}

/** Las categorias/menus a los que pertenece un item. */
export function categories(itemXml) {
  const out = [];
  const re = /<category domain="([^"]+)" nicename="([^"]+)"><!\[CDATA\[([\s\S]*?)\]\]><\/category>/g;
  let m;
  while ((m = re.exec(itemXml)) !== null) {
    out.push({ domain: m[1], nicename: m[2], name: m[3] });
  }
  return out;
}

/**
 * Recorre el fichero y llama a onItem(xmlDelItem) una vez por cada <item>.
 * Tambien devuelve la cabecera del canal (titulo, url base, terminos).
 */
export async function readWxr(path, onItem) {
  const stream = fs.createReadStream(path, { encoding: 'utf8', highWaterMark: 4 * 1024 * 1024 });
  let buf = '';
  let head = '';
  let inItems = false;
  let count = 0;

  for await (const chunk of stream) {
    buf += chunk;
    for (;;) {
      const start = buf.indexOf('<item>');
      if (start === -1) {
        // Guardamos la cabecera hasta que empiecen los items.
        if (!inItems) {
          head += buf.slice(0, Math.max(0, buf.length - 16));
          buf = buf.slice(Math.max(0, buf.length - 16));
        }
        break;
      }
      if (!inItems) {
        head += buf.slice(0, start);
        inItems = true;
      }
      const end = buf.indexOf('</item>', start);
      if (end === -1) break; // el item sigue en el siguiente trozo
      const itemXml = buf.slice(start + 6, end);
      buf = buf.slice(end + 7);
      count++;
      onItem(itemXml);
    }
  }
  return { head, count };
}

/** Los <wp:term> del canal (menus, taxonomias de Elementor...). */
export function terms(headXml) {
  const out = [];
  const re = /<wp:term>([\s\S]*?)<\/wp:term>/g;
  let m;
  while ((m = re.exec(headXml)) !== null) {
    out.push({
      id: tag(m[1], 'wp:term_id'),
      taxonomy: tag(m[1], 'wp:term_taxonomy'),
      slug: tag(m[1], 'wp:term_slug'),
      name: tag(m[1], 'wp:term_name'),
    });
  }
  return out;
}
