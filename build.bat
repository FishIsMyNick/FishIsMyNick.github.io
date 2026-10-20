@echo off
REM Build the portfolio on Windows. Double-click this, or run it from a
REM terminal. Pass --watch to rebuild on every save, or --serve to also
REM start a local server on http://localhost:8000.

setlocal
cd /d "%~dp0"

where py >nul 2>nul && (set PY=py) || (set PY=python)

%PY% -c "import jinja2, yaml" >nul 2>nul
if errorlevel 1 (
  echo Installing the two packages the build needs...
  %PY% -m pip install --quiet jinja2 pyyaml
  if errorlevel 1 (
    echo.
    echo Could not install them automatically. Run this yourself:
    echo     pip install jinja2 pyyaml
    pause
    exit /b 1
  )
)

%PY% build.py %*
echo.
pause
