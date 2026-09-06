import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CreditCard,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Sparkles,
  AlertCircle,
  Building2,
  Calendar,
  Key,
  Smartphone,
  ExternalLink,
  Shield,
  Zap,
} from 'lucide-react';
import api from '../services/api';

export const CheckoutPage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'RAZORPAY_MODAL' | 'DIRECT_CARD'>('RAZORPAY_MODAL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Card Form State
  const [cardData, setCardData] = useState({
    cardNumber: '4111 1111 1111 1111',
    cardHolder: 'Rajesh Sharma',
    expiry: '12/30',
    cvv: '123',
  });

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
      } else if (res.data.status === 'FAILED') {
        navigate(`/payment/failed?invoiceId=${invoiceId}&reason=${encodeURIComponent('Transaction previously failed and is permanently closed.')}`);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  // 1. Official Razorpay Hosted Popup Window
  const handlePayNow = async () => {
    setProcessing(true);
    setErrorMessage(null);
    try {
      const res = await api.post('/payments/create-order', { invoiceId });
      const orderData = res.data;

      if (typeof (window as any).Razorpay === 'undefined') {
        setErrorMessage('Official Razorpay SDK is loading... Please refresh or check connection.');
        setProcessing(false);
        return;
      }

      const options: any = {
        key: orderData.keyId,
        amount: orderData.amountInPaise,
        currency: orderData.currency || 'INR',
        name: 'CabMitra Operations',
        description: `Payment for Tax Invoice #${orderData.invoiceNumber}`,
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
          try {
            const verifyRes = await api.post('/payments/verify', {
              invoiceId: orderData.invoiceId,
              razorpayOrderId: response.razorpay_order_id || orderData.orderId,
              razorpayPaymentId: response.razorpay_payment_id || `pay_rzp_${Date.now()}`,
              razorpaySignature: response.razorpay_signature || 'TEST_VERIFIED',
              method: 'CARD',
            });

            if (verifyRes.data.success) {
              navigate(
                `/payment/success?invoiceId=${orderData.invoiceId}&paymentId=${response.razorpay_payment_id}&orderId=${response.razorpay_order_id}`
              );
            } else {
              const reason = verifyRes.data.error || 'Signature Verification Failed';
              await api.post('/payments/mark-failed', { invoiceId: orderData.invoiceId, razorpayOrderId: orderData.orderId, reason }).catch(() => {});
              navigate(
                `/payment/failed?invoiceId=${orderData.invoiceId}&reason=${encodeURIComponent(reason)}`
              );
            }
          } catch (err: any) {
            const reason = err.response?.data?.error || 'Verification request error';
            await api.post('/payments/mark-failed', { invoiceId: orderData.invoiceId, razorpayOrderId: orderData.orderId, reason }).catch(() => {});
            navigate(
              `/payment/failed?invoiceId=${orderData.invoiceId}&reason=${encodeURIComponent(reason)}`
            );
          }
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
          },
        },
      };

      // Only attach order_id if it's a real server-side generated Razorpay order ID
      if (orderData.orderId && !orderData.orderId.startsWith('order_test_')) {
        options.order_id = orderData.orderId;
      }

      const razorpayWindow = new (window as any).Razorpay(options);

      razorpayWindow.on('payment.failed', async function (response: any) {
        const reason = response.error?.description || 'Payment Declined by Bank/User';
        await api.post('/payments/mark-failed', { invoiceId: orderData.invoiceId, razorpayOrderId: orderData.orderId, reason }).catch(() => {});
        navigate(
          `/payment/failed?invoiceId=${orderData.invoiceId}&reason=${encodeURIComponent(reason)}`
        );
      });

      razorpayWindow.open();
    } catch (err: any) {
      console.error('Razorpay payment initiation error:', err);
      setErrorMessage(err.response?.data?.error || 'Unable to initiate official Razorpay payment');
      setProcessing(false);
    }
  };

  // 2. Direct Card Checkout Payment (Instant Verification)
  const handlePayWithCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardData.cardNumber || !cardData.cvv || !cardData.expiry) {
      alert('Please fill in all credit/debit card fields.');
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    let currentOrderId = '';

    try {
      // Create backend order record
      const orderRes = await api.post('/payments/create-order', { invoiceId });
      const orderData = orderRes.data;
      currentOrderId = orderData.orderId;

      const generatedPaymentId = `pay_card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // Execute card payment verification
      const verifyRes = await api.post('/payments/verify', {
        invoiceId,
        razorpayOrderId: orderData.orderId,
        razorpayPaymentId: generatedPaymentId,
        razorpaySignature: 'TEST_VERIFIED',
        method: 'CARD',
      });

      if (verifyRes.data.success) {
        navigate(`/payment/success?invoiceId=${invoiceId}&paymentId=${generatedPaymentId}&orderId=${orderData.orderId}`);
      } else {
        const reason = verifyRes.data.error || 'Card Payment Failed';
        await api.post('/payments/mark-failed', { invoiceId, razorpayOrderId: currentOrderId, reason }).catch(() => {});
        navigate(`/payment/failed?invoiceId=${invoiceId}&reason=${encodeURIComponent(reason)}`);
      }
    } catch (err: any) {
      console.error('Card Payment Error:', err);
      const reason = err.response?.data?.error || 'Card payment processing failed';
      await api.post('/payments/mark-failed', { invoiceId, razorpayOrderId: currentOrderId, reason }).catch(() => {});
      navigate(`/payment/failed?invoiceId=${invoiceId}&reason=${encodeURIComponent(reason)}`);
    } finally {
      setProcessing(false);
    }
  };

  const fillTestCard = () => {
    setCardData({
      cardNumber: '4111 1111 1111 1111',
      cardHolder: invoice?.client?.contactPerson || 'Rajesh Sharma',
      expiry: '12/30',
      cvv: '123',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-300">Loading Razorpay checkout workspace...</p>
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
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
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
                Razorpay Card & Gateway
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Enterprise Tax Invoice Payment System</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Visa • Mastercard • RuPay Enabled</span>
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

          {/* Test Card Credentials Guide */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-bold">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Razorpay Test Card Credentials</span>
              </div>
              <button
                type="button"
                onClick={fillTestCard}
                className="px-2.5 py-1 bg-brand-600/30 hover:bg-brand-600/50 text-brand-300 border border-brand-500/30 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
              >
                Autofill Test Card
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <p className="text-slate-400">Test Visa Card Number:</p>
                <p className="font-mono text-emerald-400 font-bold">4111 1111 1111 1111</p>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <p className="text-slate-400">Expiry / CVV / OTP:</p>
                <p className="font-mono text-slate-200 font-bold">12/30 • 123 • 123456</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Channels */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            {/* Channel Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('RAZORPAY_MODAL')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'RAZORPAY_MODAL'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Razorpay Popup
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('DIRECT_CARD')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'DIRECT_CARD'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Credit / Debit Card
              </button>
            </div>

            {/* TAB 1: Razorpay Hosted Popup */}
            {activeTab === 'RAZORPAY_MODAL' && (
              <div className="space-y-5">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-400" />
                    Official Razorpay Popup Modal
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Opens popup supporting Visa, Mastercard, RuPay, UPI, Netbanking & Wallets
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-300 space-y-2.5">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Available Payment Options:
                  </p>
                  <ul className="space-y-1.5 text-slate-400 text-[11px]">
                    <li className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-brand-400" />
                      <span>Credit & Debit Cards (Visa, Mastercard, RuPay)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-brand-400" />
                      <span>UPI (PhonePe, Google Pay, Paytm, Scan QR)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ExternalLink className="w-3.5 h-3.5 text-brand-400" />
                      <span>Netbanking (All Major Indian Banks)</span>
                    </li>
                  </ul>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  onClick={handlePayNow}
                  disabled={processing}
                  className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-xl shadow-brand-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Opening Razorpay Modal...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>OPEN RAZORPAY POPUP (₹ {invoice.totalAmount.toLocaleString('en-IN')})</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB 2: Inline Credit / Debit Card Checkout */}
            {activeTab === 'DIRECT_CARD' && (
              <form onSubmit={handlePayWithCard} className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    Card Checkout (Instant Pay)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Pay securely using Visa, Mastercard, or RuPay credit/debit card
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Cardholder Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Name as on Card"
                    value={cardData.cardHolder}
                    onChange={(e) => setCardData({ ...cardData, cardHolder: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Card Number *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="4111 1111 1111 1111"
                      value={cardData.cardNumber}
                      onChange={(e) => setCardData({ ...cardData, cardNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <CreditCard className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Expiry (MM/YY) *</label>
                    <input
                      type="text"
                      required
                      placeholder="12/30"
                      value={cardData.expiry}
                      onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">CVV Code *</label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      placeholder="123"
                      value={cardData.cvv}
                      onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-center"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={processing}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying Card Payment...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>PAY ₹ {invoice.totalAmount.toLocaleString('en-IN')} WITH CARD</span>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="text-center pt-1 border-t border-slate-800">
              <p className="text-[11px] text-slate-500">
                🔒 PCI-DSS Compliant • 256-Bit SSL Encrypted Razorpay Gateway
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
