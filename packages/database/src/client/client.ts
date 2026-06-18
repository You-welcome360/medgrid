import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter });
};

type GlobalWithPrisma = typeof globalThis & {
  prismaGlobal?: ReturnType<typeof prismaClientSingleton>;
};

const prisma =
  (globalThis as GlobalWithPrisma).prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') {
  (globalThis as GlobalWithPrisma).prismaGlobal = prisma;
}
