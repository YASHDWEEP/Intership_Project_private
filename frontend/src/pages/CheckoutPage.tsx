import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Sparkles,
  AlertCircle,
  Building2,
  Calendar,
  Receipt,
  Smartphone,
  ExternalLink,
  Key,
} from 'lucide-react';
import api from '../services/api';

export const CheckoutPage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'RAZORPAY_MODAL' | 'UPI_QR'>('RAZORPAY_MODAL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>('');

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceDetails();
    }
  }, [invoiceId]);

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/invoices/${invoiceId}`);
      setInvoice(res.data);
      if (res.data.status === 'PAID') {
        navigate(`/payment/success?invoiceId=${invoiceId}`);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    setProcessing(true);
    setErrorMessage(null);
    try {
      // 1. Create order on backend via Razorpay API
      const res = await api.post('/payments/create-order', { invoiceId });
      const orderData = res.data;
      setRazorpayKeyId(orderData.keyId);

      // Check if official Razorpay script is loaded
      if (typeof (window as any).Razorpay === 'undefined') {
        setErrorMessage('Official Razorpay Checkout SDK is loading... Please refresh or check connection.');
        setProcessing(false);
        return;
      }

      // 2. Configure Official Razorpay Hosted Modal Popup Options
      const options = {
        key: orderData.keyId,
        amount: orderData.amountInPaise,
        currency: orderData.currency || 'INR',
        name: 'CabMitra Operations',
        description: `Payment for Tax Invoice #${orderData.invoiceNumber}`,
        order_id: orderData.orderId,
        prefill: {
          name: orderData.clientName || 'Corporate Client',
          email: orderData.clientEmail || 'client@corporate.com',
          contact: orderData.clientPhone || '9876543210',
        },
        notes: {
          invoiceId: orderData.invoiceId,
          invoiceNumber: orderData.invoiceNumber,
          platform: 'CabMitra Enterprise ERP',
        },
        theme: {
          color: '#2563eb',
          backdrop_color: '#0f172a',
        },
        handler: async function (response: any) {
          // Verify server-side HMAC signature
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
                  verifyRes.data.error || 'Signature Verification Failed'
                )}`
              );
            }
          } catch (err: any) {
            navigate(
              `/payment/pending?invoiceId=${orderData.invoiceId}&orderId=${response.razorpay_order_id}&paymentId=${response.razorpay_payment_id}`
            );
          }
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
          },
        },
      };

      // Instantiate official Razorpay modal popup window
      const razorpayWindow = new (window as any).Razorpay(options);

      razorpayWindow.on('payment.failed', function (response: any) {
        navigate(
          `/payment/failed?invoiceId=${orderData.invoiceId}&reason=${encodeURIComponent(
            response.error.description || 'Payment Declined by Bank/User'
          )}`
        );
      });

      razorpayWindow.open();
    } catch (err: any) {
      console.error('Razorpay payment initiation error:', err);
      setErrorMessage(err.response?.data?.error || 'Unable to initiate official Razorpay payment');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-300">Loading official Razorpay checkout...</p>
        </div>
      </div>
    );
  }

  if (errorMessage && !invoice) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold">Checkout Unavailable</h2>
          <p className="text-sm text-slate-400">{errorMessage}</p>
          <button
            onClick={() => navigate('/invoices')}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold"
          >
            Return to Invoices
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Top Header Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white font-bold text-base shadow-md shadow-brand-600/30">
            C
          </div>
          <div>
            <h1 className="font-bold text-white tracking-wide text-sm flex items-center gap-1.5">
              CabMitra
              <span className="text-[10px] bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded font-semibold border border-brand-500/30">
                Official Razorpay Modal
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Enterprise Tax Invoice Billing Gateway</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Authentic Razorpay Hosted Popup</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Invoice Summary */}
        <div className="md:col-span-7 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <p className="text-xs font-semibold text-brand-400 uppercase tracking-widest">Tax Invoice Statement</p>
                <h2 className="text-2xl font-black text-white font-mono mt-1">{invoice.invoiceNumber}</h2>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
                  {invoice.status}
                </span>
              </div>
            </div>

            {/* Client & Billing Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                <p className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Corporate Client
                </p>
                <p className="font-bold text-white text-sm truncate">{invoice.client?.name}</p>
                <p className="text-slate-400 text-[11px] font-mono">GSTIN: {invoice.client?.gstNumber}</p>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                <p className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Billing Period
                </p>
                <p className="font-semibold text-slate-200">
                  {new Date(invoice.billingPeriodStart).toLocaleDateString('en-IN')} -{' '}
                  {new Date(invoice.billingPeriodEnd).toLocaleDateString('en-IN')}
                </p>
                <p className="text-slate-400 text-[11px]">Due Date: {new Date(invoice.dueDate).toLocaleDateString('en-IN')}</p>
              </div>
            </div>

            {/* Breakdown List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Trips Billing Subtotal</span>
                <span className="font-mono text-slate-200">₹ {invoice.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>GST (5% CGST + SGST)</span>
                <span className="font-mono text-purple-400">₹ {invoice.taxAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-white">Total Amount Payable</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  ₹ {invoice.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Configuration Hint Banner */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-200 font-bold">
              <Key className="w-4 h-4 text-amber-400" />
              <span>Razorpay Credentials Info</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              The payment flow connects to Razorpay using credentials configured in <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-300">backend/.env</code>. To use live or test credentials from your Razorpay Dashboard, update <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-300">RAZORPAY_KEY_ID</code> and <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-300">RAZORPAY_KEY_SECRET</code>.
            </p>
          </div>
        </div>

        {/* Right Column: Launch Official Razorpay Hosted Popup */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-600/10 rounded-full blur-2xl"></div>

            <div className="border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-brand-400" />
                  Razorpay Hosted Checkout
                </h3>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[10px] font-bold">
                  Official Popup
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Launches official Razorpay Modal featuring UPI (PhonePe, GPay, Paytm), Cards, Netbanking & Wallets
              </p>
            </div>

            {/* Feature List */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 text-xs text-slate-300 space-y-3">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Enabled Payment Channels:
              </p>
              <ul className="space-y-2 text-slate-400">
                <li className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-brand-400" />
                  <span>PhonePe, Google Pay, Paytm, BHIM UPI & Scan QR</span>
                </li>
                <li className="flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-brand-400" />
                  <span>Visa, Mastercard, RuPay Corporate Cards</span>
                </li>
                <li className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-brand-400" />
                  <span>Net Banking (SBI, HDFC, ICICI, Axis, Kotak & 50+ Banks)</span>
                </li>
              </ul>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Launch Razorpay Button */}
            <button
              onClick={handlePayNow}
              disabled={processing}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2.5 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Opening Razorpay Modal Popup...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>OPEN RAZORPAY POPUP (₹ {invoice.totalAmount.toLocaleString('en-IN')})</span>
                </>
              )}
            </button>

            <div className="text-center">
              <p className="text-[11px] text-slate-500">
                🔒 PCI-DSS Compliant • 256-Bit SSL Encrypted Payment Gateway
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
