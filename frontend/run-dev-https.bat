@echo off
setlocal EnableExtensions

cd /d "%~dp0"

echo =========================================
echo VMJAMTECH HR Frontend - HTTPS Dev Runner
echo =========================================
echo.

if not exist "node_modules" (
  echo node_modules not found. Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR: npm install failed.
    exit /b 1
  )
)

if not exist "certificates\\dev-key.pem" (
  echo.
  echo ERROR: Missing certificates\\dev-key.pem
  echo Please place your HTTPS key file in frontend\\certificates.
  exit /b 1
)

if not exist "certificates\\dev-cert.pem" (
  echo.
  echo ERROR: Missing certificates\\dev-cert.pem
  echo Please place your HTTPS cert file in frontend\\certificates.
  exit /b 1
)

echo Starting Next.js HTTPS dev server on port 3001...
echo - Local:   https://localhost:3001
echo - Network: https://^<your-lan-ip^>:3001
echo.

set "NEXT_PUBLIC_APP_URL=https://localhost:3001"
call npm run dev:https
exit /b %errorlevel%
