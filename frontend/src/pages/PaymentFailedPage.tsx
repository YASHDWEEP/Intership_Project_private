import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle, RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react';
import api from '../services/api';

export const PaymentFailedPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const invoiceId = searchParams.get('invoiceId');
  const reasonParam = searchParams.get('reason');

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    } else {
      setLoading(false);
    }
  }, [invoiceId]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/invoices/${invoiceId}`);
      setInvoice(res.data);
    } catch (err) {
      console.error('Fetch invoice error:', err);
    } finally {
      setLoading(false);
    }
  };

  const failureReason = reasonParam || 'Payment could not be authorized or was cancelled by user';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 selection:bg-rose-500 selection:text-white">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 text-center relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl"></div>

        {/* Failed Icon */}
        <div className="w-20 h-20 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
          <XCircle className="w-10 h-10 text-rose-500" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white tracking-tight">Payment Failed</h1>
          <p className="text-xs text-slate-400">
            We were unable to process your payment for this corporate invoice.
          </p>
        </div>

        {/* Details Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-left text-xs space-y-3 font-sans">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-400 font-medium">Invoice Number</span>
            <span className="font-mono font-bold text-white text-sm">{invoice?.invoiceNumber || 'INV-2026-001'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Client</span>
            <span className="font-semibold text-slate-200">{invoice?.client?.name || 'CabMitra Client'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Amount</span>
            <span className="font-mono font-extrabold text-slate-200 text-sm">
              ₹ {invoice?.totalAmount ? invoice.totalAmount.toLocaleString('en-IN') : '0'}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-xs">
              <AlertCircle className="w-3.5 h-3.5" />
              Reason for Failure
            </p>
            <p className="text-[11px] text-rose-300 leading-snug">{failureReason}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          {invoiceId && (
            <button
              onClick={() => navigate(`/payment/checkout/${invoiceId}`)}
              className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Payment Again</span>
            </button>
          )}

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
