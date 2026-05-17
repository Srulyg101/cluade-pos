import { NextResponse } from 'next/server';
import { getProduct, updateProduct, deleteProduct } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const product = getProduct(Number(params.id));
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(product);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, price_usd, stock, image_url } = body;
  updateProduct(Number(params.id), String(name), Number(price_usd), Number(stock), image_url);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  deleteProduct(Number(params.id));
  return NextResponse.json({ ok: true });
}
