'use client';
import { useState, useEffect } from 'react';

export default function TwoFactorSection() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [settingUp, setSettingUp] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error' | ''>('');
  const [actionLoading, setActionLoading] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
  };

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/account/2fa/status', { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setEnabled(data.twoFactorEnabled);
    } catch (err) {
      console.error('Failed to load 2FA status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleStartSetup = async () => {
    setActionLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/account/2fa/setup', { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setQrCodeDataUrl(data.qrCodeDataUrl);
        setSettingUp(true);
      } else {
        setMsg(data.error || 'Failed to start 2FA setup');
        setMsgType('error');
      }
    } catch (err: any) {
      setMsg('Network error: ' + err.message);
      setMsgType('error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyCode.trim()) return;
    setActionLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/account/2fa/verify-setup', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ code: verifyCode.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setEnabled(true);
        setSettingUp(false);
        setVerifyCode('');
        setQrCodeDataUrl('');
        setMsg('2FA enabled successfully!');
        setMsgType('success');
      } else {
        setMsg(data.error || 'Invalid code');
        setMsgType('error');
      }
    } catch (err: any) {
      setMsg('Network error: ' + err.message);
      setMsgType('error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!disableCode.trim() && !disablePassword.trim()) return;
    setActionLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/account/2fa/disable', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ code: disableCode.trim() || undefined, password: disablePassword.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setEnabled(false);
        setDisableCode('');
        setDisablePassword('');
        setMsg('2FA disabled');
        setMsgType('success');
      } else {
        setMsg(data.error || 'Failed to disable 2FA');
        setMsgType('error');
      }
    } catch (err: any) {
      setMsg('Network error: ' + err.message);
      setMsgType('error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div>
      {msg && (
        <p className={`text-sm font-semibold mb-4 ${msgType === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {msg}
        </p>
      )}

      {enabled ? (
        <div>
          <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3 mb-4">2FA is currently enabled on your account.</p>
          <p className="text-sm font-semibold text-gray-700 mb-2">Disable 2FA</p>
          <p className="text-xs text-gray-500 mb-2">Enter your current authenticator code, or your account password.</p>
          <input
            type="text"
            inputMode="numeric"
            placeholder="6-digit code"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            className="input-field mb-2"
          />
          <input
            type="password"
            placeholder="Or your password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            className="input-field mb-3"
          />
          <button
            onClick={handleDisable}
            disabled={actionLoading}
            className="text-sm py-2 px-4 rounded-full border-2 border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            {actionLoading ? 'Disabling...' : 'Disable 2FA'}
          </button>
        </div>
      ) : settingUp ? (
        <div>
          <p className="text-sm text-gray-700 mb-3">Scan this QR code with your authenticator app:</p>
          {qrCodeDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCodeDataUrl} alt="2FA QR Code" className="w-48 h-48 mb-4 border border-gray-200 rounded-lg" />
          )}
          <label className="block text-sm font-semibold text-gray-700 mb-2">Enter the 6-digit code to confirm</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            className="input-field mb-3"
            placeholder="123456"
          />
          <button
            onClick={handleVerify}
            disabled={actionLoading}
            className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
          >
            {actionLoading ? 'Verifying...' : 'Confirm and Enable'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleStartSetup}
          disabled={actionLoading}
          className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
        >
          {actionLoading ? 'Starting...' : 'Enable 2FA'}
        </button>
      )}
    </div>
  );
}
