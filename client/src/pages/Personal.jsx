import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api.js';
import RecordCard from '../components/RecordCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Navbar from '../components/Navbar.jsx';
import RecordEditModal from '../components/RecordEditModal.jsx';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'overdue', label: 'Overdue' },
];

export default function Personal() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/records', { params: { module: 'personal', status: status || undefined, search: search || undefined } });
      setRecords(data.records);
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => { load(); }, [load]);

  const act = {
    onComplete: async (r) => { await api.post(`/records/${r._id}/complete`); load(); },
    onDelete: async (r) => { await api.delete(`/records/${r._id}`); load(); },
    onSnooze: async (r) => { await api.post(`/records/${r._id}/snooze`, { minutes: 60 }); load(); },
    onPin: async (r) => { await api.put(`/records/${r._id}`, { pinned: !r.pinned }); load(); },
    onEdit: (r) => setEditingRecord(r),
  };

  return (
    <div>
      <Navbar title="Personal" subtitle="Tasks, meetings, appointments and plans." />

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <div className="btn-group">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              className={`btn btn-sm ${status === t.key ? 'btn-primary' : 'btn-light'}`}
              onClick={() => setStatus(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          className="form-control form-control-sm ms-auto"
          style={{ maxWidth: 240 }}
          placeholder="Search personal items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && (
        <div className="d-flex flex-column gap-2">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 90 }} />)}
        </div>
      )}

      {!loading && records.length === 0 && (
        <div className="surface-card">
          <EmptyState icon="bi-brightness-high" title="Nothing pending. You're all caught up." subtitle="Add a task, meeting or appointment from Smart Notes." />
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="row g-2">
          {records.map((r) => (
            <div className="col-md-6" key={r._id}>
              <RecordCard record={r} {...act} />
            </div>
          ))}
        </div>
      )}

      {editingRecord && (
        <RecordEditModal record={editingRecord} onClose={() => setEditingRecord(null)} onSaved={load} />
      )}
    </div>
  );
}
