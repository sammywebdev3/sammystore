import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const apiKey = process.env.YOUR_DANOTP_API_KEY;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'getServices';
  
  if (!apiKey) {
    return NextResponse.json({ 
      success: false, 
      error: 'API key not configured',
      debugRaw: 'Missing YOUR_DANOTP_API_KEY'
    }, { status: 500 });
  }

  try {
    const url = `https://www.danotp.com.ng/stubs/handler_api.php?action=${action}&api_key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    const text = await response.text();
    
    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `HTTP ${response.status}`,
        debugRaw: text.substring(0, 200)
      }, { status: response.status });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid JSON response',
        debugRaw: text.substring(0, 300)
      }, { status: 500 });
    }

    let services = [];
    if (Array.isArray(data)) {
      services = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.services)) services = data.services;
      else if (Array.isArray(data.data)) services = data.data;
      else if (data.data && typeof data.data === 'object') services = [data.data];
    }

    return NextResponse.json({
      success: true,
      services: services,
      count: services.length,
      debugRaw: text.substring(0, 150)
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      services: [] 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.YOUR_DANOTP_API_KEY;
  const body = await request.json();
  
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const params = new URLSearchParams({
      action: 'getNumber',
      api_key: apiKey,
      service: body.service || '',
      country: 'usa',
      ...(body.carrier && { carrier: body.carrier }),
      ...(body.area_codes && { area_codes: body.area_codes }),
      ...(body.duration && { duration: body.duration }),
      ...(body.specific_number && { specific_number: body.specific_number })
    });

    const response = await fetch(`https://www.danotp.com.ng/stubs/handler_api.php?${params.toString()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const text = await response.text();
    
    return NextResponse.json({
      success: response.ok,
      rawResponse: text,
      parsed: (() => {
        try { return JSON.parse(text); } catch { return text; }
      })()
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
