import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed default subscription plans
  const plans = [
    { name: 'Monthly', slug: 'monthly', duration: 1, price: 999 },
    { name: 'Quarterly', slug: 'quarterly', duration: 3, price: 2499 },
    { name: 'Yearly', slug: 'yearly', duration: 12, price: 7999 },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: { price: plan.price },
      create: plan,
    });
  }
  console.log('✅ Subscription plans seeded');

  // Seed some default add-ons
  const addons = [
    { name: 'KDS Module', description: 'Kitchen Display System for order management', price: 499 },
    { name: 'Inventory Management', description: 'Raw material tracking and recipe management', price: 699 },
    { name: 'Multi-branch Support', description: 'Manage multiple restaurant branches', price: 999 },
  ];

  for (const addon of addons) {
    const existing = await prisma.addOn.findFirst({ where: { name: addon.name } });
    if (!existing) {
      await prisma.addOn.create({ data: addon });
    }
  }
  console.log('✅ Add-ons seeded');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
