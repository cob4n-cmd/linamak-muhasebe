import React from 'react';

const statusColors = {
  beklemede: 'bg-amber-100 text-amber-800',
  devam: 'bg-blue-100 text-blue-800',
  tamamlandi: 'bg-emerald-100 text-emerald-800',
  iptal: 'bg-red-100 text-red-800',
  durduruldu: 'bg-gray-100 text-gray-800',
};

const statusLabels = {
  beklemede: 'Beklemede',
  devam: 'Devam Ediyor',
  tamamlandi: 'Tamamlandi',
  iptal: 'Iptal',
  durduruldu: 'Durduruldu',
};

const invoiceColors = {
  faturali: 'bg-emerald-100 text-emerald-800',
  faturasiz: 'bg-gray-100 text-gray-600',
};

const invoiceLabels = {
  faturali: 'Faturali',
  faturasiz: 'Faturasiz',
};

export default function StatusBadge({ status, type = 'status' }) {
  if (type === 'invoice') {
    return <span className={`badge ${invoiceColors[status] || invoiceColors.faturasiz}`}>{invoiceLabels[status] || status}</span>;
  }
  return <span className={`badge ${statusColors[status] || statusColors.beklemede}`}>{statusLabels[status] || status}</span>;
}
