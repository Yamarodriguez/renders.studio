@echo off
REM ---------------------------------------------------------------
REM  02 - Descarga las ~1.600 imagenes de renders.studio
REM
REM  ANTES hay que haber ejecutado, en el simbolo del sistema:
REM      cd /d "D:\web\renders.studio"
REM      node scripts/01-extraer-xml.mjs
REM      node scripts/02-preparar-descarga-imagenes.mjs
REM
REM  Las deja en:  D:\web\renders.studio\public\wp-content\uploads\...
REM  conservando ruta y nombre (estan indexadas en Google Imagenes).
REM
REM  Tarda unos minutos. SE PUEDE EJECUTAR HACIENDO DOBLE CLIC.
REM ---------------------------------------------------------------
setlocal
set PROYECTO=D:\web\renders.studio
set CONFIG=%PROYECTO%\descargas\curl-imagenes.txt
set LOG=%PROYECTO%\descargas\log-02.txt

cd /d "%PROYECTO%"

if not exist "%CONFIG%" (
  echo.
  echo ERROR: no existe "%CONFIG%"
  echo Ejecuta antes, en el simbolo del sistema:
  echo     cd /d "%PROYECTO%"
  echo     node scripts/01-extraer-xml.mjs
  echo     node scripts/02-preparar-descarga-imagenes.mjs
  goto :fin
)

echo ================================================ > "%LOG%"
echo Descarga de imagenes - %DATE% %TIME% >> "%LOG%"
echo ================================================ >> "%LOG%"

echo.
echo Descargando imagenes. Esto tarda varios minutos, no cierres la ventana.
echo.

curl --create-dirs --parallel --parallel-max 8 -sS --retry 2 --retry-delay 1 ^
     -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" ^
     -w "%%{http_code} %%{size_download} %%{url_effective}\n" ^
     -K "%CONFIG%" >> "%LOG%" 2>&1

echo Descarga terminada. Contando ficheros...
echo.

set /a TOTAL=0
for /r "%PROYECTO%\public\wp-content\uploads" %%F in (*) do set /a TOTAL+=1
echo Ficheros en public\wp-content\uploads: %TOTAL%
echo Ficheros descargados: %TOTAL% >> "%LOG%"

echo.
echo Respuestas que NO son 200 (si no sale ninguna, perfecto):
findstr /B /V "200 " "%LOG%" | findstr /R "^[0-9][0-9][0-9] "

echo.
echo El detalle esta en: %LOG%

:fin
echo.
echo Pulsa una tecla para cerrar esta ventana.
pause >nul
endlocal
