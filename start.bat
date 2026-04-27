@echo off
cd /d "%~dp0"
title Auto RFQ Banana

set PYCMD=
where py >nul 2>nul && set PYCMD=py
if not defined PYCMD where python >nul 2>nul && set PYCMD=python
if not defined PYCMD (
    echo.
    echo ============================================================
    echo  ERROR: Python is not installed or not on PATH.
    echo ============================================================
    echo.
    echo Please install Python from https://python.org
    echo During install, check "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

echo ============================================================
echo  Auto RFQ Banana
echo ============================================================
echo.
echo Starting local server on port 8000...
echo Browser will open automatically in a moment.
echo.
echo IMPORTANT:
echo   - Keep THIS window open while using the app.
echo   - Close this window when finished to stop the server.
echo   - If port 8000 is busy, edit this file and change 8000.
echo.
echo ============================================================
echo.

start "" "http://localhost:8000/app.html"
%PYCMD% -m http.server 8000
