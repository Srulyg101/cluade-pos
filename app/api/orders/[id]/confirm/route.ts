import { NextResponse } from 'next/server';
import { updateOrderStatus } from '@/lib/db';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  updateOrderStatus(Number(params.id), 'confirmed');
  return NextResponse.json({ ok: true });
}
