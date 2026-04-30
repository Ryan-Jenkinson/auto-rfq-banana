#!/usr/bin/env bash
# ============================================================
#  RFQ Analysis Tool — macOS launcher.
#
#  Mirrors start.bat: uses an embedded WebView (WebKit on macOS via
#  pywebview) so no local HTTP port is opened and no system browser
#  is launched. Everything runs inside the embedded window.
#
#  Double-click this file in Finder, or run from Terminal:
#      ./start.command
# ============================================================
set -e
cd "$(dirname "$0")"

# Sanity check: launcher.py must be present. If it's missing, the
# bundle is incomplete — refuse to run rather than silently degrading.
if [ ! -f "launcher.py" ]; then
    echo
    echo "============================================================"
    echo "  ERROR: launcher.py is missing from this folder."
    echo "============================================================"
    echo
    echo "  The launcher script is required. This bundle is incomplete."
    echo "  Re-extract the zip, or contact support."
    echo
    echo "  THIS APP WILL NOT FALL BACK TO A LOCAL WEB SERVER."
    echo
    read -n 1 -s -r -p "Press any key to close…"
    exit 1
fi

# Find python3 (the Mac default; falls back to python if needed)
PYCMD=""
if command -v python3 >/dev/null 2>&1; then
    PYCMD="python3"
elif command -v python >/dev/null 2>&1; then
    PYCMD="python"
else
    echo
    echo "============================================================"
    echo "  ERROR: Python is not installed or not on PATH."
    echo "============================================================"
    echo
    echo "Install Python 3 from https://python.org or via Homebrew:"
    echo "    brew install python"
    echo
    read -n 1 -s -r -p "Press any key to close…"
    exit 1
fi

# Check whether pywebview is importable. On macOS pywebview also
# needs the PyObjC bindings to drive WebKit. We install both as
# user-site (no admin needed).
if ! "$PYCMD" -c "import webview" >/dev/null 2>&1; then
    echo
    echo "============================================================"
    echo "  First-time setup: installing pywebview + PyObjC bindings"
    echo "  (one-time, into your user Python — no admin needed)."
    echo "============================================================"
    echo
    "$PYCMD" -m pip install --user --quiet --disable-pip-version-check \
        pywebview pyobjc-core pyobjc-framework-Cocoa pyobjc-framework-WebKit
    if [ $? -ne 0 ]; then
        echo
        echo "ERROR: pywebview install failed. You may be offline,"
        echo "or pip may need to be enabled."
        echo
        read -n 1 -s -r -p "Press any key to close…"
        exit 1
    fi
fi

# Re-verify after install
if ! "$PYCMD" -c "import webview" >/dev/null 2>&1; then
    echo
    echo "ERROR: pywebview was installed but cannot be imported."
    echo
    read -n 1 -s -r -p "Press any key to close…"
    exit 1
fi

# Launch — same launcher.py as Windows. Cross-platform.
"$PYCMD" "$(dirname "$0")/launcher.py"
RC=$?
if [ $RC -ne 0 ]; then
    echo
    echo "The application exited with an error (code $RC)."
    echo
    read -n 1 -s -r -p "Press any key to close…"
fi
