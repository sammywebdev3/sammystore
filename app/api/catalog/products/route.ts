import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CatalogProduct from '@/models/CatalogProduct';
import CatalogItem from '@/models/CatalogItem';

export async function GET() {
  await dbConnect();

  const products = await CatalogProduct.find({ active: true }).sort({ createdAt: -1 }).lean();

  const counts = await CatalogItem.aggregate([
    { $match: { status: 'available' } },
    { $group: { _id: '$productId', count: { $sum: 1 } } },
  ]);
  const countMap: Record<string, number> = {};
  for (const c of counts) countMap[String(c._id)] = c.count;

  const withStock = products.map((p: any) => ({
    id: String(p._id),
    name: p.name,
    category: p.category,
    price: p.price,
    description: p.description,
    instructions: p.instructions,
    stock: countMap[String(p._id)] || 0,
  }));

  return NextResponse.json({ success: true, products: withStock });
}
