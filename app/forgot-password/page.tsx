'use client';
import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      // We always show the same message regardless of whether the email
      // exists (see the API route) - this is intentional, not a bug.
      if (data.success) {
        setSubmitted(true);
        setMsgType('success');
        setMsg(data.message);
      } else {
        setMsgType('error');
        setMsg(data.error || 'Something went wrong');
      }
    } catch (error) {
      setMsgType('error');
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
        <p className="text-center text-gray-500 mb-8 text-sm">Reset your password</p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div className="text-center text-sm text-gray-600">
            Check your email for a link to reset your password. It expires in 1 hour.
          </div>
        )}

        {msg && (
          <p className={`mt-4 text-center text-sm font-semibold ${msgType === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {msg}
          </p>
        )}

        <p className="text-center text-gray-500 mt-6 text-sm">
          Remembered your password? <Link href="/login" className="text-[#f97316] font-semibold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
