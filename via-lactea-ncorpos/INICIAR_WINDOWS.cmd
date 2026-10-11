@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale Node.js 20.11 ou posterior em https://nodejs.org/
  pause
  exit /b 1
)
if not defined PORT set "PORT=4180"
echo Abra http://localhost:%PORT%/ no navegador depois da mensagem Local.
echo Mantenha esta janela aberta. Ctrl+C encerra o servidor.
node scripts/serve.mjs
pause
