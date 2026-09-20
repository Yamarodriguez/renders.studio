# renders.studio — migración de WordPress a Astro

Copia fiel de la web de WordPress (OceanWP + Elementor) a un sitio estático en
Astro, **sin cambiar ni una sola dirección**.

## Estado

| Fase | Estado |
|---|---|
| Fase 0 — Reconocimiento | cerrada |
| Fase 1 — Copia fiel | en curso |
| Fase 2 — Mejoras | sin empezar |
| Fase 3 — Mudanza | sin empezar |

### Comprobaciones

| # | Comprobación | Resultado |
|---|---|---|
| 0 | Marcado contra la web real | **0 diferencias** en 58.089 elementos y 37.416 contenidos de widget, 141 páginas |
| 1 | Encabezados (H1/H2/H3 en orden) | **145 de 145 páginas idénticas** |
| 2 | Geometría con Playwright | pendiente |
| 3 | Texto invisible | pendiente |
| 4 | Ficheros que no cargan | pendiente |

## Cómo se construye

```
npm install
npm run datos     # extrae el XML y copia de la web real lo que genera cada plugin
npm run build     # genera las 145 páginas en dist/
```

O, para verla en local de una sola vez: doble clic en `VER-EN-LOCAL.cmd`.

## Qué hay en cada carpeta

| Carpeta | Qué es |
|---|---|
| `scripts/` | El motor de render y las comprobaciones, numerados por orden de uso |
| `scripts/lib/` | El motor: `render-elementor.mjs` (armazón), `render-widgets.mjs` (contenido), `construir-pagina.mjs` (página entera) |
| `src/pages/` | La página de Astro que genera las 145 rutas |
| `datos/` | El contenido ya extraído del export y lo capturado de la web real |
| `public/` | Imágenes, hojas de estilo, JavaScript y tipografías, en su ruta original |
| `informes/` | Resultados de las comprobaciones |
| `capturas/` | Comparativas lado a lado con la web actual |
| `descargas/` | Los `.cmd` que descargan de la web en vivo |
| `worpress/` | El export XML de WordPress |

## Las reglas

Están en `PROMPT-NUEVA-MIGRACION.md` y `ANALISIS-MIGRACION.md`. Las tres que
más han costado:

1. **La maquetación sale de `_elementor_data`**, nunca de `content:encoded`.
2. **El CSS no se escribe: se copia.** La web carga 317 hojas; imitarlas es
   imposible.
3. **Lo que genera un plugin no se calcula: se copia.** Galería, formulario,
   mapa, la rejilla de Content Views y las cuatro páginas legales.

## Despliegue

Netlify, desde este repositorio. Mientras dure la Fase 1 y 2, `netlify.toml`
manda una cabecera `X-Robots-Tag: noindex` para que Google no vea dos copias
de la misma web. **Se quita el día de la mudanza.**
