/**
 * Precision monetary calculations utility for CabMitra financial engines.
 * Avoids raw floating-point binary representation errors (e.g. 0.1 + 0.2 = 0.30000000000000004).
 */

export function roundMoney(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function addMoney(...amounts: number[]): number {
  const sum = amounts.reduce((acc, curr) => acc + (curr || 0), 0);
  return roundMoney(sum);
}

export function subtractMoney(a: number, b: number): number {
  return roundMoney((a || 0) - (b || 0));
}

export function multiplyMoney(a: number, b: number): number {
  return roundMoney((a || 0) * (b || 0));
}

export function calculateGst(subtotal: number, gstRatePercent: number = 5.0): number {
  const safeSubtotal = roundMoney(subtotal);
  const tax = (safeSubtotal * gstRatePercent) / 100;
  return roundMoney(tax);
}

export function calculateCommission(amount: number, commissionPercent: number): number {
  const safeAmount = roundMoney(amount);
  const comm = (safeAmount * commissionPercent) / 100;
  return roundMoney(comm);
}
