import React from 'react';

export default function StatCard({ title, value, sub, color = 'primary', icon }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-700 border-primary-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    gray: 'bg-gray-50 text-gray-700 border-gray-100',
  };
  return (
    <div className={`card p-5 border ${colors[color] || colors.primary}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
        </div>
        {icon && <div className="text-2xl opacity-60">{icon}</div>}
      </div>
    </div>
  );
}
