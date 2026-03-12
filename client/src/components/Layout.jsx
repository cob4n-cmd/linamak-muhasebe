import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const nav = [
  { to: '/dashboard', icon: '📊', label: 'Kontrol Paneli' },
  { to: '/jobs', icon: '📋', label: 'Anlasmali Isler' },
  { to: '/customers', icon: '👥', label: 'Musteriler' },
  { to: '/suppliers', icon: '🏭', label: 'Tedarikciler' },
  { to: '/income-expenses', icon: '💰', label: 'Gelir & Gider' },
  { to: '/credit-cards', icon: '💳', label: 'Kredi Kartlari' },
  { to: '/assets', icon: '🏦', label: 'Genel Varlik' },
  { to: '/kdv', icon: '🧾', label: 'KDV Hesabi' },
  { to: '/charts', icon: '📈', label: 'Grafikler' },
  { to: '/settings', icon: '⚙️', label: 'Ayarlar' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-gray-900 text-white flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-lg font-bold text-white">L</div>
            <div>
              <p className="font-semibold text-sm leading-tight">LinaMAK</p>
              <p className="text-xs text-gray-400">Muhasebe Sistemi</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map(item => (
            <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary-500 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`
              }>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-700">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
              {(user?.name || user?.username || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || user?.username}</p>
              <p className="text-xs text-gray-400">{user?.role === 'admin' ? 'Yonetici' : 'Personel'}</p>
            </div>
            <button onClick={handleLogout} title="Cikis" className="text-gray-400 hover:text-white transition-colors text-lg">⏻</button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-700 text-2xl">☰</button>
          <span className="font-semibold text-primary-600">LinaMAK Muhasebe</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
