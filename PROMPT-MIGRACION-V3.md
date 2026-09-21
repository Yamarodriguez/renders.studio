# Prompt para migrar una web de WordPress a Astro (versión 3)

Copia todo lo que hay debajo de la línea y pégalo en una sesión nueva,
rellenando lo que está entre corchetes.

Esta versión sale de la migración de **renders.studio** (145 páginas, OceanWP +
Elementor). Todo lo que hay aquí costó una ronda de ensayo y error. La parte
nueva más importante es la sección **A: cómo trabajamos**, porque la mitad del
tiempo perdido no fue de código: fue de no saber quién ejecuta qué.

---

Quiero migrar la web **[DOMINIO]** (WordPress, tema **[TEMA]**, maquetada con
**[Elementor / Divi / Gutenberg]**, hoy en vivo en `https://[DOMINIO]`) a un
sitio estático en **Astro** desplegado en **[Netlify / Cloudflare Pages]**,
conservando todas las URL y el posicionamiento.

Soy el propietario, no soy técnico: explícame las cosas en castellano llano,
hazlo tú, y súbelo a Git cuando esté verificado.

## Lo que te doy de entrada

- **Export de WordPress (XML)**: en `[RUTA]\worpress\`. Si hay varios, usa el
  más grande y dime qué contiene cada uno antes de empezar.
- **Mi carpeta de trabajo**: `[RUTA DE LA CARPETA]` (conectada a esta sesión).
- **Los scripts de la migración anterior**: en `[RUTA]\scripts\`. **Empieza por
  ahí.** El motor de render, el comparador y los descargadores ya están
  escritos y verificados; adáptalos, no los reescribas. Esto es lo que más
  tiempo y gasto ahorra.
- **Repositorio y despliegue**: `[URL DE GITHUB]`, rama `[main]`, proyecto de
  Netlify `[NOMBRE]`.
- **Cuentas** (para la Fase 3): AdSense `[…]`, Analytics `[…]`, Search Console
  `[…]`, WhatsApp `[…]`, correo `[…]`.
- **Datos del titular para las legales**: `[nombre o razón social, NIF, dirección]`.

---

# A. CÓMO TRABAJAMOS (lee esto primero)

## A1. Quién ejecuta qué

**Tú (Claude) puedes leer y escribir ficheros en mi carpeta, pero NO puedes
ejecutar comandos en mi ordenador.** Ni `node`, ni `npm`, ni `git`, ni `curl`.
Tampoco tienes salida a internet hacia mi dominio.

Por tanto:

- **Todo lo que haya que ejecutar, lo ejecuto yo.**
- **Todo lo que haya que ejecutar, me lo das como un fichero `.cmd` de doble
  clic**, no como comandos sueltos para pegar. Pegar comandos falla: se cuelan
  caracteres, se pega en PowerShell en vez del símbolo del sistema, se ejecuta
  a medias.
- Analizar, escribir código, comparar y decidir: eso lo haces tú.

## A2. Cómo tiene que ser cada `.cmd`

1. Empieza comprobando **sus propios requisitos** (que existe `node`, que
   existe `curl`, que la dependencia clave está instalada) y se para con un
   mensaje claro si falta algo.
2. Ejecuta los pasos **de uno en uno**, anunciando cuál va (`[3/5] Descargando
   hojas de estilo...`).
3. Ante el primer error, **se para y dice qué paso falló por su nombre**:
   `SE HA PARADO AQUI: generar los iconos`.
4. Termina con `pause`, para que la ventana no se cierre y yo pueda leerlo.
5. Deja un registro en `descargas\log-XX.txt` para que tú lo leas luego.

> **Error real de la vez pasada:** encadenaste seis scripts en un
> `npm run datos`. Falló el cuarto porque faltaba un `npm install`, los dos
> últimos no se ejecutaron, y nadie se enteró. Dos días después el despliegue
> reventó por los ficheros que no se habían generado.

## A3. `npm install` va SIEMPRE primero

Cada vez que añadas una dependencia al `package.json`, el siguiente `.cmd` que
me des tiene que empezar con `npm install` **y comprobar que la dependencia
está de verdad**, mirando que exista un fichero concreto suyo. No des por hecho
que la instalé.

## A4. Antes de decir nada, mira mi carpeta

Si te digo "sigue igual", "no funciona" o "se ve mal, **lo PRIMERO que haces es
listar mi carpeta**: qué ficheros hay, de qué fecha y de qué tamaño. No supongas
que los comandos se ejecutaron. No me pidas que te pegue errores antes de haber
mirado tú.

Esto funcionó bien y hay que mantenerlo.

## A5. No me pidas capturas: hazlas tú

No puedes abrir mi web, pero **sí puedes traerte mis ficheros y montarla en tu
entorno**: mis hojas de estilo, mis imágenes y el HTML real. Con eso levantas
las dos webs —la vieja y la nueva— en tu servidor local, las abres con
Playwright y me mandas las comparativas lado a lado.

Es mucho más rápido que esperar a que yo lo mire. Hazlo en cuanto tengas algo
que enseñar.

## A6. Gastar menos

- **Descarga las 145 páginas al principio, no una muestra de 13.** Con la
  muestra hicimos tres rondas de "ahora me falta una página con este menú".
  Una sola descarga de ~55 MB lo evita todo.
- **No me pidas que te pegue registros largos**: escríbelos en un fichero, que
  tú lo lees directamente.
- **No listes carpetas enormes** (las 1.600 imágenes) sin filtro.
- Cuando algo falle, **reprodúcelo en tu entorno** antes de proponerme nada.
  La vez pasada el fallo de Netlify lo reprodujiste borrando un fichero: eso
  es lo correcto.

## A7. Qué sube a Git y qué no

- **`datos/` SÍ sube.** Netlify lo necesita para construir. Si falta un solo
  fichero, el despliegue falla con `ENOENT ... exit code 2`.
- **`public/` SÍ sube** (imágenes, hojas, JavaScript, tipografías). Son unos
  250 MB; avísame antes.
- **`referencia/` NO sube** (la copia de la web real, solo sirve para comparar).
- `dist/`, `node_modules/` y los registros, tampoco.

Antes de cada subida, pasa las comprobaciones. Si alguna falla, **no se sube
nada**.

---

# B. LAS REGLAS DEL CÓDIGO

## B1. Copiar, no reconstruir

1. **La maquetación sale de `_elementor_data`**, nunca de `content:encoded`.
2. **El CSS no se escribe: se copia.** La web carga 317 hojas. Si te pillas
   midiendo un margen a ojo desde una captura, para y dime qué hoja falta.
3. **Lo que genera un plugin no se calcula: se captura del HTML real.** En
   renders.studio eran cinco cosas, y cada una costó una ronda:
   - la galería de fotos
   - el formulario de Contact Form 7 (lleva dentro el número de la página, así
     que **va uno por página**)
   - el mapa de Google
   - la rejilla de Content Views (`[pt_view]`) **y la hoja de estilo suelta que
     deja detrás**
   - **las páginas legales, que están VACÍAS en el export** porque las escribe
     Complianz al vuelo
4. **Las fotos recortadas "a medida" de Elementor** se guardan en
   `uploads/elementor/thumbs/` con un nombre imposible de calcular. Se capturan.

## B2. El marcado de Elementor

Todo esto se descubre comparando, pero si ya lo sabes vas mucho más rápido:

- Una página puede mezclar **los dos sistemas**: `section`+`column` (clásico) y
  `container` (flexbox nuevo). En renders.studio **las 141 páginas llevaban los
  dos**. El motor tiene que pintar ambos.
- **Elementor escribe las clases en el orden en que están GUARDADOS los
  ajustes**, no en un orden fijo. Las clases escritas a mano caen donde les
  toque según ese orden.
- `elementor-section-height-default` **sale dos veces**, salvo cuando la sección
  tiene altura mínima: entonces la segunda la sustituye
  `elementor-section-items-{posición}`.
- El orden se invierte según el caso: `e-con-full e-flex` a ancho completo,
  `e-flex e-con-boxed` en caja.
- La sección con velo lleva dentro un **`<div class="elementor-background-overlay"></div>` vacío**.
- `_inline_size` viene unas veces como `{size: 67.28}` y otras como `67.28`.
- "Ancho completo" es una **clase**, no CSS.
- `data-settings` solo lleva unas pocas claves (`background_background`,
  `_animation`, `_animation_delay`, `shape_divider_*`), **en el orden guardado**,
  y el retardo solo sale si hay animación.

## B3. Los iconos: DOS versiones de Font Awesome

Esto no se ve y lo cambia todo:

- **Los iconos de los widgets no son una tipografía**: Elementor mete el SVG
  dentro del HTML.
- Esos trazados son de **Font Awesome 5.15.4**, aunque el tema cargue la
  **6.7.2** como tipografía para sus flechas de menú.
- Si usas la del tema, los miles de iconos salen con **otro dibujo** y ninguna
  comprobación lo detecta: cargan bien, pero están mal.

En `package.json`: `@fortawesome/fontawesome-free@6.7.2` (tipografía del tema) y
un alias `fa5` → `@fortawesome/fontawesome-free@5.15.4` (trazados de Elementor).

## B4. Las imágenes

- La variante por defecto de Elementor es **`large`**, no el original.
- El `srcset` va en este orden: **la variante que se usa**, luego las demás en
  el orden guardado, y **el original al final**. Solo las de la misma
  proporción.
- **Las dos primeras imágenes de cada página NO llevan `loading="lazy"`.**
- **Una foto repetida que ya salió sin `lazy` tampoco lo lleva la segunda vez.**
- La clase de animación al pasar el ratón va en la propia `<img>`, delante.
- Las rutas y los nombres no se tocan: están indexadas en Google Imágenes.

## B5. Lo que WordPress cambia al publicar

- Comillas rectas → `«así»` y `'así'` (*wptexturize*).
- Quita el punto y coma final de los `style="..."` escritos a mano.
- Añade `decoding="async"` a las imágenes del texto que no lo llevan.
- Los enlaces sin protocolo salen en `https`.
- Los `http://` internos salen en `https://` (plugin de SSL).

