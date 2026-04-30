"""
Desktop launcher — opens the application in an embedded browser window.

Renders app.html in the OS's native webview component (Edge WebView2 on
Windows, WebKit on macOS). All processing happens locally inside that
window. The launcher itself opens no network ports and makes no internet
requests.

Native file save bridge:
    Browser-driven downloads are blocked under most corporate Edge
    policies when the page is loaded from a file:// origin. To work
    around that without compromise, this launcher exposes a Python
    `save_file` function to the JavaScript side. When the app needs to
    write an xlsx (RFQ outbound, award letter, decision log, ...), JS
    base64-encodes the bytes and calls `pywebview.api.save_file(name,
    b64)`. Python opens a native Save-As dialog, writes the chosen path,
    and then opens the destination folder in Explorer so the user sees
    the file appear. The whole round trip is entirely local — same
    approval surface as anything else Python is allowed to do.
"""

import base64
import os
import subprocess
import sys

import webview

ROOT = os.path.dirname(os.path.abspath(__file__))


def app_url() -> str:
    """Return the file:// URL for app.html, exiting with a clear error if missing."""
    path = os.path.join(ROOT, "app.html")
    if not os.path.exists(path):
        sys.stderr.write(f"ERROR: app.html not found at {path}\n")
        sys.exit(1)
    return "file:///" + path.replace(os.sep, "/")


class Api:
    """JS-callable Python methods. Each callable becomes
    `pywebview.api.<method_name>` on the JavaScript side, returning a
    Promise that resolves to the method's return value.
    """

    def save_file(self, suggested_filename: str, b64_bytes: str):
        """Write file bytes (base64-encoded) to a path the user picks.

        Args:
            suggested_filename: filename the dialog defaults to (e.g.
                "AwardLetter_Acme_RFQ-2026-04-001.xlsx"). The extension
                drives the dialog's file-type filter.
            b64_bytes: base64 string of the file contents.

        Returns:
            The full path written, or None if the user canceled.

        Side effect:
            On success, opens the containing folder in the OS file
            browser so the user immediately sees where the file landed.
        """
        ext = os.path.splitext(suggested_filename)[1].lower().lstrip(".")
        type_label_map = {
            "xlsx": "Excel files (*.xlsx)",
            "json": "JSON files (*.json)",
            "md":   "Markdown files (*.md)",
            "txt":  "Text files (*.txt)",
            "csv":  "CSV files (*.csv)",
            "pdf":  "PDF files (*.pdf)",
        }
        file_types = (
            type_label_map.get(ext, f"{ext.upper()} files (*.{ext})"),
            "All files (*.*)",
        )

        # Default the dialog to a "BananaExports" folder under the user's
        # Documents — predictable, easy to find, doesn't litter the desktop.
        default_dir = os.path.join(os.path.expanduser("~"), "Documents", "BananaExports")
        try:
            os.makedirs(default_dir, exist_ok=True)
        except Exception:
            default_dir = os.path.expanduser("~")

        win = webview.windows[0] if webview.windows else None
        if win is None:
            sys.stderr.write("save_file: no webview window available\n")
            return None

        result = win.create_file_dialog(
            webview.SAVE_DIALOG,
            directory=default_dir,
            save_filename=suggested_filename,
            file_types=file_types,
        )

        if not result:
            return None

        # create_file_dialog returns a string on Windows, sometimes a tuple/list
        # on other platforms — normalize to a single path.
        path = result if isinstance(result, str) else result[0]

        try:
            with open(path, "wb") as f:
                f.write(base64.b64decode(b64_bytes))
        except OSError as e:
            sys.stderr.write(f"save_file: write failed at {path}: {e}\n")
            return None

        # Open the containing folder so the file is immediately visible.
        # Best-effort — never fail the save just because the explorer
        # couldn't open.
        try:
            self._reveal_in_folder(path)
        except Exception as e:
            sys.stderr.write(f"save_file: reveal failed (non-fatal): {e}\n")

        return path

    def _reveal_in_folder(self, path: str) -> None:
        """Open the destination folder in the host OS's file browser,
        with the saved file selected when supported."""
        if sys.platform == "win32":
            # /select, requests Explorer highlight the file
            subprocess.Popen(["explorer", "/select,", os.path.normpath(path)])
        elif sys.platform == "darwin":
            subprocess.Popen(["open", "-R", path])
        else:
            subprocess.Popen(["xdg-open", os.path.dirname(path)])


def main() -> None:
    api = Api()
    webview.create_window(
        title="RFQ Analysis Tool",
        url=app_url(),
        width=1500,
        height=950,
        min_size=(1100, 700),
        text_select=True,
        js_api=api,
    )
    webview.start(debug=False, http_server=False)


if __name__ == "__main__":
    main()
