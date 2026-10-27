@echo off
setlocal
cd /d "%~dp0"
docker compose down
if errorlevel 1 (
  echo Could not stop the app. Check that Docker Desktop is running.
  pause
  exit /b 1
)
echo Application stopped.
pause
