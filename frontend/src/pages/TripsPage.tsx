import React, { useState, useEffect } from 'react';
import {
  Car,
  Plus,
  Search,
  Download,
  Filter,
  Trash2,
  Edit,
  Calculator,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';

export const TripsPage: React.FC = () => {
  const [trips, setTrips] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Dropdown reference data
  const [clients, setClients] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    tripDate: new Date().toISOString().split('T')[0],
    clientId: '',
    vendorId: '',
    vehicleId: '',
    vehicleNumber: '',
    vehicleType: '4 Seater',
    employeeCount: 1,
    totalKm: '',
    tripCategory: 'PICKUP',
    billCategory: 'REGULAR',
    waitingTime: 0,
    tollAmount: 0,
    parkingAmount: 0,
  });

  // Pricing engine preview breakdown state
  const [previewPricing, setPreviewPricing] = useState<any>(null);
  const [calculatingPreview, setCalculatingPreview] = useState(false);

  useEffect(() => {
    fetchTrips();
    fetchRefData();
  }, [page, search, statusFilter, clientFilter, vendorFilter]);

  useEffect(() => {
    // Auto-calculate pricing preview whenever Client, VehicleType, or TotalKM changes in form!
    if (formData.clientId && formData.vehicleType && formData.totalKm && parseFloat(formData.totalKm) > 0) {
      calculateLivePricingPreview();
    } else {
      setPreviewPricing(null);
    }
  }, [formData.clientId, formData.vehicleType, formData.totalKm, formData.waitingTime, formData.tollAmount, formData.parkingAmount]);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '15',
        search,
        status: statusFilter,
        clientId: clientFilter,
        vendorId: vendorFilter,
      });
      const res = await api.get(`/trips?${queryParams}`);
      setTrips(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      console.error('Fetch trips error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRefData = async () => {
    try {
      const [cRes, vRes, vehRes] = await Promise.all([
        api.get('/clients'),
        api.get('/vendors'),
        api.get('/vehicles'),
      ]);
      setClients(cRes.data);
      setVendors(vRes.data);
      setVehicles(vehRes.data);
    } catch (err) {
      console.error('Fetch ref data error:', err);
    }
  };

  const calculateLivePricingPreview = async () => {
    setCalculatingPreview(true);
    try {
      const res = await api.post('/pricing-rules/calculate-preview', {
        clientId: formData.clientId,
        vehicleType: formData.vehicleType,
        totalKm: parseFloat(formData.totalKm),
        vendorId: formData.vendorId,
        waitingTime: parseFloat(String(formData.waitingTime || 0)),
        tollAmount: parseFloat(String(formData.tollAmount || 0)),
        parkingAmount: parseFloat(String(formData.parkingAmount || 0)),
      });
      setPreviewPricing(res.data);
    } catch (err) {
      console.error('Pricing preview error:', err);
    } finally {
      setCalculatingPreview(false);
    }
  };

  const handleVehicleChange = (vehId: string) => {
    const selectedVeh = vehicles.find((v) => v.id === vehId);
    if (selectedVeh) {
      setFormData((prev) => ({
        ...prev,
        vehicleId: selectedVeh.id,
        vehicleNumber: selectedVeh.vehicleNumber,
        vehicleType: selectedVeh.vehicleType,
        vendorId: selectedVeh.vendorId,
      }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/trips', formData);
      setIsModalOpen(false);
      fetchTrips();
      // Reset form
      setFormData({
        tripDate: new Date().toISOString().split('T')[0],
        clientId: '',
        vendorId: '',
        vehicleId: '',
        vehicleNumber: '',
        vehicleType: '4 Seater',
        employeeCount: 1,
        totalKm: '',
        tripCategory: 'PICKUP',
        billCategory: 'REGULAR',
        waitingTime: 0,
        tollAmount: 0,
        parkingAmount: 0,
      });
      setPreviewPricing(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save trip');
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trip record?')) return;
    try {
      await api.delete(`/trips/${id}`);
      fetchTrips();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete trip');
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Standardized Trip Log</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Normalized trip entries, client pricing rates, vendor cost payouts & margins
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-brand-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Trip Entry</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vehicle no, slab..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
        >
          <option value="">All Vendors</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
        >
          <option value="">All Statuses</option>
          <option value="VALIDATED">VALIDATED</option>
          <option value="PROCESSED">PROCESSED</option>
          <option value="INVOICED">INVOICED</option>
          <option value="SETTLED">SETTLED</option>
        </select>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Trip Date</th>
                <th className="py-3 px-4">Client Account</th>
                <th className="py-3 px-4">Vendor Partner</th>
                <th className="py-3 px-4">Vehicle / Type</th>
                <th className="py-3 px-4">Distance / Slab</th>
                <th className="py-3 px-4 text-right">Revenue (₹)</th>
                <th className="py-3 px-4 text-right">Vendor Cost (₹)</th>
                <th className="py-3 px-4 text-right">Margin (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-400">
                    Loading trips...
                  </td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    No trips found matching the selected filters.
                  </td>
                </tr>
              ) : (
                trips.map((t) => {
                  const margin = t.tripRevenue - t.vendorCost;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-gray-900 whitespace-nowrap">
                        {new Date(t.tripDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-gray-800 font-medium">{t.client?.name}</td>
                      <td className="py-3 px-4 text-gray-600">{t.vendor?.name}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900">{t.vehicleNumber}</span>
                        <span className="block text-[10px] text-gray-500">{t.vehicleType}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-gray-900">{t.totalKm} KM</span>
                        <span className="block text-[10px] text-blue-600 font-medium">{t.kmSlab}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                        ₹ {t.tripRevenue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-600 whitespace-nowrap">
                        ₹ {t.vendorCost.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-blue-600 whitespace-nowrap">
                        ₹ {margin.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => handleDeleteTrip(t.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                          title="Delete trip"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>
            Page <strong>{meta.page || 1}</strong> of <strong>{meta.totalPages || 1}</strong> ({meta.total || 0} total trips)
          </span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 rounded border border-gray-200 bg-white disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= (meta.totalPages || 1)}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 rounded border border-gray-200 bg-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Manual Trip Entry Modal Form */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Manual Trip Entry" maxWidth="2xl">
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Trip Date *</label>
              <input
                type="date"
                required
                value={formData.tripDate}
                onChange={(e) => setFormData({ ...formData, tripDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Client Account *</label>
              <select
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              >
                <option value="">Select Client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Select Registered Vehicle</label>
              <select
                value={formData.vehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              >
                <option value="">Select from Fleet (Optional)</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicleNumber} ({v.vehicleType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vehicle Registration Number *</label>
              <input
                type="text"
                required
                placeholder="KA-01-MJ-1024"
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vehicle Type *</label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              >
                <option value="4 Seater">4 Seater</option>
                <option value="6 Seater">6 Seater</option>
                <option value="EV">EV (Electric)</option>
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
              </select>
            </div>

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
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Total Distance (KM) *</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="e.g. 24.5"
                value={formData.totalKm}
                onChange={(e) => setFormData({ ...formData, totalKm: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Waiting Time (Hrs)</label>
              <input
                type="number"
                step="0.5"
                value={formData.waitingTime}
                onChange={(e) => setFormData({ ...formData, waitingTime: parseFloat(e.target.value || '0') })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Toll Amount (₹)</label>
              <input
                type="number"
                value={formData.tollAmount}
                onChange={(e) => setFormData({ ...formData, tollAmount: parseFloat(e.target.value || '0') })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Parking (₹)</label>
              <input
                type="number"
                value={formData.parkingAmount}
                onChange={(e) => setFormData({ ...formData, parkingAmount: parseFloat(e.target.value || '0') })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Pricing Engine Real-time Calculation Breakdown Card */}
          {previewPricing && (
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 border border-slate-800 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-brand-400">
                <span className="flex items-center gap-1.5">
                  <Calculator className="w-4 h-4" />
                  Automated Backend Pricing Engine Calculation
                </span>
                <span className="px-2 py-0.5 bg-brand-500/20 text-brand-300 rounded border border-brand-500/30">
                  Slab: {previewPricing.kmSlab}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center text-xs">
                <div className="bg-slate-950 p-2 rounded">
                  <span className="block text-[10px] text-slate-400">Trip Revenue</span>
                  <span className="font-extrabold text-emerald-400 text-base">₹ {previewPricing.tripRevenue}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded">
                  <span className="block text-[10px] text-slate-400">Vendor Cost</span>
                  <span className="font-extrabold text-amber-400 text-base">₹ {previewPricing.vendorCost}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded">
                  <span className="block text-[10px] text-slate-400">Operating Margin</span>
                  <span className="font-extrabold text-blue-400 text-base">₹ {previewPricing.margin}</span>
                </div>
              </div>
            </div>
          )}

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
              Save Standardized Trip
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
