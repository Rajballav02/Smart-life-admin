import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import SmartNoteInput from '../components/SmartNoteInput.jsx';
import RecordCard from '../components/RecordCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import RecordEditModal from '../components/RecordEditModal.jsx';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function LifeHub() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data: dashboard } = await api.get('/dashboard');
      setData(dashboard);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleComplete = async (record) => {
    await api.post(`/records/${record._id}/complete`);
    load();
  };
  const handleDelete = async (record) => {
    await api.delete(`/records/${record._id}`);
    load();
  };

  return (
    <div>
      <h3 className="mb-1">{greeting()}, {user?.name?.split(' ')[0]} 👋</h3>
      <p className="text-muted mb-4">Here&apos;s what&apos;s happening across your life.</p>

      <SmartNoteInput onCreated={load} />

      <div className="row g-3 my-1">
        <StatBlock
          title="Personal" color="personal"
          items={loading ? null : [
            ['Due today', data?.personal.stats.dueToday],
            ['Upcoming', data?.personal.stats.upcoming],
            ['Overdue', data?.personal.stats.overdue],
          ]}
        />
        <StatBlock
          title="Finance" color="finance"
          items={loading ? null : [
            ['Income (week)', `₹${data?.finance.stats.income?.toLocaleString('en-IN') || 0}`],
            ['Expense (week)', `₹${data?.finance.stats.expense?.toLocaleString('en-IN') || 0}`],
            ['Savings (week)', `₹${data?.finance.stats.savings?.toLocaleString('en-IN') || 0}`],
          ]}
        />
        <StatBlock
          title="Documents & Assets" color="documents"
          items={loading ? null : [
            ['Documents', data?.documents.stats.totalDocuments],
            ['Assets', data?.documents.stats.totalAssets],
            ['Expiring soon', data?.documents.stats.expiringSoon],
          ]}
        />
      </div>

      <ModuleSection
        title="Personal" icon="bi-brightness-high" color="personal"
        records={data?.personal.recent} loading={loading}
        onComplete={handleComplete} onDelete={handleDelete} onEdit={setEditingRecord}
        emptyTitle="Nothing pending. You're all caught up."
      />
      <ModuleSection
        title="Finance" icon="bi-wallet2" color="finance"
        records={data?.finance.recent} loading={loading}
        onDelete={handleDelete} onEdit={setEditingRecord}
        emptyTitle="No financial records yet."
      />
      <ModuleSection
        title="Documents & Assets" icon="bi-file-earmark-lock2" color="documents"
        records={data?.documents.recent} loading={loading}
        onComplete={handleComplete} onDelete={handleDelete} onEdit={setEditingRecord}
        emptyTitle="No documents or assets added yet."
      />

      {editingRecord && (
        <RecordEditModal record={editingRecord} onClose={() => setEditingRecord(null)} onSaved={load} />
      )}
    </div>
  );
}

function StatBlock({ title, color, items }) {
  return (
    <div className="col-md-4">
      <div className="surface-card p-3">
        <div className={`text-${color} fw-semibold small mb-2`}>{title}</div>
        <div className="row g-2">
          {(items || [[], [], []]).map(([label, value], i) => (
            <div className="col-4" key={label || i}>
              {items ? (
                <>
                  <div className="stat-value" style={{ fontSize: '1.25rem' }}>{value}</div>
                  <div className="stat-label">{label}</div>
                </>
              ) : (
                <div className="skeleton" style={{ height: 34 }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModuleSection({ title, icon, color, records, loading, onComplete, onDelete, onEdit, emptyTitle }) {
  return (
    <div className="mt-4">
      <div className="d-flex align-items-center gap-2 mb-2">
        <i className={`bi ${icon} text-${color}`} />
        <span className="divider-label">{title}</span>
      </div>

      {loading && (
        <div className="d-flex flex-column gap-2">
          <div className="skeleton" style={{ height: 90 }} />
          <div className="skeleton" style={{ height: 90 }} />
        </div>
      )}

      {!loading && (!records || records.length === 0) && (
        <div className="surface-card"><EmptyState icon={icon} title={emptyTitle} /></div>
      )}

      {!loading && records && records.length > 0 && (
        <div className="row g-2">
          {records.map((r) => (
            <div className="col-md-6" key={r._id}>
              <RecordCard record={r} onComplete={onComplete} onDelete={onDelete} onEdit={onEdit} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
