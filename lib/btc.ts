import { btc } from 'vfx-web-sdk';

const client = new btc.BtcClient('mainnet');

export const BTC_TO_SATOSHI = 100_000_000;

export async function getBtcBalance(address: string): Promise<number> {
  if (!address) return 0;
  const info = await client.getAddressInfo(address, true);
  return info.balance;
}

export async function verifyBtcPayment(
  address: string,
  expectedSatoshis: number,
  sinceTimestamp: number
): Promise<{ confirmed: boolean; txId?: string }> {
  if (!address) return { confirmed: false };

  const txs = await client.getTransactions(address, 10);
  for (const tx of txs) {
    if (!tx.status.confirmed) continue;
    const blockTime = tx.status.block_time * 1000;
    if (blockTime < sinceTimestamp - 3600_000) continue; // skip txs older than 1hr before order

    const received = tx.vout
      .filter((out) => out.scriptpubkey_address === address)
      .reduce((sum, out) => sum + out.value, 0);

    if (received >= expectedSatoshis * 0.99) {
      return { confirmed: true, txId: tx.txid };
    }
  }

  return { confirmed: false };
}
