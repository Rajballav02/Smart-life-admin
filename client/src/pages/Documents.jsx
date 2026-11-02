import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api.js';
import RecordCard from '../components/RecordCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Navbar from '../components/Navbar.jsx';
import RecordEditModal from '../components/RecordEditModal.jsx';

const TYPE_TABS = [
  { key: '', label: 'All' },
  { key: 'document', label: 'Documents' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'warranty', label: 'Warranty' },
  { key: 'service', label: 'Service' },
  { key: 'asset', label: 'Assets' },
];

export default function Documents() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/records', { params: { module: 'documents', search: search || undefined } });
      const filtered = type ? data.records.filter((r) => r.type === type) : data.records;
      setRecords(filtered);
    } finally {
      setLoading(false);
    }
  }, [type, search]);

  useEffect(() => { load(); }, [load]);

  const act = {
    onComplete: async (r) => { await api.post(`/records/${r._id}/complete`); load(); },
    onDelete: async (r) => { await api.delete(`/records/${r._id}`); load(); },
    onSnooze: async (r) => { await api.post(`/records/${r._id}/snooze`, { minutes: 60 * 24 }); load(); },
    onPin: async (r) => { await api.put(`/records/${r._id}`, { pinned: !r.pinned }); load(); },
    onEdit: (r) => setEditingRecord(r),
  };

  return (
    <div>
      <Navbar title="Documents & Assets" subtitle="Insurance, warranties, renewals and vehicle service — tracked before they expire." />

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <div className="btn-group flex-wrap">
          {TYPE_TABS.map((t) => (
            <button
              key={t.key}
              className={`btn btn-sm ${type === t.key ? 'btn-primary' : 'btn-light'}`}
              onClick={() => setType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          className="form-control form-control-sm ms-auto"
          style={{ maxWidth: 240 }}
          placeholder="Search documents & assets..."
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
          <EmptyState icon="bi-file-earmark-lock2" title="No documents or assets added yet." subtitle="Write a Smart Note like 'Bike insurance expires 20 October'." />
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
