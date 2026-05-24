@echo off
setlocal EnableExtensions

set "COMPOSE_FILE=docker-compose.deploy.yml"
set "ADMIN_USER=superadmin"
set "ADMIN_PASS=Super@admin123"

echo ===============================================================
echo VMJAMTECH HR Docker Deploy (Clean DB + Superadmin Seed)
echo ===============================================================
echo.

echo [0/4] Removing conflicting named containers from previous runs...
for %%C in (vmjamtech_hr_postgres vmjamtech_hr_api vmjamtech_hr_web vmjamtech_hr_web_https) do (
  docker rm -f %%C >nul 2>&1
)

docker compose -f "%COMPOSE_FILE%" down -v --remove-orphans

echo.
echo [1/4] Building and starting postgres, api, web...
docker compose -f "%COMPOSE_FILE%" up -d --build postgres api web
if errorlevel 1 goto :error

echo.
echo [2/4] Waiting for API health...
call :wait_api
if errorlevel 1 goto :error_wait

echo.
echo [3/4] Seeding superadmin account...
docker compose -f "%COMPOSE_FILE%" run --rm api_migrator npm run prisma:seed
if errorlevel 1 goto :error_seed

echo.
echo [4/4] Deployment complete.
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

:error_wait
echo ERROR: API did not become healthy in time.
goto :show_logs

:error_seed
echo ERROR: Failed to seed superadmin account.
goto :show_logs

:error
echo ERROR: Docker compose command failed.
goto :show_logs

:show_logs
echo.
echo --- docker compose ps ---
docker compose -f "%COMPOSE_FILE%" ps
echo.
echo --- api logs (tail) ---
docker compose -f "%COMPOSE_FILE%" logs --tail=120 api
exit /b 1

:done
endlocal
exit /b 0
