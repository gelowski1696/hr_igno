# IGNO HRMS Backend

New NestJS backend for the HRMS reconstruction.

## Local Setup

1. Create a local Postgres database:

```bash
createdb igno_hr_dev
```

2. Copy environment settings:

```bash
copy .env.example .env
```

3. Install and prepare:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

## Legacy Migration

The previous Express/SQLite backend is preserved at `../backend_old`.

Dry-run table counts:

```bash
npm run migrate:legacy -- --sqlite ../backend_old/prisma/db/hrdb.sqlite --dry-run
```

Run migration after Postgres migrations are applied. For a legacy import, migrate first, then seed the superadmin so the admin account exists after legacy users are loaded:

```bash
npm run migrate:legacy -- --sqlite ../backend_old/prisma/db/hrdb.sqlite
npm run prisma:seed
```

Migrated legacy users are forced to change their password.
