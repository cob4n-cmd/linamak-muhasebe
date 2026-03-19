import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

const fmt = v => Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

const statusOptions = [
  { value: 'all', label: 'Tum Durumlar' },
  { value: 'beklemede', label: 'Beklemede' },
  { value: 'devam', label: 'Devam Ediyor' },
  { value: 'tamamlandi', label: 'Tamamlandi' },
  { value: 'iptal', label: 'Iptal' },
  { value: 'durduruldu', label: 'Durduruldu' },
];

const emptyForm = {
  title: '', customer_id: '', customer_name: '', description: '', status: 'beklemede',
  invoice_no: '', faturali_tutar: '', faturasiz_tutar: '', kdv_rate: 20,
  start_date: '', end_date: '',
};

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [customerMode, setCustomerMode] = useState('select'); // 'select' | 'type'
  const [suppliers, setSuppliers] = useState([]);
  const [expCategories, setExpCategories] = useState([]);
  const [expModal, setExpModal] = useState(null); // job id or null
  const [expForm, setExpForm] = useState({ description: '', faturali_tutar: '', faturasiz_tutar: '', kdv_rate: 20, category: 'Genel', supplier_id: '', supplier_name: '', expense_date: '', note: '' });
  const [supplierMode, setSupplierMode] = useState('select'); // 'select' | 'type'
  const [expSaving, setExpSaving] = useState(false);

  // Tahsilat modal
  const [tahModal, setTahModal] = useState(null); // job id or null
  const [tahForm, setTahForm] = useState({ amount: '', payment_date: '', method: 'nakit', note: '' });
  const [tahSaving, setTahSaving] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get('/jobs', { params });
      setJobs(data);
    } catch (err) {
      console.error('Isler yuklenemedi:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  const fetchCustomers = useCallback(async () => {
    try {
      const { data } = await api.get('/customers');
      setCustomers(data);
    } catch (err) {
      console.error('Musteriler yuklenemedi:', err);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);
  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    api.get('/suppliers').then(r => setSuppliers(r.data)).catch(() => {});
    api.get('/expenses/categories').then(r => setExpCategories(r.data)).catch(() => {});
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setCustomerMode('select');
    setModalOpen(true);
  };

  const openEdit = (job) => {
    setEditing(job.id);
    setForm({
      title: job.title || '',
      customer_id: job.customer_id || '',
      customer_name: '',
      description: job.description || '',
      status: job.status || 'beklemede',
      invoice_no: job.invoice_no || '',
      faturali_tutar: job.faturali_tutar || '',
      faturasiz_tutar: job.faturasiz_tutar || '',
      kdv_rate: job.kdv_rate || 20,
      start_date: job.start_date || '',
      end_date: job.end_date || '',
    });
    setCustomerMode(job.customer_id ? 'select' : 'type');
    setModalOpen(true);
  };

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        status: form.status,
        invoice_no: Number(form.faturali_tutar) > 0 ? form.invoice_no : '',
        faturali_tutar: Number(form.faturali_tutar) || 0,
        faturasiz_tutar: Number(form.faturasiz_tutar) || 0,
        kdv_rate: Number(form.kdv_rate) || 20,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };

      if (customerMode === 'select' && form.customer_id) {
        payload.customer_id = form.customer_id;
      } else if (customerMode === 'type' && form.customer_name.trim()) {
        payload.customer_name = form.customer_name.trim();
      }

      if (editing) {
        await api.put(`/jobs/${editing}`, payload);
      } else {
        await api.post('/jobs', payload);
      }
      setModalOpen(false);
      fetchJobs();
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.error || 'Hata olustu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu isi silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/jobs/${id}`);
      fetchJobs();
    } catch (err) {
      alert('Silme hatasi');
    }
  };

  const openExpenseModal = (jobId) => {
    setExpModal(jobId);
    setExpForm({ description: '', faturali_tutar: '', faturasiz_tutar: '', kdv_rate: 20, category: 'Genel', supplier_id: '', supplier_name: '', expense_date: new Date().toISOString().slice(0, 10), note: '' });
    setSupplierMode('select');
  };

  const handleExpenseSave = async (e) => {
    e.preventDefault();
    setExpSaving(true);
    try {
      let supplierId = null;
      if (supplierMode === 'select' && expForm.supplier_id) {
        supplierId = expForm.supplier_id;
      } else if (supplierMode === 'type' && expForm.supplier_name.trim()) {
        // Auto-create supplier
        const existing = suppliers.find(s => s.name.toLowerCase() === expForm.supplier_name.trim().toLowerCase());
        if (existing) {
          supplierId = existing.id;
        } else {
          const res = await api.post('/suppliers', { name: expForm.supplier_name.trim() });
          supplierId = res.data.id;
          // Refresh suppliers list
          const sRes = await api.get('/suppliers');
          setSuppliers(sRes.data);
        }
      }

      await api.post('/expenses', {
        job_id: expModal,
        supplier_id: supplierId,
        category: expForm.category,
        description: expForm.description,
        faturali_tutar: parseFloat(expForm.faturali_tutar) || 0,
        faturasiz_tutar: parseFloat(expForm.faturasiz_tutar) || 0,
        kdv_rate: parseFloat(expForm.kdv_rate) || 20,
        expense_date: expForm.expense_date,
        is_paid: false,
        payment_method: 'nakit',
      });

      setExpModal(null);
      fetchJobs();
    } catch (err) {
      alert(err.response?.data?.error || 'Masraf eklenirken hata olustu');
    } finally {
      setExpSaving(false);
    }
  };

  const setExp = (key, val) => setExpForm(f => ({ ...f, [key]: val }));

  // Tahsilat handlers
  const openTahsilatModal = (jobId) => {
    setTahModal(jobId);
    setTahForm({ amount: '', payment_date: new Date().toISOString().slice(0, 10), method: 'nakit', note: '' });
  };

  const handleTahsilatSave = async (e) => {
    e.preventDefault();
    setTahSaving(true);
    try {
      await api.post('/payments', {
        job_id: tahModal,
        amount: parseFloat(tahForm.amount),
        payment_date: tahForm.payment_date,
        method: tahForm.method,
        note: tahForm.note,
      });
      setTahModal(null);
      fetchJobs();
    } catch (err) {
      alert(err.response?.data?.error || 'Tahsilat eklenirken hata olustu');
    } finally {
      setTahSaving(false);
    }
  };

  const setTah = (key, val) => setTahForm(f => ({ ...f, [key]: val }));

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const computedFaturaliKdvDahil = () => {
    const ft = Number(form.faturali_tutar) || 0;
    const rate = Number(form.kdv_rate) || 0;
    return Math.round(ft * (1 + rate / 100) * 100) / 100;
  };

  const computedToplamAnlasma = () => {
    return computedFaturaliKdvDahil() + (Number(form.faturasiz_tutar) || 0);
  };

  // Summary calculations
  const totalContract = jobs.reduce((s, j) => s + Number(j.contract_value_with_kdv || 0), 0);
  const totalPaid = jobs.reduce((s, j) => s + Number(j.total_paid || 0), 0);
  const totalExpenseAll = jobs.reduce((s, j) => s + Number(j.total_expense || 0), 0);
  const totalNetProfit = totalPaid - totalExpenseAll;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-accent-900">Isler</h1>
          <p className="text-sm text-gray-500 mt-1">Tum is ve projeleri yonetin</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Yeni Is
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard title="Is Sayisi" value={jobs.length} color="blue" icon="📋" />
        <StatCard title="Toplam Sozlesme" value={fmt(totalContract)} color="primary" icon="📄" />
        <StatCard title="Toplam Tahsilat" value={fmt(totalPaid)} color="green" icon="💰" />
        <StatCard title="Toplam Gider" value={fmt(totalExpenseAll)} color="red" icon="📉" />
        <StatCard title="Net Kar" value={fmt(totalNetProfit)} color={totalNetProfit >= 0 ? 'green' : 'red'} icon="📊" />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Is veya musteri ara..."
              className="form-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-input sm:w-48"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {statusOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Baslik</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Musteri</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Sozlesme</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Tahsilat</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Gider</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Net Kar</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Odeme</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Durum</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Islemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    Henuz is bulunmuyor
                  </td>
                </tr>
              ) : (
                jobs.map(job => (
                  <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/jobs/${job.id}`} className="font-medium text-accent-900 hover:text-primary-600">
                        {job.title}
                      </Link>
                      <div className="text-xs text-gray-400 sm:hidden mt-0.5">{job.customer_name || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{job.customer_name || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium hidden sm:table-cell">{fmt(job.contract_value_with_kdv)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium hidden sm:table-cell">{fmt(job.total_paid)}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium hidden md:table-cell">{fmt(job.total_expense)}</td>
                    <td className="px-4 py-3 text-right font-medium hidden md:table-cell">
                      {(() => {
                        const net = Number(job.total_paid || 0) - Number(job.total_expense || 0);
                        return <span className={net >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmt(net)}</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      {(() => {
                        const paid = Number(job.total_paid || 0);
                        const contract = Number(job.contract_value_with_kdv || 0);
                        const remaining = contract - paid;
                        const pct = contract > 0 ? Math.round(paid / contract * 100) : 0;
                        if (pct >= 100) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Tamamen Alindi</span>;
                        if (pct > 0) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">%{pct} - Kalan {fmt(remaining)}</span>;
                        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Tahsilat Yok</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Detay"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </Link>
                        <button
                          onClick={() => openTahsilatModal(job.id)}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Tahsilat Ekle"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                        <button
                          onClick={() => openExpenseModal(job.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Masraf Ekle"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </button>
                        <button
                          onClick={() => openEdit(job)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Duzenle"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Is Duzenle' : 'Yeni Is'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {/* Title */}
          <div>
            <label className="form-label">Is Basligi *</label>
            <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>

          {/* Customer */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">Musteri</label>
              <button
                type="button"
                className="text-xs text-primary-600 hover:text-primary-700"
                onClick={() => setCustomerMode(m => m === 'select' ? 'type' : 'select')}
              >
                {customerMode === 'select' ? 'Yeni musteri yaz' : 'Listeden sec'}
              </button>
            </div>
            {customerMode === 'select' ? (
              <select className="form-input" value={form.customer_id} onChange={e => set('customer_id', e.target.value)}>
                <option value="">Musteri secin</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <input className="form-input" placeholder="Musteri adi yazin" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} />
            )}
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Aciklama</label>
            <textarea className="form-input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {/* Status */}
          <div>
            <label className="form-label">Durum</label>
            <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
              {statusOptions.filter(o => o.value !== 'all').map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Faturali Tutar & KDV */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Faturali Tutar</label>
              <input className="form-input" type="number" step="0.01" min="0" value={form.faturali_tutar} onChange={e => set('faturali_tutar', e.target.value)} placeholder="KDV'li kisim" />
            </div>
            <div>
              <label className="form-label">KDV Orani (%)</label>
              <input className="form-input" type="number" step="1" min="0" max="100" value={form.kdv_rate} onChange={e => set('kdv_rate', e.target.value)} />
            </div>
            <div>
              <label className="form-label">KDV Dahil Faturali</label>
              <div className="form-input bg-gray-50 text-gray-700 font-medium">{fmt(computedFaturaliKdvDahil())}</div>
            </div>
          </div>

          {/* Invoice No (conditional) */}
          {Number(form.faturali_tutar) > 0 && (
            <div>
              <label className="form-label">Fatura No</label>
              <input className="form-input" value={form.invoice_no} onChange={e => set('invoice_no', e.target.value)} placeholder="Fatura numarasi" />
            </div>
          )}

          {/* Faturasiz Tutar & Toplam */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Faturasiz Tutar</label>
              <input className="form-input" type="number" step="0.01" min="0" value={form.faturasiz_tutar} onChange={e => set('faturasiz_tutar', e.target.value)} placeholder="KDV'siz kisim" />
            </div>
            <div></div>
            <div>
              <label className="form-label">Toplam Anlasma</label>
              <div className="form-input bg-primary-50 text-primary-700 font-bold">{fmt(computedToplamAnlasma())}</div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Baslangic Tarihi</label>
              <input className="form-input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Bitis Tarihi</label>
              <input className="form-input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Iptal</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Kaydediliyor...' : (editing ? 'Guncelle' : 'Kaydet')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Tahsilat Ekle Modal */}
      <Modal open={!!tahModal} onClose={() => setTahModal(null)} title="Tahsilat Ekle">
        <form onSubmit={handleTahsilatSave} className="space-y-4">
          <div>
            <label className="form-label">Tutar (₺) *</label>
            <input className="form-input" type="number" step="0.01" min="0" required value={tahForm.amount} onChange={e => setTah('amount', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Tarih *</label>
            <input className="form-input" type="date" required value={tahForm.payment_date} onChange={e => setTah('payment_date', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Odeme Yontemi</label>
            <select className="form-input" value={tahForm.method} onChange={e => setTah('method', e.target.value)}>
              <option value="nakit">Nakit</option>
              <option value="havale/eft">Havale/EFT</option>
              <option value="cek">Cek</option>
              <option value="kredi_karti">Kredi Karti</option>
              <option value="diger">Diger</option>
            </select>
          </div>
          <div>
            <label className="form-label">Not</label>
            <input className="form-input" value={tahForm.note} onChange={e => setTah('note', e.target.value)} placeholder="Tahsilat notu (opsiyonel)" />
          </div>
          <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">Tahsilat eklendiginde otomatik olarak Gelir kaydı da olusturulur.</p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={() => setTahModal(null)} className="btn-secondary">Iptal</button>
            <button type="submit" disabled={tahSaving} className="btn-primary">
              {tahSaving ? 'Kaydediliyor...' : 'Tahsilat Ekle'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Masraf Ekle Modal */}
      <Modal open={!!expModal} onClose={() => setExpModal(null)} title="Masraf Ekle" size="md">
        <form onSubmit={handleExpenseSave} className="space-y-4">
          <div>
            <label className="form-label">Aciklama *</label>
            <input className="form-input" value={expForm.description} onChange={e => setExp('description', e.target.value)} placeholder="Masraf aciklamasi" required />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Faturali Tutar (₺)</label>
              <input className="form-input" type="number" step="0.01" min="0" value={expForm.faturali_tutar} onChange={e => setExp('faturali_tutar', e.target.value)} placeholder="KDV uygulanacak" />
            </div>
            <div>
              <label className="form-label">Faturasiz Tutar (₺)</label>
              <input className="form-input" type="number" step="0.01" min="0" value={expForm.faturasiz_tutar} onChange={e => setExp('faturasiz_tutar', e.target.value)} placeholder="KDV uygulanmaz" />
            </div>
            <div>
              <label className="form-label">KDV Orani (%)</label>
              <input className="form-input" type="number" step="1" min="0" max="100" value={expForm.kdv_rate} onChange={e => setExp('kdv_rate', e.target.value)} />
            </div>
          </div>

          {/* KDV Onizleme */}
          {(Number(expForm.faturali_tutar) > 0 || Number(expForm.faturasiz_tutar) > 0) && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              {Number(expForm.faturali_tutar) > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Faturali:</span><span>{fmt(expForm.faturali_tutar)}</span>
                </div>
              )}
              {Number(expForm.faturali_tutar) > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>KDV (%{expForm.kdv_rate}):</span><span>{fmt(Number(expForm.faturali_tutar) * Number(expForm.kdv_rate) / 100)}</span>
                </div>
              )}
              {Number(expForm.faturasiz_tutar) > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Faturasiz:</span><span>{fmt(expForm.faturasiz_tutar)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-accent-900 border-t border-gray-200 pt-1">
                <span>Toplam (KDV Dahil):</span>
                <span>{fmt(
                  Number(expForm.faturali_tutar || 0) * (1 + Number(expForm.kdv_rate || 0) / 100) + Number(expForm.faturasiz_tutar || 0)
                )}</span>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Tarih *</label>
              <input className="form-input" type="date" value={expForm.expense_date} onChange={e => setExp('expense_date', e.target.value)} required />
            </div>
            <div>
              <label className="form-label">Kategori</label>
              <select className="form-input" value={expForm.category} onChange={e => setExp('category', e.target.value)}>
                {expCategories.length > 0
                  ? expCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                  : <option value="Genel">Genel</option>
                }
              </select>
            </div>
          </div>

          {/* Supplier Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">Tedarikci</label>
              <button
                type="button"
                className="text-xs text-primary-600 hover:text-primary-700"
                onClick={() => setSupplierMode(m => m === 'select' ? 'type' : 'select')}
              >
                {supplierMode === 'select' ? 'Yeni tedarikci yaz' : 'Listeden sec'}
              </button>
            </div>
            {supplierMode === 'select' ? (
              <select className="form-input" value={expForm.supplier_id} onChange={e => setExp('supplier_id', e.target.value)}>
                <option value="">Tedarikci secin (opsiyonel)</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : (
              <input className="form-input" placeholder="Yeni tedarikci adi yazin" value={expForm.supplier_name} onChange={e => setExp('supplier_name', e.target.value)} />
            )}
            {supplierMode === 'type' && expForm.supplier_name.trim() && (
              <p className="text-xs text-gray-500 mt-1">Yeni tedarikci otomatik olusturulacak. Daha sonra Tedarikciler menusunden duzenleyebilirsiniz.</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={() => setExpModal(null)} className="btn-secondary">Iptal</button>
            <button type="submit" disabled={expSaving} className="btn-primary">
              {expSaving ? 'Kaydediliyor...' : 'Masraf Ekle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
