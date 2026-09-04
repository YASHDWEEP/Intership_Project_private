import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Clock, RefreshCw, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import api from '../services/api';

export const PaymentPendingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const invoiceId = searchParams.get('invoiceId');
  const paymentId = searchParams.get('paymentId');
  const orderId = searchParams.get('orderId');

  const [invoice, setInvoice] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (invoiceId) {
      checkPaymentStatus();
    }
  }, [invoiceId]);

  const checkPaymentStatus = async () => {
    if (!invoiceId) return;
    setChecking(true);
    setStatusMessage('Checking latest Razorpay payment status...');
    try {
      // If paymentId & orderId are present in URL, attempt verification call first
      if (orderId && paymentId) {
        try {
          await api.post('/payments/verify', {
            invoiceId,
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
          });
        } catch (e) {
          // ignore error if already updated
        }
      }

      const res = await api.get(`/payments/status/${invoiceId}`);
      setInvoice(res.data);

      if (res.data.invoiceStatus === 'PAID') {
        navigate(`/payment/success?invoiceId=${invoiceId}&paymentId=${paymentId || ''}`);
      } else if (res.data.invoiceStatus === 'FAILED') {
        navigate(`/payment/failed?invoiceId=${invoiceId}&reason=Payment failed or rejected`);
      } else {
        setStatusMessage('Payment is still processing with Razorpay. Please wait a moment or click Check Payment Status.');
      }
    } catch (err: any) {
      setStatusMessage('Unable to confirm status at the moment.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 selection:bg-amber-500 selection:text-white">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 text-center relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl"></div>

        {/* Pending Icon */}
        <div className="w-20 h-20 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
          <Clock className="w-10 h-10 text-amber-400 animate-pulse" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white tracking-tight">Payment Verification Pending</h1>
          <p className="text-xs text-slate-400">
            We are waiting for confirmation from the payment provider.
          </p>
        </div>

        {/* Invoice Info Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-left text-xs space-y-3 font-sans">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-400 font-medium">Invoice Number</span>
            <span className="font-mono font-bold text-white text-sm">{invoice?.invoiceNumber || 'INV-2026-001'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Corporate Client</span>
            <span className="font-semibold text-slate-200">{invoice?.clientName || 'CabMitra Client'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Amount Due</span>
            <span className="font-mono font-extrabold text-amber-400 text-sm">
              ₹ {invoice?.totalAmount ? invoice.totalAmount.toLocaleString('en-IN') : '0'}
            </span>
          </div>

          {paymentId && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Payment Ref</span>
              <span className="font-mono text-slate-300 text-[11px] truncate max-w-[200px]">{paymentId}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-center">
            <p className="text-[11px] font-medium leading-snug">{statusMessage}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            onClick={checkPaymentStatus}
            disabled={checking}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>Check Payment Status</span>
          </button>

          <button
            onClick={() => navigate('/invoices')}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Invoices</span>
          </button>
        </div>
      </div>
    </div>
  );
};
