@echo off
REM ---------------------------------------------------------------
REM  03 - Descarga las hojas de estilo reales de renders.studio
REM
REM  ANTES hay que haber ejecutado:
REM      descargas\01-descargar-html-referencia.cmd   (doble clic)
REM      node scripts/03-analizar-head.mjs
REM
REM  Las deja en:  D:\web\renders.studio\referencia\css\
REM  numeradas con su orden de carga (01-..., 02-...).
REM  El CSS no se escribe: se copia.
REM
REM  SE PUEDE EJECUTAR HACIENDO DOBLE CLIC.
REM ---------------------------------------------------------------
setlocal
set PROYECTO=D:\web\renders.studio
set CONFIG=%PROYECTO%\descargas\curl-css.txt
set LOG=%PROYECTO%\descargas\log-03.txt

cd /d "%PROYECTO%"

if not exist "%CONFIG%" (
  echo.
  echo ERROR: no existe "%CONFIG%"
  echo Ejecuta antes:  node scripts/03-analizar-head.mjs
  goto :fin
)

echo ================================================ > "%LOG%"
echo Descarga de hojas de estilo - %DATE% %TIME% >> "%LOG%"
echo ================================================ >> "%LOG%"

echo.
echo Descargando hojas de estilo...
echo.

curl --create-dirs --parallel --parallel-max 6 -sS --retry 2 ^
     -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" ^
     -w "%%{http_code} %%{size_download} %%{url_effective}\n" ^
     -K "%CONFIG%" >> "%LOG%" 2>&1

echo === Hojas comunes descargadas ===
dir /b "%PROYECTO%\referencia\css\*.css"
echo.
echo === Cuantas hojas propias de pagina ===
set /a PROPIAS=0
for %%F in ("%PROYECTO%\referencia\css\paginas\*.css") do set /a PROPIAS+=1
echo %PROPIAS% ficheros en referencia\css\paginas
echo.
echo Respuestas 404 (son normales: alguna pagina no usa Essential Addons):
findstr /B "404 " "%LOG%" | find /c "404"
echo.
echo Respuestas que no son ni 200 ni 404 (estas SI son un problema):
findstr /B /V "200 404" "%LOG%" | findstr /R "^[0-9][0-9][0-9] "
echo.
echo El detalle esta en: %LOG%

:fin
echo.
echo Pulsa una tecla para cerrar esta ventana.
pause >nul
endlocal
