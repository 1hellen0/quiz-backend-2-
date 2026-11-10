'use strict';

class InvalidPurchaseDecimalError extends Error {
  constructor(field, precision) {
    super(`${field} must be a positive decimal string with at most ${precision} fractional digits.`);
    this.name = 'InvalidPurchaseDecimalError';
  }
}

function parsePositiveDecimal(value, scale, integerDigits, field) {
  const expression = new RegExp(`^(0|[1-9]\\d{0,${integerDigits - 1}})(?:\\.(\\d{1,${scale}}))?$`);
  if (typeof value !== 'string') {
    throw new InvalidPurchaseDecimalError(field, scale);
  }
  const match = expression.exec(value);
  if (!match) {
    throw new InvalidPurchaseDecimalError(field, scale);
  }

  const fraction = (match[2] || '').padEnd(scale, '0');
  const units = BigInt(match[1]) * (10n ** BigInt(scale)) + BigInt(fraction || '0');
  if (units <= 0n) {
    throw new InvalidPurchaseDecimalError(field, scale);
  }

  return {
    canonical: `${match[1]}.${fraction}`,
    units
  };
}

function calculateTotalCents(lines) {
  let thousandthsOfCent = 0n;
  for (const line of lines) {
    thousandthsOfCent += line.quantityMilli * line.priceCents;
  }
  const cents = (thousandthsOfCent + 500n) / 1000n;
  if (cents > 9999999999999999n) {
    throw new RangeError('Calculated total exceeds DECIMAL(16,2).');
  }
  return cents;
}

function formatCents(cents) {
  const whole = cents / 100n;
  const fraction = String(cents % 100n).padStart(2, '0');
  return `${whole}.${fraction}`;
}

module.exports = {
  InvalidPurchaseDecimalError,
  parsePositiveDecimal,
  calculateTotalCents,
  formatCents
};
