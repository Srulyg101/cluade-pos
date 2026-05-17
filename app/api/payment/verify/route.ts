import { NextResponse } from 'next/server';
import { getOrder, updateOrderStatus } from '@/lib/db';
import { verifyVfxPayment } from '@/lib/vfx';
import { verifyBtcPayment } from '@/lib/btc';

export async function POST(req: Request) {
  const { orderId } = await req.json();
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

  const order = getOrder(Number(orderId));
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (order.status === 'confirmed') {
    return NextResponse.json({ confirmed: true, txId: order.payment_tx_id });
  }

  const sinceTimestamp = new Date(order.created_at).getTime();
  const address = order.payment_address ?? '';

  try {
    if (order.payment_method === 'vfx') {
      const expectedVfx = order.total_vfx ?? 0;
      const result = await verifyVfxPayment(address, expectedVfx, sinceTimestamp);
      if (result.confirmed) {
        updateOrderStatus(order.id, 'confirmed', result.txHash);
        return NextResponse.json({ confirmed: true, txId: result.txHash });
      }
    } else if (order.payment_method === 'btc') {
      const expectedSatoshis = order.total_btc ?? 0;
      const result = await verifyBtcPayment(address, expectedSatoshis, sinceTimestamp);
      if (result.confirmed) {
        updateOrderStatus(order.id, 'confirmed', result.txId);
        return NextResponse.json({ confirmed: true, txId: result.txId });
      }
    }
  } catch {
    // Network errors don't break the poll loop
  }

  return NextResponse.json({ confirmed: false });
}
