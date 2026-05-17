import { NextResponse } from 'next/server';
import { getOrders, createOrder, getSetting, decrementStock } from '@/lib/db';
import { getVfxBalance } from '@/lib/vfx';
import { getBtcBalance } from '@/lib/btc';
import { usdToVfx, usdToBtcSatoshis } from '@/lib/price';

export async function GET() {
  return NextResponse.json(getOrders());
}

export async function POST(req: Request) {
  const body = await req.json();
  const { items, total_usd, payment_method } = body;

  if (!items?.length || total_usd == null || !payment_method) {
    return NextResponse.json({ error: 'items, total_usd, and payment_method are required' }, { status: 400 });
  }

  const vfxRate = parseFloat(getSetting('vfx_usd_rate') ?? '0.10');
  const btcRate = parseFloat(getSetting('btc_usd_rate') ?? '65000');
  const vfxAddress = getSetting('store_vfx_address') ?? '';
  const btcAddress = getSetting('store_btc_address') ?? '';

  const total_vfx = usdToVfx(total_usd, vfxRate);
  const total_btc = usdToBtcSatoshis(total_usd, btcRate);

  const paymentAddress = payment_method === 'btc' ? btcAddress : vfxAddress;
  let balanceSnapshot = 0;

  try {
    if (payment_method === 'vfx' && vfxAddress) {
      balanceSnapshot = await getVfxBalance(vfxAddress);
    } else if (payment_method === 'btc' && btcAddress) {
      balanceSnapshot = await getBtcBalance(btcAddress);
    }
  } catch {
    // Balance snapshot is best-effort; don't fail order creation
  }

  const result = createOrder({
    items_json: JSON.stringify(items),
    total_usd: Number(total_usd),
    total_vfx,
    total_btc,
    payment_method,
    payment_address: paymentAddress,
    balance_snapshot: balanceSnapshot,
  });

  // Decrement stock for each item
  for (const item of items) {
    decrementStock(item.id, item.quantity);
  }

  return NextResponse.json({ id: result.lastInsertRowid, total_vfx, total_btc }, { status: 201 });
}
