import { useState, useEffect, useMemo } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';

const fmt = v => Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

const methodLabels = {
  nakit: 'Nakit',
  'havale/eft': 'Havale/EFT',
  cek: 'Cek',
  kredi_karti: 'Kredi Karti',
  diger: 'Diger',
};

const methodOptions = [
  { value: 'nakit', label: 'Nakit' },
  { value: 'havale/eft', label: 'Havale/EFT' },
  { value: 'cek', label: 'Cek' },
  { value: 'kredi_karti', label: 'Kredi Karti' },
  { value: 'diger', label: 'Diger' },
];

const months = [
  { value: '', label: 'Tumu' },
  { value: '1', label: 'Ocak' },
  { value: '2', label: 'Subat' },
  { value: '3', label: 'Mart' },
  { value: '4', label: 'Nisan' },
  { value: '5', label: 'Mayis' },
  { value: '6', label: 'Haziran' },
  { value: '7', label: 'Temmuz' },
  { value: '8', label: 'Agustos' },
  { value: '9', label: 'Eylul' },
  { value: '10', label: 'Ekim' },
  { value: '11', label: 'Kasim' },
  { value: '12', label: 'Aralik' },
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i).reverse();

const emptyIncome = {
  description: '',
  customer_id: '',
  category: '',
  amount: '',
  kdv_rate: 20,
  income_date: new Date().toISOString().slice(0, 10),
  method: 'havale/eft',
  invoice_no: '',
  note: '',
};

const emptyExpense = {
  category: '',
  supplier_id: '',
  description: '',
  amount: '',
  kdv_rate: 20,
  expense_date: new Date().toISOString().slice(0, 10),
  is_paid: false,
  payment_method: 'havale/eft',
};

