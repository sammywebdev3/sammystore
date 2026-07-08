import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const apiKey = process.env.YOUR_DANOTP_API_KEY;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'getServices';
  const country = searchParams.get('country') || 'US';
  
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 });
  }

  try {
    const url = action === 'getServices' 
      ? `https://www.danotp.com.ng/stubs/all_server_2.php?action=${action}&api_key=${apiKey}&country=${country}`
      : `https://www.danotp.com.ng/stubs/all_server_2.php?action=${action}&api_key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    const text = await response.text();
    
    if (!response.ok) {
      return NextResponse.json({ success: false, error: `HTTP ${response.status}` }, { status: response.status });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 500 });
    }

    // Convert object to array and FIX PRICING
    let result = [];
    const seen = new Set();
    
    if (Array.isArray(data)) {
      result = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.services)) result = data.services;
      else if (Array.isArray(data.countries)) result = data.countries;
      else {
        // Server 2 specific parsing
        result = Object.entries(data).map(([id, info]: [string, any]) => {
          // Look for price in multiple places: price, cost, retail
          let rawPrice = info.price || info.cost || info.retail || 0;
          // Ensure it's a number
          let finalPrice = parseFloat(rawPrice);
          if (isNaN(finalPrice)) finalPrice = 0;

          return {
            id: id,
            name: info.name || id,
            price: finalPrice,
            formattedPrice: `₦${finalPrice.toLocaleString()}`
          };
        });
      }
    }

    // Remove duplicates
    result = result.filter(item => {
      if (seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });

    return NextResponse.json({ success: true, data: result, count: result.length });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
      country: body.country || '',
      ...(body.maxPrice && { maxPrice: body.maxPrice }),
      ...(body.operator && { operator: body.operator }),
      ...(body.ref && { ref: body.ref })
    });

    const response = await fetch(`https://www.danotp.com.ng/stubs/all_server_2.php?${params.toString()}`);
    const text = await response.text();
    
    return NextResponse.json({
      success: response.ok,
      rawResponse: text,
      parsed: (() => { try { return JSON.parse(text); } catch { return text; } })()
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
