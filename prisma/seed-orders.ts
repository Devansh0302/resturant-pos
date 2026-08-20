import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding fake orders to tables...\n');

  const restaurants = await prisma.restaurant.findMany();

  for (const restaurant of restaurants) {
    const staff = await prisma.staff.findFirst({
      where: { restaurant_id: restaurant.id }
    });

    if (!staff) {
      console.log(`No staff found for ${restaurant.name}. Skipping.`);
      continue;
    }

    const menuItems = await prisma.menuItem.findMany({
      where: { restaurant_id: restaurant.id }
    });

    if (menuItems.length === 0) {
      console.log(`No menu items found for ${restaurant.name}. Skipping.`);
      continue;
    }

    const tables = await prisma.table.findMany({
      where: { restaurant_id: restaurant.id }
    });

    let createdCount = 0;
    // Add orders to the first 2 tables of each restaurant
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      
      // Let's create orders for up to 2 tables
      if (i < 2) {
        // Mark table as occupied
        await prisma.table.update({
          where: { id: table.id },
          data: { status: 'OCCUPIED' }
        });
        
        // Pick a couple of menu items
        const numItems = Math.min(menuItems.length, 2);
        const orderItemsToCreate = menuItems.slice(0, numItems).map((item, index) => ({
          menu_item_id: item.id,
          quantity: index + 1,
          unit_price: item.price,
          total_price: item.price * (index + 1),
          restaurant_id: restaurant.id,
        }));

        const subtotal = orderItemsToCreate.reduce((sum, item) => sum + item.total_price, 0);
        const cgst = subtotal * (restaurant.cgst_rate / 100);
        const sgst = subtotal * (restaurant.sgst_rate / 100);
        const total = subtotal + cgst + sgst;

        // Ensure we don't recreate if an order is already open for this table
        const existingOpenOrder = await prisma.order.findFirst({
          where: { table_id: table.id, status: 'OPEN' }
        });

        if (!existingOpenOrder) {
          await prisma.order.create({
            data: {
              invoice_number: `INV-${Date.now()}-${table.table_number}`,
              table_id: table.id,
              staff_id: staff.id,
              restaurant_id: restaurant.id,
              guest_count: 2,
              status: 'OPEN',
              subtotal: subtotal,
              cgst_amount: cgst,
              sgst_amount: sgst,
              total_amount: total,
              order_items: {
                create: orderItemsToCreate
              }
            }
          });
          createdCount++;
        }
      }
    }
    console.log(`✅ Created ${createdCount} orders for ${restaurant.name}`);
  }

  console.log('\n🎉 Fake order seeding complete!\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
