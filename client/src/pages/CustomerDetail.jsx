import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

const fmt = v => Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('jobs');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/customers/${id}`);
        setCustomer(data);
      } catch (err) {
        console.error('Musteri yuklenemedi', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="text-center py-12 text-gray-400">Yukleniyor...</div>;
  if (!customer) return <div className="text-center py-12 text-red-500">Musteri bulunamadi</div>;

  const jobs = customer.jobs || [];
  const payments = customer.payments || [];
  const totalContract = jobs.reduce((s, j) => s + Number(j.contract_amount || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const balance = totalContract - totalPaid;

  const tabs = [
    { key: 'jobs', label: 'Isler', count: jobs.length },
    { key: 'payments', label: 'Odemeler', count: payments.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-3 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Musterilere Don
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-accent-900">{customer.name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
              {customer.contact_person && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  {customer.contact_person}
                </span>
              )}
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {customer.email}
                </span>
              )}
              {customer.city && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {customer.city}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Toplam Sozlesme" value={fmt(totalContract)} color="blue" icon="📄" />
        <StatCard title="Toplam Tahsilat" value={fmt(totalPaid)} color="green" icon="💰" />
        <StatCard title="Kalan Bakiye" value={fmt(balance)} color={balance > 0 ? 'orange' : 'green'} icon="📊" />
        <StatCard title="Is Sayisi" value={jobs.length} color="purple" icon="🔧" />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                tab === t.key ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
              }`}>{t.count}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {tab === 'jobs' && (
        <div className="card overflow-hidden">
          {jobs.length === 0 ? (
            <div className="text-center py-10 text-gray-400">Bu musteriye ait is bulunamadi</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-5 py-3 font-semibold text-gray-600">Is Basligi</th>
                    <th className="px-5 py-3 font-semibold text-gray-600 text-right">Sozlesme Bedeli</th>
                    <th className="px-5 py-3 font-semibold text-gray-600 text-right">Tahsilat</th>
                    <th className="px-5 py-3 font-semibold text-gray-600 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobs.map(j => (
                    <tr key={j.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <Link to={`/jobs/${j.id}`} className="text-primary-600 hover:text-primary-700 font-medium hover:underline">
                          {j.title}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-right font-medium">{fmt(j.contract_amount)}</td>
                      <td className="px-5 py-3 text-right font-medium">{fmt(j.total_paid)}</td>
                      <td className="px-5 py-3 text-center">
                        <StatusBadge status={j.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-5 py-3">Toplam</td>
                    <td className="px-5 py-3 text-right">{fmt(totalContract)}</td>
                    <td className="px-5 py-3 text-right">{fmt(totalPaid)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div className="card overflow-hidden">
          {payments.length === 0 ? (
            <div className="text-center py-10 text-gray-400">Bu musteriye ait odeme bulunamadi</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-5 py-3 font-semibold text-gray-600">Tarih</th>
                    <th className="px-5 py-3 font-semibold text-gray-600 text-right">Tutar</th>
                    <th className="px-5 py-3 font-semibold text-gray-600">Is Basligi</th>
                    <th className="px-5 py-3 font-semibold text-gray-600">Yontem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-600">
                        {p.date ? new Date(p.date).toLocaleDateString('tr-TR') : '-'}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-emerald-600">{fmt(p.amount)}</td>
                      <td className="px-5 py-3 text-gray-700">{p.job_title || '-'}</td>
                      <td className="px-5 py-3">
                        {p.method && (
                          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 capitalize">{p.method}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-5 py-3">Toplam</td>
                    <td className="px-5 py-3 text-right text-emerald-600">{fmt(totalPaid)}</td>
                    <td></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
