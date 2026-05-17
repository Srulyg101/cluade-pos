import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const method = searchParams.get('method') ?? 'vfx';

  const key =
    method === 'btc' ? 'store_btc_address'
    : method === 'usdc' ? 'store_usdc_address'
    : 'store_vfx_address';
  const address = getSetting(key) ?? '';

  return NextResponse.json({ address, method });
}
