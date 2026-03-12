import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../api';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

const fmt = v => Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

const aylar = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [monthly, setMonthly] = useState([]);
  const [recent, setRecent] = useState({ recentJobs: [], recentPayments: [], unpaidDebts: [] });
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchMonthly(selectedYear);
  }, [selectedYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, recentRes, yearsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent'),
        api.get('/dashboard/years')
      ]);
      setStats(statsRes.data);
      setRecent(recentRes.data);
      setYears(yearsRes.data);
      await fetchMonthly(selectedYear);
    } catch (err) {
      console.error('Dashboard veri yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthly = async (year) => {
    try {
      const res = await api.get(`/dashboard/monthly/${year}`);
      const data = res.data.map(item => ({
        ...item,
        name: aylar[item.month - 1] || item.month
      }));
      setMonthly(data);
    } catch (err) {
      console.error('Aylık veri yükleme hatası:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-accent-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Genel bakış ve özet bilgiler</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/jobs"
            className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Yeni İş
          </Link>
          <Link
            to="/income-expenses"
            className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Gelir Ekle
          </Link>
          <Link
            to="/income-expenses"
            className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Gider Ekle
          </Link>
        </div>
      </div>

      {/* KPI Row 1 - Finansal */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Toplam Sozlesme" value={fmt(stats.totalContracts)} sub="Anlasmali isler toplami" color="primary" icon="📋" />
        <StatCard title="Toplam Gelir" value={fmt(stats.totalRevenue)} color="green" icon="📈" />
        <StatCard title="Toplam Gider" value={fmt(stats.totalExpense)} color="red" icon="📉" />
        <StatCard title="Net Kar" value={fmt(stats.profit)} color={stats.profit >= 0 ? 'green' : 'red'} icon="💰" />
        <StatCard title="Toplam Varlik" value={fmt(stats.totalAssets)} color="primary" icon="🏦" />
      </div>

      {/* KPI Row 2 - Operasyonel */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Aktif Is" value={stats.activeJobs || 0} color="blue" icon="⚙️" />
        <StatCard title="Musteri Sayisi" value={stats.customerCount || 0} color="purple" icon="👥" />
        <StatCard title="Tedarikci Borcu" value={fmt(stats.supplierDebt)} color="orange" icon="🏭" />
        <StatCard title="Kart Borcu" value={fmt(stats.ccDebt)} color="red" icon="💳" />
        <StatCard title="Toplam Borc" value={fmt((stats.supplierDebt || 0) + (stats.ccDebt || 0))} sub="Tedarikci + Kart" color="red" icon="⚠️" />
      </div>

      {/* Monthly Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-lg font-semibold text-accent-900">Aylık Gelir / Gider / Kâr</h2>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="mt-2 sm:mt-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            {years.length > 0 ? (
              years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))
            ) : (
              <option value={selectedYear}>{selectedYear}</option>
            )}
          </select>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip
                formatter={(value) => fmt(value)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Bar dataKey="gelir" name="Gelir" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gider" name="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="kar" name="Kâr" fill="#F7941D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Son İşler */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-accent-900">Son İşler</h2>
            <Link to="/jobs" className="text-primary-500 hover:text-primary-600 text-sm font-medium">
              Tümünü Gör →
            </Link>
          </div>
          {recent.recentJobs && recent.recentJobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">İş Adı</th>
                    <th className="pb-2 font-medium">Müşteri</th>
                    <th className="pb-2 font-medium">Durum</th>
                    <th className="pb-2 font-medium text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recent.recentJobs.map(job => (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3">
                        <Link to={`/jobs/${job.id}`} className="text-primary-500 hover:text-primary-600 font-medium">
                          {job.title || job.name}
                        </Link>
                      </td>
                      <td className="py-3 text-gray-600">{job.customer || job.customer_name || '-'}</td>
                      <td className="py-3">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="py-3 text-right font-medium text-accent-900">
                        {fmt(job.total_amount || job.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p>Henüz iş kaydı yok</p>
            </div>
          )}
        </div>

        {/* Bekleyen Borçlar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-accent-900">Bekleyen Borçlar</h2>
            <Link to="/suppliers" className="text-primary-500 hover:text-primary-600 text-sm font-medium">
              Tümünü Gör →
            </Link>
          </div>
          {recent.unpaidDebts && recent.unpaidDebts.length > 0 ? (
            <div className="space-y-3">
              {recent.unpaidDebts.map((debt, index) => (
                <div key={debt.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="font-medium text-accent-900">{debt.supplier_name || debt.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{debt.description || debt.note || ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-500">{fmt(debt.amount || debt.remaining)}</p>
                    {debt.due_date && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(debt.due_date).toLocaleDateString('tr-TR')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Bekleyen borç yok</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
