import React, { useState, useEffect } from 'react';
import { Landmark, Plus, Download, CheckCircle, CreditCard, ShieldCheck, Send } from 'lucide-react';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';

export const SettlementsPage: React.FC = () => {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Generator Modal State
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    vendorId: '',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    deductions: [{ type: 'PENALTY', amount: 0, reason: 'Late Duty Arrival Penalty' }],
  });

  const [selectedSettlementForPayment, setSelectedSettlementForPayment] = useState<any>(null);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: '',
  });

  useEffect(() => {
    fetchSettlements();
    fetchVendors();
  }, []);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settlements');
      setSettlements(res.data);
    } catch (err) {
      console.error('Fetch settlements error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await api.get('/vendors');
      setVendors(res.data);
    } catch (err) {
      console.error('Fetch vendors error:', err);
    }
  };

  const handleGenerateSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/settlements/generate', formData);
      setIsGeneratorModalOpen(false);
      fetchSettlements();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate settlement');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/settlements/${id}/approve`);
      fetchSettlements();
    } catch (err: any) {
      alert('Failed to approve settlement');
    }
  };

  const handleOpenPaymentModal = (settlement: any) => {
    setSelectedSettlementForPayment(settlement);
    setPaymentData({
      amount: settlement.netPayable,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: `UTR-${Date.now()}`,
    });
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/settlements/${selectedSettlementForPayment.id}/pay`, paymentData);
      setIsPaymentModalOpen(false);
      fetchSettlements();
    } catch (err: any) {
      alert('Failed to record payment');
    }
  };

  const handleDownloadPdf = async (settlementId: string) => {
    try {
      const res = await api.get(`/settlements/${settlementId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Settlement_${settlementId.slice(0, 8)}.pdf`;
      a.click();
    } catch (err: any) {
      alert('Failed to download settlement PDF');
    }
  };

  const handleSendEmail = async (settlementId: string) => {
    try {
      const res = await api.post(`/settlements/${settlementId}/send-email`);
      alert(res.data?.message || 'Settlement PDF emailed successfully to vendor!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send settlement email');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vendor Settlement Engine</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Automated vendor payouts, slab earnings grouping, deductions, approval workflow, and transaction logs
          </p>
        </div>

        <button
          onClick={() => setIsGeneratorModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-brand-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Calculate New Settlement</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
            <tr>
              <th className="py-3 px-4">Vendor Partner</th>
              <th className="py-3 px-4">Period</th>
              <th className="py-3 px-4 text-center">Total Trips</th>
              <th className="py-3 px-4 text-right">Gross Amount (₹)</th>
              <th className="py-3 px-4 text-right">Deductions (₹)</th>
              <th className="py-3 px-4 text-right">Net Payable (₹)</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-400">
                  Loading settlements...
                </td>
              </tr>
            ) : settlements.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  No settlements calculated yet.
                </td>
              </tr>
            ) : (
              settlements.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3 px-4 font-semibold text-gray-900">{s.vendor?.name}</td>
                  <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                    {new Date(s.settlementPeriodStart).toLocaleDateString('en-IN')} -{' '}
                    {new Date(s.settlementPeriodEnd).toLocaleDateString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-gray-800">{s.totalTrips}</td>
                  <td className="py-3 px-4 text-right font-medium text-emerald-600">
                    ₹ {s.grossAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-rose-600">
                    ₹ {s.deductions.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-blue-600 text-sm">
                    ₹ {s.netPayable.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                    <button
                      onClick={() => handleDownloadPdf(s.id)}
                      className="px-2 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg font-semibold text-[11px] border border-brand-200 inline-flex items-center gap-1"
                      title="Download Settlement PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </button>
                    <button
                      onClick={() => handleSendEmail(s.id)}
                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold text-[11px] border border-indigo-200 inline-flex items-center gap-1"
                      title="Email Settlement PDF to Vendor"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Email
                    </button>
                    {s.status === 'CALCULATED' && (
                      <button
                        onClick={() => handleApprove(s.id)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold text-[11px] border border-indigo-200"
                      >
                        Approve
                      </button>
                    )}
                    {s.status === 'APPROVED' && (
                      <button
                        onClick={() => handleOpenPaymentModal(s)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold text-[11px] border border-emerald-200"
                      >
                        Record Payment
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Generator Modal */}
      <Modal isOpen={isGeneratorModalOpen} onClose={() => setIsGeneratorModalOpen(false)} title="Calculate Vendor Settlement">
        <form onSubmit={handleGenerateSettlement} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Vendor Partner *</label>
            <select
              required
              value={formData.vendorId}
              onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            >
              <option value="">Select Vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.companyName})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Period Start *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Period End *</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsGeneratorModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md shadow-brand-600/30"
            >
              Calculate Settlement
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Record Vendor Payment">
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
            <select
              value={paymentData.paymentMethod}
              onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            >
              <option value="BANK_TRANSFER">NEFT / RTGS Bank Transfer</option>
              <option value="UPI">UPI Payment</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Reference / UTR Number *</label>
            <input
              type="text"
              required
              value={paymentData.referenceNumber}
              onChange={(e) => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/30"
            >
              Confirm & Mark Paid
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
