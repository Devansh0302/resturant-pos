import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Staff History data...\n');

  const staffList = await prisma.staff.findMany();
  if (staffList.length === 0) {
    console.log('No staff found. Please run regular seed first.');
    return;
  }

  const tables = await prisma.table.findMany();
  if (tables.length === 0) {
    console.log('No tables found. Please run regular seed first.');
    return;
  }

  // Generate some orders over the last 30 days for each staff member
  const now = new Date();
  
  for (const staff of staffList) {
    console.log(`Generating history for ${staff.name}...`);
    
    // Create 15-20 random past orders per staff
    const numOrders = Math.floor(Math.random() * 6) + 15;
    
    for (let i = 0; i < numOrders; i++) {
      // Random date within last 30 days
      const daysAgo = Math.floor(Math.random() * 30);
      const orderDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      
      // Also add some for TODAY explicitly
      if (i < 3) {
        orderDate.setTime(now.getTime() - (Math.random() * 8 * 60 * 60 * 1000)); // Today within last 8 hours
      }

      const table = tables[Math.floor(Math.random() * tables.length)];
      
      const subtotal = Math.floor(Math.random() * 2000) + 300;
      const cgst = subtotal * 0.025;
      const sgst = subtotal * 0.025;
      const total = subtotal + cgst + sgst;

      await prisma.order.create({
        data: {
          table_id: table.id,
          staff_id: staff.id,
          invoice_number: `SR-H-${Math.floor(Math.random() * 1000000)}`,
          guest_count: Math.floor(Math.random() * 4) + 1,
          status: 'PAID',
          subtotal: subtotal,
          cgst_amount: cgst,
          sgst_amount: sgst,
          total_amount: total,
          created_at: orderDate,
        }
      });
    }
  }

  console.log('\n🎉 Seeded fake history data successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
