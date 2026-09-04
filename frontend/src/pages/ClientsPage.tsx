import React, { useState, useEffect } from 'react';
import { Building2, Plus, Phone, Mail, FileText, Calendar } from 'lucide-react';
import api from '../services/api';
import { Modal } from '../components/Modal';

export const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    gstNumber: '',
    contactPerson: '',
    contactEmail: '',
    phone: '',
    billingCycle: 'MONTHLY',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await api.get('/clients');
      setClients(res.data);
    } catch (err) {
      console.error('Fetch clients error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/clients', formData);
      setIsModalOpen(false);
      fetchClients();
      setFormData({
        name: '',
        gstNumber: '',
        contactPerson: '',
        contactEmail: '',
        phone: '',
        billingCycle: 'MONTHLY',
      });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create client');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Corporate Clients Hub</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage corporate client accounts, GST details, billing cycles, and tariffs
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-brand-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Corporate Client</span>
        </button>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{c.name}</h3>
                  <span className="text-[10px] font-mono text-gray-400">GST: {c.gstNumber}</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {c.billingCycle}
              </span>
            </div>

            <div className="space-y-2 text-xs text-gray-600 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Contact Person:</span>
                <span className="font-semibold text-gray-800">{c.contactPerson}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Email:</span>
                <span className="font-semibold text-gray-800">{c.contactEmail}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Phone:</span>
                <span className="font-semibold text-gray-800">{c.phone}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100 text-center text-xs">
              <div className="bg-gray-50 p-2 rounded-lg">
                <span className="block text-[10px] text-gray-400">Total Trips</span>
                <span className="font-bold text-gray-900">{c._count?.trips || 0}</span>
              </div>
              <div className="bg-gray-50 p-2 rounded-lg">
                <span className="block text-[10px] text-gray-400">Invoices</span>
                <span className="font-bold text-gray-900">{c._count?.invoices || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Client Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Corporate Client Account">
        <form onSubmit={handleCreateClient} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Company Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Infosys Limited"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">GSTIN Number *</label>
              <input
                type="text"
                required
                placeholder="29AAAAA0000A1Z5"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Billing Cycle</label>
              <select
                value={formData.billingCycle}
                onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              >
                <option value="DAILY">DAILY</option>
                <option value="WEEKLY">WEEKLY</option>
                <option value="MONTHLY">MONTHLY</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Person *</label>
              <input
                type="text"
                required
                placeholder="Rajesh Sharma"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Email *</label>
              <input
                type="email"
                required
                placeholder="rajesh@company.com"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                placeholder="+91 98801 23456"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
              Create Client
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
