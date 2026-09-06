import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Filter,
  Users,
  Building2,
  Truck,
  Briefcase,
  KeyRound,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Mail,
  LogOut,
  User as UserIcon,
  Plus,
  Settings2,
  Check,
} from 'lucide-react';
import api from '../services/api';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';

interface UserRoleItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
  clientId?: string | null;
  vendorId?: string | null;
  createdAt: string;
  client?: { id: string; name: string } | null;
  vendor?: { id: string; name: string } | null;
}

interface DynamicRole {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
  userCount?: number;
}

const AVAILABLE_PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboard Overview' },
  { key: 'trips', label: 'Trips & Fleet Logistics' },
  { key: 'import-center', label: 'Excel Import Center' },
  { key: 'clients', label: 'Corporate Clients' },
  { key: 'vendors', label: 'Vendor Transport Partners' },
  { key: 'vehicles', label: 'Vehicles & Fleet' },
  { key: 'pricing', label: 'Pricing Rules & Slabs' },
  { key: 'invoices', label: 'Client GST Invoices' },
  { key: 'payments', label: 'Online Payments & Checkout' },
  { key: 'settlements', label: 'Vendor Earnings & Settlements' },
  { key: 'reports', label: 'Financial & Operations Reports' },
  { key: 'email-center', label: 'Email Communication Center' },
  { key: 'users', label: 'User & Role Management' },
  { key: 'audit-logs', label: 'Audit Trail Logs' },
];

