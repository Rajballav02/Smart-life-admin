import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api.js';
import RecordCard from '../components/RecordCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Navbar from '../components/Navbar.jsx';
import RecordEditModal from '../components/RecordEditModal.jsx';
import { CategoryPie, WeeklyTrendBar, IncomeExpenseBar } from '../components/FinanceCharts.jsx';

const VIEWS = [
  { key: 'weekly', label: 'Weekly', endpoint: '/finance/weekly' },
  { key: 'half-monthly', label: 'Half-Monthly', endpoint: '/finance/half-monthly' },
  { key: 'monthly', label: 'Monthly', endpoint: '/finance/monthly' },
];

export default function Finance() {
  const [view, setView] = useState('weekly');
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = VIEWS.find((v) => v.key === view).endpoint;
      const [{ data: summaryData }, { data: recordData }] = await Promise.all([
        api.get(endpoint),
        api.get('/records', { params: { module: 'finance' } }),
      ]);
      setSummary(summaryData);
      setRecords(recordData.records);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => { load(); }, [load]);

  const onDelete = async (r) => { await api.delete(`/records/${r._id}`); load(); };

  return (
    <div>
      <Navbar title="Finance" subtitle="Track income, expenses, bills and subscriptions with real analysis." />

      <div className="btn-group mb-3">
        {VIEWS.map((v) => (
          <button key={v.key} className={`btn btn-sm ${view === v.key ? 'btn-primary' : 'btn-light'}`} onClick={() => setView(v.key)}>
            {v.label}
          </button>
        ))}
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <div className="stat-tile bg-finance-soft border-0">
            <div className="stat-label text-finance">Income</div>
            <div className="stat-value">₹{(summary?.income || 0).toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stat-tile" style={{ background: 'var(--sla-danger-bg)', border: 0 }}>
            <div className="stat-label" style={{ color: 'var(--sla-danger)' }}>Expenses</div>
            <div className="stat-value">₹{(summary?.expenses || 0).toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stat-tile bg-personal-soft border-0">
            <div className="stat-label text-personal">Savings</div>
            <div className="stat-value">₹{(summary?.savings || 0).toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-5">
          <div className="surface-card p-3 h-100">
            <div className="divider-label mb-2">Expense by category</div>
            <CategoryPie data={summary?.categoryBreakdown} />
          </div>
        </div>
        <div className="col-lg-4">
          <div className="surface-card p-3 h-100">
            <div className="divider-label mb-2">Income vs Expense</div>
            <IncomeExpenseBar income={summary?.income || 0} expense={summary?.expenses || 0} />
          </div>
        </div>
        <div className="col-lg-3">
          <div className="surface-card p-3 h-100">
            <div className="divider-label mb-2">Overview</div>
            <div className="d-flex flex-column gap-3 mt-3">
              <div>
                <div className="stat-value" style={{ fontSize: '1.4rem' }}>{summary?.transactionCount || 0}</div>
                <div className="stat-label">Transactions</div>
              </div>
              <div>
                <div className="fw-semibold">{summary?.topCategory?.name || '—'}</div>
                <div className="stat-label">Top spending category</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {view === 'monthly' && summary?.weeklyTrend && (
        <div className="surface-card p-3 mb-4">
          <div className="divider-label mb-2">Weekly spending trend</div>
          <WeeklyTrendBar data={summary.weeklyTrend} />
        </div>
      )}

      <div className="divider-label mb-2">Transaction history</div>
      {loading && <div className="skeleton" style={{ height: 120 }} />}
      {!loading && records.length === 0 && (
        <div className="surface-card"><EmptyState icon="bi-wallet2" title="No financial records yet." subtitle="Try 'Spent ₹500 on shopping today.'" /></div>
      )}
      {!loading && records.length > 0 && (
        <div className="row g-2">
          {records.map((r) => (
            <div className="col-md-6" key={r._id}><RecordCard record={r} onDelete={onDelete} onEdit={(rec) => setEditingRecord(rec)} /></div>
          ))}
        </div>
      )}

      {editingRecord && (
        <RecordEditModal record={editingRecord} onClose={() => setEditingRecord(null)} onSaved={load} />
      )}
    </div>
  );
}
