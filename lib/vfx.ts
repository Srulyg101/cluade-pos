import { VfxClient, Network } from 'vfx-web-sdk';

const client = new VfxClient(Network.Mainnet);

export async function getVfxBalance(address: string): Promise<number> {
  if (!address) return 0;
  const details = await client.getAddressDetails(address);
  return details?.balance ?? 0;
}

export async function verifyVfxPayment(
  address: string,
  expectedVfx: number,
  sinceTimestamp: number
): Promise<{ confirmed: boolean; txHash?: string }> {
  if (!address) return { confirmed: false };

  const result = await client.listTransactionsForAddress(address, 1, 20);
  if (!result?.results?.length) return { confirmed: false };

  for (const tx of result.results) {
    const txTime = new Date(tx.date_crafted).getTime();
    if (
      tx.to_address === address &&
      tx.total_amount >= expectedVfx * 0.99 && // 1% tolerance
      txTime >= sinceTimestamp - 60_000 // 1 min buffer
    ) {
      return { confirmed: true, txHash: tx.hash };
    }
  }

  return { confirmed: false };
}
