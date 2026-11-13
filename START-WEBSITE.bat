@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or was not found.
  echo Install Node.js 22.5 or later, then run this file again.
  echo https://nodejs.org/
  pause
  exit /b 1
)
echo.
echo   PNC MUSIC CLUB - WEBSITE AND ADMIN
 echo  Open: http://localhost:4173
 echo  Admin: http://localhost:4173/admin.html
 echo  First time? Copy the one-time setup code printed below.
echo.
start "" "http://localhost:4173"
node server.js
pause
