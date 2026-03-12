import React, { useState, useEffect } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const fmt = v => Number(v||0).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' ₺';
const typeLabels = { nakit: 'Nakit', banka: 'Banka', arac: 'Arac', ekipman: 'Ekipman', gayrimenkul: 'Gayrimenkul', diger: 'Diger' };
const COLORS = ['#F7941D', '#FBB040', '#4CAF50', '#2196F3', '#9C27B0', '#9E9E9E'];

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [balance, setBalance] = useState(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'diger', value: '', description: '', acquisition_date: '', note: '' });

  const load = () => {
    api.get('/assets').then(r => setAssets(r.data));
    api.get('/assets/balance-sheet').then(r => setBalance(r.data));
  };
  useEffect(load, []);

  const openAdd = () => { setEditing(null); setForm({ name: '', type: 'diger', value: '', description: '', acquisition_date: '', note: '' }); setModal(true); };
  const openEdit = a => { setEditing(a); setForm({ name: a.name, type: a.type, value: a.value, description: a.description || '', acquisition_date: a.acquisition_date || '', note: a.note || '' }); setModal(true); };

  const save = async e => {
    e.preventDefault();
    const data = { ...form, value: parseFloat(form.value) || 0 };
    if (editing) await api.put(`/assets/${editing.id}`, data);
    else await api.post('/assets', data);
    setModal(false); load();
  };

  const del = async id => { if (confirm('Varlik silinsin mi?')) { await api.delete(`/assets/${id}`); load(); } };

  const grouped = {};
  assets.forEach(a => { if (!grouped[a.type]) grouped[a.type] = []; grouped[a.type].push(a); });

  const pieData = balance?.assets?.map((a, i) => ({ name: typeLabels[a.type] || a.type, value: a.total })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-accent-900">Genel Varlik</h1>
          <p className="text-sm text-accent-500">Bilanco ve varlik takibi</p>
        </div>
        <button onClick={openAdd} className="btn-primary">+ Varlik Ekle</button>
      </div>

      {balance && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Toplam Varlik" value={fmt(balance.totalAssets)} color="green" icon="🏦" />
          <StatCard title="Toplam Borc" value={fmt(balance.totalLiabilities)} color="red" icon="📉" />
          <StatCard title="Net Varlik" value={fmt(balance.netWorth)} color={balance.netWorth >= 0 ? 'primary' : 'red'} icon="💎" />
          <StatCard title="Kart Borcu" value={fmt(balance.ccDebt)} color="orange" icon="💳" />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="card">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                <h3 className="font-semibold text-accent-800">{typeLabels[type] || type}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map(a => (
                  <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-accent-900">{a.name}</p>
                      {a.description && <p className="text-xs text-accent-500">{a.description}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-accent-800">{fmt(a.value)}</span>
                      <button onClick={() => openEdit(a)} className="text-primary-500 hover:text-primary-700 text-sm">Duzenle</button>
                      <button onClick={() => del(a.id)} className="text-red-500 hover:text-red-700 text-sm">Sil</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {assets.length === 0 && <p className="text-center py-8 text-accent-400">Henuz varlik eklenmemis</p>}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-accent-800 mb-4">Varlik Dagilimi</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} %${(percent*100).toFixed(0)}`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-accent-400 py-8">Veri yok</p>}

          {balance && (
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-accent-600">Tedarikci Borcu</span><span className="font-medium text-red-600">{fmt(balance.supplierDebt)}</span></div>
              <div className="flex justify-between"><span className="text-accent-600">Kart Borcu</span><span className="font-medium text-red-600">{fmt(balance.ccDebt)}</span></div>
              <hr />
              <div className="flex justify-between font-semibold"><span>Net Varlik</span><span className={balance.netWorth >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmt(balance.netWorth)}</span></div>
            </div>
          )}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Varlik Duzenle' : 'Yeni Varlik'}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="form-label">Varlik Adi *</label><input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required /></div>
            <div><label className="form-label">Tur</label>
              <select className="form-input" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
                {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className="form-label">Deger (₺) *</label><input className="form-input" type="number" step="0.01" value={form.value} onChange={e => setForm(f => ({...f, value: e.target.value}))} required /></div>
            <div><label className="form-label">Edinim Tarihi</label><input className="form-input" type="date" value={form.acquisition_date} onChange={e => setForm(f => ({...f, acquisition_date: e.target.value}))} /></div>
          </div>
          <div><label className="form-label">Aciklama</label><input className="form-input" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
          <div><label className="form-label">Not</label><textarea className="form-input" rows={2} value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Iptal</button>
            <button type="submit" className="btn-primary">{editing ? 'Guncelle' : 'Ekle'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
