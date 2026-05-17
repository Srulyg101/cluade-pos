import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createOrder, getSetting, decrementStock } from '@/lib/db';
import { usdToVfx, usdToBtcSatoshis } from '@/lib/price';

export async function POST(req: Request) {
  const body = await req.json();
  const { items, total_usd, tip_usd = 0, discount_usd = 0 } = body;

  if (!items?.length || total_usd == null) {
    return NextResponse.json({ error: 'items and total_usd required' }, { status: 400 });
  }

  const finalTotal = Math.max(0, total_usd + tip_usd - discount_usd);
  const amountCents = Math.round(finalTotal * 100);

  if (amountCents < 50) {
    return NextResponse.json({ error: 'Minimum charge is $0.50' }, { status: 400 });
  }

  const stripe = getStripe();

  const vfxRate = parseFloat(getSetting('vfx_usd_rate') ?? '0.10');
  const btcRate = parseFloat(getSetting('btc_usd_rate') ?? '65000');
  const accountId = getSetting('stripe_account_id') ?? '';
  const total_vfx = usdToVfx(finalTotal, vfxRate);
  const total_btc = usdToBtcSatoshis(finalTotal, btcRate);

  // Create DB order record first
  const orderResult = createOrder({
    items_json: JSON.stringify(items),
    total_usd: finalTotal,
    total_vfx,
    total_btc,
    payment_method: 'stripe',
    payment_address: '',
    balance_snapshot: 0,
  });
  const orderId = Number(orderResult.lastInsertRowid);

  const piOptions = accountId ? { stripeAccount: accountId } : undefined;

  // Platform fee: $0.05 flat + 0.05% of transaction (only applies to connected accounts)
  const platformFeeFlat = 5; // cents
  const platformFeePct = Math.round(amountCents * 0.0005); // 0.05%
  const applicationFeeAmount = accountId ? platformFeeFlat + platformFeePct : undefined;

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      ...(applicationFeeAmount !== undefined && { application_fee_amount: applicationFeeAmount }),
      metadata: {
        order_id: String(orderId),
        tip_usd: String(tip_usd),
        discount_usd: String(discount_usd),
        platform_fee_cents: String(applicationFeeAmount ?? 0),
      },
    },
    piOptions
  );

  // Decrement stock
  for (const item of items) {
    decrementStock(item.id, item.quantity);
  }

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    orderId,
    total_usd: finalTotal,
    total_vfx,
    total_btc,
  });
}
