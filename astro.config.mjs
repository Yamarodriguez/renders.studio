// @ts-check
import { defineConfig } from 'astro/config';

/**
 * Configuracion de la web nueva.
 *
 * Lo importante aqui es NO cambiar ninguna direccion:
 *  - trailingSlash 'always'  -> /madrid/  , igual que en WordPress
 *  - build.format 'directory'-> genera /madrid/index.html
 *  - site                    -> el dominio definitivo, para el sitemap
 *
 * Las imagenes NO pasan por el optimizador de Astro: van tal cual en
 * public/wp-content/uploads/... conservando ruta y nombre, porque estan
 * indexadas en Google Imagenes.
 */
export default defineConfig({
  site: 'https://renders.studio',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // El CSS copiado de la web original no se toca ni se junta: se sirve
    // tal cual desde public/, en el mismo orden que en la web en vivo.
    inlineStylesheets: 'never',
  },
  compressHTML: false,
});