## B6. La cabecera no es una

En OceanWP cada página elige su menú con `ocean_header_custom_menu`. En
renders.studio eran **cinco cabeceras distintas** y 82 páginas usaban una que
no estaba en la muestra inicial.

El extractor del armazón tiene que **avisar** si le falta la referencia de
algún menú, con el número de páginas afectadas.

## B7. Las hojas de estilo

- Saca la lista del `<head>` de **varias** páginas, una de cada tipo.
- **`post-{ID}.css` va EN MEDIO**, no al final: detrás quedan seis hojas más
  (widgets del tema y tipografías).
- **`post-{ID}.css` no existe hasta que alguien visita esa página.** Elementor
  lo genera al vuelo. Las descargas de esas páginas traen un error de 196 bytes.
  Solución: visitar las páginas que faltan y volver a descargar.
- Las tipografías y los iconos: **mira npm antes de montar un descargador**. La
  versión exacta la pone el comentario de cabecera del CSS.
- Las fotos de fondo de las franjas **viven dentro del CSS**, en `url(...)`.
  El descargador tiene que recorrer las hojas ya descargadas y bajar lo que
  pidan. Sin eso, las franjas salen de color liso.
- **No adelgaces el CSS** hasta que la web esté idéntica.

---

# C. EL COMPARADOR (esto es lo que hace que funcione)

