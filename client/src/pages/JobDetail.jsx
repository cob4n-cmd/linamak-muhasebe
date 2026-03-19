import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

const fmt = v => Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

const methodLabels = {
  nakit: 'Nakit',
  'havale/eft': 'Havale/EFT',
  cek: 'Cek',
  kredi_karti: 'Kredi Karti',
  diger: 'Diger',
};

const emptyPayment = { amount: '', payment_date: '', method: 'nakit', note: '' };
const emptyExpense = { category: '', supplier_id: '', description: '', faturali_tutar: '', faturasiz_tutar: '', kdv_rate: 20, expense_date: '', is_paid: false, payment_method: 'nakit' };

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payments');
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);

  // Payment modal
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [savingPayment, setSavingPayment] = useState(false);

  // Expense modal
  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [savingExpense, setSavingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null); // expense id or null

  const fetchJob = useCallback(async () => {
    try {
      const { data } = await api.get(`/jobs/${id}`);
      setJob(data);
    } catch (err) {
      console.error('Is detayi yuklenemedi:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const { data } = await api.get('/suppliers');
      setSuppliers(data);
    } catch (err) {
      console.error('Tedarikciler yuklenemedi:', err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/expenses/categories');
      setCategories(data);
    } catch (err) {
      console.error('Kategoriler yuklenemedi:', err);
    }
  }, []);

  useEffect(() => { fetchJob(); }, [fetchJob]);
  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Payment handlers
  const openPaymentModal = () => {
    setPaymentForm(emptyPayment);
    setPaymentModal(true);
  };

  const handleSavePayment = async e => {
    e.preventDefault();
    setSavingPayment(true);
    try {
      await api.post('/payments', {
        job_id: Number(id),
        amount: Number(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        method: paymentForm.method,
        note: paymentForm.note,
      });
      setPaymentModal(false);
      fetchJob();
    } catch (err) {
      alert(err.response?.data?.error || 'Hata olustu');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Bu odemeyi silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/payments/${paymentId}`);
      fetchJob();
    } catch (err) {
      alert('Silme hatasi');
    }
  };

  // Expense handlers
  const openExpenseModal = () => {
    setEditingExpense(null);
    setExpenseForm(emptyExpense);
    setExpenseModal(true);
  };

  const openEditExpense = (exp) => {
    setEditingExpense(exp.id);
    setExpenseForm({
      category: exp.category || '',
      supplier_id: exp.supplier_id || '',
      description: exp.description || '',
      faturali_tutar: exp.faturali_tutar || '',
      faturasiz_tutar: exp.faturasiz_tutar || exp.amount || '',
      kdv_rate: exp.kdv_rate || 20,
      expense_date: exp.expense_date || '',
      is_paid: exp.is_paid ? true : false,
      payment_method: exp.payment_method || 'nakit',
    });
    setExpenseModal(true);
  };

  const handleSaveExpense = async e => {
    e.preventDefault();
    setSavingExpense(true);
    try {
      const payload = {
        job_id: Number(id),
        supplier_id: expenseForm.supplier_id || null,
        category: expenseForm.category,
        description: expenseForm.description,
        faturali_tutar: Number(expenseForm.faturali_tutar) || 0,
        faturasiz_tutar: Number(expenseForm.faturasiz_tutar) || 0,
        kdv_rate: Number(expenseForm.kdv_rate) || 20,
        expense_date: expenseForm.expense_date,
        is_paid: expenseForm.is_paid,
        payment_method: expenseForm.payment_method,
      };
      if (editingExpense) {
        await api.put(`/expenses/${editingExpense}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      setExpenseModal(false);
      setEditingExpense(null);
      fetchJob();
    } catch (err) {
      alert(err.response?.data?.error || 'Hata olustu');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Bu masrafi silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/expenses/${expenseId}`);
      fetchJob();
    } catch (err) {
      alert('Silme hatasi');
    }
  };

  const setP = (key, val) => setPaymentForm(f => ({ ...f, [key]: val }));
  const setE = (key, val) => setExpenseForm(f => ({ ...f, [key]: val }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Is bulunamadi</p>
        <Link to="/jobs" className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">Islere don</Link>
      </div>
    );
  }

  const totalPaid = (job.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalExpense = (job.expenses || []).reduce((s, e) => s + Number(e.total_with_kdv || 0), 0);
  const profit = totalPaid - totalExpense;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/jobs" className="inline-flex items-center text-sm text-gray-500 hover:text-primary-600 mb-3">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Islere Don
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-accent-900">{job.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {job.customer_name && (
                <Link to={`/customers/${job.customer_id}`} className="text-sm text-primary-600 hover:text-primary-700">
                  {job.customer_name}
                </Link>
              )}
              <StatusBadge status={job.invoice_status} type="invoice" />
              <StatusBadge status={job.status} />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Toplam Anlasma" value={fmt(job.contract_value_with_kdv)} sub={`Faturali: ${fmt(job.faturali_tutar)} | Faturasiz: ${fmt(job.faturasiz_tutar)}`} color="primary" icon="📄" />
        <StatCard title="Tahsilat" value={fmt(totalPaid)} color="green" icon="💰" />
        <StatCard title="Giderler" value={fmt(totalExpense)} color="red" icon="📉" />
        <StatCard title="Kar" value={fmt(profit)} color={profit >= 0 ? 'green' : 'red'} icon={profit >= 0 ? '📈' : '📉'} />
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 sm:flex-none px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'payments'
                ? 'border-primary-500 text-primary-700 bg-primary-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Tahsilatlar ({(job.payments || []).length})
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 sm:flex-none px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'expenses'
                ? 'border-primary-500 text-primary-700 bg-primary-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Masraflar ({(job.expenses || []).length})
          </button>
        </div>

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-accent-900">Tahsilatlar</h3>
              <button onClick={openPaymentModal} className="btn-primary text-sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Tahsilat Ekle
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Tarih</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Tutar</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Yontem</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Not</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Islem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(job.payments || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Henuz tahsilat bulunmuyor</td>
                    </tr>
                  ) : (
                    (job.payments || []).map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-700">{p.payment_date}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600">{fmt(p.amount)}</td>
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{methodLabels[p.method] || p.method}</td>
                        <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{p.note || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeletePayment(p.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Sil"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-accent-900">Masraflar</h3>
              <button onClick={openExpenseModal} className="btn-primary text-sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Masraf Ekle
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Tarih</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Kategori</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Tedarikci</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Tutar</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">KDV Dahil</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Durum</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Islem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(job.expenses || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Henuz masraf bulunmuyor</td>
                    </tr>
                  ) : (
                    (job.expenses || []).map(exp => (
                      <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-700">{exp.expense_date}</td>
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{exp.category}</td>
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{exp.supplier_name || '-'}</td>
                        <td className="px-4 py-3 text-right font-medium">{fmt(exp.amount)}</td>
                        <td className="px-4 py-3 text-right text-red-600 font-medium hidden md:table-cell">{fmt(exp.total_with_kdv)}</td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          <span className={`badge ${exp.is_paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {exp.is_paid ? 'Odendi' : 'Bekliyor'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditExpense(exp)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Duzenle"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
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
        )}
      </div>

      {/* Payment Modal */}
      <Modal open={paymentModal} onClose={() => setPaymentModal(false)} title="Tahsilat Ekle">
        <form onSubmit={handleSavePayment} className="space-y-4">
          <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">Tahsilat eklendiginde otomatik olarak Gelir & Gider sayfasinda da gelir kaydı olusturulur.</p>
          <div>
            <label className="form-label">Tutar *</label>
            <input className="form-input" type="number" step="0.01" min="0" required value={paymentForm.amount} onChange={e => setP('amount', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Odeme Tarihi *</label>
            <input className="form-input" type="date" required value={paymentForm.payment_date} onChange={e => setP('payment_date', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Odeme Yontemi</label>
            <select className="form-input" value={paymentForm.method} onChange={e => setP('method', e.target.value)}>
              {Object.entries(methodLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Not</label>
            <input className="form-input" value={paymentForm.note} onChange={e => setP('note', e.target.value)} placeholder="Odeme notu (opsiyonel)" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={() => setPaymentModal(false)} className="btn-secondary">Iptal</button>
            <button type="submit" disabled={savingPayment} className="btn-primary">
              {savingPayment ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Expense Modal */}
      <Modal open={expenseModal} onClose={() => { setExpenseModal(false); setEditingExpense(null); }} title={editingExpense ? 'Masraf Duzenle' : 'Masraf Ekle'} size="lg">
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Kategori *</label>
              <select className="form-input" required value={expenseForm.category} onChange={e => setE('category', e.target.value)}>
                <option value="">Kategori secin</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Tedarikci</label>
              <select className="form-input" value={expenseForm.supplier_id} onChange={e => setE('supplier_id', e.target.value)}>
                <option value="">Tedarikci secin (opsiyonel)</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Aciklama</label>
            <input className="form-input" value={expenseForm.description} onChange={e => setE('description', e.target.value)} placeholder="Masraf aciklamasi" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Faturali Tutar</label>
              <input className="form-input" type="number" step="0.01" min="0" value={expenseForm.faturali_tutar} onChange={e => setE('faturali_tutar', e.target.value)} placeholder="KDV uygulanacak tutar" />
            </div>
            <div>
              <label className="form-label">Faturasiz Tutar</label>
              <input className="form-input" type="number" step="0.01" min="0" value={expenseForm.faturasiz_tutar} onChange={e => setE('faturasiz_tutar', e.target.value)} placeholder="KDV uygulanmayacak tutar" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">KDV Orani (%)</label>
              <input className="form-input" type="number" step="1" min="0" max="100" value={expenseForm.kdv_rate} onChange={e => setE('kdv_rate', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Masraf Tarihi *</label>
              <input className="form-input" type="date" required value={expenseForm.expense_date} onChange={e => setE('expense_date', e.target.value)} />
            </div>
          </div>
          {/* KDV Preview */}
          {(() => {
            const ft = Number(expenseForm.faturali_tutar) || 0;
            const fst = Number(expenseForm.faturasiz_tutar) || 0;
            const rate = Number(expenseForm.kdv_rate) || 0;
            if (ft + fst <= 0) return null;
            const kdv = Math.round(ft * rate / 100 * 100) / 100;
            const total = Math.round((ft + kdv + fst) * 100) / 100;
            return (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-600">Faturali:</span><span className="font-medium">{fmt(ft)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">KDV ({rate}%):</span><span className="font-medium text-blue-700">+{fmt(kdv)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Faturasiz:</span><span className="font-medium">{fmt(fst)}</span></div>
                <div className="flex justify-between border-t border-blue-200 pt-1 mt-1"><span className="font-semibold text-gray-800">Toplam (KDV Dahil):</span><span className="font-bold text-blue-800">{fmt(total)}</span></div>
              </div>
            );
          })()}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Odeme Yontemi</label>
              <select className="form-input" value={expenseForm.payment_method} onChange={e => setE('payment_method', e.target.value)}>
                {Object.entries(methodLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={expenseForm.is_paid}
                  onChange={e => setE('is_paid', e.target.checked)}
                />
                <span className="text-sm font-medium text-gray-700">Odendi</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={() => { setExpenseModal(false); setEditingExpense(null); }} className="btn-secondary">Iptal</button>
            <button type="submit" disabled={savingExpense} className="btn-primary">
              {savingExpense ? 'Kaydediliyor...' : editingExpense ? 'Guncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
