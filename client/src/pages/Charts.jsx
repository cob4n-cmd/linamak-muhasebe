import React, { useState, useEffect } from 'react';
import api from '../api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const fmt = v => Number(v||0).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' ₺';
const aylar = ['Oca','Sub','Mar','Nis','May','Haz','Tem','Agu','Eyl','Eki','Kas','Ara'];
const COLORS = ['#F7941D', '#FBB040', '#4CAF50', '#2196F3', '#9C27B0', '#E91E63', '#00BCD4', '#FF5722', '#607D8B', '#795548', '#CDDC39'];

export default function Charts() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [years, setYears] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [expBreakdown, setExpBreakdown] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cashFlow, setCashFlow] = useState([]);
  const [growth, setGrowth] = useState([]);

  useEffect(() => { api.get('/dashboard/years').then(r => setYears(r.data)); }, []);
  useEffect(() => {
    api.get(`/charts/revenue-trend/${year}`).then(r => setRevenue(r.data));
    api.get(`/charts/expense-breakdown/${year}`).then(r => setExpBreakdown(r.data));
    api.get(`/charts/customer-ranking/${year}`).then(r => setCustomers(r.data));
    api.get(`/charts/cash-flow/${year}`).then(r => setCashFlow(r.data));
    api.get('/charts/growth').then(r => setGrowth(r.data));
  }, [year]);

  const revenueData = revenue.map((r, i) => ({ name: aylar[i], ...r }));
  const cashFlowData = cashFlow.map((c, i) => ({ name: aylar[i], ...c }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-accent-900">Grafikler</h1>
          <p className="text-sm text-accent-500">Aylik ve yillik performans analizi</p>
        </div>
        <select className="form-input w-28" value={year} onChange={e => setYear(e.target.value)}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
          {!years.includes(year) && <option value={year}>{year}</option>}
        </select>
      </div>

      {/* Gelir Trendi */}
      <div className="card p-5">
        <h3 className="font-semibold text-accent-800 mb-4">Aylik Gelir/Gider Trendi</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend />
            <Bar dataKey="gelir" name="Gelir" fill="#4CAF50" radius={[4,4,0,0]} />
            <Bar dataKey="gider" name="Gider" fill="#f44336" radius={[4,4,0,0]} />
            <Bar dataKey="kar" name="Kar" fill="#F7941D" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Gider Dagilimi */}
        <div className="card p-5">
          <h3 className="font-semibold text-accent-800 mb-4">Gider Dagilimi</h3>
          {expBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={expBreakdown} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                  label={({ name, percent }) => `${name} %${(percent*100).toFixed(0)}`}>
                  {expBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-accent-400 py-12">Veri yok</p>}
        </div>

        {/* Musteri Siralamasi */}
        <div className="card p-5">
          <h3 className="font-semibold text-accent-800 mb-4">En Iyi Musteriler</h3>
          {customers.length > 0 ? (
            <div className="space-y-3">
              {customers.map((c, i) => {
                const max = customers[0]?.total || 1;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-accent-700">{c.name}</span>
                      <span className="font-medium text-accent-800">{fmt(c.total)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className="bg-primary-500 h-2.5 rounded-full" style={{ width: `${(c.total / max * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-center text-accent-400 py-12">Veri yok</p>}
        </div>
      </div>

      {/* Nakit Akisi */}
      <div className="card p-5">
        <h3 className="font-semibold text-accent-800 mb-4">Aylik Nakit Akisi</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={cashFlowData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend />
            <Line type="monotone" dataKey="giris" name="Giris" stroke="#4CAF50" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="cikis" name="Cikis" stroke="#f44336" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="net" name="Net" stroke="#F7941D" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Yillik Buyume */}
      {growth.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-accent-800 mb-4">Yillik Karsilastirma</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={growth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={v => fmt(v)} />
              <Legend />
              <Bar dataKey="gelir" name="Gelir" fill="#4CAF50" radius={[4,4,0,0]} />
              <Bar dataKey="gider" name="Gider" fill="#f44336" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
