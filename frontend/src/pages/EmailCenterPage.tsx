import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Inbox as InboxIcon,
  Search,
  CheckCircle2,
  Paperclip,
  Clock,
  ExternalLink,
  Filter,
  FileText,
  CreditCard,
  Building2,
  RefreshCw,
  Plus,
} from 'lucide-react';
import api from '../services/api';

export const EmailCenterPage: React.FC = () => {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    fetchEmails();
  }, [directionFilter, typeFilter]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      let url = `/emails?direction=${directionFilter}&type=${typeFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await api.get(url);
      setEmails(res.data);
      if (res.data.length > 0 && !selectedEmail) {
        setSelectedEmail(res.data[0]);
      }
    } catch (err) {
      console.error('Fetch emails error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateInbound = async () => {
    setSimulating(true);
    try {
      const res = await api.post('/emails/simulate-inbound', {
        from: 'priya.s@tcs.com',
        clientName: 'Tata Consultancy Services',
        subject: 'Re: Tax Invoice Payment Confirmation & Route Clarification',
        bodyHtml: `<p>Hi CabMitra Support Team,</p><p>We have processed payment for Invoice #INV-2026-0002 via corporate bank transfer. Please verify receipt and send the updated trip logs for our audit team.</p><p>Regards,<br><strong>Priya Sundaram</strong><br>TCS Transport Desk</p>`,
      });
      fetchEmails();
      setSelectedEmail(res.data);
    } catch (err: any) {
      alert('Failed to simulate inbound query');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Mail className="w-7 h-7 text-brand-600" />
            Communication Center & Mailbox
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Centralized inbox tracking all outbound dispatched PDFs (Invoices, Receipts, Settlements) and received messages
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchEmails}
            className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200 transition-colors inline-flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>

          <button
            onClick={handleSimulateInbound}
            disabled={simulating}
            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-brand-600/30 transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Simulate Client Inquiry
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center space-x-1">
          {[
            { label: 'All Mails', value: 'ALL' },
            { label: 'Sent (Outbound)', value: 'OUTBOUND' },
            { label: 'Received (Inbound)', value: 'INBOUND' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setDirectionFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                directionFilter === tab.value
                  ? 'bg-brand-600 text-white shadow-xs font-bold'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="ALL">All Categories</option>
            <option value="TAX_INVOICE">Tax Invoices</option>
            <option value="PAYMENT_RECEIPT">Payment Receipts</option>
            <option value="VENDOR_SETTLEMENT">Vendor Settlements</option>
            <option value="INBOUND_QUERY">Client / Vendor Queries</option>
          </select>
        </div>
      </div>

      {/* Main Mail Grid Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Email Master List (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs divide-y divide-gray-100 min-h-[600px]">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading mailbox records...</div>
          ) : emails.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <Mail className="w-10 h-10 mx-auto text-gray-300" />
              <p className="text-sm font-medium">No emails found matching filters.</p>
            </div>
          ) : (
            emails.map((email) => {
              const isSelected = selectedEmail?.id === email.id;
              const isOutbound = email.direction === 'OUTBOUND';
              return (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected ? 'bg-brand-50/70 border-l-4 border-brand-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                        isOutbound ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isOutbound ? <Send className="w-2.5 h-2.5" /> : <InboxIcon className="w-2.5 h-2.5" />}
                      {isOutbound ? 'SENT' : 'RECEIVED'}
                    </span>

                    <span className="text-[11px] text-gray-400">
                      {new Date(email.sentAt).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="font-semibold text-xs text-gray-900 truncate">
                    {isOutbound ? `To: ${email.to}` : `From: ${email.from}`}
                  </div>

                  <div className="font-bold text-xs text-gray-800 mt-1 truncate">{email.subject}</div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100/60 text-[11px] text-gray-500">
                    <span className="truncate max-w-[200px] font-mono text-[10px] text-gray-400">
                      {email.type.replace('_', ' ')}
                    </span>
                    {email.attachment && (
                      <span className="inline-flex items-center gap-1 text-brand-600 font-medium text-[10px]">
                        <Paperclip className="w-3 h-3" />
                        {email.attachment}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Email Reading & Preview Pane (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs min-h-[600px] flex flex-col">
          {selectedEmail ? (
            <div>
              {/* Header Details */}
              <div className="p-6 bg-gray-50 border-b border-gray-200 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 leading-snug">{selectedEmail.subject}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                          selectedEmail.direction === 'OUTBOUND'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {selectedEmail.status || 'DELIVERED'}
                      </span>

                      <span className="text-xs text-gray-500">
                        {new Date(selectedEmail.sentAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </div>

                  {selectedEmail.previewUrl && (
                    <a
                      href={selectedEmail.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors inline-flex items-center gap-1.5 flex-shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ethereal Preview
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-gray-200/80">
                  <div>
                    <span className="font-semibold text-gray-500">From:</span>{' '}
                    <span className="font-mono text-gray-900 font-bold">{selectedEmail.from}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500">To:</span>{' '}
                    <span className="font-mono text-gray-900 font-bold">{selectedEmail.to}</span>
                  </div>
                </div>

                {selectedEmail.attachment && (
                  <div className="bg-white border border-gray-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-medium text-gray-800">
                      <Paperclip className="w-4 h-4 text-brand-600" />
                      <span>{selectedEmail.attachment}</span>
                    </div>
                    <span className="text-[11px] text-emerald-600 font-bold">PDF Attached</span>
                  </div>
                )}
              </div>

              {/* Rendered HTML Email Content */}
              <div className="p-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Email Message Content</h3>
                <div
                  className="bg-white rounded-lg border border-gray-100 p-4 min-h-[300px]"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center text-gray-400 my-auto">
              <Mail className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium">Select an email from the left pane to read.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
