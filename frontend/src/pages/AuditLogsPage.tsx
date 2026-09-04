import React, { useState, useEffect } from 'react';
import { ShieldCheck, History, User, Clock } from 'lucide-react';
import api from '../services/api';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-logs');
      setLogs(res.data);
    } catch (err) {
      console.error('Fetch logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-brand-600" />
          Financial & Operational Audit Trail Logs
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Immutable audit log history of trip modifications, pricing updates, invoice generations, and settlement approvals
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
            <tr>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Entity</th>
              <th className="py-3 px-4">Entity ID</th>
              <th className="py-3 px-4">Change Payload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-mono">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400 font-sans">
                  Loading audit logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400 font-sans">
                  No audit logs recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 font-bold text-gray-900 font-sans">{log.user?.name || 'System Admin'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-sans">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-gray-800 font-sans">{log.entity}</td>
                  <td className="py-3 px-4 text-gray-500 text-[10px]">{log.entityId}</td>
                  <td className="py-3 px-4 text-[10px] text-gray-600 max-w-xs truncate">
                    {log.newValue || log.oldValue || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
