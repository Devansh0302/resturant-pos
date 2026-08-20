import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const restaurant = await prisma.restaurant.findFirst({
    where: { name: { contains: 'House of Brew' } }
  }) || await prisma.restaurant.findFirst();

  if (!restaurant) {
    console.log('No restaurant found');
    return;
  }

  const staffMembers = await prisma.staff.findMany({
    where: { restaurant_id: restaurant.id }
  });

  if (staffMembers.length === 0) {
    console.log('No staff members found');
    return;
  }

  const waiters = staffMembers.filter(s => s.role === 'WAITER' || s.role === 'ADMIN');
  
  if (waiters.length === 0) {
    console.log('No waiters found');
    return;
  }

  let tables = await prisma.table.findMany({ where: { restaurant_id: restaurant.id } });
  if (tables.length === 0) {
    const ts = Date.now();
    await prisma.table.create({
      data: { restaurant_id: restaurant.id, table_number: `T1-${ts}`, capacity: 4 }
    });
    await prisma.table.create({
      data: { restaurant_id: restaurant.id, table_number: `T2-${ts}`, capacity: 2 }
    });
    await prisma.table.create({
      data: { restaurant_id: restaurant.id, table_number: `T3-${ts}`, capacity: 6 }
    });
    tables = await prisma.table.findMany({ where: { restaurant_id: restaurant.id } });
  }

  const today = new Date();
  console.log(`Generating fake orders for restaurant: ${restaurant.name}`);

  for (const waiter of waiters) {
    const numOrders = Math.floor(Math.random() * 5) + 3; // 3 to 7 orders
    
    for (let i = 0; i < numOrders; i++) {
      const table = tables[Math.floor(Math.random() * tables.length)];
      const amount = Math.floor(Math.random() * 2000) + 500;
      const invoiceNo = `FAKE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      
      await prisma.order.create({
        data: {
          restaurant_id: restaurant.id,
          table_id: table.id,
          staff_id: waiter.id,
          status: 'PAID',
          invoice_number: invoiceNo,
          order_type: 'DINE_IN',
          subtotal: amount,
          cgst_amount: amount * 0.025,
          sgst_amount: amount * 0.025,
          total_amount: amount * 1.05,
          payment_mode: 'UPI',
          paid_at: today,
        }
      });
    }
    console.log(`Created ${numOrders} orders for ${waiter.name} (${waiter.role})`);
  }

  console.log('Successfully generated fake performance data!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
