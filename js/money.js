// Money is handled as integer halalas (1 SAR = 100 halalas) so totals never pick up float error.

export const CURRENCY_LABEL = 'ر.س';

export function toHalalas(sar) {
  return Math.round(Number(sar) * 100);
}

/** 15000 -> "150", 2223 -> "22.23", 123450 -> "1,234.50" */
export function formatAmount(halalas) {
  const whole = halalas % 100 === 0;
  return (halalas / 100).toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function formatSar(halalas) {
  return `${formatAmount(halalas)} ${CURRENCY_LABEL}`;
}
