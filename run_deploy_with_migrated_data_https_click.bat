@echo off
setlocal EnableExtensions

cd /d "%~dp0"

set "LOG_DIR=logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TS=%%i"
set "LOG_FILE=%LOG_DIR%\deploy_with_migrated_data_https_%TS%.log"

echo ===============================================================
echo VMJAMTECH HR Deploy Launcher (HTTPS + Migrated Data)
echo ===============================================================
echo.
echo This window will stay open after deployment.
echo Log file: %LOG_FILE%
echo.

echo Streaming deploy output (also saved to log)...
echo.
powershell -NoProfile -Command ^
  "& { $ErrorActionPreference = 'SilentlyContinue'; cmd /c deploy_with_migrated_data_https.bat 2>&1 | Tee-Object -FilePath '%LOG_FILE%'; exit $LASTEXITCODE }"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if "%EXIT_CODE%"=="0" (
  echo SUCCESS: Deployment completed.
) else (
  echo ERROR: Deployment failed with exit code %EXIT_CODE%.
)
echo.
echo --- Last 60 log lines ---
powershell -NoProfile -Command "if (Test-Path '%LOG_FILE%') { Get-Content -Path '%LOG_FILE%' -Tail 60 } else { Write-Output 'No log file found.' }"
echo.
echo Full log: %LOG_FILE%
echo.
pause
exit /b %EXIT_CODE%
