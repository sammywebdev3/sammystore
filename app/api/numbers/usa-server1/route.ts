import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserId } from '@/lib/auth';

// GET remains the same (fetching services)
export async function GET(request: Request) {
  const apiKey = process.env.YOUR_DANOTP_API_KEY;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'getServices';
  
  if (!apiKey) return NextResponse.json({ success: false, error: 'API key missing' }, { status: 500 });

  try {
    const url = `https://www.danotp.com.ng/stubs/handler_api.php?action=${action}&api_key=${apiKey}`;
    const response = await fetch(url, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
    const text = await response.text();
    
    let data = JSON.parse(text);
    let services = [];
    const seen = new Set();
    
    if (Array.isArray(data)) services = data;
    else if (data && typeof data === 'object') {
      if (Array.isArray(data.services)) services = data.services;
      else services = Object.values(data).filter(i => i && typeof i === 'object');
    }

    // Clean and deduplicate
    services = services.filter(s => {
      const name = s.name || s;
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });

    return NextResponse.json({ success: true, services, count: services.length });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}

// POST now checks balance!
export async function POST(request: Request) {
  const apiKey = process.env.YOUR_DANOTP_API_KEY;
  const body = await request.json();
  
  // 1. Check Auth & Balance FIRST
  await dbConnect();
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Please login' }, { status: 401 });

  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Check if user has money (Example: assuming cost is 500 for now, or check body.cost)
  const cost = body.cost || 500; // Default cost if not provided
  
  if (user.walletBalance < cost) {
    return NextResponse.json({ 
      success: false, 
      error: `Insufficient funds. You need ₦${cost} but have ₦${user.walletBalance}` 
    }, { status: 400 });
  }

  if (!apiKey) return NextResponse.json({ error: 'API key missing' }, { status: 500 });

  try {
    // 2. Call DanOTP
    const params = new URLSearchParams({
      action: 'getNumber',
      api_key: apiKey,
      service: body.service || '',
      country: 'usa',
      ...(body.carrier && { carrier: body.carrier }),
      ...(body.area_codes && { area_codes: body.area_codes }),
      ...(body.duration && { duration: body.duration })
    });

    const response = await fetch(`https://www.danotp.com.ng/stubs/handler_api.php?${params.toString()}`);
    const text = await response.text();
    
    // 3. If DanOTP succeeds, deduct money
    if (text.includes('ACCESS_NUMBER') || response.ok) {
      user.walletBalance -= cost;
      await user.save();
      
      return NextResponse.json({
        success: true,
        message: 'Number acquired and charged!',
        rawResponse: text,
        newBalance: user.walletBalance
      });
    } else {
      return NextResponse.json({
        success: false,
        error: text || 'Failed to get number'
      });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
