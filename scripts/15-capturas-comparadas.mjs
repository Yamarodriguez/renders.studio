import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:8099';
const VISIBLE = `.elementor-invisible{visibility:visible!important;opacity:1!important}`;
const paginas = [
  { nombre: 'portada', nuevo: '/', real: '/_real/renders.html' },
  { nombre: 'madrid', nuevo: '/madrid/', real: '/_real/madrid.html' },
];
const vistas = [
  { etiqueta: 'escritorio', width: 1400, height: 1400, cortes: [0, 1400, 2800, 5200] },
  { etiqueta: 'movil', width: 390, height: 844, cortes: [0, 844, 1688] },
];

const navegador = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
fs.mkdirSync('capturas', { recursive: true });

async function bandas(url, v) {
  const ctx = await navegador.newContext({ viewport: { width: v.width, height: v.height } });
  const pag = await ctx.newPage();
  await pag.goto(BASE + url, { waitUntil: 'networkidle', timeout: 60000 });
  await pag.addStyleTag({ content: VISIBLE });
  await pag.evaluate(async () => {
    await new Promise((r) => { let y = 0; const t = setInterval(() => { window.scrollBy(0, 900); y += 900; if (y > document.body.scrollHeight) { clearInterval(t); r(); } }, 25); });
  });
  await pag.waitForTimeout(1500);
  const out = [];
  for (const y of v.cortes) {
    await pag.evaluate((yy) => window.scrollTo(0, yy), y);
    await pag.waitForTimeout(400);
    out.push(await pag.screenshot());
  }
  await ctx.close();
  return out;
}

for (const p of paginas) {
  for (const v of vistas) {
    const A = await bandas(p.nuevo, v);
    const B = await bandas(p.real, v);
    for (let i = 0; i < A.length; i++) {
      const sep = 24;
      const etiquetaAlto = 40;
      const lienzo = sharp({
        create: { width: v.width * 2 + sep, height: v.height + etiquetaAlto, channels: 3, background: '#111111' },
      });
      const texto = Buffer.from(
        `<svg width="${v.width * 2 + sep}" height="${etiquetaAlto}">
           <rect width="100%" height="100%" fill="#111"/>
           <text x="${v.width / 2}" y="27" font-family="sans-serif" font-size="20" fill="#7CE38B" text-anchor="middle">WEB NUEVA (Astro)</text>
           <text x="${v.width + sep + v.width / 2}" y="27" font-family="sans-serif" font-size="20" fill="#9BC1FF" text-anchor="middle">WEB ACTUAL (WordPress)</text>
         </svg>`
      );
      const f = `capturas/comparativa-${p.nombre}-${v.etiqueta}-${i + 1}.png`;
      await lienzo
        .composite([
          { input: texto, top: 0, left: 0 },
          { input: A[i], top: etiquetaAlto, left: 0 },
          { input: B[i], top: etiquetaAlto, left: v.width + sep },
        ])
        .png({ quality: 90 })
        .toFile(f);
      console.log(f);
    }
  }
}
await navegador.close();
