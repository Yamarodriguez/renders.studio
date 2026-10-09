/**
 * PASO 23 - Sacar a una hoja comun los <style> repetidos del contenido.
 *
 * Los bloques de texto de Elementor traen su propio CSS ("por que elegirnos",
 * el proceso, las opiniones, las preguntas, la rejilla de Content Views...),
 * y se repite en casi todas las paginas. Este paso lo junta en
 * public/estilo/bloques.css y guarda la huella de cada bloque en
 * datos/bloques-css.json; al pintar, aeo.limpiaMarcado() quita del HTML los
 * bloques cuya huella esta en esa lista.
 *
 * Se ejecuta sobre una compilacion que AUN tiene los <style> (por ejemplo
 * con la lista vacia) y solo hace falta repetirlo si cambia el contenido.
 *
 * Uso:  node scripts/23-bloques-css.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const RAIZ = process.cwd();
const DIST = path.join(RAIZ, 'dist');
const md5 = (t) => crypto.createHash('md5').update(t).digest('hex');

const vistos = new Map();
const recorre = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) recorre(f);
    else if (e.name === 'index.html') {
      const html = fs.readFileSync(f, 'utf8');
      const main = (html.match(/<main[\s\S]*<\/main>/) || [''])[0];
      for (const st of main.match(/<style\b[^>]*>[\s\S]*?<\/style>/g) || []) {
        const h = md5(st);
        if (!vistos.has(h)) vistos.set(h, { st, veces: 0 });
        vistos.get(h).veces++;
      }
    }
  }
};
recorre(DIST);

// Solo los bloques que se repiten en muchas paginas. Los de una sola pagina se
// quedan donde estan: algunos traen reglas generales (details, summary...) que
// en una hoja comun afectarian a toda la web.
const MINIMO = 5;
for (const [h, v] of vistos) if (v.veces < MINIMO) vistos.delete(h);

const partes = [...vistos.entries()].map(
  ([h, { st, veces }]) => `/* bloque ${h.slice(0, 8)} (${veces} paginas) */\n${st.replace(/^<style\b[^>]*>|<\/style>$/g, '').trim()}\n`
);
fs.writeFileSync(
  path.join(RAIZ, 'public/estilo/bloques.css'),
  `/* Estilos que el contenido de Elementor traia dentro de cada pagina.\n   Generado por scripts/23-bloques-css.mjs: no editar a mano. */\n\n${partes.join('\n')}`
);
fs.writeFileSync(path.join(RAIZ, 'datos/bloques-css.json'), JSON.stringify({ hashes: [...vistos.keys()] }, null, 2) + '\n');
const bytes = [...vistos.values()].reduce((a, b) => a + b.st.length * b.veces, 0);
console.log(`bloques distintos: ${vistos.size} | bytes que salen del HTML: ${bytes}`);
