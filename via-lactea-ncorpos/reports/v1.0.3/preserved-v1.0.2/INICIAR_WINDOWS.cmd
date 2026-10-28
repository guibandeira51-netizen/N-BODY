@echo off
cd /d "%~dp0"
set "TASK_NODE_BIN=node"
where node >nul 2>nul
if errorlevel 1 set "TASK_NODE_BIN=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not "%TASK_NODE_BIN%"=="node" if not exist "%TASK_NODE_BIN%" (
  echo Instale Node.js 20.11 ou posterior em https://nodejs.org/
  pause
  exit /b 1
)
if not defined PORT set "PORT=4180"
echo Abra http://localhost:%PORT%/ no navegador depois da mensagem Local.
echo Mantenha esta janela aberta. Ctrl+C encerra o servidor.
"%TASK_NODE_BIN%" scripts/serve.mjs
pause
