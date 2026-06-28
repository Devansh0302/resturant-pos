import { prisma } from './prisma';

/**
 * Generate invoice number in format SR-YYYY-XXXX
 * where XXXX is zero-padded count of orders in current year.
 */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);

  const orderCount = await prisma.order.count({
    where: {
      created_at: {
        gte: startOfYear,
        lt: endOfYear,
      },
    },
  });

  const nextNumber = (orderCount + 1).toString().padStart(4, '0');
  return `SR-${year}-${nextNumber}`;
}
