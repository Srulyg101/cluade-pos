import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSetting, setSetting } from '@/lib/db';

export async function POST(req: Request) {
  const stripe = getStripe();
  const origin = new URL(req.url).origin;

  let accountId = getSetting('stripe_account_id') ?? '';

  if (!accountId) {
    const account = await stripe.accounts.create({ type: 'express' });
    accountId = account.id;
    setSetting('stripe_account_id', accountId);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/admin/settings?stripe=refresh`,
    return_url: `${origin}/api/stripe/callback?account_id=${accountId}`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: link.url });
}
