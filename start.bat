@echo off
set PORT=8003
cd /d "%~dp0"
title Auto RFQ Banana (port %PORT%)

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
echo  Auto RFQ Banana  -  http://localhost:%PORT%/app.html
echo ============================================================
echo.
echo Starting local server on port %PORT%...
echo Browser will open automatically in a moment.
echo.
echo IMPORTANT:
echo   - Keep THIS window open while using the app.
echo   - Close this window when finished to stop the server.
echo   - Each Andersen workapp uses its own port, so you can
echo     run multiple apps at the same time:
echo       supplier-pricing   8000
echo       supplier-recon     8001
echo       tariff-impact      8002
echo       auto-rfq-banana    8003
echo.
echo ============================================================
echo.

start "" "http://localhost:%PORT%/app.html"
%PYCMD% -m http.server %PORT%
