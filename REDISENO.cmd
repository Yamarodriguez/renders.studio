@echo off
REM ===============================================================
REM  FASE 2 - REDISENO
REM
REM  1. instala lo que falte
REM  2. genera los datos y construye las 145 paginas
REM  3. mide el contraste de TODAS y escribe el arreglo
REM  4. vuelve a construir con el arreglo dentro
REM  5. arranca el servidor y abre el navegador
REM
REM  Se para en el primer fallo diciendo cual es.
REM
REM  SE EJECUTA HACIENDO DOBLE CLIC EN ESTE FICHERO.
REM ===============================================================
setlocal
set PROYECTO=D:\web\renders.studio
cd /d "%PROYECTO%"

echo.
echo ===============================================
echo  renders.studio - Fase 2, redisenno
echo ===============================================
echo.

where node >nul 2>&1
if errorlevel 1 (set PASO=comprobar que Node esta instalado& goto :error)

echo [1/6] Instalando dependencias...
call npm install --no-audit --no-fund
if errorlevel 1 (set PASO=npm install& goto :error)

if not exist "public\fuentes\inter-latin-wght-normal.woff2" (
  echo.
  echo ERROR: falta public\fuentes\inter-latin-wght-normal.woff2
  echo        Sin las tipografias el redisenno no se ve.
  set PASO=comprobar las tipografias
  goto :error
)
if not exist "public\rediseno.css" (
  echo ERROR: falta public\rediseno.css
  set PASO=comprobar la hoja de redisenno
  goto :error
)
if not exist "public\contraste.css" (
  echo /* aun sin generar */ > "public\contraste.css"
)

echo.
echo [2/6] Generando los datos...
call node scripts/01-extraer-xml.mjs
if errorlevel 1 (set PASO=extraer el XML& goto :error)
call node scripts/04-extraer-armazon.mjs
if errorlevel 1 (set PASO=extraer el armazon& goto :error)
call node scripts/13-extraer-envoltorio.mjs
if errorlevel 1 (set PASO=extraer el envoltorio& goto :error)
call node scripts/07-generar-iconos.mjs
if errorlevel 1 (set PASO=generar los iconos& goto :error)
call node scripts/10-capturar-cabecera.mjs
if errorlevel 1 (set PASO=capturar las cabeceras& goto :error)
call node scripts/08-capturar-dinamicos.mjs
if errorlevel 1 (set PASO=capturar lo dinamico& goto :error)

echo.
echo [3/6] Construyendo las 145 paginas...
call npm run build
if errorlevel 1 (set PASO=construir la web& goto :error)

echo.
echo [4/6] Midiendo el contraste y escribiendo el arreglo...
echo       (abre cada pagina en un navegador; tarda unos minutos)
call npx playwright install chromium
call node scripts/20-contraste.mjs
if errorlevel 1 (set PASO=medir el contraste& goto :error)

echo.
echo [5/6] Volviendo a construir, ya con el arreglo dentro...
call npm run build
if errorlevel 1 (set PASO=construir otra vez& goto :error)

echo.
echo [6/6] Arrancando el servidor local...
start "" http://localhost:4321
call npm run dev

echo.
echo ===============================================
echo  LISTO.   http://localhost:4321
echo.
echo  El parte del contraste esta en:
echo     informes\contraste.md
echo ===============================================
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
