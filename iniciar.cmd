@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Mi Estudio - servidor local
echo.
echo   Mi Estudio - servidor local
echo   ----------------------------
echo   Abriendo http://localhost:8080 ...
echo   Para cortar, cerra esta ventana.
echo.
start "" http://localhost:8080
where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server 8080
  goto :eof
)
where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 8080
  goto :eof
)
where node >nul 2>nul
if %errorlevel%==0 (
  npx --yes http-server -p 8080 -c-1
  goto :eof
)
echo No encontre Python ni Node.
echo Instala Python desde https://www.python.org/downloads/ y volve a intentar.
pause
