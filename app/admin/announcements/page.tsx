'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Announcement {
  _id: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  active: boolean;
  createdAt: string;
}

const SEVERITY_STYLE: Record<Announcement['severity'], string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  critical: 'bg-red-50 border-red-200 text-red-800',
};

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'info' | 'warning' | 'critical'>('info');

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
  };

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/announcements', { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.announcements);
      } else {
        setError(data.error || 'Failed to load announcements');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message: message.trim(), severity }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('');
        setSeverity('info');
        loadAnnouncements();
      } else {
        setError(data.error || 'Failed to send announcement');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const toggleActive = async (a: Announcement) => {
    try {
      await fetch(`/api/admin/announcements/${a._id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ active: !a.active }),
      });
      loadAnnouncements();
    } catch (err) {
      console.error('Failed to toggle announcement:', err);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Delete this announcement permanently?')) return;
    try {
      await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE', headers: authHeaders() });
      loadAnnouncements();
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 pt-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Announcements</h1>
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-800">
          &larr; Admin Home
        </Link>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Broadcast a message to everyone on the site. It shows as a banner at the top of every page
        (logged in or not) until you deactivate it or the visitor dismisses it themselves.
      </p>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <form onSubmit={handleSend} className="bg-white border border-gray-200 rounded-xl p-4 mb-8 space-y-3">
        <h2 className="font-semibold text-gray-800 mb-2">Send New Announcement</h2>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. We're aware of an issue with number verification and are working on a fix."
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Announcement['severity'])}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-5 rounded-lg transition-colors text-sm"
          >
            {sending ? 'Sending...' : 'Send to Everyone'}
          </button>
        </div>
      </form>

      <h2 className="font-semibold text-gray-800 mb-3">History</h2>
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : announcements.length === 0 ? (
        <p className="text-sm text-gray-500">No announcements sent yet.</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a._id} className={`border rounded-xl p-4 ${SEVERITY_STYLE[a.severity]}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium whitespace-pre-wrap flex-1">{a.message}</p>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${a.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                  {a.active ? 'Live' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs opacity-70">{new Date(a.createdAt).toLocaleString()}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(a)}
                    className="text-xs font-semibold underline hover:opacity-70"
                  >
                    {a.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                  <button
                    onClick={() => deleteAnnouncement(a._id)}
                    className="text-xs font-semibold underline hover:opacity-70 text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
