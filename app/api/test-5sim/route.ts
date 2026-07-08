import { NextResponse } from 'next/server';
import { fiveSimRequest } from '@/lib/5sim';

export async function GET() {
  try {
    const apiKey = process.env.FIVESIM_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not set' }, { status: 500 });
    }
    
    const data = await fiveSimRequest('/countries/any');
    return NextResponse.json({ 
      success: true, 
      countriesCount: Object.keys(data).length,
      sample: Object.keys(data).slice(0, 5)
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      apiKeySet: !!process.env.FIVESIM_API_KEY
    }, { status: 500 });
  }
}
