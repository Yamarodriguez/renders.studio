# Análisis AEO de renders.studio: optimización para buscadores e IA

Fecha: 9 de octubre de 2026. **No se ha cambiado nada en la web.**

AEO (*Answer Engine Optimization*) es posicionar la web en las respuestas de ChatGPT, Claude, Perplexity, Gemini, Copilot y los resúmenes con IA de Google. Para eso, sus rastreadores tienen que poder entrar, entender quién eres y encontrar respuestas claras que puedan citar.

## Cómo se ha medido

- **Web real (WordPress):** se pidió /madrid/ haciéndose pasar por 10 rastreadores de IA (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, PerplexityBot, Google-Extended, Bytespider, CCBot y Applebot-Extended), además de robots.txt, llms.txt y el sitemap.
- **Web nueva (Astro):** se analizaron las 183 páginas compiladas: tamaño, proporción de texto, encabezados, primer párrafo, datos estructurados y metadatos.
- **Competencia:** robots.txt y llms.txt de 10 competidores.

## 1. Acceso: ¿pueden entrar los rastreadores de IA?

| Comprobación | Web real (WordPress) | Web nueva (Astro) |
|---|---|---|
| Los 10 rastreadores de IA reciben la página | **Sí**, todos con código 200 y la página entera | Pendiente: hoy es web de pruebas |
| robots.txt | Sí, lo permite todo | **No existe** |
| Sitemap | Sí (sitemap_index.xml de Yoast) | **No existe** |
| llms.txt | No (404) | **No existe** |
| HTML sin JavaScript | Sí | Sí: estático, el texto está en el HTML |
| Cabecera noindex | No | **Sí, en toda la web** (a propósito mientras es de pruebas) |

**Lo más importante:** a la web nueva le faltan robots.txt y sitemap. Hoy no importa porque no está publicada, pero el día de la mudanza los buscadores y las IA la encontrarían sin mapa de páginas. Hay que crearlos antes de la mudanza y quitar ese mismo día la cabecera noindex.

**Competencia:**

| Web | llms.txt | Reglas para IA en robots.txt |
|---|---|---|
| rogervila.com | Sí | No |
| weaversight.com | Sí | Sí: permite GPTBot, ClaudeBot, PerplexityBot, Google-Extended, OAI-SearchBot y CCBot |
| vimapstudio.com | Sí | No |
| lobostudio.es, hamau.studio, davantstudio.com, renders.es, arquitecturas3d.com, globalcgi.eu, behindpictures.com | No | No |

Tener llms.txt y reglas explícitas para los rastreadores de IA todavía es poco habitual en el sector: solo 3 de 10 tienen lo primero y 1 de 10 lo segundo. Es fácil adelantarse.

## 2. Contenido: ¿encuentran una respuesta que citar?

Las IA citan sobre todo **la primera frase que responde** a la pregunta y los bloques de pregunta y respuesta.

| Medida (mediana) | 145 páginas originales | 38 páginas nuevas |
|---|---|---|
| Peso del HTML | 275 KB | 273 KB |
| Texto frente a código | 9 % | 10 % |
| Palabras | 3.588 | 4.251 |
| h2 | 41 | 34 |
| Preguntas (h2/h3 en pregunta y FAQ) | 20 | 31 |

**Primer párrafo de algunas páginas:**

| Página | Empieza por |
|---|---|
| / | «Renders 3D: En Renders.studio transformamos ideas en imágenes 3D de alta calidad…» |
| /madrid/ | «Ofrecemos servicios de render Madrid para arquitectura, diseño de interiores y proyectos urbanísticos…» |
| /hiperrealistas/ | «Ofrecemos servicios de renders Hiperrealistas para arquitectura…» |
| /renders-piscinas/ | «Ofrecemos servicios de renders de piscinas para arquitectura…» |
| /precios/ | «Conocer los precios de renders 3D es fundamental antes de contratar…» |
| /que-enviar-para-pedir-un-render/ | «Para pedir un render no necesitas un proyecto terminado…» (bien: responde directamente) |

**Problemas:**

1. **El primer párrafo es el mismo en casi todas las páginas**, con la palabra cambiada («Ofrecemos servicios de renders X…»). Una IA que compare /madrid/, /sevilla/ y /renders-piscinas/ ve el mismo texto y no tiene motivo para citar ninguna. Las páginas nuevas tienen su bloque propio («¿Qué son los renders de piscinas?»), pero aparece **después** de la portada repetida.
2. **Páginas muy largas y repetidas:** de 3.600 a 4.250 palabras, de las que unas 3.400 se repiten en más de 35 páginas. Las IA trocean las páginas y descartan lo repetido. Lo que hace única cada página (de 650 a 1.000 palabras) queda diluido.
3. **Solo el 9 % del HTML es texto.** El resto son estilos dentro del contenido (los bloques de «por qué elegirnos», el proceso, las opiniones y las preguntas frecuentes llevan su propio CSS), listas de tamaños de imagen y atributos de Elementor. Algunos rastreadores de IA cortan las páginas largas, y el texto útil queda al final.
4. **Faltan datos concretos y fáciles de extraer.** La IA busca frases como «Un render interior cuesta entre 70 y 170 €; el plazo habitual es de 15 días». En la web los precios están en /precios/, pero la descripción de esa página dice «desde 50 € a 150 €», que contradice la tabla. Una IA puede citar el dato equivocado.
5. **Lo bueno:** las preguntas frecuentes están en el HTML aunque estén plegadas, hay muchas preguntas reales (de 20 a 31 por página) y las guías nuevas responden en la primera frase.

