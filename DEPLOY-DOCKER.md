# VMJAMTECH HR Docker Deploy

This project now includes Docker deployment for:
- Postgres
- NestJS API (`3005` host port)
- Next.js frontend (`3004` host port)

## Files Added

- `docker-compose.deploy.yml`
- `frontend/Dockerfile`
- `frontend/.dockerignore`
- `deploy_clean_superadmin.bat`
- `deploy_with_migrated_data.bat`
- `deploy_with_migrated_data_https.bat`
- `run_deploy_with_migrated_data_https_click.bat` (double-click safe launcher with logs)
- `docker-compose.deploy.https.yml`
- `deploy/caddy/Caddyfile`

## Superadmin Login (both deploy modes)

- Username: `superadmin`
- Password: `Super@admin123`

## Option 1: Clean Database (no data, only superadmin)

Run:

```bat
deploy_clean_superadmin.bat
```

This will:
1. Remove old containers + volumes
2. Build/start Postgres + API + Frontend
3. Seed superadmin user

## Option 2: Migrated Legacy Data (all tables from legacy sqlite)

Run:

```bat
deploy_with_migrated_data.bat
```

This will:
1. Remove old containers + volumes
2. Start Postgres
3. Import data using this priority:
   - migration from `backend_old/prisma/db/hrdb.sqlite` (preferred, full legacy source)
   - fallback: `backend/data/current_migrated_data.sql` (if sqlite is unavailable)
4. Start API + Frontend
5. Upsert superadmin user/password

## Option 3: Migrated Legacy Data + HTTPS Frontend

Run:

```bat
deploy_with_migrated_data_https.bat
```

If you deploy by double-clicking in Windows Explorer, use:

```bat
run_deploy_with_migrated_data_https_click.bat
```

This keeps the window open and writes logs in `logs/`.

This will:
1. Remove old containers + volumes
2. Start Postgres
3. Import data using this priority:
   - migration from `backend_old/prisma/db/hrdb.sqlite` (preferred, full legacy source)
   - fallback: `backend/data/current_migrated_data.sql` (if sqlite is unavailable)
4. Start API + Frontend
5. Upsert superadmin user/password
6. Start `web_https` reverse proxy (Caddy) on `https://localhost:3443`

## Access URLs

- Frontend: `http://localhost:3004/login`
- Frontend (HTTPS deploy mode): `https://localhost:3443/login`
- API Health: `http://localhost:3005/api/v1/health`

## Activity Logs (Sentry-like file logging)

The backend now writes request/activity/error logs as JSON lines:

- Container path: `/data/hrms/uploads/logs/activity.log`
- Host (Docker volume): inside `vmjamtech_uploads` volume

Pull and inspect on VPS:

```bash
# live tail
docker exec -it vmjamtech_hr_api sh -lc 'tail -f /data/hrms/uploads/logs/activity.log'

# copy to local server path
docker cp vmjamtech_hr_api:/data/hrms/uploads/logs/activity.log /root/hr_igno_activity.log
```

Optional env overrides:

- `ACTIVITY_LOG_PATH` (custom file path)
- `ACTIVITY_LOG_SKIP_PATHS` (comma-separated prefixes, default `/api/v1/health`)

## Notes

- Copy the full project folder to the target machine, including `backend_old/`.
- If you want to deploy your exact current Postgres data, place a SQL dump at:
  - `backend/data/current_migrated_data.sql`
- Production/VPS compose uses:
  - `DATABASE_URL=postgresql://vpos:vpos@postgres:5432/igno_hr_dev?schema=public`
- Make sure Docker Desktop/Engine is running before executing the `.bat` scripts.
- Change JWT secrets and Postgres password in `docker-compose.deploy.yml` for real production.
- HTTPS deploy mode uses an internal/self-signed certificate; browser warning is expected unless you trust the generated CA.
