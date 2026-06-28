/**
 * GST Calculation Helpers for Spice Route
 */

export interface GSTBreakdown {
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
}

/**
 * Calculate GST from a subtotal amount.
 * The subtotal is the sum of all item prices.
 * GST is added ON TOP of the subtotal.
 */
export function calculateGST(
  subtotal: number,
  cgstRate: number = 2.5,
  sgstRate: number = 2.5
): GSTBreakdown {
  const cgst = round2(subtotal * (cgstRate / 100));
  const sgst = round2(subtotal * (sgstRate / 100));
  const total = round2(subtotal + cgst + sgst);

  return { subtotal: round2(subtotal), cgst, sgst, total };
}

/**
 * Recalculate order totals from a list of items.
 */
export function recalculateOrderTotal(
  items: { quantity: number; unit_price: number }[],
  cgstRate: number = 2.5,
  sgstRate: number = 2.5
): GSTBreakdown {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  return calculateGST(subtotal, cgstRate, sgstRate);
}

/**
 * Round to 2 decimal places.
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Format price in Indian Rupees.
 */
export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format price without decimals for menu display.
 */
export function formatPriceShort(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}
