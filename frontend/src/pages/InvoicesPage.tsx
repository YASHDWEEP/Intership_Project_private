import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Plus, Download, FileText, CheckCircle, Send, Calendar, CreditCard, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';

export const InvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

  // Generator Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchInvoices();
    fetchClients();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/invoices');
      setInvoices(res.data);
    } catch (err) {
      console.error('Fetch invoices error:', err);
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

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/invoices/generate', formData);
      setIsModalOpen(false);
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate invoice');
    }
  };

  const handleDownloadPdf = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const res = await api.get(`/invoices/${invoiceId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      a.click();
    } catch (err: any) {
      alert('Failed to download invoice PDF');
    }
  };

  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  const handleSendEmail = async (invoiceId: string, invoiceNumber: string) => {
    setSendingEmailId(invoiceId);
    try {
      const res = await api.post(`/invoices/${invoiceId}/send-email`);
      alert(res.data?.message || `Invoice PDF email sent successfully for ${invoiceNumber}!`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send invoice email');
    } finally {
      setSendingEmailId(null);
    }
  };

  /**
   * Directly launch Razorpay Checkout Popup Modal for Instant Payment
   */
  const handleDirectPayNow = async (inv: any) => {
    setPayingInvoiceId(inv.id);
    try {
      const res = await api.post('/payments/create-order', { invoiceId: inv.id });
      const orderData = res.data;

      if (typeof (window as any).Razorpay === 'undefined') {
        alert('Razorpay Checkout SDK is loading... Please check internet connection.');
        setPayingInvoiceId(null);
        return;
      }

      // Format contact phone
      const cleanPhone = (orderData.clientPhone || '9876543210').replace(/[^0-9]/g, '').slice(-10);

      const options = {
        key: orderData.keyId,
        amount: orderData.amountInPaise,
        currency: orderData.currency || 'INR',
        name: 'CabMitra Operations',
        description: `Tax Invoice Payment #${orderData.invoiceNumber}`,
        order_id: orderData.orderId,
        prefill: {
          name: orderData.clientName || 'Corporate Client',
          email: orderData.clientEmail || 'client@corporate.com',
          contact: cleanPhone,
        },
        notes: {
          invoiceId: orderData.invoiceId,
          invoiceNumber: orderData.invoiceNumber,
        },
        theme: {
          color: '#2563eb',
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await api.post('/payments/verify', {
              invoiceId: orderData.invoiceId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verifyRes.data.success) {
              navigate(
                `/payment/success?invoiceId=${orderData.invoiceId}&paymentId=${response.razorpay_payment_id}&orderId=${response.razorpay_order_id}`
              );
            } else {
              navigate(
                `/payment/failed?invoiceId=${orderData.invoiceId}&reason=${encodeURIComponent(
                  verifyRes.data.error || 'Verification Failed'
                )}`
              );
            }
          } catch (err: any) {
            navigate(
              `/payment/pending?invoiceId=${orderData.invoiceId}&orderId=${response.razorpay_order_id}&paymentId=${response.razorpay_payment_id}`
            );
          } finally {
            setPayingInvoiceId(null);
          }
        },
        modal: {
          ondismiss: function () {
            setPayingInvoiceId(null);
          },
        },
      };

      const razorpayWindow = new (window as any).Razorpay(options);
      razorpayWindow.on('payment.failed', function (response: any) {
        setPayingInvoiceId(null);
        navigate(
          `/payment/failed?invoiceId=${orderData.invoiceId}&reason=${encodeURIComponent(
            response.error.description || 'Payment Failed'
          )}`
        );
      });

      razorpayWindow.open();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to initiate Razorpay order');
      setPayingInvoiceId(null);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Client Billing & GST Invoices</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Automated corporate client tax invoices, 5% GST calculations, downloadable PDF billing statements, and Razorpay online checkout
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-brand-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Client Invoice</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
            <tr>
              <th className="py-3 px-4">Invoice #</th>
              <th className="py-3 px-4">Client Name</th>
              <th className="py-3 px-4">Billing Period</th>
              <th className="py-3 px-4 text-right">Subtotal (₹)</th>
              <th className="py-3 px-4 text-right">GST (5%)</th>
              <th className="py-3 px-4 text-right">Total Amount (₹)</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-400">
                  Loading invoices...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  No invoices generated yet. Click "Generate Client Invoice" above.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const latestPayment = inv.payments && inv.payments[0] ? inv.payments[0] : null;
                const isPayingThis = payingInvoiceId === inv.id;
                return (
                  <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-900 font-mono text-sm">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{inv.client?.name}</td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                      {new Date(inv.billingPeriodStart).toLocaleDateString('en-IN')} -{' '}
                      {new Date(inv.billingPeriodEnd).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-700">
                      ₹ {inv.subtotal.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-purple-600">
                      ₹ {inv.taxAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-600 text-sm">
                      ₹ {inv.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => handleDownloadPdf(inv.id, inv.invoiceNumber)}
                        className="px-2 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg font-semibold text-[11px] border border-brand-200 transition-colors inline-flex items-center gap-1"
                        title="Download PDF Invoice"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </button>

                      <button
                        onClick={() => handleSendEmail(inv.id, inv.invoiceNumber)}
                        disabled={sendingEmailId === inv.id}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold text-[11px] border border-indigo-200 transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                        title="Email PDF Invoice to Client"
                      >
                        {sendingEmailId === inv.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Email</span>
                          </>
                        )}
                      </button>

                      {inv.status === 'PAID' && (
                        <span
                          title={
                            latestPayment
                              ? `Payment ID: ${latestPayment.razorpayPaymentId || latestPayment.referenceNumber || 'Verified'}\nDate: ${new Date(
                                  latestPayment.paidAt || latestPayment.createdAt
                                ).toLocaleString('en-IN')}`
                              : 'Paid via Razorpay'
                          }
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-[11px] border border-emerald-200 inline-flex items-center gap-1 cursor-default"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          PAID
                        </span>
                      )}

                      {inv.status === 'PENDING' && (
                        <button
                          onClick={() => navigate(`/payment/pending?invoiceId=${inv.id}`)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-semibold text-[11px] border border-amber-200 transition-colors inline-flex items-center gap-1"
                        >
                          <Clock className="w-3.5 h-3.5 animate-pulse" />
                          PROCESSING
                        </button>
                      )}

                      {inv.status !== 'PAID' && inv.status !== 'PENDING' && (
                        <button
                          onClick={() => handleDirectPayNow(inv)}
                          disabled={isPayingThis}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-sm shadow-emerald-600/30 transition-all inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          {isPayingThis ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Opening...</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-3.5 h-3.5" />
                              PAY NOW
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Generate Client Tax Invoice">
        <form onSubmit={handleGenerateInvoice} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Corporate Client *</label>
            <select
              required
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            >
              <option value="">Select Client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.gstNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Billing Period Start *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Billing Period End *</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900">
            <p className="font-semibold">Automated Tax Calculation</p>
            <p className="text-[11px] text-blue-700 mt-0.5">
              System will group all un-invoiced validated trips for this client during the billing period and automatically calculate 5% GST (2.5% CGST + 2.5% SGST).
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-md shadow-brand-600/30"
            >
              Generate Invoice
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
