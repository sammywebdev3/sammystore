import axios from 'axios';
import { NextResponse } from 'next/server';

const API_KEY = process.env.FIVESIM_API_KEY;
const BASE_URL = 'https://5sim.net/v1';

if (!API_KEY) throw new Error('FIVESIM_API_KEY is not set in Vercel Environment Variables');

// Normalize Countries
export async function getCountries() {
  try {
    const res = await axios.get(`${BASE_URL}/guest/countries`, {
      headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' }
    });

    const raw = res.data;
    let countries: { code: string; name: string; prefix: string }[] = [];

    if (Array.isArray(raw)) {
      countries = raw.map((c: any) => ({
        code: c.iso || c.name?.toLowerCase() || '',
        name: c.text_en || c.name || '',
        prefix: c.prefix || ''
      }));
    } else if (typeof raw === 'object' && raw !== null) {
      countries = Object.entries(raw).map(([key, info]: [string, any]) => ({
        code: info.iso || key,
        name: info.text_en || key.charAt(0).toUpperCase() + key.slice(1),
        prefix: info.prefix || ''
      }));
    }

    return NextResponse.json({ success: true, countries: countries.sort((a, b) => a.name.localeCompare(b.name)) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.response?.data?.error || err.message }, { status: 500 });
  }
}

// Normalize Products for a Country
export async function getProducts(country: string) {
  try {
    const res = await axios.get(`${BASE_URL}/guest/products/${country}/any`, {
      headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' }
    });

    const raw = res.data;
    let products: { id: string; name: string }[] = [];

    if (Array.isArray(raw)) {
      products = raw.map((p: any) => ({ id: p.name || p.id, name: p.name || p.id }));
    } else if (typeof raw === 'object' && raw !== null) {
      products = Object.entries(raw).map(([id, info]: [string, any]) => ({
        id,
        name: info.name || id
      }));
    }

    return NextResponse.json({ success: true, products: products.sort((a, b) => a.name.localeCompare(b.name)) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.response?.data?.error || err.message }, { status: 500 });
  }
}

// Buy Number
export async function buyNumber(country: string, product: string) {
  try {
    const res = await axios.get(`${BASE_URL}/user/buy/activation/${country}/any/${product}`, {
      headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' }
    });

    const data = res.data;
    if (data.error) throw new Error(data.error);

    return NextResponse.json({
      success: true,
      orderId: data.id,
      phoneNumber: data.phone,
      price: data.price,
      status: data.status
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.response?.data?.error || err.message }, { status: 500 });
  }
}

// Check SMS
export async function checkSms(orderId: string) {
  try {
    const res = await axios.get(`${BASE_URL}/user/check/${orderId}`, {
      headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' }
    });

    const data = res.data;
    return NextResponse.json({
      success: true,
      status: data.status,
      sms: data.sms || null
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
