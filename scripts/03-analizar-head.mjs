/**
 * PASO 3 - Lee el <head> de las paginas reales descargadas y saca:
 *
 *   - la lista de hojas de estilo EN SU ORDEN de carga, unificando las de
 *     todas las paginas (regla 4 y 5: la hoja post-{ID}.css va EN MEDIO)
 *   - las tipografias y paquetes de iconos, con su version si se puede
 *   - los codigos de AdSense, Analytics, Tag Manager y Search Console
 *   - los estilos que van dentro del propio HTML (<style>), que tambien hacen falta
 *
 * Lee:   referencia/html/*.html
 * Deja:  informes/head.json            (todo el detalle, por pagina)
 *        informes/HOJAS-DE-ESTILO.md   (para leerlo tu)
 *        descargas/curl-css.txt        (la lista de encargos para bajar el CSS)
 *
 * Uso:   node scripts/03-analizar-head.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const HTML = path.join(RAIZ, 'referencia', 'html');
const INFORMES = path.join(RAIZ, 'informes');
const DOMINIO = 'https://renders.studio';

if (!fs.existsSync(HTML)) {
  console.error(`ERROR: no encuentro ${HTML}`);
  console.error('Ejecuta antes (doble clic):  descargas\\01-descargar-html-referencia.cmd');
  process.exit(1);
}

const ficheros = fs.readdirSync(HTML).filter((f) => f.endsWith('.html')).sort();
if (!ficheros.length) {
  console.error('ERROR: la carpeta referencia/html esta vacia.');
  process.exit(1);
}

fs.mkdirSync(INFORMES, { recursive: true });
fs.mkdirSync(path.join(RAIZ, 'descargas'), { recursive: true });

/** Devuelve solo el <head> (hasta el primer <body). */
function soloHead(html) {
  const i = html.search(/<body[\s>]/i);
  return i === -1 ? html : html.slice(0, i);
}

function absoluta(href) {
  if (href.startsWith('//')) return 'https:' + href;
  if (href.startsWith('/')) return DOMINIO + href;
  return href;
}

const porPagina = {};
const inlineTodos = [];

for (const f of ficheros) {
  const html = fs.readFileSync(path.join(HTML, f), 'utf8');
  const head = soloHead(html);

  // --- hojas y scripts en el orden en que aparecen ---
  const hojas = [];
  const scripts = [];
  const estilosEnLinea = [];

  const re = /<(link|script|style)\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(head)) !== null) {
    const etiqueta = m[1].toLowerCase();
    const attrs = m[2];
    if (etiqueta === 'link') {
      const rel = /rel\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1]?.toLowerCase();
      const href = /href\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
      if (!href) continue;
      if (rel === 'stylesheet') {
        hojas.push({ href: absoluta(href), id: /id\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] || null });
      } else if (rel === 'preload' && /as\s*=\s*["']?(style|font)/i.test(attrs)) {
        hojas.push({ href: absoluta(href), id: 'preload', preload: true });
      }
    } else if (etiqueta === 'script') {
      const src = /src\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
      if (src) scripts.push(absoluta(src));
    } else if (etiqueta === 'style') {
      const fin = head.indexOf('</style>', m.index);
      if (fin !== -1) {
        const cuerpo = head.slice(head.indexOf('>', m.index) + 1, fin);
        const id = /id\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] || '(sin id)';
        estilosEnLinea.push({ id, largo: cuerpo.length, css: cuerpo });
        inlineTodos.push({ pagina: f, id, largo: cuerpo.length });
      }
    }
  }

  // --- codigos de cuentas ---
  const cuentas = {
    adsense: [...new Set([...html.matchAll(/ca-pub-\d{10,20}/g)].map((x) => x[0]))],
    analytics: [...new Set([...html.matchAll(/\bG-[A-Z0-9]{8,12}\b/g)].map((x) => x[0]))],
    universalAnalytics: [...new Set([...html.matchAll(/\bUA-\d{4,12}-\d+\b/g)].map((x) => x[0]))],
    tagManager: [...new Set([...html.matchAll(/\bGTM-[A-Z0-9]{5,9}\b/g)].map((x) => x[0]))],
    searchConsole: [
      ...new Set(
        [...html.matchAll(/<meta[^>]+name=["']google-site-verification["'][^>]+content=["']([^"']+)["']/gi)].map(
          (x) => x[1]
        )
      ),
    ],
    whatsapp: [...new Set([...html.matchAll(/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)[\/]?(\+?\d{6,15})/g)].map((x) => x[1]))],
    correos: [...new Set([...html.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)].map((x) => x[0]))],
    telefonos: [...new Set([...html.matchAll(/tel:(\+?[\d\s().-]{6,20})/g)].map((x) => x[1].trim()))],
  };

  // --- clases del <body> (hace falta la del kit de Elementor) ---
  const body = /<body[^>]*class\s*=\s*["']([^"']+)["']/i.exec(html)?.[1] || '';

  porPagina[f] = { hojas, scripts, estilosEnLinea: estilosEnLinea.map(({ id, largo }) => ({ id, largo })), cuentas, bodyClass: body };
  // los <style> completos se guardan aparte, pesan
  fs.mkdirSync(path.join(INFORMES, 'estilos-en-linea'), { recursive: true });
  for (const e of estilosEnLinea) {
    const nombre = `${f.replace('.html', '')}--${e.id.replace(/[^\w.-]/g, '_')}.css`;
    fs.writeFileSync(path.join(INFORMES, 'estilos-en-linea', nombre), e.css);
  }
}

