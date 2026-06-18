import 'dotenv/config';

import prisma from '../src/client/client';
import bcrypt from 'bcrypt';
import { UserRole, UserStatus } from '../src/generated/prisma/enums';

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL!;

  const existing = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existing) {
    console.log('✅ Super Admin already exists.');
    return;
  }

  const passwordHash = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD!, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,

      firstName: 'System',
      lastName: 'Administrator',

      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,

      registeredBySystem: true,

      emailVerified: true,
      emailVerifiedAt: new Date(),

      mustChangePassword: true,
    },
  });

  console.log('✅ Super Admin seeded successfully.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
