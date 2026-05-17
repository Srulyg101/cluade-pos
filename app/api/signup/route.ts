import { NextResponse } from 'next/server';
import { VfxClient, Network } from 'vfx-web-sdk';

const vfx = new VfxClient(Network.Mainnet);

export async function POST(req: Request) {
  const { email, pin } = await req.json();

  if (!email || !pin) {
    return NextResponse.json({ error: 'email and pin are required' }, { status: 400 });
  }

  if (pin.length < 4) {
    return NextResponse.json({ error: 'PIN must be at least 4 digits' }, { status: 400 });
  }

  const privateKey = vfx.privateKeyFromEmailPassword(email.trim().toLowerCase(), pin);
  const publicKey = vfx.publicFromPrivate(privateKey);
  const address = vfx.addressFromPrivate(privateKey);

  return NextResponse.json({ address, publicKey });
}
