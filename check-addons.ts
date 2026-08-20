import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const addons = await prisma.addOn.findMany();
  console.log('Addons in DB:', addons);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
