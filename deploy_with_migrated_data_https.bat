@echo off
setlocal EnableExtensions

set "COMPOSE_FILE=docker-compose.deploy.yml"
set "COMPOSE_FILE_HTTPS=docker-compose.deploy.https.yml"
set "LEGACY_SQLITE=backend_old\prisma\db\hrdb.sqlite"
set "DATA_SNAPSHOT_SQL=backend\data\current_migrated_data.sql"
set "ADMIN_USER=superadmin"
set "ADMIN_PASS=Super@admin123"

if not exist "%COMPOSE_FILE%" (
  echo ERROR: Missing %COMPOSE_FILE%
  exit /b 1
)

if not exist "%COMPOSE_FILE_HTTPS%" (
  echo ERROR: Missing %COMPOSE_FILE_HTTPS%
  exit /b 1
)

if not exist "%LEGACY_SQLITE%" (
  if not exist "%DATA_SNAPSHOT_SQL%" (
    echo ERROR: No data source file found.
    echo Expected one of:
    echo   %LEGACY_SQLITE%
    echo   %DATA_SNAPSHOT_SQL%
    echo.
    echo Copy the full project folder ^(including backend_old^) and try again.
    exit /b 1
  )
)

echo ===============================================================
echo VMJAMTECH HR Docker Deploy (Migrated Legacy Data + HTTPS)
echo ===============================================================
echo.

echo [0/7] Removing conflicting named containers from previous runs...
for %%C in (vmjamtech_hr_postgres vmjamtech_hr_api vmjamtech_hr_web vmjamtech_hr_web_https) do (
  docker rm -f %%C >nul 2>&1
)

docker compose -f "%COMPOSE_FILE%" -f "%COMPOSE_FILE_HTTPS%" down -v --remove-orphans

echo.
echo [1/7] Starting postgres...
docker compose -f "%COMPOSE_FILE%" -f "%COMPOSE_FILE_HTTPS%" up -d --build postgres
if errorlevel 1 goto :error

echo.
echo [2/7] Waiting for postgres readiness...
call :wait_postgres
if errorlevel 1 goto :error_pg

echo.
if exist "%LEGACY_SQLITE%" (
  echo [3/7] Running legacy sqlite migration import...
  docker compose -f "%COMPOSE_FILE%" -f "%COMPOSE_FILE_HTTPS%" run --rm api_migrator
  if errorlevel 1 goto :error_migrate
  echo Legacy sqlite migration completed.
) else (
  echo [3/7] Legacy sqlite not found. Restoring SQL snapshot...
  docker compose -f "%COMPOSE_FILE%" -f "%COMPOSE_FILE_HTTPS%" exec -T postgres psql -U vpos -d igno_hr_dev < "%DATA_SNAPSHOT_SQL%"
  if errorlevel 1 goto :error_restore
)

echo.
echo [4/7] Starting api and web...
docker compose -f "%COMPOSE_FILE%" -f "%COMPOSE_FILE_HTTPS%" up -d --build api web
if errorlevel 1 goto :error

echo.
echo [5/7] Waiting for API health...
call :wait_api
if errorlevel 1 goto :error_wait

echo.
echo [6/7] Ensuring superadmin credentials...
docker compose -f "%COMPOSE_FILE%" -f "%COMPOSE_FILE_HTTPS%" run --rm api_migrator npm run prisma:seed
if errorlevel 1 goto :error_seed

echo.
echo [7/7] Starting HTTPS reverse proxy...
docker compose -f "%COMPOSE_FILE%" -f "%COMPOSE_FILE_HTTPS%" up -d web_https
if errorlevel 1 goto :error

echo.
echo Deployment complete.
echo.
echo Login credentials:
echo   Username: %ADMIN_USER%
echo   Password: %ADMIN_PASS%
echo.
echo URLs:
echo   Frontend HTTPS: https://localhost:3443/login
echo   API Health: http://localhost:3005/api/v1/health
echo.
echo Note:
echo - This uses an internal/self-signed certificate (browser warning is expected).
echo - For LAN access, open https://^<server-ip^>:3443 and accept certificate warning.
echo.
goto :done

:wait_postgres
for /L %%i in (1,1,90) do (
  docker compose -f "%COMPOSE_FILE%" -f "%COMPOSE_FILE_HTTPS%" exec -T postgres pg_isready -U vpos -d igno_hr_dev >nul 2>&1
  if not errorlevel 1 (
    echo Postgres is ready.
    exit /b 0
  )
  timeout /t 2 /nobreak >nul
)
exit /b 1

:wait_api
for /L %%i in (1,1,90) do (
  docker compose -f "%COMPOSE_FILE%" -f "%COMPOSE_FILE_HTTPS%" exec -T api wget -qO- http://127.0.0.1:3000/api/v1/health >nul 2>&1
  if not errorlevel 1 (
    echo API is healthy.
    exit /b 0
  )
  timeout /t 2 /nobreak >nul
)
exit /b 1

:error_pg
echo ERROR: Postgres did not become ready in time.
goto :show_logs

:error_migrate
echo ERROR: Legacy data migration failed.
goto :show_logs

:error_restore
echo ERROR: SQL snapshot restore failed.
goto :show_logs

:error_wait
echo ERROR: API did not become healthy in time.
goto :show_logs

:error_seed
echo ERROR: Failed to upsert superadmin credentials.
goto :show_logs

:error
echo ERROR: Docker compose command failed.
goto :show_logs

:show_logs
echo.
echo --- docker compose ps ---
docker compose -f "%COMPOSE_FILE%" -f "%COMPOSE_FILE_HTTPS%" ps
echo.
echo --- postgres logs (tail) ---
docker compose -f "%COMPOSE_FILE%" -f "%COMPOSE_FILE_HTTPS%" logs --tail=120 postgres
echo.
echo --- api logs (tail) ---
docker compose -f "%COMPOSE_FILE%" -f "%COMPOSE_FILE_HTTPS%" logs --tail=120 api
echo.
echo --- web_https logs (tail) ---
docker compose -f "%COMPOSE_FILE%" -f "%COMPOSE_FILE_HTTPS%" logs --tail=120 web_https
exit /b 1

:done
endlocal
exit /b 0
