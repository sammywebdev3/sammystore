import { NextResponse } from 'next/server';
import { fiveSimRequest } from '@/lib/5sim';

export async function GET() {
  try {
    const data = await fiveSimRequest('/guest/countries');
    
    console.log('Raw countries data:', data);
    
    // 5sim returns an object where keys are country names (lowercase)
    // Each country has: iso, prefix, text_en, text_ru, virtual21, etc.
    if (data && typeof data === 'object') {
      const countries = Object.entries(data).map(([key, info]: [string, any]) => ({
        code: info.iso || key,  // Use the ISO code if available, otherwise use the key
        name: info.text_en || key.charAt(0).toUpperCase() + key.slice(1),
        prefix: info.prefix || '',
        img: info.img || null
      })).sort((a, b) => a.name.localeCompare(b.name));
      
      return NextResponse.json({ 
        success: true, 
        countries
      });
    }
    
    return NextResponse.json({ success: true, countries: [] });
  } catch (error: any) {
    console.error('Countries API error:', error.response?.data || error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message
    }, { status: 500 });
  }
}
