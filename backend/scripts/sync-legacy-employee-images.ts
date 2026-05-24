import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const prisma = new PrismaClient();

type Options = {
  sourceDir: string | null;
  targetDir: string;
};

function parseOptions(): Options {
  const args = process.argv.slice(2);
  const sourceFlag = args.findIndex((arg) => arg === '--source');

  const explicitSource =
    sourceFlag >= 0 && args[sourceFlag + 1] ? resolve(args[sourceFlag + 1]) : null;

  const fallbackSources = [
    resolve(process.cwd(), '../backend_old/hrStatic/employeeImages'),
    resolve(process.cwd(), '../backend_old/employeeImages'),
  ];

  const sourceDir =
    explicitSource ||
    fallbackSources.find((candidate) => existsSync(candidate) && isDirectoryWithFiles(candidate)) ||
    null;

  const targetDir = resolve(process.cwd(), 'uploads/employee-images');

  return { sourceDir, targetDir };
}

function isDirectoryWithFiles(path: string) {
  try {
    return readdirSync(path).length > 0;
  } catch {
    return false;
  }
}

function ensureTargetDir(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function copySourceToTarget(sourceDir: string, targetDir: string) {
  cpSync(sourceDir, targetDir, {
    recursive: true,
    force: false,
    errorOnExist: false,
  });
}

function normalizePath(value?: string | null) {
  if (!value) return null;

  if (value.startsWith('/uploads/employee-images/')) {
    return value;
  }

  if (value.startsWith('/employeeImages/') || value.startsWith('employeeImages/')) {
    return `/uploads/employee-images/${basename(value)}`;
  }

  if (value.startsWith('uploads/employee-images/')) {
    return `/${value}`;
  }

  return value;
}

async function rewriteEmployeeImagePaths() {
  const rows = await prisma.employeeImage.findMany({
    select: {
      id: true,
      validId1: true,
      validId2: true,
      mugshot1: true,
      mugshot2: true,
      mugshot3: true,
      mugshot4: true,
    },
  });

  let updated = 0;

  for (const row of rows) {
    const nextValidId1 = normalizePath(row.validId1);
    const nextValidId2 = normalizePath(row.validId2);
    const nextMugshot1 = normalizePath(row.mugshot1);
    const nextMugshot2 = normalizePath(row.mugshot2);
    const nextMugshot3 = normalizePath(row.mugshot3);
    const nextMugshot4 = normalizePath(row.mugshot4);

    const changed =
      nextValidId1 !== row.validId1 ||
      nextValidId2 !== row.validId2 ||
      nextMugshot1 !== row.mugshot1 ||
      nextMugshot2 !== row.mugshot2 ||
      nextMugshot3 !== row.mugshot3 ||
      nextMugshot4 !== row.mugshot4;

    if (!changed) {
      continue;
    }

    await prisma.employeeImage.update({
      where: { id: row.id },
      data: {
        validId1: nextValidId1,
        validId2: nextValidId2,
        mugshot1: nextMugshot1,
        mugshot2: nextMugshot2,
        mugshot3: nextMugshot3,
        mugshot4: nextMugshot4,
      },
    });

    updated += 1;
  }

  return { total: rows.length, updated };
}

async function main() {
  const options = parseOptions();
  ensureTargetDir(options.targetDir);

  if (options.sourceDir && existsSync(options.sourceDir)) {
    copySourceToTarget(options.sourceDir, options.targetDir);
    console.log(`Copied legacy files from ${options.sourceDir} to ${options.targetDir}`);
  } else {
    console.log('No legacy employee image folder found. Path rewrite will still run.');
  }

  const result = await rewriteEmployeeImagePaths();
  console.log(`Normalized employee image paths: ${result.updated}/${result.total} record(s) updated.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
