'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

function isVideoUrl(url: string) {
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url);
}

function toEmbedUrl(url: string) {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  return url;
}

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch('/api/accounts/products');
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          const found = data.products.find((p: any) => String(p.id) === String(productId));
          setProduct(found || null);
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
      }
      setLoading(false);

      try {
        const detailRes = await fetch(`/api/accounts/products/${productId}`);
        const detailData = await detailRes.json();
        if (detailData.success && detailData.product) {
          setProduct((prev: any) => ({ ...(prev || {}), ...detailData.product }));
        }
      } catch (error) {
        console.error('Failed to fetch product detail:', error);
      }
    };
    fetchProduct();
  }, [productId]);

  // product.stock is already a normalized number (or null if unknown) from
  // the products API - checking `!== null && !== undefined` instead of a
  // truthy check is what makes a real 0 (out of stock) distinguishable
  // from "stock unknown", since 0 is falsy in JS.
  const hasStockInfo = product?.stock !== null && product?.stock !== undefined;
  const outOfStock = hasStockInfo && product.stock === 0;
  const maxQty = hasStockInfo ? product.stock : undefined;
  const unitPrice = product ? parseFloat(product.price || '0') : 0;
  const totalPrice = unitPrice * quantity;

  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMsg, setCartMsg] = useState('');

  const handleAddToCart = async () => {
    if (!product) return;
    setAddingToCart(true);
    setCartMsg('');

    const token = localStorage.getItem('token');
    if (!token) {
      setCartMsg('Please login to add to cart');
      setAddingToCart(false);
      return;
    }

    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product.id,
          name: product.name || product.title,
          category: product.category,
          unitPrice,
          quantity,
        }),
      });
      const data = await res.json();
      setCartMsg(data.success ? 'Added to cart!' : data.error || 'Failed to add to cart');
    } catch (error: any) {
      setCartMsg('Network error: ' + error.message);
    }
    setAddingToCart(false);
  };

  const handleBuy = async () => {
    if (!product) return;
    setBuying(true);
    setMsg('');

    const token = localStorage.getItem('token');
    if (!token) {
      setMsg('Please login to purchase');
      setBuying(false);
      return;
    }

    try {
      const res = await fetch('/api/accounts/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId: product.id, amount: quantity })
      });
      const data = await res.json();

      if (data.success) {
         router.push(`/orders?highlight=${data.orderId}`);
      } else {
        setMsg(data.error || 'Purchase failed');
      }
    } catch (error: any) {
      setMsg('Network error: ' + error.message);
    }
    setBuying(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex flex-col md:flex-row max-w-7xl mx-auto">
          <Sidebar />
          <main className="flex-1 p-6 md:p-8">
            <p className="text-gray-600 mb-4">Loading...</p>
          </main>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex flex-col md:flex-row max-w-7xl mx-auto">
          <Sidebar />
          <main className="flex-1 p-6 md:p-8">
            <p className="text-gray-600 mb-4">Product not found.</p>
            <Link href="/accounts" className="text-[#f97316] font-semibold">← Back to Buy Accounts</Link>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex flex-col md:flex-row max-w-7xl mx-auto">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <Link href="/accounts" className="text-sm text-gray-500 hover:text-[#f97316] mb-4 inline-block">
            ← Back to Buy Accounts
          </Link>

          <div className="mb-8">
            {product.category && (
              <span className="inline-block text-xs font-semibold text-[#f97316] bg-primary-50 px-2 py-1 rounded-full mb-3">
                {product.category}
              </span>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2 break-words">
              {product.name || product.title}
            </h1>
            {outOfStock ? (
              <p className="text-red-600 font-semibold">Out of Stock</p>
            ) : hasStockInfo ? (
              <p className="text-gray-600">{product.stock.toLocaleString()} available</p>
            ) : (
              <p className="text-gray-400">Stock unknown</p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {product.instructions && (
                <div className="card p-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-3">How to Login & Use This Account</h2>
                  <p className="text-gray-700 whitespace-pre-line">{product.instructions}</p>
                </div>
              )}

              {product.video && (
                <div className="card p-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-3">Video Tutorial</h2>
                  {isVideoUrl(product.video) ? (
                    <div className="aspect-video">
                      <iframe
                        src={toEmbedUrl(product.video)}
                        className="w-full h-full rounded-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <a href={product.video} target="_blank" rel="noopener noreferrer" className="text-[#f97316] font-semibold underline">
                      Watch Tutorial
                    </a>
                  )}
                </div>
              )}

              {!product.instructions && !product.video && (
                <div className="card p-6 text-gray-500 text-sm">
                  No additional instructions provided for this product.
                </div>
              )}
            </div>

            <div className="card p-6 h-fit">
              <p className="text-sm text-gray-600 mb-1">Price per unit</p>
              <p className="text-2xl font-bold text-[#f97316] mb-4">₦{unitPrice.toLocaleString()}</p>

              <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  let val = parseInt(e.target.value) || 1;
                  if (val < 1) val = 1;
                  if (maxQty && val > maxQty) val = maxQty;
                  setQuantity(val);
                }}
                min={1}
                max={maxQty}
                className="input-field mb-4"
              />

              <div className="border-t border-gray-200 pt-4 mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Total</span>
                  <span className="text-xl font-bold text-gray-800">₦{totalPrice.toLocaleString()}</span>
                </div>
              </div>

            
              href="/refund-policy"
              className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 mb-4 hover:bg-gray-100 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-[#f97316] stroke-2 flex-shrink-0" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Failed delivery is auto-refunded to your wallet - see our Refund Policy</span>
            </a>

              {outOfStock ? (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-semibold text-center">
                  This product is currently out of stock
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className="btn-secondary flex-1 disabled:opacity-50"
                  >
                    {addingToCart ? 'Adding...' : 'Add to Cart'}
                  </button>
                  <button
                    onClick={handleBuy}
                    disabled={buying}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {buying ? 'Processing...' : 'Purchase Now'}
                  </button>
                </div>
              )}

              {cartMsg && (
                <div className="mt-3 p-3 rounded-lg bg-primary-50 text-[#f97316] text-sm font-semibold">
                  {cartMsg}
                </div>
              )}

              {msg && (
                <div className="mt-4 p-3 rounded-lg bg-red-100 text-red-800 text-sm font-semibold">
                  {msg}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
