import { NextResponse } from 'next/server';
import { fiveSimRequest } from '@/lib/5sim';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');

  if (!country) {
    return NextResponse.json({ success: false, error: 'Country is required' }, { status: 400 });
  }

  try {
    // Correct endpoint: /v1/guest/products/{country}/{operator}
    // Use "any" for operator to get all products for that country
    const data = await fiveSimRequest(`/guest/products/${country}/any`);
    
    console.log('Products response for', country, ':', data);
    
    // 5sim returns an array of product objects
    if (Array.isArray(data)) {
      return NextResponse.json({ 
        success: true, 
        products: data.map((p: any) => ({
          id: p.name || p.id,
          name: p.name
        })).sort((a: any, b: any) => a.name.localeCompare(b.name))
      });
    }
    
    return NextResponse.json({ success: true, products: [] });
  } catch (error: any) {
    console.error('Products API error:', error.response?.data || error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: error.response?.data
    }, { status: 500 });
  }
}
