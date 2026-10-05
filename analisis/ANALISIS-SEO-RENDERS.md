# Análisis SEO de renders.studio frente a la competencia

Fecha: 6 de octubre de 2026 · Método: `PROMPT-SEO-V1.md`, fases 1 (lo que no se ve), 4 (investigación de Google) y 5 (competencia).
**No se ha cambiado nada en la web.** Esto es solo el análisis; el plan se aprueba antes de tocar nada.

Datos en bruto: `analisis/datos/competencia-renders.json` (29 páginas de 22 dominios), `analisis/datos/nuestra-renders.json` (10 páginas nuestras) y `analisis/datos/competencia-urls.txt`.

## Cómo se ha hecho y qué límites tiene

- Seis búsquedas, una por intención: «renders», «renders 3d arquitectura España estudio», «empresa de renders España», «cuánto cuesta un render», «renders hiperrealistas» y «qué es un render arquitectura».
- De los resultados se descargaron y leyeron 29 páginas de 22 webs: título, descripción, h1, todos los h2/h3 en orden, palabras, precios, plazos, preguntas frecuentes, datos estructurados y elementos de confianza.
- Nuestra web se midió sobre la versión compilada (las 145 páginas de `dist`).
- **Límite:** el buscador que uso no es Google España. Los competidores son los reales del sector, pero el orden exacto en que salen puede variar. Para afinar posiciones hace falta el export de Search Console.
- **Sobre la palabra «renders» a secas:** es una búsqueda mixta. Google mezcla definiciones (Wikipedia, Lumion, escuelas) con estudios. Para salir ahí hacen falta las dos cosas: una buena respuesta a «qué es un render» y una página de servicio fuerte.

## 1. Quién sale por delante

| Web | Sale por | Palabras | h2 | Lo que la distingue |
|---|---|---|---|---|
| lobostudio.es | empresa de renders, hiperrealistas | 2.499 | 30 | «+3.700 clientes, +55.000 imágenes», 4,9/5 en Google con 109 reseñas, oficinas en Barcelona, Madrid y Málaga, FAQ de 10 preguntas |
| hamau.studio | empresa de renders | 2.604 | 10 | Solo promociones y villas; precios publicados (10.000–30.000 €); fundador con nombre; «cuándo NO somos buena opción»; FAQ de 14 preguntas |
| rogervila.com | renders 3D, Madrid, Barcelona | 2.006 | 18 | «14 años», presupuesto en 24 h, proceso en 5 fases, reseñas con nota, ficha de negocio local |
| weaversight.com | renders arquitectura, Madrid | 1.627 | 11 | Proyectos con nombre propio, clientes, dirección, FAQ de 7 preguntas |
| arquitecturas3d.com | renders, precios | 1.474 | 8 | Precios en la portada («desde 99 €»), 24 h / 72 h, «+350 proyectos», WhatsApp, 4 pasos |
| davantstudio.com | empresa de renders | 892 | 15 | «+7 años, +400 clientes», servicios por tipo de cliente |
| jvarenders.com | renders 3D arquitectura | 640 | 7 | «13 años, +175 proyectos, +2.000 imágenes», proyectos con nombre, blog técnico |
| vimapstudio.com | empresas de renders, ciudades | 1.612 | 10 | Proyectos con localidad (Navacerrada, Narón, barrio de Salamanca) |
| globalcgi.eu | renders 3D | 2.057 | 6 | 117 imágenes, guía descargable |
| behindpictures.com | estudio de renders, qué es un render | 1.234 | 24 | Clientes con nombre (Radisson), FAQ, artículo «qué es un render» |
| credibility3d.es | renders 3D arquitectura | 410 | 7 | «15 años», muy corta |
| rendersa.com | empresa de renders | 1.239 | 7 | «10 años, 500 clientes», presupuesto en 24 h |
| icarasarquitectura.com | renders Madrid | 604 | 6 | Corta, portfolio |
| rendersvalencia.com | renders Valencia | 1.590 | 13 | «20 años» |
| renders.es | renders España, precios, ciudades | 1.378 | 17 | **Misma fórmula que renders.studio:** páginas de ciudad clonadas y títulos con palabras repetidas. No es un modelo a seguir |
| estudio3dbs.com, lookrender.com, ararenders.com, 3detail.es, habdesign.es, firefliesrenders.com | precio de un render | 746–2.176 | 5–10 | Guías de precios con rangos por tipo de proyecto, factores y «cómo comparar presupuestos» |
| lumion.es, proyecto3dvalencia.es, behindpictures.com | qué es un render | 575–1.033 | 6–9 | Definición corta arriba, para qué sirve, tipos, diferencias con foto y plano |
| estudiolatarq.com | mejores estudios de renders | 1.125 | 4 | Listado comparativo de estudios |

