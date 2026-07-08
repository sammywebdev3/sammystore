import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.YOUR_DANOTP_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'API key not configured in Vercel Environment Variables',
        products: [],
        debugRaw: 'Missing YOUR_DANOTP_API_KEY'
      },
      { status: 500 }
    );
  }

  try {
    // Correct endpoint from Postman collection
    const url = `https://www.danotp.com.ng/stubs/buy-accounts.php?action=getProducts&api_key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'SammyStore/1.0'
      },
      cache: 'no-store',
      next: { revalidate: 0 }
    });

    const rawText = await response.text();
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: `HTTP ${response.status}: ${response.statusText}`,
          products: [],
          debugRaw: rawText.substring(0, 200)
        },
        { status: response.status }
      );
    }

    // Try to parse JSON
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      // If not JSON, return raw text
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON response from DanOTP',
          products: [],
          debugRaw: rawText.substring(0, 300)
        },
        { status: 500 }
      );
    }

    // Extract products from response
    let products = [];
    
    if (Array.isArray(data)) {
      products = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.data)) products = data.data;
      else if (Array.isArray(data.products)) products = data.products;
      else if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        products = [data.data];
      }
    }

    return NextResponse.json({
      success: true,
      products: products,
      debugRaw: rawText.substring(0, 150)
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Network error',
        products: [],
        debugRaw: 'Connection failed'
      },
      { status: 500 }
    );
  }
}
