@echo off
REM ===============================================================
REM  SUBIR EL PROYECTO A GITHUB  -  Fase 2 (redisenno)
REM
REM  Antes de subir pasa las comprobaciones. Si alguna falla, NO sube
REM  nada (regla 22 de tu prompt).
REM
REM  Repositorio: https://github.com/Yamarodriguez/renders.studio
REM  Rama: main
REM
REM  SE EJECUTA HACIENDO DOBLE CLIC EN ESTE FICHERO.
REM ===============================================================
setlocal
set PROYECTO=D:\web\renders.studio
cd /d "%PROYECTO%"

echo.
echo ===============================================
echo  Subir renders.studio a GitHub - Fase 2
echo ===============================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: no se encuentra "git" en este ordenador.
  goto :fin
)

REM --- 0. que esten los ficheros del redisenno --------------------
if not exist "public\rediseno.css" (
  echo NO SE SUBE: falta public\rediseno.css
  goto :fin
)
if not exist "public\fuentes\inter-latin-wght-normal.woff2" (
  echo NO SE SUBE: faltan las tipografias en public\fuentes\
  goto :fin
)
if not exist "public\contraste.css" (
  echo NO SE SUBE: falta public\contraste.css
  echo              Ejecuta antes REDISENO.cmd
  goto :fin
)

REM --- 1. comprobaciones ------------------------------------------
echo [1/5] Comprobando el marcado contra la web real...
echo       (el redisenno solo toca estilo: esto TIENE que seguir en 0)
call node scripts/06-comparar-marcado.mjs
if errorlevel 1 (
  echo.
  echo NO SE SUBE: hay diferencias de marcado.
  echo Mira informes\comparacion-marcado.md
  goto :fin
)

echo.
echo [2/5] Construyendo las 145 paginas...
call npm run build
if errorlevel 1 (
  echo.
  echo NO SE SUBE: la construccion ha fallado.
  goto :fin
)

echo.
echo [3/5] Comprobando los encabezados...
call node scripts/14-comparar-encabezados.mjs
if errorlevel 1 (
  echo.
  echo NO SE SUBE: hay encabezados distintos a los de la web real.
  echo Mira informes\encabezados.md
  goto :fin
)

REM --- 2. git -----------------------------------------------------
echo.
echo [4/5] Preparando git...
git config core.longpaths true
git config http.postBuffer 524288000
git remote -v

git add -A
echo.
echo    Ficheros con cambios:
git status --short

echo.
echo [5/5] Subiendo...
echo.

git commit -m "Fase 2: redisenno visual (tipografia, paleta, aire y botones)" -m "Tipografia: Inter Tight en titulares e Inter en texto, variables, solo latino, desde npm." -m "Paleta: un solo acento (el magenta de marca). Fuera azul, morado y dorado." -m "Comprobacion 3 (texto invisible): el H1 de la portada estaba en blanco sobre gris claro (1,31:1). Arreglado junto con otros 62 casos." -m "El marcado sigue en 0 diferencias: la hoja de redisenno se carga la ultima y no toca el HTML." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_011hssdUEogzyUuHz2isGaVs"
if errorlevel 1 (
  echo.
  echo AVISO: git dice que no hay nada nuevo que guardar, o ha fallado el commit.
  echo Se intenta subir igualmente por si quedaba algo pendiente.
)

git push origin main
if errorlevel 1 (
  echo.
  echo ===============================================
  echo  LA SUBIDA HA FALLADO
  echo.
  echo  Causas normales:
  echo   - te pide usuario y contrasena de GitHub
  echo   - hay cambios en el repositorio que no tienes aqui
  echo     (prueba:  git pull --rebase origin main)
  echo.
  echo  Copia las lineas de arriba y pegamelas.
  echo ===============================================
  goto :fin
)

echo.
echo ===============================================
echo  SUBIDO
echo.
echo  https://github.com/Yamarodriguez/renders.studio
echo.
echo  Netlify empieza el despliegue solo. Recuerda que
echo  la web de pruebas sigue con noindex hasta la mudanza.
echo ===============================================

:fin
echo.
echo Pulsa una tecla para cerrar esta ventana.
pause >nul
endlocal