## 2. Qué tienen en común los que salen arriba

Sobre las 15 portadas de estudios analizadas:

| Elemento | Cuántos lo tienen | renders.studio |
|---|---|---|
| WhatsApp | 11 de 15 | **No** (0 de 145 páginas) |
| Teléfono que se puede pulsar | 8 de 15 | **No** (0 de 145) |
| Formulario | 10 de 15 | Sí en 73 páginas, **roto en 67** |
| Cifras de experiencia (años, proyectos, clientes) | 12 de 15 | Sí, pero sin confirmar (ver 3.3) |
| Vídeo o animación a la vista | 12 de 15 | No en la portada |
| Tour 360 como servicio | 13 de 15 | Sí |
| Equipo o fundador con nombre | 9 de 15 | No |
| Dirección | 8 de 15 | No |
| Clientes o proyectos con nombre | 9 de 15 | No |
| Blog o guías | 10 de 15 | No |
| Preguntas frecuentes | 6 de 15 | Sí |
| Testimonios | 5 de 15 | Sí, los mismos 12 en 138 páginas |
| Ficha de negocio en datos estructurados | 5 de 15 | No |
| Preguntas frecuentes en datos estructurados | 6 de 15 | Solo en /precios/ |

**Tamaño y orden.** La portada típica de un competidor tiene unas 1.470 palabras y 10 h2. La nuestra tiene 3.765 palabras, 65 h2 y 45 h3. No falta texto: sobra, y está repetido.

**La secuencia que más se repite** en las portadas que ganan:

1. Qué hacemos y para quién (arquitectos, promotoras, interioristas).
2. Prueba inmediata: cifras, reseñas, logos de clientes.
3. Servicios, 4 a 6, cada uno con enlace a su página.
4. Proyectos reales con nombre y lugar.
5. Por qué nosotros, 3 o 4 razones.
6. Proceso en 3 a 5 pasos, con plazos.
7. Testimonios.
8. Preguntas frecuentes, 7 a 14.
9. Contacto: «presupuesto en 24 horas» y WhatsApp.

**Títulos.** Los suyos dicen qué son y para quién: «Empresa de Renders y Visualización Arquitectónica 3D», «Estudio de renders 3D + IA en Barcelona para Arquitectura y Producto». El nuestro repite la palabra: «Renders - Render - Renders 3D - Renders arquitectura - Renders.studio».

## 3. Lo que no se ve en renders.studio

Medido sobre las 145 páginas compiladas.

### 3.1 Fallos que impiden que un cliente contacte

| Fallo | Cuánto |
|---|---|
| Formulario que muestra «Error: Formulario de contacto no encontrado» | 67 páginas (entre ellas Madrid). El fallo ya está en la web de WordPress actual |
| Teléfono | No aparece en ninguna página |
| WhatsApp | No aparece en ninguna página |
| Botones que no llevan a ningún sitio (`#`) | 7 en la portada: «ver más», «arquitectura», «Ver más proyectos render», «Más tipos de renders», «Render con IA», «Imágenes» y el correo |
| El correo del texto no es un enlace de correo | En todas las páginas con el bloque de contacto |

Esto va primero. Con el contacto roto, cualquier mejora de posicionamiento trae visitas que no pueden escribir.

### 3.2 El idioma: está escrito en argentino

2.211 formas de voseo en 138 páginas: «necesitás» (691), «tenés» (277), «querés» (277), «descubrí» (276), «contás», «podés», «obtené», «pedí», «escribinos» (138 cada una).

El objetivo es España. Un arquitecto de Madrid que lee «¿Necesitás un presupuesto? Escribinos» entiende que el estudio no es de aquí. Los competidores escriben todos en español de España.

### 3.3 Cifras y afirmaciones que tienes que confirmar o quitar

| Afirmación | Dónde | Problema |
|---|---|---|
| «Más de 11 años y 3.200 visualizaciones anuales» | 138 páginas | Sin respaldo visible |
| «Visualizaciones listas en solo 15 días» | 138 páginas | En la misma página un testimonio dice «entregas en 4 días», y /precios/ dice 48 horas, 24 horas y 7 días laborables |
| «Premios por visualizaciones en concursos de todo el mundo» | 138 páginas | No se nombra ninguno |
| 12 opiniones de clientes (Laura Torres, Fernando Ruiz, María Fernández…) | 138 páginas, idénticas | En el código llevan la nota «12 testimonios reales y SEO optimizado». Si no son clientes reales, hay que quitarlas: unas reseñas inventadas son un riesgo legal y de confianza |
| «Trabajo integral: visualizaciones, branding y sitios web» | 138 páginas | ¿Hacéis branding y webs? |
| «Cursos de renders» | Todas | ¿Dais cursos, o es una página informativa? |
| «Trabajos renderista» | Todas | Atrae a gente que busca empleo, no a clientes |

