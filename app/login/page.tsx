'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        // Save the token and user info
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
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="card-dark w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-2">
          <span className="text-[#e11d3f]">SAMMY</span><span className="text-[#8c0018]">STORE</span>
        </h2>
        <p className="text-center text-[#a0a0b0] mb-8 font-mono text-sm">{`> SECURE LOGIN GATEWAY`}</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[#e11d3f] text-sm font-mono mb-2">{`> EMAIL_ADDRESS`}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-dark" required />
          </div>
          <div>
            <label className="block text-[#e11d3f] text-sm font-mono mb-2">{`> PASSWORD`}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-dark" required />
          </div>
          <button type="submit" disabled={loading} className="btn-neon-green w-full">
            {loading ? 'AUTHENTICATING...' : 'LOGIN'}
          </button>
        </form>
        {msg && <p className="mt-4 text-center text-[#e11d3f] font-mono text-sm">{msg}</p>}
        <p className="text-center text-[#a0a0b0] mt-6 text-sm">
          No access? <Link href="/register" className="text-[#e11d3f] hover:underline">Request Entry</Link>
        </p>
      </div>
    </div>
  );
}
