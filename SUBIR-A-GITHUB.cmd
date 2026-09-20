@echo off
REM ===============================================================
REM  SUBIR EL PROYECTO A GITHUB
REM
REM  Antes de subir pasa las comprobaciones que ya existen. Si alguna
REM  falla, NO sube nada (es la regla 22 de tu prompt).
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
echo  Subir renders.studio a GitHub
echo ===============================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: no se encuentra "git" en este ordenador.
  goto :fin
)

REM --- 1. comprobaciones -----------------------------------------
echo [1/5] Comprobando el marcado contra la web real...
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

REM --- 2. ajustes de git para un repositorio grande ---------------
echo.
echo [4/5] Preparando git...
git config core.longpaths true
git config http.postBuffer 524288000

echo.
echo    Repositorio remoto:
git remote -v

echo.
echo    Ficheros que van a subir (resumen):
git add -A
git status --short --untracked-files=no > "%TEMP%\_gitstat.txt" 2>&1
for /f %%C in ('find /c /v "" ^< "%TEMP%\_gitstat.txt"') do echo       %%C ficheros con cambios

REM --- 3. subir ---------------------------------------------------
echo.
echo [5/5] Subiendo...
echo    (la primera vez son unos 300 MB: imagenes, hojas de estilo y
echo     el contenido extraido. Puede tardar varios minutos.)
echo.

git commit -m "Fase 1: motor de render verificado, 145 paginas generadas" -m "Marcado: 0 diferencias en 58.089 elementos y 37.416 contenidos de widget." -m "Encabezados: 145 de 145 paginas identicas a la web real." -m "Pendientes las comprobaciones de geometria, texto invisible y ficheros que no cargan."
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
echo  Si Netlify esta conectado a este repositorio,
echo  el despliegue empieza solo. Recuerda que la web
echo  de pruebas va con noindex hasta la mudanza.
echo ===============================================

:fin
echo.
echo Pulsa una tecla para cerrar esta ventana.
pause >nul
endlocal
