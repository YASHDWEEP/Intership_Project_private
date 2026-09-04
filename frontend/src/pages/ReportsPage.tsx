import React, { useState } from 'react';
import { BarChart3, Download, FileText, Calendar, Filter } from 'lucide-react';
import api from '../services/api';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState('trips');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);

  const handleFetchReport = async () => {
    setLoading(true);
    try {
      const endpoint = reportType === 'pnl' ? '/reports/profit-loss' : '/reports/trips';
      const res = await api.get(`${endpoint}?startDate=${startDate}&endDate=${endDate}`);
      setReportData(res.data);
    } catch (err) {
      console.error('Fetch report error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      const endpoint = reportType === 'pnl' ? '/reports/profit-loss' : '/reports/trips';
      const fileName = reportType === 'pnl' ? 'Profit_Loss_Report.csv' : 'Trips_Report.csv';
      const res = await api.get(`${endpoint}?startDate=${startDate}&endDate=${endDate}&format=csv`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download CSV report. Please try again.');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Financial & Operational Reports</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Generate detailed trip statements, corporate client revenue, vendor payouts & P&L reports with CSV export
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-emerald-600/30 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-3.5 py-2 text-xs font-semibold bg-gray-50 border border-gray-300 rounded-xl text-gray-800"
          >
            <option value="trips">Standard Trip Operations Log Report</option>
            <option value="pnl">Profit & Loss (P&L) Financial Statement</option>
          </select>

          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg text-gray-800"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg text-gray-800"
            />
          </div>
        </div>

        <button
          onClick={handleFetchReport}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs shadow-xs"
        >
          Generate Report Preview
        </button>
      </div>

      {/* Report Data Preview Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        {reportType === 'pnl' ? (
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Client Corporate Account</th>
                <th className="py-3 px-4 text-center">Total Trips</th>
                <th className="py-3 px-4 text-right">Gross Client Revenue (₹)</th>
                <th className="py-3 px-4 text-right">Vendor Payout Cost (₹)</th>
                <th className="py-3 px-4 text-right">Net Operating Profit (₹)</th>
                <th className="py-3 px-4 text-right">Profit Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reportData.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="py-3.5 px-4 font-bold text-gray-900">{row.clientName}</td>
                  <td className="py-3.5 px-4 text-center font-semibold text-gray-700">{row.totalTrips}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                    ₹ {row.grossRevenue?.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-amber-600">
                    ₹ {row.totalVendorCost?.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-blue-600 text-sm">
                    ₹ {row.netProfit?.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-indigo-600">{row.marginPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">KM Run</th>
                <th className="py-3 px-4 text-right">Revenue (₹)</th>
                <th className="py-3 px-4 text-right">Cost (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reportData.slice(0, 25).map((t, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-semibold text-gray-900">
                    {new Date(t.tripDate).toLocaleDateString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-gray-800">{t.client?.name}</td>
                  <td className="py-3 px-4 text-gray-600">{t.vendor?.name}</td>
                  <td className="py-3 px-4 font-mono font-bold text-gray-800">{t.vehicleNumber}</td>
                  <td className="py-3 px-4 font-semibold text-gray-800">{t.totalKm} KM</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600">₹ {t.tripRevenue}</td>
                  <td className="py-3 px-4 text-right font-bold text-amber-600">₹ {t.vendorCost}</td>
                  <td className="py-3 px-4 text-center font-bold text-blue-600">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
