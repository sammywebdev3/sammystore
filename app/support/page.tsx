'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  userUnread?: boolean;
}

const STATUS_LABEL: Record<Ticket['status'], string> = {
  open: 'Awaiting your reply',
  pending: 'Awaiting support',
  closed: 'Closed',
};

const STATUS_COLOR: Record<Ticket['status'], string> = {
  open: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-gray-200 text-gray-600',
};

export default function SupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const authedFetch = (url: string, opts: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    return fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(opts.headers || {}),
      },
    });
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
      const res = await authedFetch('/api/support/tickets');
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

  const openTicket = async (id: string) => {
    try {
      const res = await authedFetch(`/api/support/tickets/${id}`);
      const data = await res.json();
      if (data.success) setSelectedTicket(data.ticket);
    } catch {
      // silent - the list view still works even if a single fetch fails
    }
  };

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      setError('Subject and message are required');
      return;
    }
    try {
      setCreating(true);
      setError('');
      const res = await authedFetch('/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify({ subject: newSubject.trim(), message: newMessage.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewSubject('');
        setNewMessage('');
        setShowNewForm(false);
        await loadTickets();
        setSelectedTicket(data.ticket);
      } else {
        setError(data.error || 'Failed to create ticket');
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    try {
      setReplying(true);
      const res = await authedFetch(`/api/support/tickets/${selectedTicket._id}`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText.trim() }),
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

  if (selectedTicket) {
    return (
      <div className="max-w-2xl mx-auto p-4 pt-8">
        <button
          onClick={() => setSelectedTicket(null)}
          className="text-gray-500 hover:text-gray-800 text-sm mb-4 flex items-center gap-1"
        >
          ← Back to tickets
        </button>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800">{selectedTicket.subject}</h1>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLOR[selectedTicket.status]}`}>
              {STATUS_LABEL[selectedTicket.status]}
            </span>
          </div>

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
                <p className="text-xs text-gray-500 mb-1">{m.sender === 'admin' ? 'Support' : 'You'}</p>
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

          {selectedTicket.status !== 'closed' && (
            <div className="space-y-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f97316] outline-none transition"
              />
              <button
                onClick={handleReply}
                disabled={replying || !replyText.trim()}
                className="bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {replying ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          )}
          {selectedTicket.status === 'closed' && (
            <p className="text-sm text-gray-500 italic">This ticket is closed. Open a new ticket if you need further help.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pt-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            Support Tickets
            {tickets.some((t) => t.userUnread) && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500 text-white">
                {tickets.filter((t) => t.userUnread).length} new
              </span>
            )}
          </h1>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
        >
          {showNewForm ? 'Cancel' : '+ New Ticket'}
        </button>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {showNewForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6 space-y-3">
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Subject"
            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f97316] outline-none transition"
          />
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Describe your issue..."
            rows={4}
            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f97316] outline-none transition"
          />
          <button
            onClick={handleCreateTicket}
            disabled={creating}
            className="bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            {creating ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-500 text-sm">
          No tickets yet. Open one if you need help.
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <button
              key={t._id}
              onClick={() => openTicket(t._id)}
              className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-[#f97316] transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                    {t.userUnread && (
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" aria-label="Unread reply" />
                    )}
                    <div>
                <p className="font-semibold text-gray-800">{t.subject}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(t.updatedAt).toLocaleString()}</p>
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
