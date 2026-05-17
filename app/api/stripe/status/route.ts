import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSetting, setSetting } from '@/lib/db';

export async function GET() {
  const accountId = getSetting('stripe_account_id') ?? '';
  if (!accountId) return NextResponse.json({ connected: false });

  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(accountId);
    return NextResponse.json({
      connected: true,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      email: account.email ?? null,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

export async function DELETE() {
  setSetting('stripe_account_id', '');
  return NextResponse.json({ ok: true });
}
