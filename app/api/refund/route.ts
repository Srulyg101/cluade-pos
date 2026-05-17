import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getOrder, updateOrderStatus } from '@/lib/db';

export async function POST(req: Request) {
  const { orderId, amount_usd, reason } = await req.json();
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

  const order = getOrder(Number(orderId));
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.status !== 'confirmed') {
    return NextResponse.json({ error: 'Only confirmed orders can be refunded' }, { status: 400 });
  }

  if (order.payment_method === 'stripe' && order.payment_tx_id) {
    const stripe = getStripe();
    const amountCents = amount_usd ? Math.round(Number(amount_usd) * 100) : undefined;

    const refund = await stripe.refunds.create({
      payment_intent: order.payment_tx_id,
      ...(amountCents ? { amount: amountCents } : {}),
      reason: (reason as 'duplicate' | 'fraudulent' | 'requested_by_customer') ?? 'requested_by_customer',
    });

    const isPartial = amountCents && amountCents < Math.round(order.total_usd * 100);
    updateOrderStatus(order.id, isPartial ? 'partial_refund' : 'refunded', order.payment_tx_id);

    return NextResponse.json({ refundId: refund.id, status: refund.status });
  }

  // Cash / crypto refunds are manual
  updateOrderStatus(order.id, 'refunded', order.payment_tx_id ?? undefined);
  return NextResponse.json({ status: 'manual_refund' });
}
