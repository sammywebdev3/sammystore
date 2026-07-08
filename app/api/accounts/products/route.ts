import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.YOUR_DANOTP_API_KEY;
    
    if (!apiKey) {
      console.error('API key not configured');
      return NextResponse.json({ 
        success: false, 
        error: 'API key not configured',
        products: [] 
      });
    }

    // Call DanOTP Buy Accounts API
    const response = await fetch(
      `https://www.danotp.com.ng/stubs/buy-accounts.php?action=getProducts&api_key=${apiKey}`,
      { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('DanOTP Response:', data);
    
    return NextResponse.json({ 
      success: true, 
      products: Array.isArray(data) ? data : [] 
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      products: [] 
    });
  }
}
