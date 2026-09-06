import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, AlertCircle, ShieldAlert, FileText, Ban } from 'lucide-react';
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

  const failureReason = reasonParam || invoice?.payments?.[0]?.failureReason || 'Payment declined or transaction cancelled by user';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 selection:bg-rose-500 selection:text-white font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 text-center relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl"></div>

        {/* Header Badge */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            Official Payment Failure Receipt
          </span>
        </div>

        {/* Failed Icon */}
        <div className="w-20 h-20 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
          <XCircle className="w-10 h-10 text-rose-500" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white tracking-tight">Payment Transaction Failed</h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Razorpay gateway returned failure for this transaction. The payment attempt has been logged and closed.
          </p>
        </div>

        {/* Printable/Official Failure Receipt Card */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-5 text-left text-xs space-y-3 font-sans shadow-inner">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CabMitra Billing System</p>
              <p className="font-extrabold text-white text-sm">TRANSACTION FAILURE RECORD</p>
            </div>
            <span className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded font-mono text-[11px] font-bold uppercase tracking-wider">
              FAILED
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/70">
              <span className="text-slate-400 font-medium">Invoice Number</span>
              <span className="font-mono font-bold text-white text-xs bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
                {invoice?.invoiceNumber || 'INV-2026-0001'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/70">
              <span className="text-slate-400 font-medium">Corporate Client</span>
              <span className="font-bold text-slate-200">{invoice?.client?.name || 'Corporate Client'}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/70">
              <span className="text-slate-400 font-medium">Transaction Amount</span>
              <span className="font-mono font-extrabold text-rose-400 text-base">
                ₹ {invoice?.totalAmount ? Number(invoice.totalAmount).toLocaleString('en-IN') : '0.00'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/70">
              <span className="text-slate-400 font-medium">Failure Timestamp</span>
              <span className="text-slate-300 font-mono text-[11px]">
                {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800 text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-xs text-rose-300">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                Reason for Failure
              </p>
              <p className="text-[11px] text-rose-200 leading-snug font-mono">{failureReason}</p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/80">
            <span className="flex items-center gap-1 text-slate-400 font-semibold">
              <Ban className="w-3 h-3 text-rose-500" />
              Transaction Status: CLOSED (NO REUSE ALLOWED)
            </span>
          </div>
        </div>

        {/* Notice Message */}
        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-center">
          <p className="text-[11px] text-slate-400">
            This transaction attempt has failed and is permanently closed. Reopening or retrying this specific transaction is prohibited.
          </p>
        </div>

        {/* Strict Actions: Only Return to Invoices (NO retry / second chance options) */}
        <div className="pt-1">
          <button
            onClick={() => navigate('/invoices')}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs shadow-lg transition-colors flex items-center justify-center space-x-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <span>Return to Corporate Invoices</span>
          </button>
        </div>
      </div>
    </div>
  );
};
