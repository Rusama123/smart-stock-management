/** Minimum profit % on unit cost that must remain after any discount (default 5%). */
export const DEFAULT_MIN_PROFIT_PERCENT = 5;

/**
 * Lowest allowed selling price: cost + minimum profit floor.
 * @param {number} unitCost
 * @param {number} [minProfitPercent]
 */
export function getMinSellingPrice(unitCost, minProfitPercent = DEFAULT_MIN_PROFIT_PERCENT) {
  const cost = Number(unitCost) || 0;
  if (cost <= 0) return 0;
  return parseFloat((cost * (1 + minProfitPercent / 100)).toFixed(2));
}

/**
 * Max discount % from retail that keeps price at or above min selling price.
 * Discount only consumes margin, never cost.
 */
export function getMaxSafeDiscountPercent(
  unitPrice,
  unitCost,
  minProfitPercent = DEFAULT_MIN_PROFIT_PERCENT
) {
  const retail = Number(unitPrice) || 0;
  const minPrice = getMinSellingPrice(unitCost, minProfitPercent);

  if (retail <= 0 || retail <= minPrice) return 0;

  const maxDiscountAmount = retail - minPrice;
  const percent = (maxDiscountAmount / retail) * 100;
  return parseFloat(Math.max(0, percent).toFixed(1));
}

/** Cap a desired discount to the safe maximum. */
export function capDiscountPercent(
  desiredDiscount,
  unitPrice,
  unitCost,
  minProfitPercent = DEFAULT_MIN_PROFIT_PERCENT
) {
  const desired = Math.max(0, Number(desiredDiscount) || 0);
  const maxSafe = getMaxSafeDiscountPercent(unitPrice, unitCost, minProfitPercent);
  return parseFloat(Math.min(desired, maxSafe).toFixed(1));
}

/** Sale price after discount, never below min selling price. */
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

/**
 * Build AI-facing explanation when discount is capped or unavailable.
 */
export function getDiscountSafetyNote(idealDiscount, safeDiscount, unitPrice, unitCost) {
  const minPrice = getMinSellingPrice(unitCost);
  const maxSafe = getMaxSafeDiscountPercent(unitPrice, unitCost);

  if (maxSafe <= 0) {
    return `Margin too thin to discount safely. Minimum sale price is Rs ${minPrice.toFixed(2)} (5% profit on cost).`;
  }

  if (safeDiscount < idealDiscount) {
    return `Capped from ${idealDiscount}% to ${safeDiscount}% to preserve 5% profit floor (min sale Rs ${minPrice.toFixed(2)}).`;
  }

  return `Safe within margin; maintains at least 5% profit on cost (min sale Rs ${minPrice.toFixed(2)}).`;
}

/**
 * Resolve AI suggestion: ideal % from risk rules → capped safe %.
 * Returns null when no promotion should be suggested.
 */
export function buildSafeDiscountSuggestion({
  idealDiscount,
  unitPrice,
  unitCost,
  currentDiscount = 0,
  minProfitPercent = DEFAULT_MIN_PROFIT_PERCENT,
}) {
  const safeDiscount = capDiscountPercent(idealDiscount, unitPrice, unitCost, minProfitPercent);
  const maxSafeDiscount = getMaxSafeDiscountPercent(unitPrice, unitCost, minProfitPercent);
  const minSellingPrice = getMinSellingPrice(unitCost, minProfitPercent);
  const current = Number(currentDiscount) || 0;

  if (maxSafeDiscount <= 0 || safeDiscount <= current) {
    return null;
  }

  const discountedPrice = getDiscountedSalePrice(unitPrice, safeDiscount, unitCost, minProfitPercent);

  return {
    idealDiscount,
    suggestedDiscount: safeDiscount,
    maxSafeDiscount,
    minSellingPrice,
    discountedPrice,
    safetyNote: getDiscountSafetyNote(idealDiscount, safeDiscount, unitPrice, unitCost),
    wasCapped: safeDiscount < idealDiscount,
  };
}
