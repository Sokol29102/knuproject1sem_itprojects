@echo off
setlocal
cd /d "%~dp0"
where docker >nul 2>nul
if errorlevel 1 (
  echo Docker was not found. Install Docker Desktop, start it, then try again.
  echo https://docs.docker.com/desktop/setup/install/windows-install/
  pause
  exit /b 1
)
docker info >nul 2>nul
if errorlevel 1 (
  echo Start Docker Desktop and wait for its engine to be ready.
  echo Use Linux containers, then run this file again.
  pause
  exit /b 1
)
docker compose up --build -d
if errorlevel 1 (
  echo Startup failed. Check the Docker message above.
  pause
  exit /b 1
)
echo.
echo App: http://localhost:8000
echo Docker may need a few seconds to finish starting the app.
echo Use stop-windows.cmd to stop it.
pause
