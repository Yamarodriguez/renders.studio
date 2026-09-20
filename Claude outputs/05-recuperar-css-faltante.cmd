@echo off
REM ---------------------------------------------------------------
REM  05 - Recupera las hojas de estilo de pagina que faltaban.
REM
REM  Elementor genera el CSS de una pagina la primera vez que alguien
REM  entra en ella. Asi que esto hace dos cosas:
REM    1) visita las paginas que no tenian hoja (para que se genere)
REM    2) vuelve a descargar esas hojas
REM
REM  ANTES hay que haber ejecutado:
REM      node scripts/05-revisar-css-de-paginas.mjs
REM
REM  SE PUEDE EJECUTAR HACIENDO DOBLE CLIC.
REM ---------------------------------------------------------------
setlocal
set PROYECTO=D:\web\renders.studio
set VISITAS=%PROYECTO%\descargas\curl-visitas.txt
set FALTANTES=%PROYECTO%\descargas\curl-css-faltantes.txt
set LOG=%PROYECTO%\descargas\log-05.txt
set UA=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36

cd /d "%PROYECTO%"

if not exist "%VISITAS%" (
  echo ERROR: no existe "%VISITAS%"
  echo Ejecuta antes:  node scripts/05-revisar-css-de-paginas.mjs
  goto :fin
)

echo ================================================ > "%LOG%"
echo Recuperar CSS faltante - %DATE% %TIME% >> "%LOG%"
echo ================================================ >> "%LOG%"

echo.
echo PASO 1 de 2: visitando las paginas para que Elementor genere su CSS...
echo (de 3 en 3, para no cargar tu servidor)
echo.
curl -sSL --parallel --parallel-max 3 --retry 1 ^
     -A "%UA%" -H "Accept-Encoding: identity" ^
     -w "%%{http_code} %%{url_effective}\n" ^
     -K "%VISITAS%" >> "%LOG%" 2>&1

echo Esperando 5 segundos a que el servidor escriba los ficheros...
timeout /t 5 /nobreak >nul

echo.
echo PASO 2 de 2: descargando las hojas que faltaban...
echo.
curl --create-dirs --parallel --parallel-max 6 -sS --retry 2 ^
     -A "%UA%" ^
     -w "%%{http_code} %%{size_download} %%{url_effective}\n" ^
     -K "%FALTANTES%" >> "%LOG%" 2>&1

echo Hecho. Comprobando el resultado...
echo.
node scripts/05-revisar-css-de-paginas.mjs

:fin
echo.
echo El detalle esta en: %LOG%
echo Pulsa una tecla para cerrar esta ventana.
pause >nul
endlocal
