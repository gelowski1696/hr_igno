@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

set "DIST_DIR=dist_package"
set "STAGE_DIR=%DIST_DIR%\vmjamtech_hr_deploy"
set "ZIP_STEM=vmjamtech_hr_deploy"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TS=%%i"
set "ZIP_FILE=%DIST_DIR%\%ZIP_STEM%_%TS%.zip"

echo ===============================================================
echo VMJAMTECH HR - Create Deploy ZIP Bundle
echo ===============================================================
echo.

if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"
if exist "%STAGE_DIR%" rmdir /s /q "%STAGE_DIR%"
mkdir "%STAGE_DIR%"

echo [1/6] Copying backend (without node_modules/build artifacts)...
robocopy "backend" "%STAGE_DIR%\backend" /E /R:1 /W:1 ^
  /XD "node_modules" ".next" "dist" "coverage" ".local" "uploads" "logs" ^
  /XF "*.log"
if errorlevel 8 goto :robocopy_error

echo [2/6] Copying frontend (without node_modules/build artifacts)...
robocopy "frontend" "%STAGE_DIR%\frontend" /E /R:1 /W:1 ^
  /XD "node_modules" ".next" "coverage" "qa" "certificates" ^
  /XF "*.log"
if errorlevel 8 goto :robocopy_error

echo [3/6] Copying legacy migration source data...
if not exist "backend_old\prisma\db\hrdb.sqlite" (
  echo WARNING: backend_old\prisma\db\hrdb.sqlite not found.
  echo          Migrated-data deployment via sqlite fallback will not work.
) else (
  mkdir "%STAGE_DIR%\backend_old\prisma\db" >nul 2>&1
  copy /Y "backend_old\prisma\db\hrdb.sqlite" "%STAGE_DIR%\backend_old\prisma\db\hrdb.sqlite" >nul
)

echo [4/6] Copying deploy files...
copy /Y "docker-compose.deploy.yml" "%STAGE_DIR%\docker-compose.deploy.yml" >nul
copy /Y "docker-compose.deploy.https.yml" "%STAGE_DIR%\docker-compose.deploy.https.yml" >nul
copy /Y "deploy_clean_superadmin.bat" "%STAGE_DIR%\deploy_clean_superadmin.bat" >nul
copy /Y "deploy_with_migrated_data.bat" "%STAGE_DIR%\deploy_with_migrated_data.bat" >nul
copy /Y "deploy_with_migrated_data_https.bat" "%STAGE_DIR%\deploy_with_migrated_data_https.bat" >nul
copy /Y "run_deploy_with_migrated_data_https_click.bat" "%STAGE_DIR%\run_deploy_with_migrated_data_https_click.bat" >nul
copy /Y "DEPLOY-DOCKER.md" "%STAGE_DIR%\DEPLOY-DOCKER.md" >nul
if not exist "%STAGE_DIR%\deploy\caddy" mkdir "%STAGE_DIR%\deploy\caddy"
copy /Y "deploy\caddy\Caddyfile" "%STAGE_DIR%\deploy\caddy\Caddyfile" >nul

if exist "backend\data\current_migrated_data.sql" (
  echo Found SQL snapshot. Including backend\data\current_migrated_data.sql
  if not exist "%STAGE_DIR%\backend\data" mkdir "%STAGE_DIR%\backend\data"
  copy /Y "backend\data\current_migrated_data.sql" "%STAGE_DIR%\backend\data\current_migrated_data.sql" >nul
)

echo [5/6] Creating zip archive...
powershell -NoProfile -Command ^
  "if (Test-Path '%ZIP_FILE%') { Remove-Item -Force '%ZIP_FILE%' }; Compress-Archive -Path '%STAGE_DIR%\*' -DestinationPath '%ZIP_FILE%' -CompressionLevel Optimal"
if errorlevel 1 goto :zip_error

echo [6/6] Done.
echo.
echo Output:
echo   %ZIP_FILE%
echo.
echo Notes:
echo - node_modules and build outputs are excluded.
echo - Run npm install on target machine before start.
echo - If hrdb.sqlite is present in the bundle, migrated-data deploy can run.
goto :done

:robocopy_error
echo ERROR: File copy failed (robocopy errorlevel >= 8).
exit /b 1

:zip_error
echo ERROR: Failed to create zip archive.
exit /b 1

:done
endlocal
exit /b 0
