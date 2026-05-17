import { NextResponse } from 'next/server';
import { getAllSettings, setSetting } from '@/lib/db';

export async function GET() {
  return NextResponse.json(getAllSettings());
}

export async function POST(req: Request) {
  const body = await req.json();
  for (const [key, value] of Object.entries(body)) {
    setSetting(String(key), String(value));
  }
  return NextResponse.json({ ok: true });
}
