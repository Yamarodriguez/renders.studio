/**
 * De donde sale el HTML de la web real con el que comparamos.
 *
 * Hay dos carpetas:
 *   referencia/html-todo/  -> las 145 paginas (una por slug). Es la buena.
 *   referencia/html/       -> 13 paginas de muestra, de cuando empezamos.
 *
 * Si esta la de 145, se usa esa. Si no, se tira de la muestra para no
 * bloquear el trabajo, pero avisando.
 */

import fs from 'node:fs';
import path from 'node:path';

export function paginasDeReferencia(raiz = process.cwd()) {
  const todo = path.join(raiz, 'referencia', 'html-todo');
  if (fs.existsSync(todo)) {
    const mapa = {};
    for (const f of fs.readdirSync(todo).filter((x) => x.endsWith('.html'))) {
      mapa[f.replace(/\.html$/, '')] = path.join(todo, f);
    }
    return { mapa, completa: true, carpeta: todo };
  }

  // plan B: la muestra de 13, identificando cada fichero por page-id del body
  const muestra = path.join(raiz, 'referencia', 'html');
  const mapa = {};
  if (!fs.existsSync(muestra)) return { mapa, completa: false, carpeta: null };
  const paginas = JSON.parse(fs.readFileSync(path.join(raiz, 'datos', 'paginas.json'), 'utf8'));
  const porId = Object.fromEntries(paginas.map((p) => [p.id, p]));
  for (const f of fs.readdirSync(muestra).filter((x) => x.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(muestra, f), 'utf8');
    const id = /\bpage-id-(\d+)\b/.exec(/<body[^>]*class\s*=\s*["']([^"']+)["']/i.exec(html)?.[1] || '')?.[1];
    if (id && porId[id]) mapa[porId[id].slug] = path.join(muestra, f);
  }
  return { mapa, completa: false, carpeta: muestra };
}
