/**
 * ERRATAS - paso del texto a español de España.
 *
 * Aplica datos/erratas.json sobre el HTML ya pintado de una pagina. Solo en
 * el modo rediseno: la copia fiel no pasa por aqui.
 *
 * Que toca:    el texto visible (lo que hay entre etiquetas).
 * Que NO toca: las etiquetas y sus atributos (enlaces, src, alt, clases),
 *              lo de dentro de <script> y <style>, y los encabezados
 *              h1-h4: asi la comprobacion de encabezados contra la web real
 *              sigue dando 145 de 145.
 *
 * Conserva la caja: "Pedí" -> "Pide", "pedí" -> "pide".
 */

import fs from 'node:fs';
import path from 'node:path';

const LETRA = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';

function conCaja(original, nuevo) {
  if (original === original.toUpperCase() && original !== original.toLowerCase()) return nuevo.toUpperCase();
  if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return nuevo[0].toUpperCase() + nuevo.slice(1);
  }
  return nuevo;
}

const escapa = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function creaCorrector(raiz = process.cwd()) {
  const fichero = path.join(raiz, 'datos', 'erratas.json');
  if (!fs.existsSync(fichero)) return { corrige: (h) => h, recuento: {} };
  const datos = JSON.parse(fs.readFileSync(fichero, 'utf8'));
  const palabras = datos.palabras || {};
  const frases = datos.frases || {};
  const protegidas = datos.protegidas || [];
  const recuento = {};

  // Las frases primero (son mas largas), luego las palabras sueltas.
  // \b no entiende de tildes en JavaScript: los limites se marcan a mano.
  const reglas = [
    ...Object.entries(frases).map(([de, a]) => [new RegExp(escapa(de).replace(/ /g, '\\s+'), 'gi'), de, a]),
    ...Object.entries(palabras).map(([de, a]) => [new RegExp(`(?<![${LETRA}])${escapa(de)}(?![${LETRA}-])`, 'gi'), de, a]),
  ];

  function corrigeTexto(texto) {
    if (!texto.trim()) return texto;
    if (protegidas.some((p) => texto.includes(p))) return texto;
    let t = texto;
    for (const [rx, de, a] of reglas) {
      t = t.replace(rx, (hallado) => {
        recuento[de] = (recuento[de] || 0) + 1;
        return conCaja(hallado, a);
      });
    }
    return t;
  }

  /** Recorre el HTML y corrige solo los nodos de texto permitidos. */
  function corrige(html) {
    const trozos = String(html).split(/(<[^>]+>)/);
    let vetado = 0; // dentro de script, style o un encabezado
    for (let i = 0; i < trozos.length; i++) {
      const t = trozos[i];
      if (t.startsWith('<')) {
        const m = /^<(\/?)(script|style|h[1-4])\b/i.exec(t);
        if (m) vetado += m[1] ? -1 : 1;
        continue;
      }
      if (vetado <= 0) trozos[i] = corrigeTexto(t);
    }
    return trozos.join('');
  }

  return { corrige, recuento };
}