No escribas el motor y luego mires capturas. **Escribe el comparador primero** y
deja que él te diga qué corregir.

Cómo debe funcionar:

1. Para cada página, recorre los elementos con `data-id` del HTML real y los
   compara con lo que genera el motor: etiqueta, **lista de clases en orden**,
   atributos `data-*`, y el contenido de cada widget.
2. **Agrupa las diferencias por tipo** y dice cuál falta y cuál sobra. Así cada
   ronda corrige una regla, no un caso.
3. Escribe el detalle en `informes/comparacion-marcado.md`.
4. Devuelve código de salida distinto de cero si hay diferencias.

En renders.studio: **1801 → 77 → 24 → 1 → 0** en cuatro rondas para el armazón,
y **162 → 140 → 30 → 18 → 7 → 0** para el contenido. Sin el comparador eso son
semanas a ojo.

**Trampas del comparador:**

- Pasa **los dos lados por el mismo lector de HTML** antes de comparar. Si no,
  discutirás con las manías del lector (`<br />` → `<br>`, comentarios que
  desaparecen, `<p>` que se cierra solo) en vez de con tu código.
- **Salta los elementos que cuelgan de otro widget**: hay páginas con marcado de
  Elementor pegado a mano dentro de un bloque de texto, con los mismos
  identificadores. No son el widget de verdad.
- **Normaliza lo que cambia en cada visita**: el identificador aleatorio de la
  hoja suelta de Content Views, y la marca `data-rsssl` del plugin de SSL.

---

# D. LOS FALLOS DEL ORIGINAL

Si la web en vivo tiene un fallo visible, **enséñamelo y pregúntame**. No lo
copies en silencio ni lo arregles en silencio. En renders.studio salieron tres:

1. Tres imágenes de fondo que dan 404 en el servidor, usadas en ~140 páginas.
2. Un botón con el enlace guardado como `#https://...`, que no lleva a ningún
   sitio.
