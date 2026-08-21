const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER PUBLICATION supabase_realtime ADD TABLE categories;`);
    console.log('Successfully enabled realtime for categories');
  } catch (e) {
    if (e.message.includes('already exists') || e.message.includes('already in publication')) {
      console.log('Already enabled');
    } else {
      console.error(e);
    }
  }
}

main().finally(() => prisma.$disconnect());
