@echo off
REM Serves this site locally and opens it in your browser. Double-click to
REM run, or run from a terminal. A local server is required (not opening
REM the .html files directly) because the site loads its header/footer via
REM fetch(), which browsers block on file:// URLs.
setlocal
cd /d "%~dp0"

REM Runs the server in its own window (/k keeps it open even if python
REM errors out immediately, so you can actually read the error) so this
REM window can wait a moment for it to start before opening the browser --
REM opening the browser immediately/in parallel is a race: the browser can
REM try to load the page before the server has bound the port yet.
start "Pinescape preview server" /min cmd /k python -m http.server 8000
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8000/

echo.
echo Server running in a separate minimized window titled "Pinescape preview server".
echo If the browser shows "can't reach this page", wait a second and refresh.
echo To stop the server later, close that minimized window.
echo.
pause
