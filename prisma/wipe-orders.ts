import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Wiping old orders...');
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.table.updateMany({
    data: { status: 'AVAILABLE' }
  });
  console.log('Done.');
}

main().finally(() => prisma.$disconnect());
