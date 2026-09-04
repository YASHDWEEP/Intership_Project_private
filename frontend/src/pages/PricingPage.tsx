import React, { useState, useEffect } from 'react';
import { IndianRupee, Plus, Layers } from 'lucide-react';
import api from '../services/api';
import { Modal } from '../components/Modal';

export const PricingPage: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    clientId: '',
    vehicleType: '4 Seater',
    ruleName: 'Standard Tariff Plan',
    pricingType: 'KM_SLAB',
    slabs: [
      { minKm: 0, maxKm: 15, rate: 500, vendorRate: 400 },
      { minKm: 16, maxKm: 25, rate: 700, vendorRate: 560 },
      { minKm: 26, maxKm: 40, rate: 900, vendorRate: 720 },
      { minKm: 41, maxKm: 100, rate: 1400, vendorRate: 1120 },
    ],
  });

  useEffect(() => {
    fetchRules();
    fetchClients();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/pricing-rules');
      setRules(res.data);
    } catch (err) {
      console.error('Fetch pricing rules error:', err);
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

  const handleSlabChange = (index: number, field: string, value: any) => {
    const updatedSlabs = [...formData.slabs];
    updatedSlabs[index] = { ...updatedSlabs[index], [field]: parseFloat(value || '0') };
    setFormData({ ...formData, slabs: updatedSlabs });
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/pricing-rules', formData);
      setIsModalOpen(false);
      fetchRules();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create pricing rule');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tariff & Pricing Engine Rules</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure client-specific KM slab pricing rules, vendor rate cards, and billing tiers
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-brand-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Tariff Plan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rules.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">{r.ruleName}</h3>
                <p className="text-xs text-brand-600 font-semibold">{r.client?.name}</p>
              </div>
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200">
                {r.vehicleType}
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">KM Slab Tariff Breakdown</span>
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-2 px-3">KM Distance Range</th>
                      <th className="py-2 px-3 text-right">Client Rate (₹)</th>
                      <th className="py-2 px-3 text-right">Vendor Rate (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {r.slabs?.map((s: any) => (
                      <tr key={s.id}>
                        <td className="py-2 px-3 font-semibold text-gray-800">
                          {s.minKm} - {s.maxKm} KM
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600">₹ {s.rate}</td>
                        <td className="py-2 px-3 text-right font-bold text-amber-600">₹ {s.vendorRate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Configure New Tariff Rule & Slabs">
        <form onSubmit={handleCreateRule} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

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
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tariff Plan Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Standard Corporate Tariff 2026"
              value={formData.ruleName}
              onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-gray-700">KM Slabs Rates</span>
            {formData.slabs.map((slab, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                <input
                  type="number"
                  placeholder="Min KM"
                  value={slab.minKm}
                  onChange={(e) => handleSlabChange(i, 'minKm', e.target.value)}
                  className="px-2 py-1 border rounded text-xs"
                />
                <input
                  type="number"
                  placeholder="Max KM"
                  value={slab.maxKm}
                  onChange={(e) => handleSlabChange(i, 'maxKm', e.target.value)}
                  className="px-2 py-1 border rounded text-xs"
                />
                <input
                  type="number"
                  placeholder="Client Rate ₹"
                  value={slab.rate}
                  onChange={(e) => handleSlabChange(i, 'rate', e.target.value)}
                  className="px-2 py-1 border rounded text-xs"
                />
                <input
                  type="number"
                  placeholder="Vendor Rate ₹"
                  value={slab.vendorRate}
                  onChange={(e) => handleSlabChange(i, 'vendorRate', e.target.value)}
                  className="px-2 py-1 border rounded text-xs"
                />
              </div>
            ))}
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
              Save Pricing Rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