### 3.4 Los precios se contradicen entre páginas

- Portada y ciudades: interior 50–150 €, exterior 70–200 €, modelado 60–250 €, planos 50–100 €, tour 100–500 €.
- /precios/: 70–170 €, 90–220 €, 40–180 €, 100–300 €, 350–550 €, 400–650 €…
- Descripción de /precios/ para Google: «desde 50 € a 150 €».

Además están muy por debajo del mercado que publican los competidores: 200–600 € por imagen en el segmento profesional y 600–3.000 € en el alto. Arquitecturas3D es el único que compite en precio bajo («desde 99 €»). Un precio de 50 € atrae a particulares; a una promotora le resta confianza.

### 3.5 Estructura

| Medida | Resultado |
|---|---|
| Parecido entre páginas de ciudad | 97–99 % (medido entre Madrid, Sevilla, Alicante, España y Uruguay) |
| Títulos de más de 60 caracteres | 46 de 145 |
| Títulos y descripciones con la palabra clave repetida | Prácticamente todos |
| Páginas con dos h1 | 2 (/servicios/ y /renderistas/) |
| Páginas sin h1 | 4 (las legales) |
| h2 en la portada | 65 (los competidores, 10 de media) |
| Ficha de negocio en datos estructurados | Ninguna |

## 4. Huecos frente a la competencia

«Parcial» significa que la web lo toca, pero mal o repetido.

| Hueco | ¿Lo tenemos? | Quién lo hace bien |
|---|---|---|
| Página de precios con rangos por tipo de proyecto, factores y cómo comparar presupuestos | Parcial: /precios/ tiene 6.243 palabras y 48 h2, con rangos que se contradicen | estudio3dbs, lookrender, ararenders |
| Guía «qué es un render» corta y clara | Parcial: está repetida dentro de las 145 páginas en vez de vivir en una sola | lumion, proyecto3dvalencia, behind |
| Página para promotoras e inmobiliarias (venta sobre plano) | Parcial: una tarjeta, sin página propia fuerte | hamau, rogervila, davant |
| Página para arquitectos (concursos) | No | jvarenders, arquitecturas3d |
| Página para interioristas | Parcial | lobostudio, rogervila |
| Proyectos con nombre, lugar y encargo | No: la galería son imágenes sueltas | weaver, vimap, hamau, jvarenders |
| Proceso con plazos concretos | Parcial: 9 pasos sin plazos | rogervila (5 fases), arquitecturas3d (4 pasos, 72 h) |
| «Qué necesito enviar para pedir un render» | No | estudio3dbs, hamau, lobostudio |
| «Cuántas revisiones incluye» | No | hamau |
| «Diferencia entre render, animación y tour 360» | No | hamau, lobostudio |
| «Cuántos renders necesita una promoción» | No | hamau |
| «¿La IA sustituirá a los renders?» | Parcial: hay un bloque de IA | estudio3dbs, 3detail |
| «Cómo elegir estudio de renders» | No | vimap, estudiolatarq |
| Vídeo y animación 3D a la vista | Parcial | 12 de 15 |
| Equipo con nombre y formación | No | hamau, jvarenders |
| Reseñas de Google con nota | No | lobostudio, rogervila, arquitecturas3d |
| Blog o guías | No | 10 de 15 |

## 5. Preguntas reales para las preguntas frecuentes

Salen de las FAQ y de los títulos de los competidores. Cada una iría en una sola página.

**Precio**
1. ¿Cuánto cuesta un render 3D?
2. ¿Qué factores determinan el precio de un render?
3. ¿Por qué hay tanta diferencia de precio entre estudios?
4. ¿Qué diferencia un render barato de uno profesional?
5. ¿Cómo pedir un presupuesto que se pueda comparar?
6. ¿Cuántos renders necesita una promoción inmobiliaria?

**Proceso**
7. ¿Qué necesito enviar para empezar?
8. ¿Sirve un boceto, o hacen falta planos?
9. ¿Cuánto se tarda en entregar un render?
10. ¿Cuántas revisiones incluye el trabajo?
11. ¿En qué formatos y resolución se entrega?
12. ¿Puedo usar las imágenes en portales, vallas y redes?

**Servicio**
13. ¿Qué es un render arquitectónico y para qué sirve?
14. ¿Qué diferencia hay entre un render, una animación 3D y un tour virtual 360?
15. ¿Los renders ayudan a vender sobre plano?
16. ¿Hacéis renders para concursos?
17. ¿Trabajáis con promotoras, con arquitectos, con particulares?
18. ¿Usáis inteligencia artificial?

