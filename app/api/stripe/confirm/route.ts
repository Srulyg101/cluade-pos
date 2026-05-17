import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { updateOrderStatus, getSetting } from '@/lib/db';

export async function POST(req: Request) {
  const { paymentIntentId } = await req.json();
  if (!paymentIntentId) return NextResponse.json({ error: 'paymentIntentId required' }, { status: 400 });

  const stripe = getStripe();
  const accountId = getSetting('stripe_account_id') ?? '';
  const retrieveOpts = accountId ? { stripeAccount: accountId } : undefined;

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, undefined, retrieveOpts);

  if (pi.status === 'succeeded') {
    const orderId = Number(pi.metadata.order_id);
    if (orderId) {
      updateOrderStatus(orderId, 'confirmed', pi.id);
    }
    return NextResponse.json({ confirmed: true, orderId });
  }

  return NextResponse.json({ confirmed: false, status: pi.status });
}
