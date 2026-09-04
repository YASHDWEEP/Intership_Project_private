import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStyle = (s: string) => {
    switch (s.toUpperCase()) {
      case 'PAID':
      case 'SETTLED':
      case 'APPROVED':
      case 'VALIDATED':
      case 'ACTIVE':
      case 'SUCCESS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PROCESSED':
      case 'GENERATED':
      case 'INVOICED':
      case 'COMPLETED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DRAFT':
      case 'PENDING':
      case 'CALCULATED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'SENT':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'FAILED':
      case 'INACTIVE':
      case 'OVERDUE':
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStyle(
        status
      )}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75"></span>
      {status}
    </span>
  );
};
