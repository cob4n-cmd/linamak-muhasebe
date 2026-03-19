import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';

const fmt = v => Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

export default function SupplierDetail() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unpaid | paid
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);

  // Edit modal
  const [editModal, setEditModal] = useState(null); // expense object or null
  const [editForm, setEditForm] = useState({ description: '', amount: '', kdv_rate: 20, expense_date: '', category: 'Genel', job_id: '' });
  const [editSaving, setEditSaving] = useState(false);

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

  useEffect(() => {
    fetchSupplier();
    fetchJobs();
    api.get('/expenses/categories').then(r => setCategories(r.data)).catch(() => {});
  }, [fetchSupplier, fetchJobs]);

  const handleTogglePaid = async (expenseId) => {
    try {
      await api.put(`/suppliers/expenses/${expenseId}/toggle-paid`);
      fetchSupplier();
    } catch (err) {
      alert(err.response?.data?.error || 'Hata olustu');
    }
  };

  const handleDelete = async (expenseId) => {
    if (!window.confirm('Bu kaydi silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/suppliers/expenses/${expenseId}`);
      fetchSupplier();
    } catch (err) {
      alert(err.response?.data?.error || 'Silme hatasi');
    }
  };

  const openEdit = (expense) => {
    setEditModal(expense);
    setEditForm({
      description: expense.description || '',
      amount: expense.amount || '',
      kdv_rate: expense.kdv_rate || 20,
      expense_date: expense.expense_date || '',
      category: expense.category || 'Genel',
      job_id: expense.job_id || '',
    });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      await api.put(`/suppliers/expenses/${editModal.id}`, {
        ...editForm,
        amount: Number(editForm.amount),
        kdv_rate: Number(editForm.kdv_rate),
        job_id: editForm.job_id ? Number(editForm.job_id) : null,
      });
      setEditModal(null);
      fetchSupplier();
    } catch (err) {
      alert(err.response?.data?.error || 'Hata olustu');
    } finally {
      setEditSaving(false);
    }
  };

  const setEdit = (key, val) => setEditForm(f => ({ ...f, [key]: val }));

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

  const expenses = supplier.expenses || [];
  const filteredExpenses = expenses.filter(e => {
    if (filter === 'unpaid') return !e.is_paid;
    if (filter === 'paid') return e.is_paid;
    return true;
  });

  const unpaidTotal = expenses.filter(e => !e.is_paid).reduce((s, e) => s + Number(e.total_with_kdv || 0), 0);
  const paidTotal = expenses.filter(e => e.is_paid).reduce((s, e) => s + Number(e.total_with_kdv || 0), 0);
  const grandTotal = unpaidTotal + paidTotal;

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('tr-TR');
  };

  const editKdvAmount = (Number(editForm.amount) || 0) * (Number(editForm.kdv_rate) || 0) / 100;
  const editTotalWithKdv = (Number(editForm.amount) || 0) + editKdvAmount;

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
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Odenmemis Borc" value={fmt(unpaidTotal)} color="red" icon="⏳" />
        <StatCard title="Odenen Toplam" value={fmt(paidTotal)} color="green" icon="✓" />
        <StatCard title="Genel Toplam" value={fmt(grandTotal)} color="gray" icon="📊" />
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Tumu', count: expenses.length },
            { key: 'unpaid', label: 'Odenmemis', count: expenses.filter(e => !e.is_paid).length },
            { key: 'paid', label: 'Odenmis', count: expenses.filter(e => e.is_paid).length },
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
        <p className="text-xs text-gray-400 hidden sm:block">
          Masraflar, is detayindan tedarikci secilerek eklenir
        </p>
      </div>

      {/* Expenses Table */}
      {filteredExpenses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">
            {filter === 'all' ? 'Bu tedarikciden henuz alisveris yapilmamis' :
             filter === 'unpaid' ? 'Odenmemis borc yok' : 'Odenmis kayit yok'}
          </p>
          {filter === 'all' && (
            <p className="text-gray-400 text-sm mt-1">Is masraflarinda bu tedarikciyi sectiginizde burada gorunecektir</p>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Aciklama</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Kategori</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Is</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Tutar</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">KDV Dahil</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Durum</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Islemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(e.expense_date)}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-accent-900">{e.description || e.category}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                      {e.job_title ? (
                        <Link to={`/jobs/${e.job_id}`} className="text-primary-600 hover:underline text-xs">
                          {e.job_title}
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-xs">Genel</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap hidden sm:table-cell">{fmt(e.amount)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-medium">{fmt(e.total_with_kdv)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleTogglePaid(e.id)}
                        className="cursor-pointer"
                        title={e.is_paid ? 'Odenmemis olarak isaretle' : 'Odendi olarak isaretle'}
                      >
                        {e.is_paid ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors">
                            Odendi
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors">
                            Odenmedi
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(e)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Duzenle"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
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
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={5} className="px-4 py-3 font-bold text-accent-900 hidden sm:table-cell">
                    {filter === 'unpaid' ? 'Odenmemis Toplam' : filter === 'paid' ? 'Odenmis Toplam' : 'Genel Toplam'}
                  </td>
                  <td colSpan={2} className="px-4 py-3 font-bold text-accent-900 sm:hidden">Toplam</td>
                  <td className="px-4 py-3 text-right font-bold text-accent-900">
                    {fmt(filteredExpenses.reduce((s, e) => s + Number(e.total_with_kdv || 0), 0))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Masraf Duzenle" size="md">
        <form onSubmit={handleEditSave} className="space-y-4">
          <div>
            <label className="form-label">Aciklama</label>
            <input className="form-input" value={editForm.description} onChange={e => setEdit('description', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Tutar (₺) *</label>
              <input className="form-input" type="number" step="0.01" min="0" required value={editForm.amount} onChange={e => setEdit('amount', e.target.value)} />
            </div>
            <div>
              <label className="form-label">KDV Orani (%)</label>
              <input className="form-input" type="number" step="1" min="0" max="100" value={editForm.kdv_rate} onChange={e => setEdit('kdv_rate', e.target.value)} />
            </div>
          </div>

          {Number(editForm.amount) > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between text-gray-500">
                <span>Tutar:</span><span>{fmt(editForm.amount)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>KDV (%{editForm.kdv_rate}):</span><span>{fmt(editKdvAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-accent-900 border-t border-gray-200 pt-1">
                <span>KDV Dahil:</span><span>{fmt(editTotalWithKdv)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Tarih *</label>
              <input className="form-input" type="date" required value={editForm.expense_date} onChange={e => setEdit('expense_date', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Kategori</label>
              <select className="form-input" value={editForm.category} onChange={e => setEdit('category', e.target.value)}>
                {categories.length > 0
                  ? categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                  : <option value="Genel">Genel</option>
                }
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Hangi Is Icin</label>
            <select className="form-input" value={editForm.job_id} onChange={e => setEdit('job_id', e.target.value)}>
              <option value="">-- Genel --</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditModal(null)} className="btn-secondary">Iptal</button>
            <button type="submit" disabled={editSaving} className="btn-primary">
              {editSaving ? 'Kaydediliyor...' : 'Guncelle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
