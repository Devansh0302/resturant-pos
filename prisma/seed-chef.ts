const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const chef = await prisma.staff.upsert({
    where: { email: 'chef@spiceroute.in' },
    update: {},
    create: {
      name: 'Chef',
      email: 'chef@spiceroute.in',
      password: hashedPassword,
      role: 'CHEF',
      pin: '9999',
    },
  });

  console.log('Chef seeded:', chef);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