export default function IncomeExpenses() {
  const [tab, setTab] = useState('incomes');
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);

  // Incomes state
  const [incomes, setIncomes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [incomeModal, setIncomeModal] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ ...emptyIncome });
  const [editingIncomeId, setEditingIncomeId] = useState(null);
  const [incomeSaving, setIncomeSaving] = useState(false);

  // Expenses state
  const [expenses, setExpenses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ ...emptyExpense });
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [expenseSaving, setExpenseSaving] = useState(false);

  // Fetch reference data on mount
  useEffect(() => {
    fetchReferenceData();
  }, []);

  // Fetch list data when filters or tab change
  useEffect(() => {
    if (tab === 'incomes') {
      fetchIncomes();
    } else {
      fetchExpenses();
    }
  }, [tab, year, month]);

  const fetchReferenceData = async () => {
    try {
      const [custRes, incCatRes, suppRes, expCatRes] = await Promise.all([
        api.get('/api/customers').catch(() => ({ data: [] })),
        api.get('/api/incomes/categories').catch(() => ({ data: [] })),
        api.get('/api/suppliers').catch(() => ({ data: [] })),
        api.get('/api/expenses/categories').catch(() => ({ data: [] })),
      ]);
      setCustomers(custRes.data || []);
      setIncomeCategories(incCatRes.data || []);
      setSuppliers(suppRes.data || []);
      setExpenseCategories(expCatRes.data || []);
    } catch (err) {
      console.error('Referans veri yukleme hatasi:', err);
    }
  };

  const fetchIncomes = async () => {
    try {
      setLoading(true);
      const params = { year };
      if (month) params.month = month;
      const res = await api.get('/api/incomes', { params });
      setIncomes(res.data || []);
    } catch (err) {
      console.error('Gelir yukleme hatasi:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = { year };
      if (month) params.month = month;
      const res = await api.get('/api/expenses', { params });
      setExpenses(res.data || []);
    } catch (err) {
      console.error('Gider yukleme hatasi:', err);
    } finally {
      setLoading(false);
    }
  };

  // Income summaries
  const incomeSummary = useMemo(() => {
    const totalAmount = incomes.reduce((s, i) => s + Number(i.total_with_kdv || 0), 0);
    const totalKdv = incomes.reduce((s, i) => s + Number(i.kdv_amount || 0), 0);
    return { totalAmount, totalKdv, count: incomes.length };
  }, [incomes]);

  // Expense summaries
  const expenseSummary = useMemo(() => {
    const totalAmount = expenses.reduce((s, e) => s + Number(e.total_with_kdv || 0), 0);
    const totalKdv = expenses.reduce((s, e) => s + Number(e.kdv_amount || 0), 0);
    const unpaid = expenses.filter(e => !e.is_paid).reduce((s, e) => s + Number(e.total_with_kdv || 0), 0);
    return { totalAmount, totalKdv, unpaid, count: expenses.length };
  }, [expenses]);

  // Computed KDV for income form
  const incomeKdvComputed = useMemo(() => {
    const amt = Number(incomeForm.amount) || 0;
    const rate = Number(incomeForm.kdv_rate) || 0;
    const kdv = amt * rate / 100;
    return { kdv, total: amt + kdv };
  }, [incomeForm.amount, incomeForm.kdv_rate]);

  // Computed KDV for expense form
  const expenseKdvComputed = useMemo(() => {
    const amt = Number(expenseForm.amount) || 0;
    const rate = Number(expenseForm.kdv_rate) || 0;
    const kdv = amt * rate / 100;
    return { kdv, total: amt + kdv };
  }, [expenseForm.amount, expenseForm.kdv_rate]);

  // ---- Income CRUD ----
  const openIncomeAdd = () => {
    setEditingIncomeId(null);
    setIncomeForm({ ...emptyIncome });
    setIncomeModal(true);
  };

  const openIncomeEdit = (income) => {
    setEditingIncomeId(income.id);
    setIncomeForm({
      description: income.description || '',
      customer_id: income.customer_id || '',
      category: income.category || '',
      amount: income.amount || '',
      kdv_rate: income.kdv_rate ?? 20,
      income_date: income.income_date ? income.income_date.slice(0, 10) : '',
      method: income.method || 'havale/eft',
      invoice_no: income.invoice_no || '',
      note: income.note || '',
    });
    setIncomeModal(true);
  };

  const saveIncome = async (e) => {
    e.preventDefault();
    try {
      setIncomeSaving(true);
      const payload = {
        ...incomeForm,
        amount: Number(incomeForm.amount) || 0,
        kdv_rate: Number(incomeForm.kdv_rate) || 0,
        customer_id: incomeForm.customer_id || null,
      };
      if (editingIncomeId) {
        await api.put(`/api/incomes/${editingIncomeId}`, payload);
      } else {
        await api.post('/api/incomes', payload);
      }
      setIncomeModal(false);
      fetchIncomes();
    } catch (err) {
      console.error('Gelir kaydetme hatasi:', err);
      alert('Kaydetme hatasi: ' + (err.response?.data?.error || err.message));
    } finally {
      setIncomeSaving(false);
    }
  };

  const deleteIncome = async (id) => {
    if (!window.confirm('Bu gelir kaydini silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/api/incomes/${id}`);
      fetchIncomes();
    } catch (err) {
      console.error('Gelir silme hatasi:', err);
      alert('Silme hatasi: ' + (err.response?.data?.error || err.message));
    }
  };

  // ---- Expense CRUD ----
  const openExpenseAdd = () => {
    setEditingExpenseId(null);
    setExpenseForm({ ...emptyExpense });
    setExpenseModal(true);
  };

  const openExpenseEdit = (expense) => {
    setEditingExpenseId(expense.id);
    setExpenseForm({
      category: expense.category || '',
      supplier_id: expense.supplier_id || '',
      description: expense.description || '',
      amount: expense.amount || '',
      kdv_rate: expense.kdv_rate ?? 20,
      expense_date: expense.expense_date ? expense.expense_date.slice(0, 10) : '',
      is_paid: !!expense.is_paid,
      payment_method: expense.payment_method || 'havale/eft',
    });
    setExpenseModal(true);
  };

  const saveExpense = async (e) => {
    e.preventDefault();
    try {
      setExpenseSaving(true);
      const payload = {
        ...expenseForm,
        amount: Number(expenseForm.amount) || 0,
        kdv_rate: Number(expenseForm.kdv_rate) || 0,
        supplier_id: expenseForm.supplier_id || null,
        is_paid: expenseForm.is_paid ? 1 : 0,
      };
      if (editingExpenseId) {
        await api.put(`/api/expenses/${editingExpenseId}`, payload);
      } else {
        await api.post('/api/expenses', payload);
      }
      setExpenseModal(false);
      fetchExpenses();
    } catch (err) {
      console.error('Gider kaydetme hatasi:', err);
      alert('Kaydetme hatasi: ' + (err.response?.data?.error || err.message));
    } finally {
      setExpenseSaving(false);
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm('Bu gider kaydini silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/api/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      console.error('Gider silme hatasi:', err);
      alert('Silme hatasi: ' + (err.response?.data?.error || err.message));
    }
  };

  // ---- Shared input class ----
  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-accent-900">Gelir / Gider</h1>
          <p className="text-gray-500 text-sm mt-1">Gelir ve gider kayitlarini yonetin</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'incomes' ? (
            <button
              onClick={openIncomeAdd}
              className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Gelir Ekle
            </button>
          ) : (
            <button
              onClick={openExpenseAdd}
              className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Gider Ekle
            </button>
          )}
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Tab Switcher */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          <button
            onClick={() => setTab('incomes')}
            className={`px-5 py-2 text-sm font-medium transition-colors ${
              tab === 'incomes'
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Gelirler
          </button>
          <button
            onClick={() => setTab('expenses')}
            className={`px-5 py-2 text-sm font-medium transition-colors ${
              tab === 'expenses'
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Giderler
          </button>
        </div>

        {/* Year Filter */}
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        >
          {yearOptions.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* Month Filter */}
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        >
          {months.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Loading Spinner */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : tab === 'incomes' ? (
        /* ========== INCOMES TAB ========== */
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Toplam Gelir"
              value={fmt(incomeSummary.totalAmount)}
              color="green"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              }
            />
            <StatCard
              title="KDV Toplam"
              value={fmt(incomeSummary.totalKdv)}
              color="primary"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
                </svg>
              }
            />
            <StatCard
              title="Islem Sayisi"
              value={incomeSummary.count}
              color="primary"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
              }
            />
          </div>

          {/* Incomes Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {incomes.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm">Henuz gelir kaydi yok</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 font-medium">Tarih</th>
                      <th className="px-4 py-3 font-medium">Aciklama</th>
                      <th className="px-4 py-3 font-medium hidden sm:table-cell">Musteri</th>
                      <th className="px-4 py-3 font-medium hidden sm:table-cell">Kategori</th>
                      <th className="px-4 py-3 font-medium text-right">Tutar</th>
                      <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">KDV</th>
                      <th className="px-4 py-3 font-medium text-right">Toplam</th>
                      <th className="px-4 py-3 font-medium hidden sm:table-cell">Yontem</th>
                      <th className="px-4 py-3 font-medium text-right">Islem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {incomes.map(inc => (
                      <tr key={inc.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {inc.income_date ? new Date(inc.income_date).toLocaleDateString('tr-TR') : '-'}
                        </td>
                        <td className="px-4 py-3 font-medium text-accent-900 max-w-[200px] truncate">
                          {inc.description || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{inc.customer_name || '-'}</td>
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                          {inc.category ? (
                            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {inc.category}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{fmt(inc.amount)}</td>
                        <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">{fmt(inc.kdv_amount)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">{fmt(inc.total_with_kdv)}</td>
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{methodLabels[inc.method] || inc.method || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openIncomeEdit(inc)}
                              className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                              title="Duzenle"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteIncome(inc.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
            )}
          </div>
        </div>
      ) : (
        /* ========== EXPENSES TAB ========== */
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Toplam Gider"
              value={fmt(expenseSummary.totalAmount)}
              color="red"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              }
            />
            <StatCard
              title="KDV Toplam"
              value={fmt(expenseSummary.totalKdv)}
              color="primary"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
                </svg>
              }
            />
            <StatCard
              title="Odenmemis"
              value={fmt(expenseSummary.unpaid)}
              color="orange"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {expenses.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm">Henuz gider kaydi yok</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 font-medium">Tarih</th>
                      <th className="px-4 py-3 font-medium">Aciklama</th>
                      <th className="px-4 py-3 font-medium hidden sm:table-cell">Tedarikci</th>
                      <th className="px-4 py-3 font-medium hidden sm:table-cell">Kategori</th>
                      <th className="px-4 py-3 font-medium text-right">Tutar</th>
                      <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">KDV Dahil</th>
                      <th className="px-4 py-3 font-medium">Durum</th>
                      <th className="px-4 py-3 font-medium text-right">Islem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('tr-TR') : '-'}
                        </td>
                        <td className="px-4 py-3 font-medium text-accent-900 max-w-[200px] truncate">
                          {exp.description || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{exp.supplier_name || '-'}</td>
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                          {exp.category ? (
                            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {exp.category}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{fmt(exp.amount)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600 hidden sm:table-cell">{fmt(exp.total_with_kdv)}</td>
                        <td className="px-4 py-3">
                          {exp.is_paid ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              Odendi
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              Bekliyor
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openExpenseEdit(exp)}
                              className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                              title="Duzenle"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteExpense(exp.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
            )}
          </div>
        </div>
      )}

      {/* ========== INCOME MODAL ========== */}
      <Modal
        open={incomeModal}
        onClose={() => setIncomeModal(false)}
        title={editingIncomeId ? 'Gelir Duzenle' : 'Yeni Gelir'}
        size="lg"
      >
        <form onSubmit={saveIncome} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Description */}
            <div className="sm:col-span-2">
              <label className={labelCls}>Aciklama *</label>
              <input
                type="text"
                required
                className={inputCls}
                value={incomeForm.description}
                onChange={e => setIncomeForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Gelir aciklamasi"
              />
            </div>

            {/* Customer */}
            <div>
              <label className={labelCls}>Musteri</label>
              <select
                className={inputCls}
                value={incomeForm.customer_id}
                onChange={e => setIncomeForm(f => ({ ...f, customer_id: e.target.value }))}
              >
                <option value="">-- Musteri Secin --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className={labelCls}>Kategori</label>
              <select
                className={inputCls}
                value={incomeForm.category}
                onChange={e => setIncomeForm(f => ({ ...f, category: e.target.value }))}
              >
                <option value="">-- Kategori Secin --</option>
                {incomeCategories.map((cat, i) => (
                  <option key={i} value={typeof cat === 'string' ? cat : cat.name}>
                    {typeof cat === 'string' ? cat : cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className={labelCls}>Tutar *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                className={inputCls}
                value={incomeForm.amount}
                onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* KDV Rate */}
            <div>
              <label className={labelCls}>KDV Orani (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                className={inputCls}
                value={incomeForm.kdv_rate}
                onChange={e => setIncomeForm(f => ({ ...f, kdv_rate: e.target.value }))}
              />
            </div>

            {/* Computed KDV & Total */}
            <div className="sm:col-span-2 bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">KDV Tutari:</span>
                <span className="font-medium text-accent-900">{fmt(incomeKdvComputed.kdv)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-500">Toplam (KDV Dahil):</span>
                <span className="font-bold text-emerald-600">{fmt(incomeKdvComputed.total)}</span>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className={labelCls}>Tarih *</label>
              <input
                type="date"
                required
                className={inputCls}
                value={incomeForm.income_date}
                onChange={e => setIncomeForm(f => ({ ...f, income_date: e.target.value }))}
              />
            </div>

            {/* Method */}
            <div>
              <label className={labelCls}>Odeme Yontemi</label>
              <select
                className={inputCls}
                value={incomeForm.method}
                onChange={e => setIncomeForm(f => ({ ...f, method: e.target.value }))}
              >
                {methodOptions.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Invoice No */}
            <div>
              <label className={labelCls}>Fatura No</label>
              <input
                type="text"
                className={inputCls}
                value={incomeForm.invoice_no}
                onChange={e => setIncomeForm(f => ({ ...f, invoice_no: e.target.value }))}
                placeholder="Fatura numarasi"
              />
            </div>

            {/* Note */}
            <div>
              <label className={labelCls}>Not</label>
              <input
                type="text"
                className={inputCls}
                value={incomeForm.note}
                onChange={e => setIncomeForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Ek not"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIncomeModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Iptal
            </button>
            <button
              type="submit"
              disabled={incomeSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {incomeSaving ? 'Kaydediliyor...' : editingIncomeId ? 'Guncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========== EXPENSE MODAL ========== */}
      <Modal
        open={expenseModal}
        onClose={() => setExpenseModal(false)}
        title={editingExpenseId ? 'Gider Duzenle' : 'Yeni Gider'}
        size="lg"
      >
        <form onSubmit={saveExpense} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Description */}
            <div className="sm:col-span-2">
              <label className={labelCls}>Aciklama *</label>
              <input
                type="text"
                required
                className={inputCls}
                value={expenseForm.description}
                onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Gider aciklamasi"
              />
            </div>

            {/* Category */}
            <div>
              <label className={labelCls}>Kategori</label>
              <select
                className={inputCls}
                value={expenseForm.category}
                onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}
              >
                <option value="">-- Kategori Secin --</option>
                {expenseCategories.map((cat, i) => (
                  <option key={i} value={typeof cat === 'string' ? cat : cat.name}>
                    {typeof cat === 'string' ? cat : cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier */}
            <div>
              <label className={labelCls}>Tedarikci</label>
              <select
                className={inputCls}
                value={expenseForm.supplier_id}
                onChange={e => setExpenseForm(f => ({ ...f, supplier_id: e.target.value }))}
              >
                <option value="">-- Tedarikci Secin --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className={labelCls}>Tutar *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                className={inputCls}
                value={expenseForm.amount}
                onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* KDV Rate */}
            <div>
              <label className={labelCls}>KDV Orani (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                className={inputCls}
                value={expenseForm.kdv_rate}
                onChange={e => setExpenseForm(f => ({ ...f, kdv_rate: e.target.value }))}
              />
            </div>

            {/* Computed KDV & Total */}
            <div className="sm:col-span-2 bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">KDV Tutari:</span>
                <span className="font-medium text-accent-900">{fmt(expenseKdvComputed.kdv)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-500">Toplam (KDV Dahil):</span>
                <span className="font-bold text-red-600">{fmt(expenseKdvComputed.total)}</span>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className={labelCls}>Tarih *</label>
              <input
                type="date"
                required
                className={inputCls}
                value={expenseForm.expense_date}
                onChange={e => setExpenseForm(f => ({ ...f, expense_date: e.target.value }))}
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className={labelCls}>Odeme Yontemi</label>
              <select
                className={inputCls}
                value={expenseForm.payment_method}
                onChange={e => setExpenseForm(f => ({ ...f, payment_method: e.target.value }))}
              >
                {methodOptions.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Is Paid */}
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={expenseForm.is_paid}
                  onChange={e => setExpenseForm(f => ({ ...f, is_paid: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Odendi olarak isaretle</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setExpenseModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Iptal
            </button>
            <button
              type="submit"
              disabled={expenseSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {expenseSaving ? 'Kaydediliyor...' : editingExpenseId ? 'Guncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
