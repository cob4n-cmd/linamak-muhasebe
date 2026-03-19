import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';

const fmt = v => Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

const emptyDebt = {
  description: '', amount: '', kdv_rate: '20', debt_date: '', due_date: '', note: '', job_id: ''
};

export default function SupplierDetail() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyDebt);
  const [saving, setSaving] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('debts'); // debts | purchases | transactions

  const fetchSupplier = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/suppliers/${id}`);
      setSupplier(data);
    } catch (err) {
      console.error('Tedarikci yuklenemedi:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await api.get('/jobs');
      setJobs(Array.isArray(data) ? data : data.jobs || []);
    } catch (err) { /* ignore */ }
  }, []);

  useEffect(() => { fetchSupplier(); fetchJobs(); }, [fetchSupplier, fetchJobs]);

  const openNew = () => {
    setForm({ ...emptyDebt, debt_date: new Date().toISOString().split('T')[0] });
    setModalOpen(true);
  };

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/suppliers/${id}/debts`, {
        ...form,
        amount: Number(form.amount),
        kdv_rate: Number(form.kdv_rate),
        job_id: form.job_id ? Number(form.job_id) : null
      });
      setModalOpen(false);
      fetchSupplier();
    } catch (err) {
      alert(err.response?.data?.error || 'Hata olustu');
    } finally {
      setSaving(false);
    }
  };

  const handlePay = async (debtId) => {
    if (!window.confirm('Bu borcu odendi olarak isaretlemek istiyor musunuz?')) return;
    try {
      await api.put(`/suppliers/debts/${debtId}/pay`);
      fetchSupplier();
    } catch (err) {
      alert(err.response?.data?.error || 'Hata olustu');
    }
  };

  const handleDelete = async (debtId) => {
    if (!window.confirm('Bu borcu silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/suppliers/debts/${debtId}`);
      fetchSupplier();
    } catch (err) {
      alert(err.response?.data?.error || 'Silme hatasi');
    }
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const kdvAmount = (Number(form.amount) || 0) * (Number(form.kdv_rate) || 0) / 100;
  const totalWithKdv = (Number(form.amount) || 0) + kdvAmount;

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Yukleniyor...</div>;
  }

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">Tedarikci bulunamadi</p>
        <Link to="/suppliers" className="text-primary-600 hover:underline text-sm mt-2 inline-block">
          Tedarikcilere don
        </Link>
      </div>
    );
  }

  const debts = supplier.debts || [];
  const purchases = supplier.purchases || [];
  const transactions = supplier.transactions || [];
  const filteredDebts = debts.filter(d => {
    if (filter === 'unpaid') return d.status === 'unpaid';
    if (filter === 'paid') return d.status === 'paid';
    return true;
  });

  const unpaidTotal = debts.filter(d => d.status === 'unpaid').reduce((s, d) => s + Number(d.total_amount || d.total_with_kdv || d.amount || 0), 0);
  const paidTotal = debts.filter(d => d.status === 'paid').reduce((s, d) => s + Number(d.total_amount || d.total_with_kdv || d.amount || 0), 0);
  const purchaseTotal = purchases.reduce((s, p) => s + Number(p.total_with_kdv || p.amount || 0), 0);
  const grandTotal = unpaidTotal + paidTotal;

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('tr-TR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/suppliers" className="text-sm text-gray-500 hover:text-primary-600 flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Tedarikciler
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-accent-900">{supplier.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
              {supplier.contact_person && <span>{supplier.contact_person}</span>}
              {supplier.phone && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {supplier.phone}
                </span>
              )}
              {supplier.email && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {supplier.email}
                </span>
              )}
              {supplier.city && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {supplier.city}
                </span>
              )}
            </div>
          </div>
          <button onClick={openNew} className="btn-primary shrink-0">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Borc Ekle
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Odenmemis Borc" value={fmt(unpaidTotal)} color="red" icon="⏳" />
        <StatCard title="Odenen Tutar" value={fmt(paidTotal)} color="green" icon="✓" />
        <StatCard title="Toplam Alisveris" value={fmt(purchaseTotal)} color="blue" icon="🛒" />
        <StatCard title="Toplam Borc" value={fmt(grandTotal)} color="gray" icon="📊" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('debts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'debts'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Borclar ({debts.length})
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'purchases'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Alinan Malzemeler ({purchases.length})
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'transactions'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Hesap Hareketleri ({transactions.length})
        </button>
      </div>

      {/* Borclar Tab */}
      {activeTab === 'debts' && (
        <>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Tumu', count: debts.length },
              { key: 'unpaid', label: 'Bekleyen', count: debts.filter(d => d.status === 'unpaid').length },
              { key: 'paid', label: 'Odenen', count: debts.filter(d => d.status === 'paid').length },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          {filteredDebts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Borc kaydi bulunamadi</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Aciklama</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Is</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Tutar</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">KDV Dahil</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Vade Tarihi</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Durum</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Islemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDebts.map(d => (
                      <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(d.debt_date)}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-accent-900">{d.description}</span>
                          {d.note && <p className="text-xs text-gray-400 mt-0.5">{d.note}</p>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {d.job_title ? (
                            <Link to={`/jobs/${d.job_id}`} className="text-primary-600 hover:underline text-xs">
                              {d.job_title}
                            </Link>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{fmt(d.amount)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-medium">{fmt(d.total_amount || d.total_with_kdv)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {d.due_date ? (
                            <span className={d.status === 'unpaid' && new Date(d.due_date) < new Date() ? 'text-red-600 font-medium' : ''}>
                              {formatDate(d.due_date)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {d.status === 'paid' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              Odendi
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Bekliyor
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {d.status === 'unpaid' && (
                              <button
                                onClick={() => handlePay(d.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Odendi olarak isaretle"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(d.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Sil"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Alinan Malzemeler Tab */}
      {activeTab === 'purchases' && (
        <>
          {purchases.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Bu tedarikciden henuz alisveris yapilmamis</p>
              <p className="text-gray-400 text-sm mt-1">Is masraflarinda bu tedarikci secildiginde burada gorunecektir</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Aciklama</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Hangi Is Icin</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Tutar</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">KDV Dahil</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Odeme</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {purchases.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.expense_date)}</td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-accent-900">{p.description}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {p.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {p.job_title ? (
                            <Link to={`/jobs/${p.job_id}`} className="text-primary-600 hover:underline text-xs">
                              {p.job_title}
                            </Link>
                          ) : (
                            <span className="text-gray-400 text-xs">Genel</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{fmt(p.amount)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-medium">{fmt(p.total_with_kdv)}</td>
                        <td className="px-4 py-3 text-center">
                          {p.is_paid ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              Odendi
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Odenmedi
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td colSpan={5} className="px-4 py-3 font-bold text-accent-900">Toplam</td>
                      <td className="px-4 py-3 text-right font-bold text-accent-900">{fmt(purchaseTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Hesap Hareketleri Tab */}
      {activeTab === 'transactions' && (
        <>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Henuz hesap hareketi yok</p>
              <p className="text-gray-400 text-sm mt-1">Borclar odendiginde veya masraf girildiginde burada gorunecektir</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Islem Tipi</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Aciklama</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Is</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Odeme Yontemi</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Tutar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((t, i) => (
                      <tr key={`${t.type}-${t.id}-${i}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(t.date)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {t.type === 'borc_odeme' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Borc Odeme
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Masraf/Alisveris
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-accent-900">{t.description}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {t.job_title ? (
                            <span className="text-primary-600 text-xs">{t.job_title}</span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {t.payment_method || 'Nakit'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-red-600">
                          -{fmt(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td colSpan={5} className="px-4 py-3 font-bold text-accent-900">Toplam Islem</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">
                        -{fmt(transactions.reduce((s, t) => s + Number(t.amount || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Debt Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Borc Ekle" size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="form-label">Aciklama *</label>
            <input className="form-input" required value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div>
            <label className="form-label">Hangi Is Icin</label>
            <select className="form-input" value={form.job_id} onChange={e => set('job_id', e.target.value)}>
              <option value="">-- Genel / Is secilmedi --</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Tutar (₺) *</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">KDV Orani (%)</label>
              <input
                className="form-input"
                type="number"
                step="1"
                min="0"
                max="100"
                value={form.kdv_rate}
                onChange={e => set('kdv_rate', e.target.value)}
              />
            </div>
          </div>

          {/* KDV Preview */}
          {Number(form.amount) > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between text-gray-500">
                <span>Tutar:</span>
                <span>{fmt(form.amount)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>KDV (%{form.kdv_rate}):</span>
                <span>{fmt(kdvAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-accent-900 border-t border-gray-200 pt-1">
                <span>KDV Dahil Toplam:</span>
                <span>{fmt(totalWithKdv)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Borc Tarihi *</label>
              <input
                className="form-input"
                type="date"
                required
                value={form.debt_date}
                onChange={e => set('debt_date', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Vade Tarihi</label>
              <input
                className="form-input"
                type="date"
                value={form.due_date}
                onChange={e => set('due_date', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Not</label>
            <textarea className="form-input" rows={2} value={form.note} onChange={e => set('note', e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Iptal
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
