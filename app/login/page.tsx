'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, twoFactorCode: twoFactorCode || undefined })
      });
      const data = await res.json();
      if (data.requiresTwoFactor) {
        setNeedsTwoFactor(true);
        setMsg('Enter the 6-digit code from your authenticator app');
      } else if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else {
        setMsg(data.error);
      }
    } catch (error) {
      setMsg('Network error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="flex justify-center mb-2">
            <Logo variant="stacked" />
          </div>
        <p className="text-center text-gray-500 mb-8 text-sm">Log in to your account</p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" required />
          </div>
          {needsTwoFactor && (
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2">Authentication Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="input-field"
                placeholder="6-digit code"
                autoFocus
              />
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Logging in...' : needsTwoFactor ? 'Verify Code' : 'Login'}
          </button>
        </form>
        {msg && <p className="mt-4 text-center text-red-600 text-sm font-semibold">{msg}</p>}
        <p className="text-center text-gray-500 mt-6 text-sm">
          Don't have an account? <Link href="/register" className="text-[#f97316] font-semibold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