export const UserRolesPage: React.FC = () => {
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRoleItem[]>([]);
  const [roles, setRoles] = useState<DynamicRole[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES'>('USERS');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRoleItem | null>(null);

  // Form states for User
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CLIENT',
    status: 'ACTIVE',
    clientId: '',
    vendorId: '',
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CLIENT',
    status: 'ACTIVE',
    clientId: '',
    vendorId: '',
  });

  // Form state for Dynamic Role
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    description: '',
    permissions: ['dashboard', 'trips', 'email-center'],
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchLookups();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch user roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      setRoles(res.data || []);
      if (res.data && res.data.length > 0 && !formData.role) {
        setFormData((prev) => ({ ...prev, role: res.data[0].name }));
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const fetchLookups = async () => {
    try {
      const [cRes, vRes] = await Promise.all([
        api.get('/clients'),
        api.get('/vendors'),
      ]);
      setClients(cRes.data || []);
      setVendors(vRes.data || []);
    } catch (err) {
      console.error('Failed to fetch lookup data:', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetRole = formData.role.trim().toUpperCase();
      if (!targetRole) {
        alert('Please select or specify a valid role');
        return;
      }

      await api.post('/users', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: targetRole,
        status: formData.status,
        clientId: targetRole === 'CLIENT' || formData.clientId ? formData.clientId : null,
        vendorId: targetRole === 'VENDOR' || formData.vendorId ? formData.vendorId : null,
      });

      setIsCreateModalOpen(false);
      resetForm();
      fetchUsers();
      fetchRoles();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create user role account');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const targetRole = editFormData.role.trim().toUpperCase();
      if (!targetRole) {
        alert('Please specify a valid role');
        return;
      }

      const payload: any = {
        name: editFormData.name,
        email: editFormData.email,
        role: targetRole,
        status: editFormData.status,
        clientId: editFormData.clientId || null,
        vendorId: editFormData.vendorId || null,
      };

      if (editFormData.password.trim()) {
        payload.password = editFormData.password;
      }

      await api.put(`/users/${selectedUser.id}`, payload);
      setIsEditModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
      fetchRoles();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await api.delete(`/users/${selectedUser.id}`);
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
      fetchRoles();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete user role');
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const roleName = roleFormData.name.trim().toUpperCase();
      if (!roleName) {
        alert('Role name is required');
        return;
      }

      await api.post('/roles', {
        name: roleName,
        description: roleFormData.description,
        permissions: roleFormData.permissions,
      });

      setIsCreateRoleModalOpen(false);
      setRoleFormData({ name: '', description: '', permissions: ['dashboard', 'trips', 'email-center'] });
      fetchRoles();
      fetchUsers();
      alert(`Role '${roleName}' created successfully and is now active across the system!`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create role');
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!window.confirm(`Are you sure you want to delete custom role '${roleName}'?`)) return;
    try {
      await api.delete(`/roles/${roleId}`);
      fetchRoles();
      alert(`Role '${roleName}' deleted successfully.`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete role');
    }
  };

  const openEditModal = (user: UserRoleItem) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status,
      clientId: user.clientId || '',
      vendorId: user.vendorId || '',
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (user: UserRoleItem) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: roles.length > 0 ? roles[0].name : 'CLIENT',
      status: 'ACTIVE',
      clientId: '',
      vendorId: '',
    });
  };

  // Filtered users calculation
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.client?.name && u.client.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.vendor?.name && u.vendor.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || u.status === selectedStatusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Dynamic KPI Metrics calculation
  const totalUsersCount = users.length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const clientUsersCount = users.filter((u) => u.role === 'CLIENT').length;
  const vendorUsersCount = users.filter((u) => u.role === 'VENDOR').length;
  const customRoleCount = users.filter((u) => !['ADMIN', 'OPERATIONS', 'ACCOUNTS', 'CLIENT', 'VENDOR'].includes(u.role)).length;

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'OPERATIONS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ACCOUNTS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CLIENT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'VENDOR':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'EMPLOYEE':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'MANAGER':
        return 'bg-violet-50 text-violet-700 border-violet-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="p-8">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 max-w-2xl mx-auto text-center space-y-5 shadow-sm">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
          <p className="text-sm text-gray-600">
            Only Administrator accounts can manage system user access roles or reassign privileges. You are currently logged in as <strong className="text-gray-900 uppercase font-semibold">{currentUser?.role || 'User'}</strong>.
          </p>

          <div className="pt-2 flex justify-center">
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition-all shadow-sm hover:shadow cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Switch Account / Login as Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User & Dynamic Role Management</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Create, assign, edit, and dynamically manage system access roles for Corporate Clients, Vendor Partners, Employees, Managers, Admins & Custom Roles
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateRoleModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-xs transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ Create Dynamic Role</span>
          </button>

          <button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs transition-all shadow-sm hover:shadow cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User Role</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Users</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{totalUsersCount}</p>
          </div>
          <div className="p-3 bg-gray-100 rounded-xl text-gray-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Admins</p>
            <p className="text-2xl font-black text-purple-600 mt-1">{adminCount}</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Client Users</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{clientUsersCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor Users</p>
            <p className="text-2xl font-black text-cyan-600 mt-1">{vendorUsersCount}</p>
          </div>
          <div className="p-3 bg-cyan-50 rounded-xl text-cyan-600">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Custom/Other Roles</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{customRoleCount}</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Settings2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-gray-200 space-x-6">
        <button
          onClick={() => setActiveTab('USERS')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'USERS'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          User Role Accounts ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('ROLES')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ROLES'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          System & Dynamic Roles Catalog ({roles.length})
        </button>
      </div>

      {activeTab === 'USERS' && (
        <>
          {/* Filters & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email, role or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs font-semibold text-gray-600">Role:</span>
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="py-1.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-hidden"
                >
                  <option value="ALL">All Roles</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">Status:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="py-1.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-hidden"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500 text-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-3"></div>
                Loading user access roles...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-sm">
                No user role accounts found matching your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-3.5 px-5">User Profile</th>
                      <th className="py-3.5 px-5">Assigned Role</th>
                      <th className="py-3.5 px-5">Linked Company / Entity</th>
                      <th className="py-3.5 px-5">Account Status</th>
                      <th className="py-3.5 px-5">Created Date</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-sm border border-brand-200">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{u.name}</p>
                              <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 text-gray-400" />
                                {u.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-5">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getRoleBadgeStyle(u.role)}`}>
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-gray-700 font-medium">
                          {u.role === 'CLIENT' && u.client ? (
                            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                              <Building2 className="w-3.5 h-3.5" />
                              {u.client.name}
                            </div>
                          ) : u.role === 'VENDOR' && u.vendor ? (
                            <div className="flex items-center gap-1.5 text-cyan-700 font-semibold">
                              <Truck className="w-3.5 h-3.5" />
                              {u.vendor.name}
                            </div>
                          ) : u.clientId && u.client ? (
                            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                              <Building2 className="w-3.5 h-3.5" />
                              {u.client.name}
                            </div>
                          ) : u.vendorId && u.vendor ? (
                            <div className="flex items-center gap-1.5 text-cyan-700 font-semibold">
                              <Truck className="w-3.5 h-3.5" />
                              {u.vendor.name}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">System Platform Wide</span>
                          )}
                        </td>

                        <td className="py-3.5 px-5">
                          {u.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-gray-500">
                          {new Date(u.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(u)}
                              title="Edit User Role"
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-brand-600 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(u)}
                              title="Delete User Account"
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'ROLES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getRoleBadgeStyle(r.name)}`}>
                      {r.name}
                    </span>
                    {r.isSystem && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                        Built-in System Role
                      </span>
                    )}
                  </div>
                  {!r.isSystem && (
                    <button
                      onClick={() => handleDeleteRole(r.id, r.name)}
                      className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Custom Role"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-gray-600 mb-4 leading-relaxed">{r.description}</p>

                <div className="space-y-1.5 border-t border-gray-100 pt-3">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Module Permissions:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {r.permissions.includes('*') ? (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-semibold">
                        ★ Full Platform Access (*)
                      </span>
                    ) : (
                      r.permissions.map((permKey) => {
                        const matched = AVAILABLE_PERMISSIONS.find((p) => p.key === permKey);
                        return (
                          <span
                            key={permKey}
                            className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 rounded text-[10px] font-medium"
                          >
                            {matched ? matched.label : permKey}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>Active Users: <strong className="text-gray-900 font-bold">{r.userCount || 0}</strong></span>
                <span className="text-[10px] text-gray-400">ID: {r.id.substring(0, 8)}...</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE USER ROLE MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create & Assign New User Role"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Full User Name *</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address (Login Username) *</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                placeholder="ramesh@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Initial Password *</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">Role Designation *</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsCreateRoleModalOpen(true);
                  }}
                  className="text-[10px] font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
                >
                  + Add Role
                </button>
              </div>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name} {!r.isSystem ? '(Custom Role)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Account Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          {formData.role === 'CLIENT' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Link Corporate Client *</label>
              <select
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              >
                <option value="">Select Corporate Client Company...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.gstNumber || 'No GST'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.role === 'VENDOR' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Link Vendor Partner *</label>
              <select
                required
                value={formData.vendorId}
                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              >
                <option value="">Select Vendor Partner Company...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.companyName})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
            >
              Create Account & Assign Role
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT USER ROLE MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User Role & Account Access"
      >
        <form onSubmit={handleEditUser} className="space-y-4 pt-2">
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 text-xs text-brand-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <span>As Admin, you can change the assigned user role below directly without needing a password.</span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Full User Name *</label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Reset Password <span className="text-gray-400 font-normal">(Leave blank to keep unchanged)</span>
            </label>
            <input
              type="password"
              placeholder="New password (optional)"
              value={editFormData.password}
              onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Role Designation *</label>
              <select
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name} {!r.isSystem ? '(Custom Role)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <select
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          {editFormData.role === 'CLIENT' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Link Corporate Client</label>
              <select
                value={editFormData.clientId}
                onChange={(e) => setEditFormData({ ...editFormData, clientId: e.target.value })}
                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              >
                <option value="">Select Corporate Client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {editFormData.role === 'VENDOR' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Link Vendor Partner</label>
              <select
                value={editFormData.vendorId}
                onChange={(e) => setEditFormData({ ...editFormData, vendorId: e.target.value })}
                className="w-full py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              >
                <option value="">Select Vendor Partner...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
            >
              Save Role Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* CREATE DYNAMIC SYSTEM ROLE MODAL */}
      <Modal
        isOpen={isCreateRoleModalOpen}
        onClose={() => setIsCreateRoleModalOpen(false)}
        title="Create New Dynamic Role & Access Permissions"
      >
        <form onSubmit={handleCreateRole} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Role Title / Designation *</label>
            <input
              type="text"
              required
              placeholder="e.g. EMPLOYEE, MANAGER, AUDITOR, DISPATCHER"
              value={roleFormData.name}
              onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-wider focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Role Description</label>
            <textarea
              rows={2}
              placeholder="Specify the responsibilities and scope of this access role..."
              value={roleFormData.description}
              onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Module Access Permissions *</label>
            <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-48 overflow-y-auto">
              {AVAILABLE_PERMISSIONS.map((perm) => {
                const isSelected = roleFormData.permissions.includes(perm.key);
                return (
                  <label
                    key={perm.key}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                      isSelected
                        ? 'bg-brand-50 text-brand-900 border-brand-200 font-semibold'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRoleFormData({ ...roleFormData, permissions: [...roleFormData.permissions, perm.key] });
                        } else {
                          setRoleFormData({
                            ...roleFormData,
                            permissions: roleFormData.permissions.filter((p) => p !== perm.key),
                          });
                        }
                      }}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span>{perm.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsCreateRoleModalOpen(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
            >
              Create Role & Deploy
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE USER ROLE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete User Role Access"
      >
        {selectedUser && (
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold">Are you sure you want to delete this user role account?</p>
                <p className="mt-1 text-rose-700">
                  User <strong className="text-rose-900">{selectedUser.name}</strong> ({selectedUser.email}) with role{' '}
                  <strong className="text-rose-900">{selectedUser.role}</strong> will permanently lose system login access.
                </p>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
              >
                Delete Role Account
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
