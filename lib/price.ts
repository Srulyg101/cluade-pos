export function usdToVfx(usd: number, vfxUsdRate: number): number {
  if (!vfxUsdRate || vfxUsdRate <= 0) return 0;
  return usd / vfxUsdRate;
}

export function usdToBtcSatoshis(usd: number, btcUsdRate: number): number {
  if (!btcUsdRate || btcUsdRate <= 0) return 0;
  return Math.ceil((usd / btcUsdRate) * 100_000_000);
}

export function satoshisToBtc(satoshis: number): number {
  return satoshis / 100_000_000;
}

export function formatVfx(amount: number): string {
  return amount.toFixed(4);
}

export function formatBtc(satoshis: number): string {
  return satoshisToBtc(satoshis).toFixed(8);
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
