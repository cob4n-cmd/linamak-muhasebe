import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';

const fmt = v => Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

const emptyForm = {
  name: '', contact_person: '', phone: '', email: '',
  tax_office: '', tax_number: '', address: '', city: '', note: ''
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/suppliers', { params: { search } });
      setSuppliers(data);
    } catch (err) {
      console.error('Tedarikciler yuklenemedi:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchSuppliers, 300);
    return () => clearTimeout(timer);
  }, [fetchSuppliers]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name || '', contact_person: s.contact_person || '',
      phone: s.phone || '', email: s.email || '',
      tax_office: s.tax_office || '', tax_number: s.tax_number || '',
      address: s.address || '', city: s.city || '', note: s.note || ''
    });
    setModalOpen(true);
  };

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, form);
      } else {
        await api.post('/suppliers', form);
      }
      setModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      alert(err.response?.data?.error || 'Hata olustu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu tedarikciyi silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      fetchSuppliers();
    } catch (err) {
      alert(err.response?.data?.error || 'Silme hatasi');
    }
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const totalSuppliers = suppliers.length;
  const totalUnpaid = suppliers.reduce((s, t) => s + Number(t.unpaid_debt || 0), 0);
  const totalDebt = suppliers.reduce((s, t) => s + Number(t.total_debt || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-accent-900">Tedarikciler</h1>
          <p className="text-sm text-gray-500 mt-1">Tedarikci ve borc yonetimi</p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Tedarikci
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Tedarikci ara (isim, yetkili, telefon)..."
          className="form-input pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Toplam Tedarikci" value={totalSuppliers} color="orange" icon="🏢" />
        <StatCard title="Odenmemis Borc" value={fmt(totalUnpaid)} color="red" icon="⏳" />
        <StatCard title="Toplam Borc" value={fmt(totalDebt)} color="gray" icon="📊" />
      </div>

      {/* Supplier Cards Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Yukleniyor...</div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">Tedarikci bulunamadi</p>
          <p className="text-gray-400 text-sm mt-1">Yeni tedarikci eklemek icin butonu kullanin</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(s => (
            <div key={s.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-accent-900 truncate">{s.name}</h3>
                  {s.contact_person && (
                    <p className="text-sm text-gray-500 mt-0.5">{s.contact_person}</p>
                  )}
                </div>
                <div className="flex gap-1 ml-2 shrink-0">
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    title="Duzenle"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Sil"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {s.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="truncate">{s.phone}</span>
                </div>
              )}

              {s.city && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{s.city}</span>
                </div>
              )}

              <div className="border-t border-gray-100 pt-3 mt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Odenmemis Borc</p>
                  <p className={`text-sm font-bold ${Number(s.unpaid_debt) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {fmt(s.unpaid_debt)}
                  </p>
                </div>
                <Link
                  to={`/suppliers/${s.id}`}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  Detay
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Tedarikci Duzenle' : 'Yeni Tedarikci'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Firma Adi *</label>
              <input className="form-input" required value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Yetkili Kisi</label>
              <input className="form-input" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Telefon</label>
              <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="form-label">E-posta</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Sehir</label>
              <input className="form-input" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Vergi Dairesi</label>
              <input className="form-input" value={form.tax_office} onChange={e => set('tax_office', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Vergi No</label>
              <input className="form-input" value={form.tax_number} onChange={e => set('tax_number', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Adres</label>
              <input className="form-input" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Not</label>
              <textarea className="form-input" rows={2} value={form.note} onChange={e => set('note', e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Iptal
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Kaydediliyor...' : (editing ? 'Guncelle' : 'Kaydet')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
