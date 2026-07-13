'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

interface SearchResult {
  type: 'account' | 'smm';
  id: string;
  name: string;
  category?: string;
  price: number;
  href: string;
}

function SearchInner() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setResults(data.results || []);
      })
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex flex-col md:flex-row max-w-7xl mx-auto">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#b3001f] mb-4 transition-colors">
            ← Back to Dashboard
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              {q ? `Results for "${q}"` : 'Search'}
            </h1>
            <p className="text-gray-600">
              {loading ? 'Searching...' : `${results.length} result${results.length === 1 ? '' : 's'} across Accounts and SMM`}
            </p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
                  <div className="h-5 bg-gray-200 rounded w-2/3 mb-3"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-gray-600">
                {q ? `No results found for "${q}"` : 'Type something in the search bar above to get started'}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((r) => (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={r.href}
                  className="card p-6 cursor-pointer transition-all border-2 border-transparent hover:border-[#b3001f] block"
                >
                  <span className="inline-block text-xs font-semibold text-[#b3001f] bg-primary-50 px-2 py-1 rounded-full mb-2">
                    {r.type === 'account' ? r.category || 'Account' : 'SMM Service'}
                  </span>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{r.name}</h3>
                  <p className="text-xl font-bold text-[#b3001f]">
                    ₦{r.price.toLocaleString()}
                    {r.type === 'smm' && <span className="text-sm text-gray-500 font-normal"> /1000</span>}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <SearchInner />
    </Suspense>
  );
}
