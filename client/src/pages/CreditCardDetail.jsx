import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';

const fmt = v => Number(v||0).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' ₺';

export default function CreditCardDetail() {
  const { id } = useParams();
  const [card, setCard] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', transaction_date: '', installment_count: 1, category: 'Genel', note: '' });

  const load = () => api.get(`/credit-cards/${id}`).then(r => setCard(r.data));
  useEffect(load, [id]);

  const save = async e => {
    e.preventDefault();
    await api.post(`/credit-cards/${id}/transactions`, { ...form, amount: parseFloat(form.amount), installment_count: parseInt(form.installment_count) });
    setModal(false);
    setForm({ description: '', amount: '', transaction_date: '', installment_count: 1, category: 'Genel', note: '' });
    load();
  };

  const payInstallment = async tid => {
    await api.put(`/credit-cards/transactions/${tid}/pay`);
    load();
  };

  const del = async tid => {
    if (confirm('Islem silinsin mi?')) { await api.delete(`/credit-cards/transactions/${tid}`); load(); }
  };

  if (!card) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"/></div>;

  const currentDebt = card.transactions?.filter(t => !t.is_paid).reduce((s, t) => s + t.installment_amount * t.remaining_installments, 0) || 0;
  const availableLimit = card.credit_limit - currentDebt;
  const unpaidCount = card.transactions?.filter(t => !t.is_paid).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/credit-cards" className="text-primary-500 hover:text-primary-700 text-sm">&larr; Kredi Kartlari</Link>
          <h1 className="text-2xl font-bold text-accent-900">{card.bank_name}</h1>
          <p className="text-sm text-accent-500">{card.card_name} {card.last_four_digits && `(**** ${card.last_four_digits})`}</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary">+ Harcama Ekle</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Mevcut Borc" value={fmt(currentDebt)} color="red" icon="💳" />
        <StatCard title="Kullanilabilir Limit" value={fmt(availableLimit)} color="green" icon="✅" />
        <StatCard title="Toplam Limit" value={fmt(card.credit_limit)} color="primary" icon="🏦" />
        <StatCard title="Taksitli Islem" value={unpaidCount} color="amber" icon="📊" />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-accent-800">Harcamalar</h3>
          <p className="text-xs text-accent-500">Hesap Kesim: {card.closing_day}. gun | Son Odeme: {card.due_day}. gun</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>
              <th className="table-th">Tarih</th>
              <th className="table-th">Aciklama</th>
              <th className="table-th hidden sm:table-cell">Kategori</th>
              <th className="table-th text-right">Toplam</th>
              <th className="table-th text-center">Taksit</th>
              <th className="table-th text-right hidden sm:table-cell">Aylik</th>
              <th className="table-th text-center">Durum</th>
              <th className="table-th">Islem</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {card.transactions?.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="table-td">{t.transaction_date}</td>
                  <td className="table-td font-medium">{t.description}</td>
                  <td className="table-td hidden sm:table-cell">{t.category}</td>
                  <td className="table-td text-right">{fmt(t.amount)}</td>
                  <td className="table-td text-center">
                    {t.installment_count > 1
                      ? <span className="text-xs">{t.installment_count - t.remaining_installments}/{t.installment_count}</span>
                      : <span className="text-xs text-accent-400">Tek</span>}
                  </td>
                  <td className="table-td text-right hidden sm:table-cell">{fmt(t.installment_amount)}</td>
                  <td className="table-td text-center">
                    {t.is_paid
                      ? <span className="badge bg-emerald-100 text-emerald-800">Odendi</span>
                      : <span className="badge bg-amber-100 text-amber-800">{t.remaining_installments} taksit kaldi</span>}
                  </td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      {!t.is_paid && (
                        <button onClick={() => payInstallment(t.id)} className="text-emerald-600 hover:text-emerald-800 text-xs font-medium">Taksit Ode</button>
                      )}
                      <button onClick={() => del(t.id)} className="text-red-500 hover:text-red-700 text-xs">Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!card.transactions || card.transactions.length === 0) && (
                <tr><td colSpan={8} className="text-center py-8 text-accent-400">Henuz harcama yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Yeni Harcama">
        <form onSubmit={save} className="space-y-4">
          <div><label className="form-label">Aciklama *</label><input className="form-input" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} required /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="form-label">Tutar (₺) *</label><input className="form-input" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} required /></div>
            <div><label className="form-label">Tarih *</label><input className="form-input" type="date" value={form.transaction_date} onChange={e => setForm(f => ({...f, transaction_date: e.target.value}))} required /></div>
            <div><label className="form-label">Taksit Sayisi</label>
              <select className="form-input" value={form.installment_count} onChange={e => setForm(f => ({...f, installment_count: e.target.value}))}>
                {[1,2,3,4,5,6,7,8,9,10,11,12,18,24,36].map(n => <option key={n} value={n}>{n === 1 ? 'Tek Cekim' : `${n} Taksit`}</option>)}
              </select>
            </div>
            <div><label className="form-label">Kategori</label><input className="form-input" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} /></div>
          </div>
          <div><label className="form-label">Not</label><textarea className="form-input" rows={2} value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Iptal</button>
            <button type="submit" className="btn-primary">Ekle</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
