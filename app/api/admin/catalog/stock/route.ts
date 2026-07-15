import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/adminAuth';
import CatalogProduct from '@/models/CatalogProduct';
import CatalogItem from '@/models/CatalogItem';

export async function POST(request: Request) {
  await dbConnect();
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { productId, credentialsList } = await request.json();
  if (!productId || !credentialsList) {
    return NextResponse.json({ success: false, error: 'productId and credentialsList are required' }, { status: 400 });
  }

  const product = await CatalogProduct.findById(productId);
  if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });

  const lines: string[] = String(credentialsList)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return NextResponse.json({ success: false, error: 'No valid lines found' }, { status: 400 });
  }

  const docs = lines.map((credentials) => ({ productId, credentials, status: 'available' as const }));
  await CatalogItem.insertMany(docs);

  return NextResponse.json({ success: true, added: docs.length });
}
