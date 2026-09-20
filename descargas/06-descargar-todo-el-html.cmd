@echo off
REM ---------------------------------------------------------------
REM  06 - Descarga el HTML de LAS 145 paginas de renders.studio
REM
REM  ANTES hay que haber ejecutado:
REM      node scripts/09-preparar-descarga-html.mjs
REM
REM  Las deja en:  D:\web\renders.studio\referencia\html-todo\
REM  Son unos 55 MB. Tarda unos minutos.
REM
REM  Con esto se puede comparar TODA la web, no una muestra de 13 paginas.
REM
REM  SE PUEDE EJECUTAR HACIENDO DOBLE CLIC.
REM ---------------------------------------------------------------
setlocal
set PROYECTO=D:\web\renders.studio
set CONFIG=%PROYECTO%\descargas\curl-html-todo.txt
set LOG=%PROYECTO%\descargas\log-06.txt
set UA=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36

cd /d "%PROYECTO%"

if not exist "%CONFIG%" (
  echo ERROR: no existe "%CONFIG%"
  echo Ejecuta antes:  node scripts/09-preparar-descarga-html.mjs
  goto :fin
)

echo ================================================ > "%LOG%"
echo Descarga de todo el HTML - %DATE% %TIME% >> "%LOG%"
echo ================================================ >> "%LOG%"

echo.
echo Descargando las 145 paginas. Tarda unos minutos, no cierres la ventana.
echo.

curl --create-dirs --parallel --parallel-max 4 -sSL --retry 2 ^
     -A "%UA%" -H "Accept-Encoding: identity" ^
     -w "%%{http_code} %%{size_download} %%{url_effective}\n" ^
     -K "%CONFIG%" >> "%LOG%" 2>&1

echo === Paginas descargadas ===
set /a TOTAL=0
for %%F in ("%PROYECTO%\referencia\html-todo\*.html") do set /a TOTAL+=1
echo %TOTAL% ficheros en referencia\html-todo
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
