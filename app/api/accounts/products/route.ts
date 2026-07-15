import { NextResponse } from 'next/server';
import { getMarkups, computeMarkup } from '@/lib/pricing';

function pickInstructions(obj: any): string | null {
  if (!obj) return null;
  return obj.instructions || obj.login_instructions || obj.guide || obj.description || obj.note || null;
}
function pickVideo(obj: any): string | null {
  if (!obj) return null;
  return obj.video || obj.video_url || obj.tutorial_url || obj.tutorial_video || obj.youtube_url || null;
}
function pickStock(obj: any): number | null {
  if (!obj) return null;
  // BeNotp's field name for available quantity isn't confirmed (their docs
  // are behind a login), so check every common variant. Returns null - not
  // 0 - when no stock field is present at all, so "genuinely unknown" is
  // never confused with "confirmed zero/out of stock".
  const candidates = [obj.stock, obj.quantity, obj.qty, obj.available, obj.count, obj.inventory, obj.amount];
  for (const c of candidates) {
    if (c === undefined || c === null || c === '') continue;
    const n = parseInt(String(c), 10);
    if (!isNaN(n)) return n;
  }
  return null;
}

export async function GET() {
  const apiKey = process.env.BENOTP_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: 'API key not configured',
      products: []
    }, { status: 500 });
  }

  try {
    const url = `https://www.benotp.com/stubs/buy-accounts.php?action=getProducts&api_key=${apiKey}`;

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
        rawResponse: text.substring(0, 200)
      }, { status: response.status });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON response',
        rawResponse: text.substring(0, 300)
      }, { status: 500 });
    }

    let products: any[] = [];

    if (Array.isArray(data)) {
      products = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.categories)) {
        data.categories.forEach((category: any) => {
          if (Array.isArray(category.products)) {
            category.products.forEach((product: any) => {
              products.push({
                ...product,
                category: category.name,
                instructions: pickInstructions(product) || pickInstructions(category),
                video: pickVideo(product) || pickVideo(category),
                stock: pickStock(product),
              });
            });
          }
        });
      }
      else if (Array.isArray(data.products)) {
        products = data.products.map((p: any) => ({
          ...p,
          instructions: pickInstructions(p),
          video: pickVideo(p),
          stock: pickStock(p),
        }));
      }
      else if (data.product && typeof data.product === 'object') {
        products = [{
          ...data.product,
          instructions: pickInstructions(data.product),
          video: pickVideo(data.product),
          stock: pickStock(data.product),
        }];
      }
    }

    const markups = await getMarkups();
    const markedUpProducts = products.map((p: any) => ({
      ...p,
      price: computeMarkup(parseFloat(p.price) || 0, markups.accounts),
    }));

    return NextResponse.json({
      success: true,
      products: markedUpProducts,
      count: markedUpProducts.length,
      rawResponse: text.substring(0, 150)
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Network error',
      products: []
    }, { status: 500 });
  }
}
