@echo off
cd /d "%~dp0"
title RFQ Analysis Tool

REM ============================================================
REM  Embedded-window launcher — uses Edge WebView2 (already on
REM  every Windows 10/11 machine via Edge). Opens NO network
REM  ports. Nothing leaves the machine.
REM
REM  HARD REQUIREMENT: this launcher MUST use launcher.py (pywebview
REM  + WebView2). It must NEVER fall back to a local HTTP server or
REM  open the system browser — those paths violate the security
REM  posture the Coupa / IT review approved.
REM ============================================================

REM Sanity check: launcher.py must be present. If it's missing the
REM bundle is incomplete — refuse to run rather than silently degrading.
if not exist "%~dp0launcher.py" (
    echo.
    echo ============================================================
    echo  ERROR: launcher.py is missing from this folder.
    echo ============================================================
    echo.
    echo  The launcher script is required. This bundle is incomplete.
    echo  Re-extract the zip, or contact support.
    echo.
    echo  THIS APP WILL NOT FALL BACK TO A LOCAL WEB SERVER.
    echo.
    pause
    exit /b 1
)

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

REM Check whether pywebview is already importable. If yes, launch.
%PYCMD% -c "import webview" >nul 2>nul
if errorlevel 1 goto install_pywebview
goto launch

:install_pywebview
echo.
echo ============================================================
echo  First-time setup: installing the pywebview library
echo  (one-time, into your user Python — no admin needed).
echo ============================================================
echo.
%PYCMD% -m pip install --user --quiet --disable-pip-version-check pywebview
if errorlevel 1 (
    echo.
    echo ERROR: pywebview install failed.
    echo You may be offline, or pip may need to be enabled by IT.
    echo.
    pause
    exit /b 1
)

%PYCMD% -c "import webview" >nul 2>nul
if errorlevel 1 (
    echo.
    echo ERROR: pywebview was installed but cannot be imported.
    echo Please contact support.
    echo.
    pause
    exit /b 1
)

:launch
%PYCMD% "%~dp0launcher.py"
if errorlevel 1 (
    echo.
    echo The application exited with an error.
    echo.
    pause
)
