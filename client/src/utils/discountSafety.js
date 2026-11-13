/** Client mirror of server discount safety rules (POS enforcement). */
export const DEFAULT_MIN_PROFIT_PERCENT = 5;

export function getMinSellingPrice(unitCost, minProfitPercent = DEFAULT_MIN_PROFIT_PERCENT) {
  const cost = Number(unitCost) || 0;
  if (cost <= 0) return 0;
  return parseFloat((cost * (1 + minProfitPercent / 100)).toFixed(2));
}

export function getDiscountedSalePrice(
  unitPrice,
  discountPercent,
  unitCost,
  minProfitPercent = DEFAULT_MIN_PROFIT_PERCENT
) {
  const retail = Number(unitPrice) || 0;
  const discount = Math.max(0, Number(discountPercent) || 0);
  let price = discount > 0 ? retail * (1 - discount / 100) : retail;

  const minPrice = getMinSellingPrice(unitCost, minProfitPercent);
  if (minPrice > 0 && price < minPrice) {
    price = minPrice;
  }

  return parseFloat(price.toFixed(2));
}
