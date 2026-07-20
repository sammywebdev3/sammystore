'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import TwoFactorSection from '@/components/TwoFactorSection';

interface Profile {
  name: string;
  email: string;
  apiKey: string;
  walletBalance: number;
  createdAt: string;
  suspended: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwMsgType, setPwMsgType] = useState<'success' | 'error' | ''>('');

  // API key
  const [showApiKey, setShowApiKey] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [keyMsg, setKeyMsg] = useState('');

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const res = await fetch('/api/account/me', { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setProfile(data.user);
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch {
      // ignore - page still renders with stale/empty state
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg('');

    if (newPassword !== confirmPassword) {
      setPwMsgType('error');
      setPwMsg('New passwords do not match');
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPwMsgType('success');
        setPwMsg('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwMsgType('error');
        setPwMsg(data.error || 'Failed to update password');
      }
    } catch (error: any) {
      setPwMsgType('error');
      setPwMsg('Network error: ' + error.message);
    }
    setPwSaving(false);
  };

  const handleRegenerateKey = async () => {
    if (!window.confirm('Regenerate your API key? Any existing integrations using the old key will stop working.')) {
      return;
    }
    setRegenLoading(true);
    setKeyMsg('');
    try {
      const res = await fetch('/api/account/regenerate-key', {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setProfile((prev) => (prev ? { ...prev, apiKey: data.apiKey } : prev));
        setShowApiKey(true);
        setKeyMsg('API key regenerated.');
      } else {
        setKeyMsg(data.error || 'Failed to regenerate key');
      }
    } catch (error: any) {
      setKeyMsg('Network error: ' + error.message);
    }
    setRegenLoading(false);
  };

  const copyApiKey = () => {
    if (profile?.apiKey) {
      navigator.clipboard.writeText(profile.apiKey);
      setKeyMsg('Copied to clipboard!');
      setTimeout(() => setKeyMsg(''), 1500);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading account...</p>
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
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#f97316] mb-4 transition-colors">
            ← Back to Dashboard
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Account Settings</h1>
            <p className="text-gray-600">Manage your profile, password, and wallet</p>
          </div>

          {profile?.suspended && (
            <div className="mb-6 p-4 rounded-xl bg-red-100 border border-red-300 text-red-800 font-semibold">
              Your account is currently suspended. Contact support for help.
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Profile summary */}
            <div className="card p-6 md:col-span-2">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Profile</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">Name</span>
                  <span className="text-gray-800 font-semibold">{profile?.name}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">Email</span>
                  <span className="text-gray-800 font-semibold">{profile?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Member since</span>
                  <span className="text-gray-800 font-semibold">
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Wallet quick view */}
            <div className="card p-6 bg-gradient-to-br from-orange-50 to-white">
              <h3 className="text-[#f97316] text-sm font-semibold mb-2">Wallet Balance</h3>
              <p className="text-3xl font-bold text-gray-800 mb-4">₦{(profile?.walletBalance ?? 0).toLocaleString()}</p>
              <div className="flex flex-col gap-2">
                <Link href="/fund" className="btn-primary text-sm py-2 px-4 text-center">
                  Add Funds
                </Link>
                <Link href="/orders" className="btn-secondary text-sm py-2 px-4 text-center">
                  View Orders
                </Link>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Change password */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Change Password</h2>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field"
                    minLength={8}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">At least 8 characters</p>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    minLength={8}
                    required
                  />
                </div>
                <button type="submit" disabled={pwSaving} className="btn-primary w-full disabled:opacity-50">
                  {pwSaving ? 'Updating...' : 'Update Password'}
                </button>
              </form>
              {pwMsg && (
                <p className={`mt-4 text-sm font-semibold ${pwMsgType === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {pwMsg}
                </p>
              )}
            </div>

            {/* API key */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">API Key</h2>
              <p className="text-gray-500 text-sm mb-4">
                Used to authenticate requests if you integrate with SammyStore programmatically. Keep this secret.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  readOnly
                  value={profile?.apiKey || ''}
                  className="input-field font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((s) => !s)}
                  className="btn-secondary text-sm py-2 px-3 whitespace-nowrap"
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="flex gap-3">
                <button onClick={copyApiKey} className="btn-secondary text-sm py-2 px-4 flex-1">
                  Copy
                </button>
                <button
                  onClick={handleRegenerateKey}
                  disabled={regenLoading}
                  className="text-sm py-2 px-4 flex-1 rounded-full border-2 border-red-500 text-red-600 font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {regenLoading ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>
              {keyMsg && <p className="mt-3 text-sm font-semibold text-gray-600">{keyMsg}</p>}
            </div>
          </div>

          {/* Two-Factor Authentication */}
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Two-Factor Authentication</h2>
            <p className="text-gray-500 text-sm mb-4">
              Add an extra layer of security using an authenticator app (Google Authenticator, Authy, etc).
            </p>
            <TwoFactorSection />
          </div>

          {/* Danger zone / logout */}
          <div className="card p-6 max-w-md">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Session</h2>
            <p className="text-gray-500 text-sm mb-4">Sign out of SammyStore on this device.</p>
            <button
              onClick={handleLogout}
              className="text-sm py-2 px-4 rounded-full border-2 border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
            >
              Log Out
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
