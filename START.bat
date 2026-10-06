@echo off
echo.
echo  ==========================================
echo   ECTRON Production Control
echo  ==========================================
echo.
echo  Starting API server (port 3000)...
start "ECTRON Server" cmd /k "cd /d %~dp0server && node server.js"
timeout /t 2 /nobreak > nul
echo  Starting React client (port 5173)...
start "ECTRON Client" cmd /k "cd /d %~dp0client && npm run dev"
timeout /t 3 /nobreak > nul
echo  Opening browser...
start http://localhost:5173
echo.
echo  Both services are running.
echo  Close the two terminal windows to stop.
echo.
