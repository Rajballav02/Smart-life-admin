import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const COLORS = ['#6C5CE7', '#00B894', '#FF9F43', '#EA5455', '#F6B93B', '#0FBCF9', '#A29BFE'];

export function CategoryPie({ data }) {
  if (!data || data.length === 0) {
    return <div className="text-muted small text-center py-5">No spending data yet this period.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="amount" nameKey="category" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((entry, i) => <Cell key={entry.category} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function WeeklyTrendBar({ data }) {
  if (!data || data.length === 0) {
    return <div className="text-muted small text-center py-5">No trend data yet.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE8F3" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9C99AD' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#9C99AD' }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
        <Bar dataKey="expense" fill="#6C5CE7" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function IncomeExpenseBar({ income, expense }) {
  const data = [{ name: 'This period', income, expense }];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EAE8F3" />
        <XAxis type="number" tick={{ fontSize: 12, fill: '#9C99AD' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" hide />
        <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
        <Bar dataKey="income" fill="#00B894" radius={[0, 6, 6, 0]} barSize={28} name="Income" />
        <Bar dataKey="expense" fill="#EA5455" radius={[0, 6, 6, 0]} barSize={28} name="Expense" />
      </BarChart>
    </ResponsiveContainer>
  );
}