// --- unificar el orden de las hojas de todas las paginas -------------------
// Se recorre pagina a pagina y cada hoja nueva se inserta justo detras de la
// ultima que ya conociamos. Asi se respeta el orden real de carga.
const orden = [];
const dondeAparece = {};
for (const [pagina, datos] of Object.entries(porPagina)) {
  let ultimo = -1;
  for (const h of datos.hojas) {
    const clave = h.href;
    (dondeAparece[clave] ||= []).push(pagina);
    const pos = orden.indexOf(clave);
    if (pos === -1) {
      orden.splice(ultimo + 1, 0, clave);
      ultimo = ultimo + 1;
    } else {
      ultimo = pos;
    }
  }
}

const comunes = orden.filter((h) => dondeAparece[h].length === ficheros.length);
const propias = orden.filter((h) => dondeAparece[h].length < ficheros.length);

// --- fichero de encargos para curl ---------------------------------------
const lineas = [];
const yaPedidas = new Set();
function pide(url, salida) {
  if (yaPedidas.has(salida)) return;
  yaPedidas.add(salida);
  lineas.push(`url = "${url}"`);
  lineas.push(`output = "${salida}"`);
}

// 1) las hojas comunes, numeradas con su orden de carga real
orden.forEach((url, i) => {
  if (!url.startsWith(DOMINIO)) return; // las de fuera se resuelven con npm
  const base = path.posix.basename(url.split('?')[0]);
  pide(url, `referencia/css/${String(i + 1).padStart(2, '0')}-${base}`);
});

// 2) la hoja propia de CADA pagina. Elementor genera una por pagina
//    (post-{ID}.css) y Essential Addons otra (eael-{ID}.css). Son 141 paginas,
//    asi que son unos 280 ficheros pequenos. Los que no existan daran 404 y
//    no pasa nada: significa que esa pagina no usa ese complemento.
const RUTA_PAGINAS = path.join(RAIZ, 'datos', 'paginas.json');
let cuantasPropias = 0;
if (fs.existsSync(RUTA_PAGINAS)) {
  const paginas = JSON.parse(fs.readFileSync(RUTA_PAGINAS, 'utf8'));
  for (const p of paginas) {
    pide(`${DOMINIO}/wp-content/uploads/elementor/css/post-${p.id}.css`, `referencia/css/paginas/post-${p.id}.css`);
    pide(
      `${DOMINIO}/wp-content/uploads/essential-addons-elementor/eael-${p.id}.css`,
      `referencia/css/paginas/eael-${p.id}.css`
    );
    cuantasPropias += 2;
  }
} else {
  console.warn('AVISO: no encuentro datos/paginas.json, no pido las hojas propias de cada pagina.');
}

