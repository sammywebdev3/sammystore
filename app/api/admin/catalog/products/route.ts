import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/adminAuth';
import CatalogProduct from '@/models/CatalogProduct';
import CatalogItem from '@/models/CatalogItem';

export async function GET(request: Request) {
  await dbConnect();
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const products = await CatalogProduct.find().sort({ createdAt: -1 }).lean();

  const counts = await CatalogItem.aggregate([
    { $group: { _id: { productId: '$productId', status: '$status' }, count: { $sum: 1 } } },
  ]);

  const countMap: Record<string, { available: number; sold: number }> = {};
  for (const c of counts) {
    const pid = String(c._id.productId);
    if (!countMap[pid]) countMap[pid] = { available: 0, sold: 0 };
    countMap[pid][c._id.status as 'available' | 'sold'] = c.count;
  }

  const withCounts = products.map((p: any) => ({
    ...p,
    availableCount: countMap[String(p._id)]?.available || 0,
    soldCount: countMap[String(p._id)]?.sold || 0,
  }));

  return NextResponse.json({ success: true, products: withCounts });
}

export async function POST(request: Request) {
  await dbConnect();
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { name, category, price, description, instructions } = await request.json();

  if (!name || !category || price === undefined || price === null) {
    return NextResponse.json({ success: false, error: 'Name, category, and price are required' }, { status: 400 });
  }
  const numericPrice = parseFloat(String(price));
  if (isNaN(numericPrice) || numericPrice <= 0) {
    return NextResponse.json({ success: false, error: 'Price must be a positive number' }, { status: 400 });
  }

  const product = await CatalogProduct.create({
    name: String(name).trim(),
    category: String(category).trim(),
    price: numericPrice,
    description: description || '',
    instructions: instructions || '',
    active: true,
  });

  return NextResponse.json({ success: true, product });
}
