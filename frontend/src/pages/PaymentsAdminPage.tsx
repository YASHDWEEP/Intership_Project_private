import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Building2,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Zap,
  Smartphone,
} from 'lucide-react';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';

export const PaymentsAdminPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [filters, setFilters] = useState({
    status: '',
    clientId: '',
    startDate: '',
    endDate: new Date().toISOString().split('T')[0],
    minAmount: '',
    maxAmount: '',
    search: '',
  });

  // Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundProcessing, setRefundProcessing] = useState(false);

  // Webhook Tester State
  const [simulating, setSimulating] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
    fetchClients();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.clientId) queryParams.append('clientId', filters.clientId);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.minAmount) queryParams.append('minAmount', filters.minAmount);
      if (filters.maxAmount) queryParams.append('maxAmount', filters.maxAmount);

      const res = await api.get(`/payments?${queryParams.toString()}`);
      setPayments(res.data);
    } catch (err) {
      console.error('Fetch payments error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data);
    } catch (err) {
      console.error('Fetch clients error:', err);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPayments();
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      clientId: '',
      startDate: '',
      endDate: new Date().toISOString().split('T')[0],
      minAmount: '',
      maxAmount: '',
      search: '',
    });
    fetchPayments();
  };

  const triggerSimulatedWebhook = async (payment: any, event: 'payment.captured' | 'payment.failed') => {
    if (!payment.razorpayOrderId) return;
    setSimulating(payment.id);
    try {
      const res = await api.post('/payments/test-webhook-trigger', {
        razorpayOrderId: payment.razorpayOrderId,
        event,
        failureReason: event === 'payment.failed' ? 'Simulated PhonePe UPI PIN Verification Failure' : undefined,
      });

      alert(`Webhook Simulation Success: ${res.data.message}`);
      fetchPayments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to simulate webhook event');
    } finally {
      setSimulating(null);
    }
  };

  const openRefundModal = (payment: any) => {
    setSelectedPayment(payment);
    setRefundReason('');
    setRefundModalOpen(true);
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setRefundProcessing(true);
    try {
      await api.post(`/payments/${selectedPayment.id}/refund`, {
        reason: refundReason,
      });
      alert('Refund processed successfully!');
      setRefundModalOpen(false);
      fetchPayments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to process refund');
    } finally {
      setRefundProcessing(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (!filters.search) return true;
    const term = filters.search.toLowerCase();
    const invNum = p.invoice?.invoiceNumber?.toLowerCase() || '';
    const clientName = p.invoice?.client?.name?.toLowerCase() || '';
    const orderId = p.razorpayOrderId?.toLowerCase() || '';
    const paymentId = p.razorpayPaymentId?.toLowerCase() || '';
    return (
      invNum.includes(term) ||
      clientName.includes(term) ||
      orderId.includes(term) ||
      paymentId.includes(term)
    );
  });

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payments & Razorpay Reconciliation</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit client payment records, Razorpay order/payment IDs, real-time status updates, and issue refunds
          </p>
        </div>

        <button
          onClick={fetchPayments}
          className="flex items-center space-x-2 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-xs transition-colors border border-gray-300"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <form onSubmit={applyFilters} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Search Keywords</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Invoice # / Payment ID"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Corporate Client</label>
            <select
              value={filters.clientId}
              onChange={(e) => handleFilterChange('clientId', e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Payment Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
            >
              <option value="">All Statuses</option>
              <option value="CAPTURED">CAPTURED / PAID</option>
              <option value="CREATED">CREATED / PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex items-end space-x-2">
            <button
              type="submit"
              className="flex-1 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-xs"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-semibold"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Payment ID</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-center">Method</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Razorpay Order ID</th>
                <th className="py-3 px-4">Razorpay Payment ID</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4 text-right">Actions / Real-time Webhook Test</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-400">
                    Loading payment records...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    No payment records found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-gray-800 text-[11px]">
                      {p.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900 font-mono text-xs">
                      {p.invoice?.invoiceNumber || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{p.invoice?.client?.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-600 text-sm">
                      ₹ {p.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] uppercase font-bold border border-gray-200">
                        {p.method || p.paymentMethod || 'UPI'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={p.status === 'CAPTURED' ? 'PAID' : p.status} />
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-500 text-[11px]">{p.razorpayOrderId || '-'}</td>
                    <td className="py-3 px-4 font-mono text-gray-600 text-[11px] font-medium">
                      {p.razorpayPaymentId || p.referenceNumber || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                      {p.paidAt
                        ? new Date(p.paidAt).toLocaleDateString('en-IN')
                        : new Date(p.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                      {/* Webhook Tester Buttons for CREATED or PENDING payments */}
                      {p.status !== 'CAPTURED' && p.status !== 'SUCCESS' && p.status !== 'REFUNDED' && (
                        <>
                          <button
                            onClick={() => triggerSimulatedWebhook(p, 'payment.captured')}
                            disabled={simulating === p.id}
                            title="Simulate PhonePe / Razorpay Webhook Success"
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors inline-flex items-center gap-1 shadow-xs"
                          >
                            <Zap className="w-3 h-3" />
                            Simulate Success
                          </button>

                          <button
                            onClick={() => triggerSimulatedWebhook(p, 'payment.failed')}
                            disabled={simulating === p.id}
                            title="Simulate PhonePe / Razorpay Webhook Failure"
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-semibold text-[11px] border border-rose-200 transition-colors inline-flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" />
                            Simulate Failure
                          </button>
                        </>
                      )}

                      {(p.status === 'CAPTURED' || p.status === 'SUCCESS') && (
                        <button
                          onClick={() => openRefundModal(p)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-semibold text-[11px] border border-rose-200 transition-colors inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund Modal */}
      <Modal isOpen={refundModalOpen} onClose={() => setRefundModalOpen(false)} title="Issue Payment Refund">
        {selectedPayment && (
          <form onSubmit={handleProcessRefund} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Invoice:</span>
                <span className="font-bold text-gray-900 font-mono">{selectedPayment.invoice?.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Client:</span>
                <span className="font-semibold text-gray-800">{selectedPayment.invoice?.client?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Refund Amount:</span>
                <span className="font-extrabold text-rose-600">
                  ₹ {selectedPayment.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Razorpay Payment ID:</span>
                <span className="font-mono text-gray-700">{selectedPayment.razorpayPaymentId || 'N/A'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Refund *</label>
              <textarea
                required
                rows={3}
                placeholder="Enter audit reason for processing refund..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={refundProcessing}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md shadow-rose-600/30 flex items-center space-x-1.5 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{refundProcessing ? 'Processing...' : 'Confirm Refund'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
