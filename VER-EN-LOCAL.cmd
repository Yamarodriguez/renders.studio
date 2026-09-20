@echo off
REM ===============================================================
REM  VER LA WEB EN LOCAL
REM
REM  Hace TODO lo necesario, en orden, y se para en el primer fallo
REM  diciendo exactamente cual es. Al final abre el navegador.
REM
REM  SE EJECUTA HACIENDO DOBLE CLIC EN ESTE FICHERO.
REM ===============================================================
setlocal
set PROYECTO=D:\web\renders.studio
cd /d "%PROYECTO%"

echo.
echo ===============================================
echo  renders.studio - preparar la web en local
echo ===============================================
echo.

REM --- 0. comprobaciones previas --------------------------------
where node >nul 2>&1
if errorlevel 1 (
  set PASO=comprobar que Node esta instalado
  echo ERROR: no se encuentra "node". Hay que instalar Node.js.
  goto :error
)
where curl >nul 2>&1
if errorlevel 1 (
  echo AVISO: no se encuentra "curl". El paso de descargas no funcionara.
)

REM --- 1. dependencias ------------------------------------------
echo [1/5] Instalando dependencias (npm install)...
call npm install --no-audit --no-fund
if errorlevel 1 (set PASO=npm install& goto :error)

if not exist "node_modules\fa5\svgs\solid\arrow-circle-right.svg" (
  echo.
  echo ERROR: falta Font Awesome 5, que es de donde salen los iconos.
  echo        Prueba a borrar la carpeta node_modules y repetir.
  set PASO=comprobar Font Awesome 5
  goto :error
)

REM --- 2. datos --------------------------------------------------
echo.
echo [2/5] Generando los datos a partir del export y de la web real...

echo    - extrayendo el XML
call node scripts/01-extraer-xml.mjs
if errorlevel 1 (set PASO=extraer el XML& goto :error)

echo    - armazon (barra, cabeceras, pie)
call node scripts/04-extraer-armazon.mjs
if errorlevel 1 (set PASO=extraer el armazon& goto :error)

echo    - envoltorio del contenido
call node scripts/13-extraer-envoltorio.mjs
if errorlevel 1 (set PASO=extraer el envoltorio& goto :error)

echo    - iconos
call node scripts/07-generar-iconos.mjs
if errorlevel 1 (set PASO=generar los iconos& goto :error)

echo    - cabeceras de cada pagina
call node scripts/10-capturar-cabecera.mjs
if errorlevel 1 (set PASO=capturar las cabeceras& goto :error)

echo    - piezas que genera cada plugin
call node scripts/08-capturar-dinamicos.mjs
if errorlevel 1 (set PASO=capturar lo dinamico& goto :error)

REM --- 3. recursos (hojas, scripts, letras, fondos) ---------------
echo.
echo [3/5] Descargando hojas de estilo, JavaScript, tipografias y fondos...
echo       (esto tarda unos minutos la primera vez)

call node scripts/11-preparar-descarga-recursos.mjs
if errorlevel 1 (set PASO=preparar la descarga de recursos& goto :error)

curl --create-dirs --parallel --parallel-max 6 -sS --retry 2 ^
     -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" ^
     -w "%%{http_code} %%{size_download} %%{url_effective}\n" ^
     -K "%PROYECTO%\descargas\curl-recursos.txt" > "%PROYECTO%\descargas\log-local.txt" 2>&1

call node scripts/12-recursos-del-css.mjs
if errorlevel 1 (set PASO=mirar que piden las hojas& goto :error)

curl --create-dirs --parallel --parallel-max 6 -sS --retry 2 ^
     -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" ^
     -w "%%{http_code} %%{size_download} %%{url_effective}\n" ^
     -K "%PROYECTO%\descargas\curl-css-recursos.txt" >> "%PROYECTO%\descargas\log-local.txt" 2>&1

echo    - comprobando que no falte nada
call node scripts/12-recursos-del-css.mjs

REM --- 4. comprobacion del marcado -------------------------------
echo.
echo [4/5] Comparando el marcado con la web real...
call node scripts/06-comparar-marcado.mjs
if errorlevel 1 (
  echo.
  echo AVISO: hay diferencias de marcado. Mira informes\comparacion-marcado.md
  echo        La web se puede ver igualmente.
  echo.
)

REM --- 5. arrancar -----------------------------------------------
echo.
echo [5/5] Arrancando el servidor local...
echo.
echo ===============================================
echo  Abriendo  http://localhost:4321
echo.
echo  La portada esta en la raiz y el resto en su
echo  direccion de siempre:
echo     http://localhost:4321/madrid/
echo     http://localhost:4321/precios/
echo     http://localhost:4321/aviso-legal/
echo.
echo  Para parar el servidor: Control + C en esta
echo  ventana, y luego S.
echo ===============================================
echo.

start "" http://localhost:4321
call npm run dev

goto :fin

:error
echo.
echo ===============================================
echo  SE HA PARADO AQUI: %PASO%
echo.
echo  Copia las lineas de arriba y pegamelas.
echo ===============================================

:fin
echo.
echo Pulsa una tecla para cerrar esta ventana.
pause >nul
endlocal
