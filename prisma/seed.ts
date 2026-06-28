import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Spice Route database...\n');

  // ─── Restaurant ──────────────────────────────────
  const restaurant = await prisma.restaurant.upsert({
    where: { id: 'restaurant-1' },
    update: {},
    create: {
      id: 'restaurant-1',
      name: 'Spice Route',
      address: 'MG Road, Jaipur, Rajasthan 302001',
      phone: '+91 98765 43210',
      gstin: '08ABCDE1234F1Z5',
      cgst_rate: 2.5,
      sgst_rate: 2.5,
      subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      subscription_status: 'ACTIVE',
    },
  });
  console.log('✅ Restaurant created:', restaurant.name);

  // ─── Tables ──────────────────────────────────────
  const tableData = [
    { table_number: 'T1', capacity: 4, area: 'INDOOR', status: 'OCCUPIED' },
    { table_number: 'T2', capacity: 4, area: 'INDOOR', status: 'AVAILABLE' },
    { table_number: 'T3', capacity: 6, area: 'INDOOR', status: 'OCCUPIED' },
    { table_number: 'T4', capacity: 2, area: 'INDOOR', status: 'AVAILABLE' },
    { table_number: 'T5', capacity: 4, area: 'INDOOR', status: 'OCCUPIED' },
    { table_number: 'T6', capacity: 8, area: 'INDOOR', status: 'AVAILABLE' },
    { table_number: 'T7', capacity: 4, area: 'OUTDOOR', status: 'AVAILABLE' },
    { table_number: 'T8', capacity: 6, area: 'OUTDOOR', status: 'OCCUPIED' },
    { table_number: 'T9', capacity: 4, area: 'OUTDOOR', status: 'AVAILABLE' },
    { table_number: 'T10', capacity: 4, area: 'ROOFTOP', status: 'AVAILABLE' },
    { table_number: 'T11', capacity: 6, area: 'ROOFTOP', status: 'AVAILABLE' },
    { table_number: 'T12', capacity: 4, area: 'ROOFTOP', status: 'AVAILABLE' },
  ];

  for (const t of tableData) {
    await prisma.table.upsert({
      where: { table_number: t.table_number },
      update: {},
      create: t,
    });
  }
  console.log('✅ 12 tables created');

  // ─── Categories ──────────────────────────────────
  const categories = [
    { name: 'Starters', sort_order: 1 },
    { name: 'Main Course', sort_order: 2 },
    { name: 'Breads', sort_order: 3 },
    { name: 'Rice & Biryani', sort_order: 4 },
    { name: 'Beverages', sort_order: 5 },
    { name: 'Desserts', sort_order: 6 },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { id: `cat-${cat.sort_order}` },
      update: {},
      create: { id: `cat-${cat.sort_order}`, ...cat },
    });
    categoryMap[cat.name] = created.id;
  }
  console.log('✅ 6 categories created');

  // ─── Menu Items ──────────────────────────────────
  const menuItems = [
    // Starters
    { name: 'Paneer Tikka', price: 220, food_type: 'VEG', category: 'Starters', description: 'Marinated paneer cubes grilled in tandoor' },
    { name: 'Chicken Wings', price: 280, food_type: 'NON_VEG', category: 'Starters', description: 'Crispy spiced chicken wings' },
    { name: 'Spring Rolls', price: 180, food_type: 'VEG', category: 'Starters', description: 'Crispy rolls stuffed with vegetables' },
    { name: 'Seekh Kebab', price: 320, food_type: 'NON_VEG', category: 'Starters', description: 'Minced meat kebabs on skewers' },
    { name: 'Hara Bhara Kebab', price: 200, food_type: 'VEG', category: 'Starters', description: 'Spinach and pea kebabs' },
    // Main Course
    { name: 'Dal Makhani', price: 240, food_type: 'VEG', category: 'Main Course', description: 'Creamy black lentils slow-cooked overnight' },
    { name: 'Butter Chicken', price: 320, food_type: 'NON_VEG', category: 'Main Course', description: 'Tender chicken in rich tomato-butter gravy' },
    { name: 'Paneer Butter Masala', price: 280, food_type: 'VEG', category: 'Main Course', description: 'Paneer cubes in creamy tomato sauce' },
    { name: 'Mutton Rogan Josh', price: 420, food_type: 'NON_VEG', category: 'Main Course', description: 'Kashmiri-style aromatic mutton curry' },
    { name: 'Kadai Vegetables', price: 220, food_type: 'VEG', category: 'Main Course', description: 'Mixed vegetables in kadai masala' },
    // Breads
    { name: 'Butter Naan', price: 50, food_type: 'VEG', category: 'Breads', description: 'Soft naan brushed with butter' },
    { name: 'Tandoori Roti', price: 40, food_type: 'VEG', category: 'Breads', description: 'Whole wheat bread from tandoor' },
    { name: 'Garlic Naan', price: 60, food_type: 'VEG', category: 'Breads', description: 'Naan topped with garlic and herbs' },
    // Rice & Biryani
    { name: 'Veg Biryani', price: 260, food_type: 'VEG', category: 'Rice & Biryani', description: 'Fragrant basmati rice with vegetables' },
    { name: 'Chicken Biryani', price: 340, food_type: 'NON_VEG', category: 'Rice & Biryani', description: 'Hyderabadi-style chicken biryani' },
    { name: 'Steamed Rice', price: 80, food_type: 'VEG', category: 'Rice & Biryani', description: 'Plain basmati steamed rice' },
    // Beverages
    { name: 'Masala Chai', price: 60, food_type: 'VEG', category: 'Beverages', description: 'Traditional spiced Indian tea' },
    { name: 'Cold Coffee', price: 120, food_type: 'VEG', category: 'Beverages', description: 'Chilled coffee with ice cream' },
    { name: 'Fresh Lime Soda', price: 80, food_type: 'VEG', category: 'Beverages', description: 'Fresh lime with soda water' },
    { name: 'Mango Lassi', price: 100, food_type: 'VEG', category: 'Beverages', description: 'Sweet mango yogurt drink' },
    // Desserts
    { name: 'Gulab Jamun', price: 90, food_type: 'VEG', category: 'Desserts', description: 'Deep-fried milk dumplings in sugar syrup' },
    { name: 'Vanilla Ice Cream', price: 110, food_type: 'VEG', category: 'Desserts', description: 'Classic vanilla ice cream' },
    { name: 'Rasmalai', price: 130, food_type: 'VEG', category: 'Desserts', description: 'Soft paneer discs in saffron milk' },
  ];

  for (const item of menuItems) {
    const { category, ...itemData } = item;
    await prisma.menuItem.upsert({
      where: { id: `item-${itemData.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `item-${itemData.name.toLowerCase().replace(/\s+/g, '-')}`,
        category_id: categoryMap[category],
        ...itemData,
      },
    });
  }
  console.log('✅ 23 menu items created');

  // ─── Staff ───────────────────────────────────────
  const hashedPassword = await bcrypt.hash('password123', 12);

  const staffData = [
    { id: 'staff-rahul', name: 'Rahul Sharma', email: 'rahul@spiceroute.in', role: 'ADMIN', pin: '1234' },
    { id: 'staff-priya', name: 'Priya Singh', email: 'priya@spiceroute.in', role: 'CASHIER', pin: '2345' },
    { id: 'staff-amit', name: 'Amit Kumar', email: 'amit@spiceroute.in', role: 'WAITER', pin: '3456' },
  ];

  for (const staff of staffData) {
    await prisma.staff.upsert({
      where: { email: staff.email },
      update: {},
      create: { ...staff, password: hashedPassword },
    });
  }
  console.log('✅ 3 staff members created');

  // ─── Sample Orders (on occupied tables) ──────────
  const tables = await prisma.table.findMany({ where: { status: 'OCCUPIED' } });
  const adminStaff = await prisma.staff.findFirst({ where: { role: 'ADMIN' } });
  const allMenuItems = await prisma.menuItem.findMany();

  if (adminStaff) {
    // T1: 2 guests, ~38 min ago, ₹680 order
    const t1 = tables.find(t => t.table_number === 'T1');
    if (t1) {
      const order1 = await prisma.order.create({
        data: {
          table_id: t1.id,
          staff_id: adminStaff.id,
          invoice_number: `SR-${new Date().getFullYear()}-0001`,
          guest_count: 2,
          status: 'OPEN',
          subtotal: 646.15,
          cgst_amount: 16.15,
          sgst_amount: 16.15,
          total_amount: 680,
          created_at: new Date(Date.now() - 38 * 60 * 1000),
        },
      });
      // Add items: Paneer Tikka (220) + Butter Chicken (320) + Butter Naan x2 (100) + Masala Chai (60) = 700... adjust
      const pt = allMenuItems.find(i => i.name === 'Paneer Tikka')!;
      const bc = allMenuItems.find(i => i.name === 'Butter Chicken')!;
      const bn = allMenuItems.find(i => i.name === 'Butter Naan')!;
      await prisma.orderItem.createMany({
        data: [
          { order_id: order1.id, menu_item_id: pt.id, quantity: 1, unit_price: pt.price, total_price: pt.price },
          { order_id: order1.id, menu_item_id: bc.id, quantity: 1, unit_price: bc.price, total_price: bc.price },
          { order_id: order1.id, menu_item_id: bn.id, quantity: 2, unit_price: bn.price, total_price: bn.price * 2 },
          { order_id: order1.id, menu_item_id: allMenuItems.find(i => i.name === 'Masala Chai')!.id, quantity: 1, unit_price: 60, total_price: 60 },
        ],
      });
    }

    // T3: 4 guests, ~15 min ago, ₹1320 order
    const t3 = tables.find(t => t.table_number === 'T3');
    if (t3) {
      const order3 = await prisma.order.create({
        data: {
          table_id: t3.id,
          staff_id: adminStaff.id,
          invoice_number: `SR-${new Date().getFullYear()}-0002`,
          guest_count: 4,
          status: 'OPEN',
          subtotal: 1254.55,
          cgst_amount: 31.36,
          sgst_amount: 31.36,
          total_amount: 1320,
          created_at: new Date(Date.now() - 15 * 60 * 1000),
        },
      });
      const dm = allMenuItems.find(i => i.name === 'Dal Makhani')!;
      const mrj = allMenuItems.find(i => i.name === 'Mutton Rogan Josh')!;
      const cb = allMenuItems.find(i => i.name === 'Chicken Biryani')!;
      const gn = allMenuItems.find(i => i.name === 'Garlic Naan')!;
      const ml = allMenuItems.find(i => i.name === 'Mango Lassi')!;
      await prisma.orderItem.createMany({
        data: [
          { order_id: order3.id, menu_item_id: dm.id, quantity: 1, unit_price: dm.price, total_price: dm.price },
          { order_id: order3.id, menu_item_id: mrj.id, quantity: 1, unit_price: mrj.price, total_price: mrj.price },
          { order_id: order3.id, menu_item_id: cb.id, quantity: 1, unit_price: cb.price, total_price: cb.price },
          { order_id: order3.id, menu_item_id: gn.id, quantity: 3, unit_price: gn.price, total_price: gn.price * 3 },
          { order_id: order3.id, menu_item_id: ml.id, quantity: 2, unit_price: ml.price, total_price: ml.price * 2 },
        ],
      });
    }

    // T5: 1 guest, ~52 min ago, ₹340 order
    const t5 = tables.find(t => t.table_number === 'T5');
    if (t5) {
      const order5 = await prisma.order.create({
        data: {
          table_id: t5.id,
          staff_id: adminStaff.id,
          invoice_number: `SR-${new Date().getFullYear()}-0003`,
          guest_count: 1,
          status: 'OPEN',
          subtotal: 323.08,
          cgst_amount: 8.08,
          sgst_amount: 8.08,
          total_amount: 340,
          created_at: new Date(Date.now() - 52 * 60 * 1000),
        },
      });
      const chb = allMenuItems.find(i => i.name === 'Chicken Biryani')!;
      await prisma.orderItem.createMany({
        data: [
          { order_id: order5.id, menu_item_id: chb.id, quantity: 1, unit_price: chb.price, total_price: chb.price },
        ],
      });
    }

    // T8: 6 guests, ~8 min ago, no items yet
    const t8 = tables.find(t => t.table_number === 'T8');
    if (t8) {
      await prisma.order.create({
        data: {
          table_id: t8.id,
          staff_id: adminStaff.id,
          invoice_number: `SR-${new Date().getFullYear()}-0004`,
          guest_count: 6,
          status: 'OPEN',
          subtotal: 0,
          cgst_amount: 0,
          sgst_amount: 0,
          total_amount: 0,
          created_at: new Date(Date.now() - 8 * 60 * 1000),
        },
      });
    }
  }
  console.log('✅ 4 sample orders created on occupied tables');

  // ─── Subscription History ────────────────────────
  const subscriptionHistory = [
    {
      id: 'sub-001',
      invoice_number: 'SR-SUB-2023-001',
      plan_name: 'Monthly Starter',
      plan_type: 'MONTHLY',
      billing_cycle: 'Jan 2023 – Feb 2023',
      amount: 499,
      tax_amount: 89.82,
      total_amount: 588.82,
      currency: 'INR',
      payment_method: 'UPI',
      payment_status: 'PAID',
      transaction_id: 'upi_txn_8a7b3c9d1e',
      event_type: 'NEW',
      starts_at: new Date('2023-01-15'),
      ends_at: new Date('2023-02-14'),
      notes: 'First subscription – trial converted',
      created_at: new Date('2023-01-15T10:30:00'),
    },
    {
      id: 'sub-002',
      invoice_number: 'SR-SUB-2023-002',
      plan_name: 'Monthly Starter',
      plan_type: 'MONTHLY',
      billing_cycle: 'Feb 2023 – Mar 2023',
      amount: 499,
      tax_amount: 89.82,
      total_amount: 588.82,
      currency: 'INR',
      payment_method: 'UPI',
      payment_status: 'PAID',
      transaction_id: 'upi_txn_2f4e6a8c0b',
      event_type: 'RENEWAL',
      starts_at: new Date('2023-02-15'),
      ends_at: new Date('2023-03-14'),
      created_at: new Date('2023-02-15T00:05:00'),
    },
    {
      id: 'sub-003',
      invoice_number: 'SR-SUB-2023-003',
      plan_name: 'Monthly Starter',
      plan_type: 'MONTHLY',
      billing_cycle: 'Mar 2023 – Apr 2023',
      amount: 499,
      tax_amount: 89.82,
      total_amount: 588.82,
      currency: 'INR',
      payment_method: 'UPI',
      payment_status: 'PAID',
      transaction_id: 'upi_txn_7d3b1e9f5a',
      event_type: 'RENEWAL',
      starts_at: new Date('2023-03-15'),
      ends_at: new Date('2023-04-14'),
      created_at: new Date('2023-03-15T00:05:00'),
    },
    {
      id: 'sub-004',
      invoice_number: 'SR-SUB-2023-004',
      plan_name: 'Quarterly Professional',
      plan_type: 'QUARTERLY',
      billing_cycle: 'Apr 2023 – Jul 2023',
      amount: 1299,
      tax_amount: 233.82,
      total_amount: 1532.82,
      currency: 'INR',
      payment_method: 'CARD',
      payment_status: 'PAID',
      transaction_id: 'card_txn_4a8b2c6d0e',
      event_type: 'UPGRADE',
      starts_at: new Date('2023-04-15'),
      ends_at: new Date('2023-07-14'),
      notes: 'Upgraded from Monthly Starter',
      created_at: new Date('2023-04-15T11:20:00'),
    },
    {
      id: 'sub-005',
      invoice_number: 'SR-SUB-2023-005',
      plan_name: 'Quarterly Professional',
      plan_type: 'QUARTERLY',
      billing_cycle: 'Jul 2023 – Oct 2023',
      amount: 1299,
      tax_amount: 233.82,
      total_amount: 1532.82,
      currency: 'INR',
      payment_method: 'CARD',
      payment_status: 'PAID',
      transaction_id: 'card_txn_9e7f5d3b1a',
      event_type: 'RENEWAL',
      starts_at: new Date('2023-07-15'),
      ends_at: new Date('2023-10-14'),
      created_at: new Date('2023-07-15T00:05:00'),
    },
    {
      id: 'sub-006',
      invoice_number: 'SR-SUB-2023-006',
      plan_name: 'Annual Premium',
      plan_type: 'ANNUAL',
      billing_cycle: 'Oct 2023 – Oct 2024',
      amount: 3999,
      tax_amount: 719.82,
      total_amount: 4718.82,
      currency: 'INR',
      payment_method: 'NETBANKING',
      payment_status: 'PAID',
      transaction_id: 'nb_txn_6c2d8e4f0a',
      event_type: 'UPGRADE',
      starts_at: new Date('2023-10-15'),
      ends_at: new Date('2024-10-14'),
      notes: 'Upgraded to Annual Premium – 33% savings applied',
      created_at: new Date('2023-10-15T14:45:00'),
    },
    {
      id: 'sub-007',
      invoice_number: 'SR-SUB-2024-001',
      plan_name: 'Annual Premium',
      plan_type: 'ANNUAL',
      billing_cycle: 'Oct 2024 – Oct 2025',
      amount: 4499,
      tax_amount: 809.82,
      total_amount: 5308.82,
      currency: 'INR',
      payment_method: 'UPI',
      payment_status: 'PAID',
      transaction_id: 'upi_txn_1a3b5c7d9e',
      event_type: 'RENEWAL',
      starts_at: new Date('2024-10-15'),
      ends_at: new Date('2025-10-14'),
      notes: 'Auto-renewal – revised pricing applied',
      created_at: new Date('2024-10-15T00:05:00'),
    },
    {
      id: 'sub-008',
      invoice_number: 'SR-SUB-2025-001',
      plan_name: 'Annual Premium',
      plan_type: 'ANNUAL',
      billing_cycle: 'Oct 2025 – Oct 2026',
      amount: 4499,
      tax_amount: 809.82,
      total_amount: 5308.82,
      currency: 'INR',
      payment_method: 'UPI',
      payment_status: 'PAID',
      transaction_id: 'upi_txn_5e7f9a1b3c',
      event_type: 'RENEWAL',
      starts_at: new Date('2025-10-15'),
      ends_at: new Date('2026-10-14'),
      notes: 'Auto-renewal',
      created_at: new Date('2025-10-15T00:05:00'),
    },
  ];

  for (const sub of subscriptionHistory) {
    await prisma.subscriptionHistory.upsert({
      where: { id: sub.id },
      update: {},
      create: sub,
    });
  }
  console.log('✅ 8 subscription history records created');

  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
