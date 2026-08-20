import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Multi-Tenant database...\n');

  // ─── Restaurant 1: NxtDine ──────────────────
  const r1 = await prisma.restaurant.upsert({
    where: { id: 'restaurant-1' },
    update: {},
    create: {
      id: 'restaurant-1',
      name: 'NxtDine',
      address: 'MG Road, Jaipur, Rajasthan 302001',
      phone: '+91 98765 43210',
      gstin: '08ABCDE1234F1Z5',
      cgst_rate: 2.5,
      sgst_rate: 2.5,
      subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subscription_status: 'ACTIVE',
    },
  });
  console.log('✅ Restaurant 1 created:', r1.name);

  // ─── Restaurant 2: Ocean Grill ──────────────────
  const r2 = await prisma.restaurant.upsert({
    where: { id: 'restaurant-2' },
    update: {},
    create: {
      id: 'restaurant-2',
      name: 'Ocean Grill',
      address: 'Marine Drive, Mumbai, 400020',
      phone: '+91 88888 77777',
      gstin: '27ABCDE1234F1Z5',
      cgst_rate: 2.5,
      sgst_rate: 2.5,
      subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subscription_status: 'ACTIVE',
    },
  });
  console.log('✅ Restaurant 2 created:', r2.name);

  // ─── Tables (NxtDine only for simplicity) ───
  const tableData = [
    { table_number: 'T1', capacity: 4, area: 'INDOOR', status: 'OCCUPIED' },
    { table_number: 'T2', capacity: 4, area: 'INDOOR', status: 'AVAILABLE' },
    { table_number: 'T3', capacity: 6, area: 'INDOOR', status: 'AVAILABLE' },
  ];

  for (const t of tableData) {
    await prisma.table.upsert({
      where: { restaurant_id_table_number: { restaurant_id: r1.id, table_number: t.table_number } },
      update: {},
      create: {
        table_number: t.table_number,
        capacity: t.capacity,
        area: t.area,
        status: t.status,
        restaurant_id: r1.id,
      },
    });
  }

  const tableDataR2 = [
    { table_number: 'T101', capacity: 4, area: 'INDOOR', status: 'AVAILABLE' },
    { table_number: 'T102', capacity: 2, area: 'OUTDOOR', status: 'AVAILABLE' },
  ];
  for (const t of tableDataR2) {
    await prisma.table.upsert({
      where: { restaurant_id_table_number: { restaurant_id: r2.id, table_number: t.table_number } },
      update: {},
      create: {
        table_number: t.table_number,
        capacity: t.capacity,
        area: t.area,
        status: t.status,
        restaurant_id: r2.id,
      },
    });
  }

  console.log('✅ Tables created for both restaurants');

  // ─── Categories & Menu (NxtDine) ────────────
  const c1 = await prisma.category.upsert({
    where: { id: 'cat-1-r1' },
    update: {},
    create: { id: 'cat-1-r1', name: 'Starters', sort_order: 1, restaurant_id: r1.id },
  });
  await prisma.menuItem.upsert({
    where: { id: 'item-1-r1' },
    update: {},
    create: { id: 'item-1-r1', name: 'Paneer Tikka', price: 220, food_type: 'VEG', category_id: c1.id, restaurant_id: r1.id },
  });

  // ─── Categories & Menu (Ocean Grill) ────────────
  const c2 = await prisma.category.upsert({
    where: { id: 'cat-1-r2' },
    update: {},
    create: { id: 'cat-1-r2', name: 'Seafood', sort_order: 1, restaurant_id: r2.id },
  });
  await prisma.menuItem.upsert({
    where: { id: 'item-1-r2' },
    update: {},
    create: { id: 'item-1-r2', name: 'Grilled Fish', price: 450, food_type: 'NON_VEG', category_id: c2.id, restaurant_id: r2.id },
  });

  console.log('✅ Menu items created for both restaurants');

  // ─── Staff ───────────────────────────────────────
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Staff for R1
  await prisma.staff.upsert({
    where: { id: 'staff-r1' },
    update: {},
    create: { id: 'staff-r1', name: 'Rahul R1', email: 'rahul@nxtdine.in', role: 'ADMIN', pin: '1234', password: hashedPassword, restaurant_id: r1.id },
  });

  await prisma.staff.upsert({
    where: { id: 'staff-cashier-r1' },
    update: {},
    create: { id: 'staff-cashier-r1', name: 'Priya Cashier', email: 'priya@nxtdine.in', role: 'CASHIER', pin: '1234', password: hashedPassword, restaurant_id: r1.id },
  });

  await prisma.staff.upsert({
    where: { id: 'staff-waiter-r1' },
    update: {},
    create: { id: 'staff-waiter-r1', name: 'Amit Waiter', email: 'amit@nxtdine.in', role: 'WAITER', pin: '1234', password: hashedPassword, restaurant_id: r1.id },
  });

  // Staff for R2
  await prisma.staff.upsert({
    where: { id: 'staff-r2' },
    update: {},
    create: { id: 'staff-r2', name: 'Admin R2', email: 'admin@oceangrill.in', role: 'ADMIN', pin: '1234', password: hashedPassword, restaurant_id: r2.id },
  });
  
  // Platform Super Admin
  await prisma.staff.upsert({
    where: { id: 'super-admin-1' },
    update: {},
    create: { id: 'super-admin-1', name: 'Platform Owner', email: 'super@nxtdine.com', role: 'SUPER_ADMIN', pin: '9999', password: hashedPassword, restaurant_id: null },
  });

  console.log('✅ Staff created for both restaurants and Platform Super Admin');
  console.log('\n🎉 Multi-Tenant Seeding complete!\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
