import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import { PasswordService } from '../src/modules/auth/password.service';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME || 'superadmin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const passwords = new PasswordService();

  await prisma.userAccount.upsert({
    where: { username },
    update: {
      passwordHash: await passwords.hash(password),
      role: UserRole.SUPER_ADMIN,
      menuRole: 'superadmin',
      mustChangePassword: true,
    },
    create: {
      username,
      passwordHash: await passwords.hash(password),
      role: UserRole.SUPER_ADMIN,
      menuRole: 'superadmin',
      mustChangePassword: true,
    },
  });

  console.log(`Seeded super admin user: ${username}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
