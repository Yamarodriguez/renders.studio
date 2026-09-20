# Fase 0 — Reconocimiento de renders.studio

Actualizado: 17/09/2026. Basado en el export XML de WordPress
(`D:\web\renders.studio\worpress\`) y en la exportación de Search Console.

Queda **una cosa pendiente**: el inventario de hojas de estilo y tipografías de
la web en vivo. Ver el punto 10.

---

## 1. Qué export vamos a usar

En la carpeta hay 11 ficheros XML, exportaciones parciales de la misma web
hechas el mismo día.

| Fichero | Tamaño | Qué contiene |
|---|---|---|
| `renders.WordPress.2026-09-17.xml` | 75,2 MB | **Todo** (145 páginas, 443 imágenes, 483 entradas de menú, 19 plantillas, 2 formularios) |
| `(1).xml` | 71,4 MB | Lo mismo pero incompleto |
| `(10).xml` | 2,0 MB | Solo las 443 imágenes |
| `(4).xml` | 720 KB | Solo las 19 plantillas de Elementor |
| `(6).xml` | 18 KB | Solo los 2 formularios de contacto |
| `(7).xml` | 8 KB | Solo la vista de "Content Views" |
| `(2)(3)(5)(8)(9).xml` | 2,3 KB | Vacíos |

**Se usa el de 75,2 MB.** Los demás no hacen falta.

---

## 2. Con qué está hecha la web

- **Tema:** OceanWP.
- **Constructor:** **Elementor**, versiones mezcladas de la 3.28 a la 4.2.3.
- **Complementos que pintan cosas:** Essential Addons (`eael`), Contact Form 7,
  Content Views (`pt_view`), Yoast SEO, Complianz (cookies), Smush.

### De qué campo sale la maquetación

De **`_elementor_data`**, no de `content:encoded`.

- 141 de 145 páginas lo tienen (entre 261 KB y 451 KB de árbol cada una).
- Las **4 páginas legales** no llevan Elementor **y además están vacías en el
  export**: las genera el plugin Complianz al vuelo. Su texto solo existe en la
  web en vivo.

---

## 3. Cuántas páginas hay y de qué tipo

**145 páginas, todas colgando de la raíz.** URL siempre `https://renders.studio/loquesea/`.

| Tipo | Cuántas | Ejemplos |
|---|---|---|
| Portada | 1 | `/` (página "Renders", ID 19) |
| Ciudades y provincias de España | ~105 | `/madrid/`, `/barcelona/`, `/alcala-de-henares/` |
| Latinoamérica | ~14 | `/argentina/`, `/mendoza/`, `/mexico/`, `/peru/` |
| Regiones | ~10 | `/andalucia/`, `/galicia/`, `/euskadi/` |
| Comerciales | ~10 | `/precios/`, `/presupuesto/`, `/servicios/`, `/cursos/`… |
| Contacto | 1 | `/contacto/` |
| Legales (sin Elementor, vacías en el export) | 4 | `/aviso-legal/`, `/politica-de-privacidad/`, `/politica-de-cookies/`, `/personalizar-cookies/` |

Las de ciudad son la misma plantilla repetida. **Hay 5 o 6 diseños, no 145.**
Para comparar y validar bastan 5 páginas tipo: portada, `/madrid/`, `/precios/`,
`/contacto/` y una legal.

### Plantillas de Elementor (19)

Restos de la demo del tema ("Home 1 Pro", "Pricing Table", "Our Services"…).
**Decidido: no se migran.**

---

## 4. Lo que hay dentro de la maquetación

Números reales sacados de las 141 páginas:

- **58.093 elementos** en total, profundidad máxima 5.
- Solo **10 tipos de widget**, y tres se llevan casi todo:

| Widget | Veces |
|---|---|
| `text-editor` | 12.257 |
| `heading` | 10.157 |
| `spacer` | 6.038 |
| `button` | 3.089 |
| `divider` | 2.814 |
| `image` | 2.523 |
| `icon-list` | 141 |
| `image-gallery` | 141 |
| `eael-contact-form-7` | 140 |
| `google_maps` | 120 |

- **178 ajustes distintos** en total. Es un catálogo cerrado y pequeño: el motor
  de render es abarcable.

### Dos sistemas de maquetación a la vez ⚠

Esto es lo más importante que ha salido, y es distinto de la migración anterior:

- `section` + `column` (Elementor clásico): 4.772 + 10.956
- `container` (Elementor nuevo, flexbox): 4.944
- **Las 141 páginas llevan los dos.** Ninguna es solo de un tipo.

O sea: el motor tiene que saber pintar **los dos sistemas**, no uno.

### Cosas que ya sabemos que hay que tratar

| Qué | Cuántas veces | Por qué importa |
|---|---|---|
| Velo sobre el fondo (`background_overlay`) | 7.460 | Elementor mete un `<div class="elementor-background-overlay">` vacío. Sin ese div el velo desaparece (lección 4 del análisis anterior) |
| `_inline_size` como número pelado | 564 | Las otras 9.827 vienen como diccionario. Si el lector solo acepta el diccionario, esas columnas salen al 50 % |
| Secciones a ancho completo | 2.122 | Es una **clase**, no CSS |
| `structure` (20, 21, 22, 30, 34, 40) | 3.509 | Define el reparto de columnas |

### Tipografías que pide la maquetación

`Poppins` (20.564 usos), `Roboto` (281), `Raleway` (141), `Josefin Sans` (141).
Las cuatro están en npm (`@fontsource/...`). **Faltan las del tema**, que salen
del `<head>` de la web en vivo.

---

## 5. Los ficheros que hay que traer

- **1.604 direcciones de imagen propias** (451 ficheros originales + variantes
  `-150x150`, `-300x300`, `-768x768`, `-600x600`…).
- Formatos: PNG 1.154, WebP 267, JPG 202, JPEG 32, SVG 2.
- 2 externas: emojis de `s.w.org`. No se descargan.
- Las rutas se conservan tal cual (`/wp-content/uploads/…`).
- **Faltan las imágenes que solo viven en el CSS** (fondos de franjas). Salen al
  leer las hojas de estilo, no del XML.

---

## 6. Los menús

**6 menús, 483 entradas.** Todos tienen la misma forma (10 entradas de primer
nivel: Inicio, Precios, Tipos▾7, Servicios▾5, Vídeos, Imágenes…); lo que cambia
es el listado de provincias.

| Menú | Entradas |
|---|---|
| Renders | 119 |
| renders 2 | 102 |
| Renders 3 | 102 |
| Renders España | 101 |
| Renders Argentina | 36 |
| renders sin provincias | 23 |

Son megamenús de OceanWP. **Cabecera y pie no están en Elementor**: los pinta el
tema, así que se copian del HTML de la web en vivo.

---

## 7. Formularios, mapas y cookies

- **2 formularios de Contact Form 7** metidos con `eael-contact-form-7`, en 140
  páginas. En estático no hay PHP: el aspecto se copia igual y el envío pasa a
  **Netlify Forms**.
- **120 mapas de Google** (un iframe en cada página de ciudad).
- **Aviso de cookies de Complianz**: se sustituye en Fase 3.
- **Correo de contacto: `renders.studio3D@Gmail.com`** (sale 564 veces).

---

## 8. Qué páginas no se pueden tocar (Search Console, últimos 3 meses)

220 clics y 63.100 impresiones en total. 132 páginas con datos.

**Las que traen los clics:**

| Página | Clics | Impresiones | Posición |
|---|---|---|---|
| `/trabajo-renderista/` | 54 | 876 | 20,1 |
| `/uruguay/` | 20 | 480 | 13,0 |
| `/` | 16 | 8.242 | 73,2 |
| `/chile/` | 11 | 320 | 29,8 |
| `/precios/` | 10 | 1.315 | 53,4 |
| `/guadalajara/` | 9 | 337 | 42,8 |
| `/cordoba/` `/rosario/` `/tucuman/` | 6 c/u | | |

**Las que traen las impresiones** (posición mala, mucho potencial):
`/espana/` (13.739), `/` (8.242), `/barcelona/` (2.153), `/servicios/` (2.090),
`/mallorca/` (2.007), `/baleares/` (1.882), `/malaga/` (1.881),
`/programas-para-renders/` (1.772), `/renderistas/` (1.593).

**Consultas que ya posicionan bien** (top 10): `renderista trabajo remoto` (8,8),
`renderista remoto` (8,2), `renders canarias` (4,4), `renders studio` (3,1),
`trabajo de renderista remoto` (7,2), `renders avila` (5,3).

**Tráfico por país:** Argentina 48 clics, España 35. Móvil convierte 3 veces
mejor que escritorio (CTR 1,27 % vs 0,4 %).

> Conclusión para la migración: `/trabajo-renderista/` y las páginas de
> Latinoamérica son las que más hay que cuidar; no son las que uno miraría por
> intuición. Y la comparación a 390 px importa tanto como la de escritorio.

---

## 9. Lo que ya está hecho

`scripts/01-extraer-xml.mjs` + `scripts/lib/wxr.mjs` leen el export y dejan en
`datos/`:

| Fichero | Qué es |
|---|---|
| `datos/paginas/<slug>.json` | 141 ficheros, uno por página, con el árbol de Elementor ya leído |
| `datos/paginas.json` | Índice: slug, URL, título, SEO de Yoast, versión |
| `datos/legales.json` | Las 4 páginas sin Elementor |
| `datos/menus.json` | Los 6 menús en árbol |
| `datos/adjuntos.json` | Las 443 imágenes con sus variantes |
| `datos/lista-imagenes.txt` | Las 1.604 direcciones a descargar |
| `datos/resumen-extraccion.json` | El recuento, para el validador |

Tarda 1,6 segundos. `datos/` no va a Git (se regenera).

---

## 10. Lo que falta para cerrar la Fase 0

El inventario de la web en vivo: **hojas de estilo con su orden**, **tipografías
del tema con su versión**, y de paso los códigos de AdSense, Analytics y Search
Console y el texto de las páginas legales (que en el export están vacías).

Está todo en el `<head>` y en el HTML de la web en vivo.

**No lo puedo sacar yo:** desde donde trabajo no hay salida a `renders.studio`
(ni por comandos ni por navegador), y en esta sesión no tengo consola dentro de
tu ordenador. Leo y escribo ficheros en tu carpeta, pero no ejecuto nada ahí.

**Las descargas las lanzas tú**, con los `.cmd` de `descargas\`. El primero,
`01-descargar-html-referencia.cmd`, se ejecuta con doble clic y baja 8 páginas a
`referencia\html\`.
