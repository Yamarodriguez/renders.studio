# Prompt para migrar una web de WordPress a Astro

Copia todo lo que hay debajo de la línea y pégalo en una sesión nueva de Claude,
rellenando lo que está entre corchetes. Adjunta el export XML de WordPress.

---

Quiero migrar la web **[DOMINIO]** (WordPress, tema [TEMA], maquetada con
[Elementor / Divi / Gutenberg / otro], hoy en vivo en https://[DOMINIO]) a un
sitio estático en Astro desplegado en Netlify, **conservando todas las URL y el
posicionamiento**.

Soy el propietario, no soy técnico: explícame las cosas en castellano llano,
hazlo tú, y súbelo a Git cuando esté verificado.

## Objetivo, en este orden

1. Que la web nueva sea **visualmente idéntica** a la que está en vivo.
2. Después, y solo después, mejorar SEO, velocidad y diseño.

No mezcles las dos fases. No me propongas mejoras de diseño hasta que la fase 1
esté cerrada y verificada.

## Punto de partida

- Export de WordPress (XML): adjunto.
- Mi carpeta de trabajo: `[RUTA DE LA CARPETA]` (está conectada a esta sesión).
- Sector y palabra clave principal: `[SECTOR / KEYWORD]`.
- Cuentas: AdSense `[ca-pub-…]`, Analytics `[G-…]`, Search Console `[código]`,
  WhatsApp `[número]`, correo `[…]`.
- Datos del titular para las legales: `[nombre o razón social, NIF, dirección]`.

---

# REGLAS DE TRABAJO (esto es lo importante)

Son lecciones de una migración anterior. Cada una costó días. **Léelas antes de
escribir una sola línea de código.**

## A. Copiar, no reconstruir

1. **La maquetación sale del constructor, no del texto renderizado.** En el XML,
   `content:encoded` es el texto ya renderizado y ha perdido columnas, anchos y
   separaciones. El campo bueno es `_elementor_data` (o el equivalente del
   constructor que use la web): trae el árbol completo con sus ajustes.
   **Dime qué constructor usa la web y de qué campo vas a sacar la maquetación
   antes de empezar.** Si intentas deducir el diseño del HTML plano con
   expresiones regulares, vas por el camino equivocado.

2. **El CSS no se escribe: se copia.** Descarga las hojas de estilo reales de la
   web en vivo. **No escribas CSS imitando el diseño.** Si en algún momento estás
   midiendo un margen "a ojo" desde una captura, para y dime qué hoja te falta.

3. **Tu CSS propio solo puede contener lo que NO existe en el original**:
   cabecera hecha a mano, pie, botón flotante, anuncios. **Nunca** color, tamaño
   de letra ni tipografía del contenido. Tu hoja se carga la última y gana
   siempre; si defines `body { color: ... }` machacas el tema entero.

## B. Las hojas de estilo

4. **Saca la lista de hojas del `<head>` de varias páginas reales**, una de cada
   tipo (portada, categoría, producto, legal). Únelas conservando el orden de
   carga y numera los ficheros con ese orden en el nombre (`01-…`, `02-…`).

5. **Respeta el sitio de la hoja de cada página.** En Elementor,
   `post-{ID}.css` NO va al final: va en medio de las comunes. Genera dos hojas
   comunes y mete la de la página entre ellas. Comprueba el orden real en el
   `<head>` de la web en vivo.

6. **No adelgaces el CSS hasta que la web esté idéntica.** Si luego lo haces:
   ignora las clases que van dentro de `:not()`, `:is()`, `:where()` y `:has()`
   (no tienen que existir en el HTML), y recorta selectores de una lista separada
   por comas en vez de tirar la regla entera. Un limpiador mal hecho borra los
   fondos y deja letra blanca sobre blanco.

## C. Los ficheros que la web necesita

7. **Las imágenes están en dos sitios: el contenido y el CSS.** Los fondos de las
   franjas de color van en `url(...)` dentro del CSS. Son pocas y se usan en
   cientos de páginas. El descargador tiene que recorrer **los dos sitios**.

8. **Los iconos y las letras son tipografías, no imágenes.** Si falta el `.woff2`,
   los iconos salen como cuadrados vacíos y el texto mide distinto.
   **Antes de montar un descargador contra el servidor antiguo, busca el paquete
   en npm.** Font Awesome, Simple Line Icons, Roboto y casi todas las de Google
   están ahí, y la versión exacta la pone el comentario de cabecera del CSS
   (`/*! Font Awesome Free 6.7.2 ... */`). Instálalas con npm y genera la hoja
   `@font-face` apuntando a ficheros locales: menos ficheros, sin cirílico ni
   griego, y sin depender del servidor viejo.

9. **Las imágenes conservan su ruta y su nombre** (`/wp-content/uploads/…`): están
   indexadas en Google Imágenes. No renombres nada. Y usa la **variante** de
   tamaño que usaba el constructor (Elementor usa `large` por defecto), no el
   fichero original, o las proporciones salen mal.

## D. Los fallos del original

10. **Si la web en vivo tiene un fallo visible** (texto invisible, enlaces
    muertos, un "Lorem ipsum", un aviso de obras olvidado), **enséñamelo y
    pregúntame qué hago**. No lo copies en silencio ni lo arregles en silencio.

11. **Antes de quitar algo que "no se ve", comprueba que nada dependa de su
    espacio.** En la migración anterior había una franja con el texto invisible;
    al quitarla, la foto principal tapaba el menú, porque la primera sección
    llevaba un margen superior negativo que contaba con esa franja.

12. **El contenido original no se modifica.** Se añade alrededor o se reconstruye
    su maquetación. Las correcciones puntuales se hacen en el motor con una regla
    documentada, nunca editando ficheros a mano.

13. **WordPress transforma el texto al publicar.** Las comillas rectas del export
    (`"así"`, `'así'`) salen en la web como `«así»` y `‘así’`. Aplica esa misma
    conversión, tocando solo el texto visible y nunca lo que va dentro de una
    etiqueta.

---

# CÓMO VERIFICAR (sin esto no sabemos si está bien)

## E. Montar la web real en local

14. **Descarga una página de cada tipo de la web en vivo con todas sus hojas e
    imágenes, y móntala en un servidor local.** Es la única forma de medir contra
    ella. Yo puedo ejecutar los comandos de descarga si tú no tienes salida a
    Internet hacia ese dominio.

15. **Comprueba que la copia de referencia carga TODO.** Reescribe las rutas
    absolutas al dominio antiguo para que apunten a los ficheros locales, y
    **verifica los errores 404 del navegador**. Si la referencia no carga las
    tipografías, la comparación dirá "0 diferencias" porque los dos lados están
    mal. Comparar contra una referencia rota da falsos aprobados.

## F. Las cuatro comprobaciones automáticas

Quiero estos cuatro scripts, y que **ninguno pueda saltarse**:

16. **Encabezados.** Compara la secuencia de H1/H2/H3 de cada página nueva con la
    de la web en vivo, en orden. El objetivo es 100 % idénticas. Documenta cada
    excepción con su motivo.

17. **Geometría.** Con Playwright, mide en la web real y en la nueva **cada texto,
    enlace e imagen**: posición, ancho, alto, tamaño de letra, grosor, color,
    tipografía y alineación. Lista las diferencias. El objetivo es 0–1 por página.
    Hazlo a 1400 px y a 390 px.

18. **Texto invisible.** Recorre la página y, para cada texto, compara su color
    con el color de fondo real (subiendo por los padres hasta encontrar uno
    opaco). Avisa si se parecen. Esto destapa los bloques en blanco sobre blanco.

19. **Ficheros que no cargan.** Abre cada tipo de página con el navegador, recorre
    la página entera (para que carguen las imágenes perezosas) y **lista todas las
    respuestas 400/404**, separando fotos, tipografías y otros. Tiene que quedar
    en cero.

20. **Además**, el validador de siempre: equilibrio de etiquetas, un solo H1 por
    página, ningún bloque generado dentro de otro, texto visible idéntico al
    original salvo lo añadido, ningún enlace perdido, y **que exista el fichero de
    cada imagen referenciada, también las del CSS**.

21. **Cada fallo que yo te señale a ojo, añádelo al validador como fallo
    bloqueante ese mismo día.** El validador tiene que crecer con los errores que
    encontremos. Si un fallo pudo llegar hasta mí, es que faltaba una comprobación.

22. **Un solo comando** (`npm run todo`) que genere, compile, valide y compare.
    **No se sube nada a Git si ese comando no termina en `fallos: 0`.**

---

# CÓMO ENTREGARME LAS COSAS

23. **Escribe los ficheros directamente en mi carpeta**, sin comprimir. Mi carpeta
    está conectada a la sesión. Los ZIP acaban en otra carpeta, el comando para
    descomprimir no los encuentra, falla, y los comandos siguientes se ejecutan
    con los ficheros viejos. Esto nos pasó tres veces y cada vez perdimos una
    ronda entera.

24. **Si tienen que ir muchos ficheros comprimidos**, deja el ZIP en la raíz del
    proyecto tú mismo y **comprueba después** que el contenido llegó a su sitio.

25. **Si te digo "sigue igual", lo PRIMERO que haces es mirar mi carpeta**: qué
    ficheros hay, de qué fecha y de qué tamaño. No supongas que los comandos se
    ejecutaron. No me pidas que te pegue errores antes de haber mirado tú.

26. **Los comandos, de uno en uno**, con una línea explicando qué hace cada uno y
    qué tiene que salir al terminar. En Windows: rutas entre comillas y `cd /d`.
    Nada de `node -e` ni heredocs; el código va siempre en ficheros.

27. **Dime siempre dónde estoy mirando.** `casascontenedores.netlify.app` solo
    cambia al hacer `git push`; para ver el resultado en mi ordenador es
    `npm run dev` y `http://localhost:4321`.

---

# ORDEN DE TRABAJO

**Fase 0 — Reconocimiento.** Antes de escribir código, dime:
qué constructor usa la web, de qué campo del XML sale la maquetación, cuántas
páginas hay y de qué tipos, qué hojas de estilo carga (lista con su orden), qué
tipografías y paquetes de iconos usa y en qué versión, y qué de todo eso está en
npm. **Espera a que yo lo confirme.**

**Fase 1 — Copia fiel.**
1. Extraer el XML al formato de datos, descargar imágenes (contenido **y** CSS).
2. Descargar las hojas de estilo reales y montarlas en su orden.
3. Instalar tipografías e iconos desde npm.
4. Montar la web real en local como referencia y verificar que carga todo.
5. Renderizar con el marcado exacto del constructor.
6. Pasar las cuatro comprobaciones hasta 0 fallos.
7. Enseñarme capturas comparadas, escritorio y móvil, de una página de cada tipo.

**Cierre de fase 1:** yo te digo que está bien. Hasta entonces, no pasas a la 2.

**Fase 2 — Mejoras.** SEO, velocidad, UX. Cada cambio, contra la referencia, para
saber qué se ha movido.

**Fase 3 — Mudanza.** Dominio en Netlify, DNS en el registrador, quitar el
`noindex`, sitemap en Search Console, consentimiento de cookies, Analytics. El
hosting antiguo no se cancela hasta pasado un mes.

---

**Empieza por la Fase 0. No escribas código todavía.**
