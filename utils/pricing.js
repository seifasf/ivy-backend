// Matches the storefront: a lower discountPrice replaces the regular price
const effectivePrice = (product) =>
  product.discountPrice > 0 && product.discountPrice < product.price
    ? product.discountPrice
    : product.price;

const promoDiscount = (promo, subtotal) => {
  const raw =
    promo.discountType === "percentage"
      ? (subtotal * promo.discountValue) / 100
      : promo.discountValue;
  return Math.round(Math.min(Math.max(raw, 0), subtotal) * 100) / 100;
};

// Returns a reason string when the promo cannot be used, otherwise null
const promoProblem = (promo, subtotal) => {
  if (!promo) return "Promo code not found";
  if (!promo.active) return "Promo code is inactive";
  if (new Date(promo.expiryDate) < new Date()) return "Promo code has expired";
  if (promo.currentUsage >= promo.maxUsage) return "Promo code usage limit reached";
  if (subtotal < promo.minOrderValue) {
    return `Minimum order value of ${promo.minOrderValue} EGP required`;
  }
  return null;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { effectivePrice, promoDiscount, promoProblem, escapeRegex };
