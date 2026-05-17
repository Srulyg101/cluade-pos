import { NextResponse } from 'next/server';
import { getProducts, createProduct } from '@/lib/db';

export async function GET() {
  const products = getProducts();
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, price_usd, stock, image_url } = body;

  if (!name || price_usd == null || stock == null) {
    return NextResponse.json({ error: 'name, price_usd, and stock are required' }, { status: 400 });
  }

  const result = createProduct(String(name), Number(price_usd), Number(stock), image_url);
  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
