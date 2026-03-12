import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';

const fmt = v => Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

const emptyForm = {
  bank_name: '',
  card_name: '',
  last_four_digits: '',
  credit_limit: '',
  closing_day: '',
  due_day: '',
  note: ''
};

export default function CreditCards() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const res = await api.get('/credit-cards');
      setCards(res.data);
    } catch (err) {
      console.error('Kredi kartları yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setForm(emptyForm);
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = (card) => {
    setForm({
      bank_name: card.bank_name || '',
      card_name: card.card_name || '',
      last_four_digits: card.last_four_digits || '',
      credit_limit: card.credit_limit || '',
      closing_day: card.closing_day || '',
      due_day: card.due_day || '',
      note: card.note || ''
    });
    setEditId(card.id);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editId) {
        await api.put(`/credit-cards/${editId}`, form);
      } else {
        await api.post('/credit-cards', form);
      }
      setModalOpen(false);
      fetchCards();
    } catch (err) {
      console.error('Kaydetme hatası:', err);
      alert(err.response?.data?.error || 'Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kredi kartını silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/credit-cards/${id}`);
      fetchCards();
    } catch (err) {
      console.error('Silme hatası:', err);
      alert(err.response?.data?.error || 'Silme sırasında hata oluştu');
    }
  };

  const getUsagePercent = (card) => {
    const limit = Number(card.credit_limit) || 1;
    const debt = Number(card.current_debt) || 0;
    return Math.min((debt / limit) * 100, 100);
  };

  const getUsageColor = (percent) => {
    if (percent < 50) return 'bg-emerald-500';
    if (percent <= 80) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getUsageBgColor = (percent) => {
    if (percent < 50) return 'bg-emerald-100';
    if (percent <= 80) return 'bg-amber-100';
    return 'bg-red-100';
  };

  const totalDebt = cards.reduce((sum, c) => sum + Number(c.current_debt || 0), 0);
  const totalLimit = cards.reduce((sum, c) => sum + Number(c.credit_limit || 0), 0);

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
          <h1 className="text-2xl font-bold text-accent-900">Kredi Kartları</h1>
          <p className="text-gray-500 text-sm mt-1">Kredi kartı takibi ve yönetimi</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Kart
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Toplam Kart"
          value={cards.length}
          color="primary"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
        />
        <StatCard
          title="Toplam Borç"
          value={fmt(totalDebt)}
          color="red"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          }
        />
        <StatCard
          title="Toplam Limit"
          value={fmt(totalLimit)}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Cards Grid */}
      {cards.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <p className="text-gray-400 text-lg">Henüz kredi kartı eklenmemiş</p>
          <button
            onClick={openNew}
            className="mt-4 inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
          >
            İlk Kartı Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => {
            const usage = getUsagePercent(card);
            return (
              <div key={card.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-accent-900 truncate">{card.bank_name}</h3>
                    <p className="text-sm text-gray-500 truncate">{card.card_name}</p>
                    {card.last_four_digits && (
                      <p className="text-xs text-gray-400 mt-1 font-mono">**** {card.last_four_digits}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(card)}
                      className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Düzenle"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(card.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Sil"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Usage Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-500">Kullanım</span>
                    <span className="font-medium text-accent-900">%{usage.toFixed(0)}</span>
                  </div>
                  <div className={`w-full h-2.5 rounded-full ${getUsageBgColor(usage)}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getUsageColor(usage)}`}
                      style={{ width: `${usage}%` }}
                    />
                  </div>
                </div>

                {/* Debt / Limit */}
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-gray-500">Borç / Limit</span>
                  <span className="font-medium text-accent-900">
                    {fmt(card.current_debt)} / {fmt(card.credit_limit)}
                  </span>
                </div>

                {/* Closing & Due Day */}
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  {card.closing_day && (
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Hesap kesim: <strong>{card.closing_day}</strong></span>
                    </div>
                  )}
                  {card.due_day && (
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Son ödeme: <strong>{card.due_day}</strong></span>
                    </div>
                  )}
                </div>

                {/* Detail Link */}
                <Link
                  to={`/credit-cards/${card.id}`}
                  className="block w-full text-center px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
                >
                  Detay
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Kart Düzenle' : 'Yeni Kart Ekle'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banka Adı *</label>
              <input
                type="text"
                required
                value={form.bank_name}
                onChange={e => setForm({ ...form, bank_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                placeholder="Örn: Garanti BBVA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kart Adı *</label>
              <input
                type="text"
                required
                value={form.card_name}
                onChange={e => setForm({ ...form, card_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                placeholder="Örn: Bonus Kart"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Son 4 Hane</label>
              <input
                type="text"
                maxLength={4}
                pattern="\d{0,4}"
                value={form.last_four_digits}
                onChange={e => setForm({ ...form, last_four_digits: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                placeholder="1234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kredi Limiti *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.credit_limit}
                onChange={e => setForm({ ...form, credit_limit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                placeholder="50000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hesap Kesim Günü</label>
              <input
                type="number"
                min="1"
                max="31"
                value={form.closing_day}
                onChange={e => setForm({ ...form, closing_day: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                placeholder="1-31"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Son Ödeme Günü</label>
              <input
                type="number"
                min="1"
                max="31"
                value={form.due_day}
                onChange={e => setForm({ ...form, due_day: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                placeholder="1-31"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Not</label>
            <textarea
              rows={2}
              value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm resize-none"
              placeholder="Opsiyonel not..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Ekle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
