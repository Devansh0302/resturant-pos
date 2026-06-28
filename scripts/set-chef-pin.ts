import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const chef = await prisma.staff.update({
      where: { email: 'chef@spiceroute.in' },
      data: { pin: '9999' },
    });
    console.log('Successfully updated Chef PIN to 9999');
  } catch (error) {
    console.error('Failed to update PIN:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
