@echo off
echo ========================================================
echo Launching MENTORA (Full Stack: Backend & Frontend)
echo ========================================================
start "MENTORA Backend (FastAPI)" cmd /c "%~dp0run_backend.bat"
timeout /t 3 /nobreak >nul
start "MENTORA Frontend (Next.js)" cmd /c "%~dp0run_frontend.bat"
echo.
echo Both servers are launching!
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:3000
echo.
pause