3. Dos páginas con dos H1 y cuatro páginas legales sin ninguno.

Y antes de quitar algo que "no se ve", comprueba que nada dependa de su
**espacio**: en una migración anterior, quitar una franja invisible hizo que la
foto principal tapara el menú, porque la sección de debajo tenía un margen
superior negativo que contaba con ella.

---

# E. ORDEN DE TRABAJO

## Fase 0 — Reconocimiento (sin escribir código)

Dime, y espera a que lo confirme:

- qué constructor usa y de qué campo sale la maquetación
- cuántas páginas hay y **de cuántos tipos de diseño** (no de cuántas URL)
- **cuántas cabeceras distintas** hay y qué ajuste las decide
- la lista de hojas de estilo **con su orden**
- las tipografías y los paquetes de iconos **con su versión**, y cuáles están en npm
- qué widgets usa y cuántas veces cada uno
- qué partes las genera un plugin y hay que capturar
- qué dice Search Console: **qué páginas traen el tráfico de verdad**

## Fase 1 — Copia fiel

En este orden, y cada paso en su `.cmd`:

1. Extraer el XML a datos.
2. **Descargar el HTML de TODAS las páginas** (no una muestra).
3. Descargar las imágenes.
4. Descargar las hojas de estilo, incluida la propia de cada página, y recuperar
   las que no existían aún.
5. Descargar el JavaScript, las tipografías y **lo que piden las hojas por
   dentro**.
6. Extraer el armazón (barra, cabeceras, pie) y el envoltorio del contenido.
7. Capturar lo que genera cada plugin.
8. Escribir el comparador.
9. Escribir el motor y **llevarlo a 0 diferencias**.
10. Las cuatro comprobaciones hasta 0 fallos.
11. Capturas comparadas, escritorio y móvil, de una página de cada tipo.

> **El JavaScript no es opcional.** Los bloques con `elementor-invisible` están
> ocultos hasta que el script de Elementor lanza su animación. Sin él, media web
> no se ve.

**Cierre de fase 1: yo te digo que está bien.** Hasta entonces, no pasas a la 2.

## Fase 2 — Mejoras

SEO, velocidad, UX. Cada cambio, contra la referencia, para saber qué se movió.

## Fase 3 — Mudanza

Dominio, DNS, quitar el `noindex`, sitemap, cookies, Analytics. El hosting
antiguo no se cancela hasta pasado un mes.

---

# F. LAS CUATRO COMPROBACIONES

Ninguna se puede saltar, y **cada fallo que yo te señale a ojo entra en el
validador como fallo bloqueante ese mismo día**.

1. **Encabezados.** La secuencia de H1/H2/H3 de cada página contra la real, en
   orden. Objetivo: 100 % idénticas. Cada excepción, documentada con su motivo.
2. **Geometría.** Con Playwright, en la web real y en la nueva: posición, ancho,
   alto, tamaño de letra, grosor, color, tipografía y alineación de cada texto,
   enlace e imagen. A **1400 px y a 390 px**. Objetivo: 0–1 por página.
3. **Texto invisible.** Para cada texto, compara su color con el del fondo real
   (subiendo por los padres hasta encontrar uno opaco). Avisa si se parecen.
4. **Ficheros que no cargan.** Abre cada tipo de página, recorre la página
   entera para que carguen las imágenes perezosas, y lista las respuestas
   400/404 separando fotos, tipografías y otros. Tiene que quedar en cero.

Más el validador de siempre: equilibrio de etiquetas, un solo H1, ningún bloque
generado dentro de otro, texto visible idéntico, ningún enlace perdido, y que
exista el fichero de cada imagen referenciada, **también las del CSS**.

**Un solo comando (`npm run todo`)** que genere, compile, valide y compare. No
se sube nada si no termina en `fallos: 0`.

---

# G. ANTES DE DESPLEGAR

- `netlify.toml` con **`X-Robots-Tag: noindex`** en toda la web de pruebas desde
  el primer día. Se quita el día de la mudanza.
- `trailingSlash: 'always'` y `build.format: 'directory'` en `astro.config.mjs`,
  para que las URL salgan exactamente igual.
- Las direcciones absolutas del cuerpo pasan a relativas, **pero el enlace
  canónico y las etiquetas de redes sociales se quedan absolutos**.
- Comprueba que `datos/` está completo en el repositorio **antes** de empujar.
  Un solo fichero que falte tumba el despliegue.

---

Empieza por la Fase 0. No escribas código todavía.