## 3. Entidad: ¿sabe la IA quién eres?

Los asistentes recomiendan empresas que **reconocen como entidad**: nombre, qué hacen, dónde, cómo contactar y quién habla de ellas.

| Señal | Estado |
|---|---|
| Datos estructurados de empresa (Organization) | Sí, en las 145 originales (de Yoast), pero con nombre «Renders», sin teléfono, sin zona de servicio y sin perfiles (`sameAs`) |
| Servicio (Service) | Sí, en 176 páginas |
| Preguntas frecuentes (FAQPage) | Sí, en 179 páginas |
| Migas de pan (BreadcrumbList) | Sí, en 183 |
| Búsqueda interna (SearchAction) | Apunta a `/?s=`, el buscador de WordPress, que **no funcionará en la web estática** |
| Fecha de actualización | Solo en 144 páginas (las nuevas no la tienen) |
| Opiniones (Review/AggregateRating) | No. Las 12 opiniones no están marcadas |
| Dirección, teléfono, perfil de Google, redes | No aparecen |
| Equipo, autor, quién hace el trabajo | No aparece |
| Nombre de marca uniforme | Mezcla «Renders», «Renders.studio», «Render Studio» y «RENDERS.STUDIO» |

Una IA que intente responder «¿qué estudio de renders me recomiendas en España?» no tiene de tu web un nombre claro, una zona, un teléfono ni opiniones verificables. Los competidores que salen citados (Lobo Studio, Hamau, Roger Vila) tienen reseñas en Google, dirección y equipo con nombre.

## 4. Metadatos

| Medida | Resultado |
|---|---|
| Títulos de más de 60 caracteres | 46 (no se tocan, por tu decisión) |
| Descripciones fuera de 110–160 caracteres | 4 |
| Títulos repetidos | 2 |
| Descripciones repetidas | 6 |
| Páginas sin un único h1 | 6 (4 legales sin h1; /servicios/ y /renderistas/ con 2) |
| Páginas legales con noindex | 4 (correcto) |

## 5. Propuestas, en tres grupos

### Grupo A: lo puedo hacer ya, sin cambiar nada visible

1. **robots.txt** en la web nueva: permitir todo, con reglas explícitas para los rastreadores de IA que traen visitas (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Claude-User) y enlace al sitemap. Necesito que decidas qué hacer con los que **entrenan** modelos (ver pregunta 1).
2. **sitemap.xml** con las 179 páginas indexables y su fecha.
3. **llms.txt**: un índice en texto para las IA con quién eres, qué haces, la zona, los precios de /precios/, el plazo de 15 días, los servicios, los tipos, las guías y las zonas, cada uno con su enlace.
4. **Datos estructurados de empresa completos y uniformes en las 183 páginas:** «Renders.studio» como nombre, servicio online en toda España, correo, catálogo de servicios con precios (OfferCatalog) y fecha de actualización. Quitar la búsqueda de WordPress que no funcionará.
5. **Aligerar el HTML** sin cambiar el aspecto: sacar a la hoja de estilos el CSS repetido dentro del contenido. Debería subir la proporción de texto y bajar el peso.

### Grupo B: necesita tu permiso (cambia lo que se ve)

6. **Respuesta directa al principio de cada página.** En las 38 páginas nuevas, subir el bloque «¿Qué son los renders de X?» justo debajo del título, por encima del texto repetido de la portada. En las 145 originales, añadir una frase de respuesta propia bajo el h1. No se quita nada: se añade o se reordena.
7. **Bloque de datos clave** en cada página de servicio: precio orientativo, plazo, formato de entrega y zona, en una tabla corta. Es lo que más citan las IA.
8. **Igualar la descripción de /precios/** a la tabla real. Ahora dice «desde 50 € a 150 €». Sé que dijiste que las descripciones no se tocan; esta es la única que da un dato falso y una IA puede repetirlo.
9. **Marcar las 12 opiniones** como reseñas en los datos estructurados, si tienes permiso de esos clientes para usar su nombre.
10. **Nombre de marca único** en los textos («Renders.studio»).

### Grupo C: necesita datos tuyos

11. Teléfono o WhatsApp, y dirección o «servicio online sin oficina abierta al público».
12. **Perfil de empresa en Google** y reseñas reales. Es la fuente que más usan los asistentes para recomendar negocios locales.
13. Perfiles en redes (Instagram, LinkedIn, Behance) para enlazarlos como `sameAs`.
14. Quién está detrás: nombre, formación y años de oficio confirmados.
15. Proyectos reales con nombre, lugar y año, para que las IA tengan casos concretos que citar.

## 6. Preguntas para ti

1. Los rastreadores que **entrenan** modelos de IA (GPTBot de OpenAI, ClaudeBot de Anthropic, Google-Extended, CCBot, Applebot-Extended): ¿los dejamos entrar (más presencia en las IA) o los bloqueamos (tus textos e imágenes no se usan para entrenar)? Los que **buscan y citan** en tiempo real los dejaría entrar siempre.
2. ¿Hago ya el grupo A (robots.txt, sitemap, llms.txt, datos estructurados y HTML más ligero)?
3. ¿Me das permiso para la 6 (subir la respuesta directa al principio) y la 7 (bloque de datos clave)?
4. ¿Puedo corregir la descripción de /precios/ (punto 8)?
5. ¿Tienes los datos del grupo C?
