import { NextResponse } from 'next/server';
import { setSetting } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const accountId = searchParams.get('account_id');
  if (accountId) {
    setSetting('stripe_account_id', accountId);
  }
  return NextResponse.redirect(`${origin}/admin/settings?stripe=success`);
}
