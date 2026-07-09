import { NextResponse } from 'next/server';
import { fiveSimRequest } from '@/lib/5sim';

export async function GET() {
  try {
    // Correct endpoint: /v1/guest/countries (not /user/countries)
    const data = await fiveSimRequest('/guest/countries');
    
    console.log('Countries response:', data);
    
    // 5sim returns an array of country objects
    if (Array.isArray(data)) {
      return NextResponse.json({ 
        success: true, 
        countries: data.map((c: any) => ({
          code: c.iso || c.name,
          name: c.name,
          img: c.img || null
        })).sort((a: any, b: any) => a.name.localeCompare(b.name))
      });
    }
    
    return NextResponse.json({ success: true, countries: [] });
  } catch (error: any) {
    console.error('Countries API error:', error.response?.data || error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: error.response?.data
    }, { status: 500 });
  }
}
