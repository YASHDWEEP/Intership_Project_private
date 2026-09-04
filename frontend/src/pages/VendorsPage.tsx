import React, { useState, useEffect } from 'react';
import { Users2, Plus, Phone, Mail, MapPin, Landmark } from 'lucide-react';
import api from '../services/api';
import { Modal } from '../components/Modal';

export const VendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    gstNumber: '',
    phone: '',
    email: '',
    address: '',
    commissionType: 'PERCENTAGE',
    commissionValue: 10.0,
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vendors');
      setVendors(res.data);
    } catch (err) {
      console.error('Fetch vendors error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/vendors', formData);
      setIsModalOpen(false);
      fetchVendors();
      setFormData({
        name: '',
        companyName: '',
        gstNumber: '',
        phone: '',
        email: '',
        address: '',
        commissionType: 'PERCENTAGE',
        commissionValue: 10.0,
      });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create vendor');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vendor Transport Partners</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Vendor partners fleet management, earnings calculations, and commission settings
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-brand-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Vendor Partner</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Users2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{v.name}</h3>
                  <p className="text-[11px] text-gray-500">{v.companyName}</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {v.vehicles?.length || 0} Vehicles
              </span>
            </div>

            <div className="space-y-2 text-xs text-gray-600 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">GSTIN:</span>
                <span className="font-mono text-gray-800">{v.gstNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Phone:</span>
                <span className="font-semibold text-gray-800">{v.phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Commission Rate:</span>
                <span className="font-semibold text-gray-800">
                  {v.commissionValue} {v.commissionType === 'PERCENTAGE' ? '%' : '₹'}
                </span>
              </div>
            </div>

            {/* Financial Earnings Metrics */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100 text-center text-xs">
              <div className="bg-emerald-50/60 p-2 rounded-lg">
                <span className="block text-[10px] text-emerald-700 font-medium">Total Gross Earnings</span>
                <span className="font-extrabold text-emerald-900 text-sm">₹ {(v.totalEarnings || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-amber-50/60 p-2 rounded-lg">
                <span className="block text-[10px] text-amber-700 font-medium">Pending Settlement</span>
                <span className="font-extrabold text-amber-900 text-sm">₹ {(v.pendingSettlement || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Vendor Transport Partner">
        <form onSubmit={handleCreateVendor} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vendor Partner Name *</label>
              <input
                type="text"
                required
                placeholder="Ramesh Travels"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Company Legal Name *</label>
              <input
                type="text"
                required
                placeholder="Ramesh Transport Pvt Ltd"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">GSTIN Number *</label>
              <input
                type="text"
                required
                placeholder="29ABCDE1234F1Z1"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                placeholder="+91 98451 00001"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                placeholder="ramesh@travels.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Office Address</label>
              <input
                type="text"
                placeholder="Koramangala 4th Block, Bengaluru"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Commission % *</label>
              <input
                type="number"
                step="0.5"
                required
                value={formData.commissionValue}
                onChange={(e) => setFormData({ ...formData, commissionValue: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
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
              Create Vendor
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
