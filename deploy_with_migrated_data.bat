@echo off
setlocal EnableExtensions

set "COMPOSE_FILE=docker-compose.deploy.yml"
set "LEGACY_SQLITE=backend_old\prisma\db\hrdb.sqlite"
set "DATA_SNAPSHOT_SQL=backend\data\current_migrated_data.sql"
set "ADMIN_USER=superadmin"
set "ADMIN_PASS=Super@admin123"

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
echo VMJAMTECH HR Docker Deploy (Migrated Legacy Data + Superadmin)
echo ===============================================================
echo.

echo [0/6] Removing conflicting named containers from previous runs...
for %%C in (vmjamtech_hr_postgres vmjamtech_hr_api vmjamtech_hr_web vmjamtech_hr_web_https) do (
  docker rm -f %%C >nul 2>&1
)

docker compose -f "%COMPOSE_FILE%" down -v --remove-orphans

echo.
echo [1/6] Starting postgres...
docker compose -f "%COMPOSE_FILE%" up -d --build postgres
if errorlevel 1 goto :error

echo.
echo [2/6] Waiting for postgres readiness...
call :wait_postgres
if errorlevel 1 goto :error_pg

echo.
if exist "%LEGACY_SQLITE%" (
  echo [3/6] Running legacy sqlite migration import...
  docker compose -f "%COMPOSE_FILE%" run --rm api_migrator
  if errorlevel 1 goto :error_migrate
  echo Legacy sqlite migration completed.
) else (
  echo [3/6] Legacy sqlite not found. Restoring SQL snapshot...
  docker compose -f "%COMPOSE_FILE%" exec -T postgres psql -U vpos -d igno_hr_dev < "%DATA_SNAPSHOT_SQL%"
  if errorlevel 1 goto :error_restore
)

echo.
echo [4/6] Starting api and web...
docker compose -f "%COMPOSE_FILE%" up -d --build api web
if errorlevel 1 goto :error

echo.
echo [5/6] Waiting for API health...
call :wait_api
if errorlevel 1 goto :error_wait

echo.
echo [6/6] Ensuring superadmin credentials...
docker compose -f "%COMPOSE_FILE%" run --rm api_migrator npm run prisma:seed
if errorlevel 1 goto :error_seed

echo.
echo Deployment complete.
echo.
echo Login credentials:
echo   Username: %ADMIN_USER%
echo   Password: %ADMIN_PASS%
echo.
echo URLs:
echo   Frontend: http://localhost:3004/login
echo   API Health: http://localhost:3005/api/v1/health
echo.
goto :done

:wait_postgres
for /L %%i in (1,1,90) do (
  docker compose -f "%COMPOSE_FILE%" exec -T postgres pg_isready -U vpos -d igno_hr_dev >nul 2>&1
  if not errorlevel 1 (
    echo Postgres is ready.
    exit /b 0
  )
  timeout /t 2 /nobreak >nul
)
exit /b 1

:wait_api
for /L %%i in (1,1,90) do (
  docker compose -f "%COMPOSE_FILE%" exec -T api wget -qO- http://127.0.0.1:3000/api/v1/health >nul 2>&1
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
docker compose -f "%COMPOSE_FILE%" ps
echo.
echo --- postgres logs (tail) ---
docker compose -f "%COMPOSE_FILE%" logs --tail=120 postgres
echo.
echo --- api logs (tail) ---
docker compose -f "%COMPOSE_FILE%" logs --tail=120 api
exit /b 1

:done
endlocal
exit /b 0
