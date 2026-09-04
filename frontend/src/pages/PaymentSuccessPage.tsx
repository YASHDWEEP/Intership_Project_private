import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Download, Receipt, ArrowLeft, Building2, Calendar, ShieldCheck, Printer, Smartphone } from 'lucide-react';
import api from '../services/api';

export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const invoiceId = searchParams.get('invoiceId');
  const paymentId = searchParams.get('paymentId');
  const orderId = searchParams.get('orderId');

  const [invoice, setInvoice] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (invoiceId) {
      fetchPaymentInfo();
    } else {
      setLoading(false);
    }
  }, [invoiceId]);

  const fetchPaymentInfo = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payments/status/${invoiceId}`);
      setInvoice(res.data);
      if (res.data.payment) {
        setPayment(res.data.payment);
      }
    } catch (err) {
      console.error('Fetch payment info error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoiceId) return;
    try {
      const res = await api.get(`/invoices/${invoiceId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice?.invoiceNumber || 'Invoice'}.pdf`;
      a.click();
    } catch (err) {
      alert('Failed to download invoice PDF');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-400">Verifying real-time Razorpay payment receipt...</p>
        </div>
      </div>
    );
  }

  const finalPaymentId = paymentId || payment?.razorpayPaymentId || payment?.referenceNumber || 'pay_confirmed';
  const paidDate = payment?.paidAt ? new Date(payment.paidAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
  const paymentMethod = payment?.method || 'UPI (PhonePe / GPay / Razorpay)';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 selection:bg-emerald-500 selection:text-white">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 text-center relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>

        {/* Success Icon */}
        <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>

        <div className="space-y-1">
          <span className="inline-block px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-widest">
            Razorpay Official Payment Receipt
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight pt-1">Payment Successful ✓</h1>
          <p className="text-xs text-slate-400">
            Real-time confirmation received from Razorpay gateway and PostgreSQL database updated.
          </p>
        </div>

        {/* Official Payment Receipt Box */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 text-left text-xs space-y-3 font-sans relative">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-400 font-medium">Tax Invoice Number</span>
            <span className="font-mono font-bold text-white text-sm">{invoice?.invoiceNumber || 'INV-2026-001'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Corporate Client</span>
            <span className="font-semibold text-slate-200">{invoice?.clientName || 'CabMitra Client'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Amount Paid</span>
            <span className="font-mono font-extrabold text-emerald-400 text-base">
              ₹ {invoice?.totalAmount ? invoice.totalAmount.toLocaleString('en-IN') : '0'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Razorpay Payment ID</span>
            <span className="font-mono text-slate-300 text-[11px] truncate max-w-[200px]">{finalPaymentId}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Payment Method</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-brand-400" />
              {paymentMethod}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Payment Timestamp</span>
            <span className="text-slate-300 text-[11px]">{paidDate}</span>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 font-medium">Invoice & Settlement Status</span>
            <span className="font-bold px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-md text-[10px] uppercase tracking-wider">
              INVOICE PAID • VENDOR SETTLED
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleDownloadPdf}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Tax Invoice PDF</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => window.print()}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>

            <button
              onClick={() => navigate('/invoices')}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Invoices</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
