@echo off
title AI Resume Analyzer Backend Server
echo ========================================================
echo   AI Resume Analyzer - Backend Server (Flask)
echo   Running at: http://localhost:5000
echo ========================================================
echo.
cd /d "%~dp0backend"
"..\.venv\Scripts\python.exe" app.py
if errorlevel 1 (
    echo.
    echo Server stopped with error.
    pause
)
