@echo off
REM ---------------------------------------------------------------
REM  01 - Descarga el HTML de las paginas tipo de renders.studio
REM  Se guardan en:  D:\web\renders.studio\referencia\html\
REM
REM  Hay una pagina por cada tipo de diseno Y una por cada uno de los
REM  6 menus de cabecera que usa la web.
REM
REM  SE PUEDE EJECUTAR HACIENDO DOBLE CLIC EN ESTE FICHERO.
REM ---------------------------------------------------------------
setlocal
set DESTINO=D:\web\renders.studio\referencia\html
set LOG=D:\web\renders.studio\descargas\log-01.txt
set UA=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36

echo ================================================ > "%LOG%"
echo Descarga de HTML de referencia - %DATE% %TIME% >> "%LOG%"
echo ================================================ >> "%LOG%"

echo.
echo Creando carpeta de destino...
if not exist "%DESTINO%" mkdir "%DESTINO%"
if not exist "%DESTINO%" (
  echo ERROR: no se ha podido crear "%DESTINO%"
  goto :fin
)

where curl >nul 2>&1
if errorlevel 1 (
  echo ERROR: no se encuentra el comando curl en este ordenador.
  goto :fin
)

REM --- una pagina de cada tipo de diseno ---
call :baja "https://renders.studio/"                        "00-portada.html"
call :baja "https://renders.studio/madrid/"                 "01-madrid.html"
call :baja "https://renders.studio/precios/"                "02-precios.html"
call :baja "https://renders.studio/contacto/"               "03-contacto.html"
call :baja "https://renders.studio/aviso-legal/"            "04-aviso-legal.html"
call :baja "https://renders.studio/politica-de-privacidad/" "05-privacidad.html"
call :baja "https://renders.studio/politica-de-cookies/"    "06-cookies.html"
call :baja "https://renders.studio/personalizar-cookies/"   "07-personalizar.html"
call :baja "https://renders.studio/trabajo-renderista/"     "08-trabajo-renderista.html"
call :baja "https://renders.studio/uruguay/"                "09-uruguay.html"

REM --- una pagina por cada menu de cabecera que falta ---
REM     menorca  -> menu "renders 2"        (lo usan 82 paginas)
REM     rosario  -> menu "Renders Argentina" (12 paginas)
REM     murcia   -> menu "Renders 3"         (5 paginas)
call :baja "https://renders.studio/menorca/"                "10-menorca.html"
call :baja "https://renders.studio/rosario/"                "11-rosario.html"
call :baja "https://renders.studio/murcia/"                 "12-murcia.html"

echo.
echo === Ficheros descargados ===
dir /b "%DESTINO%"
dir "%DESTINO%" >> "%LOG%"
echo.
echo Tienen que ser 13 ficheros. El detalle esta en: %LOG%

:fin
echo.
echo Pulsa una tecla para cerrar esta ventana.
pause >nul
endlocal
goto :eof

:baja
echo Descargando %~2 ...
curl -sSL -A "%UA%" -H "Accept-Encoding: identity" -w "   %~2  ->  HTTP %%{http_code}  %%{size_download} bytes" -o "%DESTINO%\%~2" "%~1" > "%TEMP%\_curl_out.txt" 2>&1
type "%TEMP%\_curl_out.txt"
echo.
type "%TEMP%\_curl_out.txt" >> "%LOG%"
echo. >> "%LOG%"
goto :eof
