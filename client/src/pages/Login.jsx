import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Giris basarisiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-amber-950 to-gray-900 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">L</div>
          <h1 className="text-2xl font-bold text-white">LinaMAK Muhasebe</h1>
          <p className="text-gray-400 text-sm mt-1">Hesabiniza giris yapin</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>}

          <div>
            <label className="form-label">Kullanici Adi</label>
            <input className="form-input" type="text" autoFocus autoComplete="username"
              value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
          </div>

          <div>
            <label className="form-label">Sifre</label>
            <input className="form-input" type="password" autoComplete="current-password"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
            {loading ? 'Giris yapiliyor...' : 'Giris Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
