import React, { useState, useEffect } from 'react';
import {
  Car,
  TrendingUp,
  IndianRupee,
  Calendar,
  AlertCircle,
  Receipt,
  Landmark,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import api from '../services/api';
import { MetricCard } from '../components/MetricCard';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const Dashboard: React.FC = () => {
  const [range, setRange] = useState('THIS_MONTH');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [range]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/analytics/dashboard?range=${range}`);
      setData(res.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 bg-gray-200 rounded-md w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const { kpis, charts } = data;

  return (
    <div className="p-8 space-y-8">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time cab operations, billing revenue, vendor cost & Razorpay payment collection analytics
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
          {[
            { label: 'Today', value: 'TODAY' },
            { label: 'This Week', value: 'THIS_WEEK' },
            { label: 'This Month', value: 'THIS_MONTH' },
            { label: 'Last Month', value: 'LAST_MONTH' },
            { label: 'All Time', value: 'ALL' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setRange(item.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                range === item.value
                  ? 'bg-white text-gray-900 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {kpis.totalTrips === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <div>
            <span className="font-semibold">No trips found for the selected time filter ({range.replace('_', ' ')}).</span>{' '}
            Your historical trips are dated in July & August 2026. Click{' '}
            <button
              onClick={() => setRange('ALL')}
              className="font-bold underline hover:text-amber-900 mx-1"
            >
              All Time
            </button>{' '}
            or{' '}
            <button
              onClick={() => setRange('LAST_MONTH')}
              className="font-bold underline hover:text-amber-900 mx-1"
            >
              Last Month
            </button>{' '}
            to view all trip revenue and operations statistics.
          </div>
        </div>
      )}

      {/* Top KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Total Operations Trips"
          value={kpis.totalTrips.toLocaleString()}
          subtitle={`${kpis.totalKm.toLocaleString()} total distance run`}
          icon={Car}
          color="indigo"
        />

        <MetricCard
          title="Gross Billing Revenue"
          value={`₹ ${kpis.totalRevenue.toLocaleString('en-IN')}`}
          subtitle="Total Client Invoiced Revenue"
          icon={IndianRupee}
          color="emerald"
        />

        <MetricCard
          title="Vendor Payables Cost"
          value={`₹ ${kpis.vendorCost.toLocaleString('en-IN')}`}
          subtitle="Gross Vendor Expenses"
          icon={Landmark}
          color="amber"
        />

        <MetricCard
          title="Gross Operating Margin"
          value={`₹ ${kpis.grossMargin.toLocaleString('en-IN')}`}
          subtitle={`Platform Profit Margin (${kpis.marginPercentage}%)`}
          icon={TrendingUp}
          trend={`${kpis.marginPercentage}%`}
          trendPositive={kpis.marginPercentage > 0}
          color="blue"
        />
      </div>

      {/* Razorpay Payments KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-medium text-gray-500">Paid Invoices</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{kpis.paidInvoices || 0}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Verified & captured online</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-medium text-gray-500">Pending Invoices</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{kpis.pendingInvoices || 0}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Awaiting client payment</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-medium text-gray-500">Failed Payments</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{kpis.failedPayments || 0}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Declined or cancelled</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-medium text-gray-500">Today's Collections</p>
            <p className="text-xl font-extrabold text-gray-900 mt-1">₹ {(kpis.todayPayments || 0).toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              This Month: ₹ {(kpis.monthPayments || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-3 bg-brand-50 rounded-xl text-brand-600">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Payment Collection Trend & Revenue Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Collection Trend Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Payment Collection Trend</h3>
              <p className="text-xs text-gray-500">Real-time captured Razorpay payment volume from PostgreSQL</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.paymentCollectionTrend || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPayment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(val: any) => [`₹ ${Number(val).toLocaleString('en-IN')}`, 'Collections']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="amount" name="Collected Amount (₹)" stroke="#10b981" fillOpacity={1} fill="url(#colorPayment)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue vs Vendor Cost Trend Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Revenue vs Vendor Cost Trend</h3>
              <p className="text-xs text-gray-500">Monthly breakdown of billing revenue and payout costs</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.revenueTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(val: any) => [`₹ ${Number(val).toLocaleString('en-IN')}`, '']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="revenue" name="Client Revenue (₹)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="Vendor Cost (₹)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Vehicle & Vendor Performance Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Client-wise Revenue Share */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
          <h3 className="text-base font-bold text-gray-900 mb-1">Client Revenue Share</h3>
          <p className="text-xs text-gray-500 mb-4">Revenue breakdown per corporate client</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.clientRevenue} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                <Tooltip
                  formatter={(val: any) => [`₹ ${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performing Vendors List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
          <h3 className="text-base font-bold text-gray-900 mb-1">Top Vendor Fleet Performance</h3>
          <p className="text-xs text-gray-500 mb-5">Completed trips and vendor earnings summary</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-4">Vendor Partner</th>
                  <th className="py-2.5 px-4">Completed Trips</th>
                  <th className="py-2.5 px-4">Gross Earnings</th>
                  <th className="py-2.5 px-4 text-right">Avg Earnings / Trip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {charts.vendorPerformance.slice(0, 5).map((v: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-gray-900">{v.name}</td>
                    <td className="py-3 px-4 text-gray-700 font-medium">{v.trips} trips</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">
                      ₹ {v.earnings.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-700">
                      ₹ {v.trips > 0 ? Math.round(v.earnings / v.trips).toLocaleString('en-IN') : 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
