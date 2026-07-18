'use client';
import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setMsgType('success');
        setMsg('Account created! Redirecting...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setMsgType('error');
        setMsg(data.error || 'Registration failed');
      }
    } catch (err: any) {
      setMsgType('error');
      setMsg('Error: ' + err.message);
    }

    setLoading(false);
  };

  const handleChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="flex justify-center mb-2">
            <Logo variant="stacked" />
          </div>
        <p className="text-center text-gray-500 mb-8 text-sm">
          Create your account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Full Name
            </label>
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Email Address
            </label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Password
            </label>
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="input-field"
              required
              minLength={8}
            />
            <p className="text-xs text-gray-400 mt-1">At least 8 characters</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {msg && (
          <p className={`mt-4 text-center text-sm font-semibold ${
            msgType === 'success' ? 'text-green-600' : 'text-red-600'
          }`}>
            {msg}
          </p>
        )}

        <p className="text-center text-gray-500 mt-6 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-[#f97316] font-semibold hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
