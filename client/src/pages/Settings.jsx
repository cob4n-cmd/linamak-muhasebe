import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';

export default function Settings() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({});
  const [pwModal, setPwModal] = useState(false);
  const [userModal, setUserModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'staff' });
  const [settingsForm, setSettingsForm] = useState({ company_name: '', default_kdv_rate: '20' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') api.get('/auth/users').then(r => setUsers(r.data));
    api.get('/settings').then(r => { setSettings(r.data); setSettingsForm({ company_name: r.data.company_name || 'LinaMAK', default_kdv_rate: r.data.default_kdv_rate || '20' }); });
  }, [user]);

  const changePassword = async e => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return setMsg('Sifreler eslesmedi');
    try {
      await api.put('/auth/change-password', { oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
      setMsg('Sifre degistirildi'); setPwModal(false); setPwForm({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (err) { setMsg(err.response?.data?.error || 'Hata'); }
  };

  const createUser = async e => {
    e.preventDefault();
    try {
      await api.post('/auth/users', userForm);
      setUserModal(false); setUserForm({ name: '', username: '', password: '', role: 'staff' });
      api.get('/auth/users').then(r => setUsers(r.data));
    } catch (err) { setMsg(err.response?.data?.error || 'Hata'); }
  };

  const saveSettings = async e => {
    e.preventDefault();
    await api.put('/settings', settingsForm);
    setSettings(prev => ({ ...prev, ...settingsForm }));
    setSettingsModal(false); setMsg('Ayarlar kaydedildi');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-accent-900">Ayarlar</h1>

      {msg && <div className="bg-primary-50 text-primary-700 text-sm px-4 py-3 rounded-lg border border-primary-200">{msg}<button onClick={() => setMsg('')} className="ml-2 font-bold">&times;</button></div>}

      {/* Profil */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-accent-800 mb-4">Profil</h2>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-500 flex items-center justify-center text-white text-2xl font-bold">
            {(user?.name || 'U')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-accent-900">{user?.name || user?.username}</p>
            <p className="text-sm text-accent-500">{user?.role === 'admin' ? 'Yonetici' : 'Personel'}</p>
          </div>
          <button onClick={() => setPwModal(true)} className="btn-secondary ml-auto">Sifre Degistir</button>
        </div>
      </div>

      {/* Firma Ayarlari */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-accent-800">Firma Ayarlari</h2>
          {user?.role === 'admin' && <button onClick={() => setSettingsModal(true)} className="btn-secondary btn-sm">Duzenle</button>}
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div><span className="text-accent-500">Firma Adi:</span> <span className="font-medium ml-2">{settings.company_name || 'LinaMAK'}</span></div>
          <div><span className="text-accent-500">Varsayilan KDV:</span> <span className="font-medium ml-2">%{settings.default_kdv_rate || 20}</span></div>
          <div><span className="text-accent-500">Para Birimi:</span> <span className="font-medium ml-2">{settings.currency || 'TRY'}</span></div>
        </div>
      </div>

      {/* Kullanicilar */}
      {user?.role === 'admin' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-accent-800">Kullanicilar</h2>
            <button onClick={() => setUserModal(true)} className="btn-primary btn-sm">+ Yeni Kullanici</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="table-th">Ad</th>
                <th className="table-th">Kullanici Adi</th>
                <th className="table-th">Rol</th>
                <th className="table-th">Kayit Tarihi</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{u.name}</td>
                    <td className="table-td">{u.username}</td>
                    <td className="table-td"><span className={`badge ${u.role === 'admin' ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-800'}`}>{u.role === 'admin' ? 'Yonetici' : 'Personel'}</span></td>
                    <td className="table-td">{u.created_at?.split('T')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hakkinda */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-accent-800 mb-2">Hakkinda</h2>
        <p className="text-sm text-accent-600">LinaMAK Muhasebe Sistemi v1.0</p>
        <p className="text-xs text-accent-400 mt-1">Makine Muhendisligi Muhasebe Yazilimi</p>
      </div>

      {/* Sifre Modal */}
      <Modal open={pwModal} onClose={() => setPwModal(false)} title="Sifre Degistir" size="sm">
        <form onSubmit={changePassword} className="space-y-4">
          <div><label className="form-label">Mevcut Sifre</label><input className="form-input" type="password" value={pwForm.oldPassword} onChange={e => setPwForm(f => ({...f, oldPassword: e.target.value}))} required /></div>
          <div><label className="form-label">Yeni Sifre</label><input className="form-input" type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({...f, newPassword: e.target.value}))} required /></div>
          <div><label className="form-label">Sifre Tekrar</label><input className="form-input" type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({...f, confirm: e.target.value}))} required /></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setPwModal(false)} className="btn-secondary">Iptal</button><button type="submit" className="btn-primary">Degistir</button></div>
        </form>
      </Modal>

      {/* Kullanici Modal */}
      <Modal open={userModal} onClose={() => setUserModal(false)} title="Yeni Kullanici" size="sm">
        <form onSubmit={createUser} className="space-y-4">
          <div><label className="form-label">Ad</label><input className="form-input" value={userForm.name} onChange={e => setUserForm(f => ({...f, name: e.target.value}))} required /></div>
          <div><label className="form-label">Kullanici Adi</label><input className="form-input" value={userForm.username} onChange={e => setUserForm(f => ({...f, username: e.target.value}))} required /></div>
          <div><label className="form-label">Sifre</label><input className="form-input" type="password" value={userForm.password} onChange={e => setUserForm(f => ({...f, password: e.target.value}))} required /></div>
          <div><label className="form-label">Rol</label>
            <select className="form-input" value={userForm.role} onChange={e => setUserForm(f => ({...f, role: e.target.value}))}>
              <option value="staff">Personel</option><option value="admin">Yonetici</option>
            </select>
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setUserModal(false)} className="btn-secondary">Iptal</button><button type="submit" className="btn-primary">Olustur</button></div>
        </form>
      </Modal>

      {/* Ayarlar Modal */}
      <Modal open={settingsModal} onClose={() => setSettingsModal(false)} title="Firma Ayarlari" size="sm">
        <form onSubmit={saveSettings} className="space-y-4">
          <div><label className="form-label">Firma Adi</label><input className="form-input" value={settingsForm.company_name} onChange={e => setSettingsForm(f => ({...f, company_name: e.target.value}))} /></div>
          <div><label className="form-label">Varsayilan KDV Orani (%)</label><input className="form-input" type="number" value={settingsForm.default_kdv_rate} onChange={e => setSettingsForm(f => ({...f, default_kdv_rate: e.target.value}))} /></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setSettingsModal(false)} className="btn-secondary">Iptal</button><button type="submit" className="btn-primary">Kaydet</button></div>
        </form>
      </Modal>
    </div>
  );
}
