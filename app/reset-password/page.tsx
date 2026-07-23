'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setMsg('');

    if (newPassword.length < 8) {
      setMsgType('error');
      setMsg('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsgType('error');
      setMsg('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        setMsgType('success');
        setMsg(data.message);
        setTimeout(() => router.push('/login'), 2000);
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

  if (!token || !email) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card w-full max-w-md p-8 text-center">
          <div className="flex justify-center mb-4">
            <Logo variant="stacked" />
          </div>
          <p className="text-red-600 font-semibold mb-2">Invalid or incomplete reset link.</p>
          <p className="text-sm text-gray-500 mb-6">Please request a new password reset link.</p>
          <Link href="/forgot-password" className="text-[#f97316] font-semibold hover:underline">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="flex justify-center mb-2">
          <Logo variant="stacked" />
        </div>
        <p className="text-center text-gray-500 mb-8 text-sm">Choose a new password</p>

        {!done ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field"
                required
                minLength={8}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                required
                minLength={8}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        ) : (
          <div className="text-center text-sm text-gray-600">Redirecting you to login...</div>
        )}

        {msg && (
          <p className={`mt-4 text-center text-sm font-semibold ${msgType === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
