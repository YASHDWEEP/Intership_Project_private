import React, { useState, useEffect } from 'react';
import { Truck, Plus, ShieldCheck, Zap } from 'lucide-react';
import api from '../services/api';
import { Modal } from '../components/Modal';

export const VehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    vendorId: '',
    vehicleNumber: '',
    vehicleType: '4 Seater',
    seatingCapacity: 4,
    fuelType: 'DIESEL',
  });

  useEffect(() => {
    fetchVehicles();
    fetchVendors();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vehicles');
      setVehicles(res.data);
    } catch (err) {
      console.error('Fetch vehicles error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await api.get('/vendors');
      setVendors(res.data);
    } catch (err) {
      console.error('Fetch vendors error:', err);
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/vehicles', formData);
      setIsModalOpen(false);
      fetchVehicles();
      setFormData({
        vendorId: '',
        vehicleNumber: '',
        vehicleType: '4 Seater',
        seatingCapacity: 4,
        fuelType: 'DIESEL',
      });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to register vehicle');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Fleet Vehicle Manager</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Registered vehicle fleet, seating capacities, and vendor partner assignments
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-brand-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Vehicle</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
            <tr>
              <th className="py-3 px-4">Vehicle Number</th>
              <th className="py-3 px-4">Vendor Partner</th>
              <th className="py-3 px-4">Vehicle Type</th>
              <th className="py-3 px-4">Seating Capacity</th>
              <th className="py-3 px-4">Fuel Type</th>
              <th className="py-3 px-4 text-center">Total Trips Run</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-400">
                  Loading vehicles...
                </td>
              </tr>
            ) : (
              vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-bold text-gray-900 font-mono text-sm">{v.vehicleNumber}</td>
                  <td className="py-3 px-4 text-gray-800 font-medium">{v.vendor?.name}</td>
                  <td className="py-3 px-4 text-gray-700 font-semibold">{v.vehicleType}</td>
                  <td className="py-3 px-4 text-gray-600">{v.seatingCapacity} Passengers</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        v.fuelType === 'ELECTRIC'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {v.fuelType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-gray-900">{v._count?.trips || 0}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Fleet Vehicle">
        <form onSubmit={handleCreateVehicle} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Vendor Partner *</label>
            <select
              required
              value={formData.vendorId}
              onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            >
              <option value="">Select Vendor Partner</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vehicle Registration Number *</label>
              <input
                type="text"
                required
                placeholder="KA-01-MJ-1024"
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs uppercase font-mono"
              />
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Seating Capacity</label>
              <input
                type="number"
                value={formData.seatingCapacity}
                onChange={(e) => setFormData({ ...formData, seatingCapacity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Fuel Type</label>
              <select
                value={formData.fuelType}
                onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              >
                <option value="DIESEL">DIESEL</option>
                <option value="PETROL">PETROL</option>
                <option value="CNG">CNG</option>
                <option value="ELECTRIC">ELECTRIC</option>
              </select>
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
              Register Vehicle
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
