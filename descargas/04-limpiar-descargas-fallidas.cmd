@echo off
REM ---------------------------------------------------------------
REM  04 - Borra los 3 ficheros basura de la descarga de imagenes.
REM
REM  Esas 3 imagenes ya NO existen en el servidor de renders.studio
REM  (dan 404). curl guardo la pagina de error como si fuera la foto:
REM  son 3 ficheros .jpg de 196 bytes que no son imagenes.
REM
REM  SE PUEDE EJECUTAR HACIENDO DOBLE CLIC.
REM ---------------------------------------------------------------
setlocal
set U=D:\web\renders.studio\public\wp-content\uploads\2025\04

echo.
for %%F in (
  "bg1.jpg"
  "hector-martinez-110928-unsplash.jpg"
  "rawpixel-1066968-unsplash.jpg"
) do (
  if exist "%U%\%%~F" (
    del /q "%U%\%%~F"
    echo Borrado: %%~F
  ) else (
    echo No estaba: %%~F
  )
)

echo.
echo Listo.
echo Pulsa una tecla para cerrar esta ventana.
pause >nul
endlocal