**Empresa**
19. ¿Tengo que reunirme en persona?
20. ¿En qué ciudades trabajáis?
21. ¿Cómo puedo hablar con vosotros?

## 6. Mejoras propuestas, en tres grupos

### Grupo 1 — Lo que impide contactar (va primero)

1. Formulario que envíe de verdad, en todas las páginas. Hace falta la clave de un servicio de envío y un correo que funcione.
2. Teléfono y WhatsApp visibles en la cabecera y como botón fijo. Hace falta el número.
3. Dar destino a los 7 botones que no llevan a ningún sitio.
4. Convertir el correo en un enlace de correo.

### Grupo 2 — Lo que puedo hacer sin datos tuyos (necesita tu permiso)

5. Pasar todo el texto de voseo a español de España con tuteo: 2.211 formas en 138 páginas, por script, con pasada de prueba y 5 ejemplos antes de aplicar.
6. Reescribir títulos y descripciones de las 145 páginas con una plantilla por tipo de página. Ejemplo para la portada: «Renders 3D de arquitectura para arquitectos y promotoras | Renders.studio».
7. Portada nueva con la secuencia que gana (apartado 2): pasar de 65 h2 a unos 10 y mandar el resto a su página.
8. Sacar de las 145 páginas los bloques que se repiten («qué es un render», «programas», «cursos», «trabajo», «IA», «freelance», «agencia», «despacho») y dejarlos solo en su página, enlazados.
9. /precios/ como guía clara: una sola tabla, factores y cómo comparar presupuestos.
10. Guías nuevas: «Qué es un render» (corta), «Qué enviar para pedir un render», «Render, animación o tour 360», «Cómo elegir estudio de renders».
11. Páginas por tipo de cliente: promotoras e inmobiliarias, arquitectos y concursos, interioristas.
12. Preguntas frecuentes con las 21 preguntas del apartado 5, repartidas una por página.
13. Datos estructurados: preguntas frecuentes, servicio y migas en todas las páginas; ficha de negocio cuando haya datos.
14. Arreglar los h1 duplicados de /servicios/ y /renderistas/.
15. Ordenar las ciudades por niveles (España → región → ciudad), como acordamos, sin eliminar ninguna.

### Grupo 3 — Lo que necesita datos reales tuyos (no se inventa nada)

16. Una sola tabla de precios, la de verdad: cuánto por tipo, con o sin IVA y qué incluye.
17. Plazos reales: presupuesto, primera prueba y entrega final.
18. Cifras de experiencia confirmadas: años, número de proyectos.
19. Opiniones: confirmar si las 12 son reales (con permiso del cliente) o quitarlas. Mejor aún, reseñas de Google.
20. Proyectos por zona con nombre, tipo, año y fotos, para dar contenido propio a cada ciudad.
21. Quién hace el trabajo: nombre, formación, foto.
22. Datos de empresa: razón social, NIF, dirección o «servicio online en toda España», horario, ficha de Google.
23. Qué servicios hacéis de verdad: ¿branding y webs?, ¿cursos?, ¿buscáis renderistas?

## 7. Preguntas para ti

Contesta con el número: «1 sí, 2 no, 3…».

1. ¿Tienes un teléfono o WhatsApp para poner en la web? ¿Cuál?
2. ¿A qué correo deben llegar los formularios? ¿El de Gmail u otro del dominio?
3. ¿Me das permiso para pasar todo el texto a español de España (tú, puedes, pide)?
4. ¿Las 12 opiniones son de clientes reales?
5. «Más de 11 años», «3.200 visualizaciones anuales» y «premios en concursos»: ¿son ciertos? Si lo son, ¿qué premios?
6. ¿Cuál es el plazo real: 15 días, 4 días, 48 horas?
7. ¿Cuál es la tabla de precios buena? ¿Quieres seguir en precio bajo (50–200 €) o subir al segmento profesional (200–600 €)?
8. ¿Hacéis branding y páginas web, o solo renders?
9. ¿Dais cursos? ¿Buscáis renderistas, o esas páginas son solo para atraer visitas?
10. ¿A quién quieres vender sobre todo: promotoras, arquitectos, interioristas o particulares?
11. ¿Me das permiso para reescribir títulos y descripciones?
12. ¿Puedo reducir la portada y quitar de las ciudades los bloques repetidos, dejándolos enlazados?
13. ¿Tienes otra web (por ejemplo renders.es)? ¿Cuál quieres posicionar para cada búsqueda?
14. ¿Puedes exportar de Search Console «Páginas» y «Consultas» de los últimos 16 meses?
15. ¿Tienes ficha de empresa en Google?