fs.writeFileSync(path.join(RAIZ, 'descargas', 'curl-css.txt'), lineas.join('\n') + '\n');

// --- informe legible ------------------------------------------------------
const cuentasJuntas = {};
for (const d of Object.values(porPagina)) {
  for (const [k, v] of Object.entries(d.cuentas)) {
    (cuentasJuntas[k] ||= new Set());
    v.forEach((x) => cuentasJuntas[k].add(x));
  }
}

let md = `# Hojas de estilo y cabecera de renders.studio\n\n`;
md += `Sacado de ${ficheros.length} paginas reales: ${ficheros.join(', ')}\n\n`;
md += `## Orden de carga (${orden.length} hojas)\n\n`;
orden.forEach((h, i) => {
  const enTodas = dondeAparece[h].length === ficheros.length;
  const marca = enTodas ? ' ' : ' **(solo en algunas)**';
  md += `${String(i + 1).padStart(2, '0')}. \`${h.replace(DOMINIO, '')}\`${marca}\n`;
});
md += `\n- Comunes a todas las paginas: **${comunes.length}**\n`;
md += `- Propias de alguna pagina: **${propias.length}**\n\n`;
if (propias.length) {
  md += `### Las propias de cada pagina\n\n`;
  propias.forEach((h) => {
    md += `- \`${h.replace(DOMINIO, '')}\` -> posicion ${orden.indexOf(h) + 1} de ${orden.length}, en: ${dondeAparece[h].join(', ')}\n`;
  });
  md += `\n`;
}
md += `## Estilos escritos dentro del HTML\n\n`;
if (inlineTodos.length) {
  inlineTodos.forEach((e) => (md += `- ${e.pagina}: \`${e.id}\` (${e.largo} caracteres)\n`));
  md += `\nEstan guardados en \`informes/estilos-en-linea/\`. **Hacen falta**: si se pierden, se pierde el aspecto.\n\n`;
} else {
  md += `Ninguno.\n\n`;
}
md += `## Clases del <body>\n\n`;
for (const [f, d] of Object.entries(porPagina)) md += `- **${f}**: \`${d.bodyClass}\`\n`;
md += `\n## Codigos de cuentas encontrados\n\n`;
for (const [k, v] of Object.entries(cuentasJuntas)) {
  md += `- **${k}**: ${v.size ? [...v].map((x) => '`' + x + '`').join(', ') : '_no encontrado_'}\n`;
}
md += `\n## Scripts que carga la portada\n\n`;
(porPagina[ficheros[0]]?.scripts || []).forEach((s) => (md += `- \`${s.replace(DOMINIO, '')}\`\n`));

fs.writeFileSync(path.join(INFORMES, 'HOJAS-DE-ESTILO.md'), md);
fs.writeFileSync(
  path.join(INFORMES, 'head.json'),
  JSON.stringify({ orden, comunes, propias, dondeAparece, porPagina, cuentas: Object.fromEntries(Object.entries(cuentasJuntas).map(([k, v]) => [k, [...v]])) }, null, 1)
);

console.log('--- Cabeceras analizadas ---');
console.log(`paginas leidas      : ${ficheros.length}`);
console.log(`hojas de estilo     : ${orden.length} (comunes ${comunes.length}, propias ${propias.length})`);
console.log(`ficheros a descargar: ${yaPedidas.size} (incluye ${cuantasPropias} hojas propias de pagina)`);
console.log(`estilos en el HTML  : ${inlineTodos.length}`);
for (const [k, v] of Object.entries(cuentasJuntas)) {
  if (v.size) console.log(`${k.padEnd(20)}: ${[...v].join(', ')}`);
}
console.log('\nInforme: informes/HOJAS-DE-ESTILO.md');
console.log('Ahora ejecuta:  descargas\\03-descargar-css.cmd');
