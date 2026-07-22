'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface TicketMessage {
  sender: 'user' | 'admin';
  message: string;
  attachmentUrl?: string;
  createdAt: string;
}

interface Ticket {
  _id: string;
  subject: string;
  status: 'open' | 'pending' | 'closed';
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
  userId: { _id: string; name: string; email: string } | string;
  adminUnread?: boolean;
}

const STATUS_LABEL: Record<Ticket['status'], string> = {
  open: 'Awaiting customer',
  pending: 'Needs reply',
  closed: 'Closed',
};

const STATUS_COLOR: Record<Ticket['status'], string> = {
  open: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-gray-200 text-gray-600',
};

export default function AdminTicketsPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto p-4 pt-8 text-gray-500 text-sm">Loading tickets...</div>}>
      <AdminTicketsPageInner />
    </Suspense>
  );
}

function AdminTicketsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | Ticket['status']>('all');

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      const res = await fetch('/api/admin/tickets', { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
      } else {
        setError(data.error || 'Failed to load tickets');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    const ticketId = searchParams.get('ticket');
    if (ticketId) openTicket(ticketId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openTicket = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setSelectedTicket(data.ticket);
    } catch {
      // silent - list view still usable
    }
  };

  const sendReply = async (status?: Ticket['status']) => {
    if (!selectedTicket) return;
    if (!replyText.trim() && !status) return;
    try {
      setReplying(true);
      const res = await fetch(`/api/admin/tickets/${selectedTicket._id}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message: replyText.trim() || undefined, status }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTicket(data.ticket);
        setReplyText('');
        loadTickets();
      } else {
        setError(data.error || 'Failed to send reply');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    } finally {
      setReplying(false);
    }
  };

  const filteredTickets = filter === 'all' ? tickets : tickets.filter((t) => t.status === filter);

  const ownerLabel = (t: Ticket) => {
    if (typeof t.userId === 'string') return t.userId;
    return `${t.userId.name} (${t.userId.email})`;
  };

  if (selectedTicket) {
    return (
      <div className="max-w-2xl mx-auto p-4 pt-8">
        <button
          onClick={() => setSelectedTicket(null)}
          className="text-gray-500 hover:text-gray-800 text-sm mb-4 flex items-center gap-1"
        >
          ← Back to all tickets
        </button>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-xl font-bold text-gray-800">{selectedTicket.subject}</h1>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLOR[selectedTicket.status]}`}>
              {STATUS_LABEL[selectedTicket.status]}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-4">{ownerLabel(selectedTicket)}</p>

          <div className="space-y-3 mb-6">
            {selectedTicket.messages.map((m, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg max-w-[85%] ${
                  m.sender === 'admin'
                    ? 'bg-[#f97316]/10 border border-[#f97316]/20 ml-auto text-right'
                    : 'bg-gray-100 border border-gray-200'
                }`}
              >
                <p className="text-xs text-gray-500 mb-1">{m.sender === 'admin' ? 'Support' : 'Customer'}</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{m.message}</p>
                {m.attachmentUrl && (
                  <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">
                    <img
                      src={m.attachmentUrl}
                      alt="Attachment"
                      className="max-w-[200px] max-h-[200px] rounded-lg border border-gray-300"
                    />
                  </a>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              rows={3}
              className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f97316] outline-none transition"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => sendReply()}
                disabled={replying || !replyText.trim()}
                className="bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                {replying ? 'Sending...' : 'Send Reply'}
              </button>
              <button
                onClick={() => sendReply('closed')}
                disabled={replying}
                className="bg-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Reply &amp; Close
              </button>
              {selectedTicket.status !== 'closed' && (
                <button
                  onClick={() => sendReply('closed')}
                  disabled={replying}
                  className="bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  Close Without Reply
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pt-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            Support Tickets
            {tickets.some((t) => t.adminUnread) && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500 text-white">
                {tickets.filter((t) => t.adminUnread).length} new
              </span>
            )}
          </h1>
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-800">
          ← Admin Home
        </Link>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'open', 'closed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              filter === f ? 'bg-[#f97316] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading tickets...</p>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-500 text-sm">
          No tickets in this view.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((t) => (
            <button
              key={t._id}
              onClick={() => openTicket(t._id)}
              className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-[#f97316] transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                    {t.adminUnread && (
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" aria-label="Unread ticket" />
                    )}
                    <div>
                <p className="font-semibold text-gray-800">{t.subject}</p>
                <p className="text-xs text-gray-400 mt-1">{ownerLabel(t)} · {new Date(t.updatedAt).toLocaleString()}</p>
              </div>
                  </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${STATUS_COLOR[t.status]}`}>
                {STATUS_LABEL[t.status]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
