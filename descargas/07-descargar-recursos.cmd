@echo off
REM ---------------------------------------------------------------
REM  07 - Descarga las hojas de estilo, el JavaScript, las tipografias
REM       y las fotos de fondo que piden las hojas.
REM
REM  Va en dos pasadas:
REM    1) las hojas y los scripts
REM    2) lo que esas hojas piden por dentro: .woff2 de las letras y los
REM       iconos, y las fotos de fondo de las franjas de color
REM
REM  Todo va a public/ conservando su ruta original.
REM
REM  ANTES hay que haber ejecutado:
REM      node scripts/10-capturar-cabecera.mjs
REM
REM  SE PUEDE EJECUTAR HACIENDO DOBLE CLIC.
REM ---------------------------------------------------------------
setlocal
set PROYECTO=D:\web\renders.studio
set LOG=%PROYECTO%\descargas\log-07.txt
set UA=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36

cd /d "%PROYECTO%"

echo ================================================ > "%LOG%"
echo Descarga de recursos - %DATE% %TIME% >> "%LOG%"
echo ================================================ >> "%LOG%"

echo.
echo PASADA 1 de 2: preparando la lista de hojas y scripts...
node scripts/11-preparar-descarga-recursos.mjs
if errorlevel 1 goto :fin

echo.
echo Descargando hojas de estilo y JavaScript...
curl --create-dirs --parallel --parallel-max 6 -sS --retry 2 ^
     -A "%UA%" ^
     -w "%%{http_code} %%{size_download} %%{url_effective}\n" ^
     -K "%PROYECTO%\descargas\curl-recursos.txt" >> "%LOG%" 2>&1

echo.
echo PASADA 2 de 2: mirando que piden esas hojas por dentro...
node scripts/12-recursos-del-css.mjs
if errorlevel 1 goto :fin

echo.
echo Descargando tipografias, iconos y fotos de fondo...
curl --create-dirs --parallel --parallel-max 6 -sS --retry 2 ^
     -A "%UA%" ^
     -w "%%{http_code} %%{size_download} %%{url_effective}\n" ^
     -K "%PROYECTO%\descargas\curl-css-recursos.txt" >> "%LOG%" 2>&1

echo.
echo Comprobando que no quede nada por bajar...
node scripts/12-recursos-del-css.mjs

echo.
echo Respuestas que NO son 200 (si no sale ninguna, perfecto):
findstr /B /V "200" "%LOG%" | findstr /R "^[0-9][0-9][0-9] "
echo.
echo El detalle esta en: %LOG%

:fin
echo.
echo Pulsa una tecla para cerrar esta ventana.
pause >nul
endlocal
