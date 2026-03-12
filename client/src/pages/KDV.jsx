import React, { useState, useEffect } from 'react';
import api from '../api';
import StatCard from '../components/StatCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const fmt = v => Number(v||0).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' ₺';
const aylar = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'];
const aylarKisa = ['Oca','Sub','Mar','Nis','May','Haz','Tem','Agu','Eyl','Eki','Kas','Ara'];

export default function KDV() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [summary, setSummary] = useState(null);
  const [annual, setAnnual] = useState([]);
  const [years, setYears] = useState([]);

  useEffect(() => {
    api.get('/dashboard/years').then(r => setYears(r.data));
  }, []);

  useEffect(() => {
    api.get(`/kdv/summary/${year}/${month}`).then(r => setSummary(r.data));
    api.get(`/kdv/summary/${year}`).then(r => setAnnual(r.data));
  }, [year, month]);

  const chartData = annual.map((m, i) => ({ name: aylarKisa[i], hesaplanan: m.hesaplanan, indirilecek: m.indirilecek, odenecek: m.odenecek }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-accent-900">KDV Hesabi</h1>
          <p className="text-sm text-accent-500">Aylik ve yillik KDV ozeti</p>
        </div>
        <div className="flex gap-2">
          <select className="form-input w-28" value={year} onChange={e => setYear(e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
            {!years.includes(year) && <option value={year}>{year}</option>}
          </select>
          <select className="form-input w-32" value={month} onChange={e => setMonth(e.target.value)}>
            {aylar.map((a, i) => <option key={i+1} value={i+1}>{a}</option>)}
          </select>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Hesaplanan KDV" value={fmt(summary.hesaplananKdv)} sub="Satislardan tahsil edilen" color="green" icon="📈" />
          <StatCard title="Indirilecek KDV" value={fmt(summary.indirilecekKdv)} sub="Alislardan odenen" color="red" icon="📉" />
          <StatCard title={summary.odenecekKdv >= 0 ? 'Odenecek KDV' : 'Devreden KDV'} value={fmt(Math.abs(summary.odenecekKdv))}
            sub={summary.odenecekKdv >= 0 ? 'Vergi dairesine odenecek' : 'Sonraki aya devredecek'}
            color={summary.odenecekKdv >= 0 ? 'primary' : 'blue'} icon="🧾" />
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-semibold text-accent-800 mb-4">Yillik KDV Trendi - {year}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend />
            <Bar dataKey="hesaplanan" name="Hesaplanan KDV" fill="#4CAF50" radius={[4,4,0,0]} />
            <Bar dataKey="indirilecek" name="Indirilecek KDV" fill="#f44336" radius={[4,4,0,0]} />
            <Bar dataKey="odenecek" name="Odenecek KDV" fill="#F7941D" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {summary && summary.details && summary.details.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-accent-800">{aylar[parseInt(month)-1]} {year} - Islem Dokumu</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <th className="table-th">Tur</th>
                <th className="table-th">Aciklama</th>
                <th className="table-th">Tarih</th>
                <th className="table-th text-right">Tutar</th>
                <th className="table-th text-right">KDV %</th>
                <th className="table-th text-right">KDV Tutar</th>
                <th className="table-th text-right">Toplam</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {summary.details.map((d, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="table-td"><span className={`badge ${d.type === 'gelir' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{d.type === 'gelir' ? 'Gelir' : 'Gider'}</span></td>
                    <td className="table-td">{d.description}</td>
                    <td className="table-td">{d.date}</td>
                    <td className="table-td text-right">{fmt(d.amount)}</td>
                    <td className="table-td text-right">%{d.kdv_rate}</td>
                    <td className="table-td text-right">{fmt(d.kdv_amount)}</td>
                    <td className="table-td text-right font-medium">{fmt(d.total_with_kdv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {summary && (!summary.details || summary.details.length === 0) && (
        <p className="text-center py-8 text-accent-400">Bu donemde faturali islem bulunmuyor</p>
      )}
    </div>
  );
}
