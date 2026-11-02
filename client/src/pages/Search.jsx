import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api.js';
import Navbar from '../components/Navbar.jsx';
import RecordCard from '../components/RecordCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import RecordEditModal from '../components/RecordEditModal.jsx';

const MODULE_FILTERS = [
  { key: '', label: 'All modules' },
  { key: 'personal', label: 'Personal' },
  { key: 'finance', label: 'Finance' },
  { key: 'documents', label: 'Documents & Assets' },
];

const STATUS_FILTERS = [
  { key: '', label: 'Any status' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'overdue', label: 'Overdue' },
];

const PRIORITY_FILTERS = [
  { key: '', label: 'Any priority' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

export default function Search() {
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await api.get('/records', {
        params: {
          search: query || undefined,
          module: moduleFilter || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
        },
      });
      setRecords(data.records);
    } finally {
      setLoading(false);
    }
  }, [query, moduleFilter, statusFilter, priorityFilter]);

  // Auto-run once filters change, debounced lightly for the text query.
  useEffect(() => {
    const t = setTimeout(() => { runSearch(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleFilter, statusFilter, priorityFilter, query]);

  const act = {
    onComplete: async (r) => { await api.post(`/records/${r._id}/complete`); runSearch(); },
    onDelete: async (r) => { await api.delete(`/records/${r._id}`); runSearch(); },
    onSnooze: async (r) => { await api.post(`/records/${r._id}/snooze`, { minutes: 60 }); runSearch(); },
    onPin: async (r) => { await api.put(`/records/${r._id}`, { pinned: !r.pinned }); runSearch(); },
    onEdit: (r) => setEditingRecord(r),
  };

  return (
    <div>
      <Navbar title="Search" subtitle="Find anything across Personal, Finance, and Documents & Assets." />

      <div className="surface-card p-3 mb-3">
        <div className="input-group mb-3">
          <span className="input-group-text bg-transparent border-end-0" style={{ borderRadius: '10px 0 0 10px' }}>
            <i className="bi bi-search text-muted" />
          </span>
          <input
            className="form-control border-start-0"
            style={{ borderRadius: '0 10px 10px 0' }}
            placeholder="Search titles, descriptions, categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="row g-2">
          <div className="col-sm-4">
            <select className="form-select form-select-sm" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
              {MODULE_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          <div className="col-sm-4">
            <select className="form-select form-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          <div className="col-sm-4">
            <select className="form-select form-select-sm" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              {PRIORITY_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="d-flex flex-column gap-2">
          {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 90 }} />)}
        </div>
      )}

      {!loading && searched && records.length === 0 && (
        <div className="surface-card"><EmptyState icon="bi-search" title="No matches found." subtitle="Try a different keyword or clear a filter." /></div>
      )}

      {!loading && records.length > 0 && (
        <>
          <p className="text-muted small mb-2">{records.length} result{records.length !== 1 ? 's' : ''}</p>
          <div className="row g-2">
            {records.map((r) => (
              <div className="col-md-6" key={r._id}>
                <RecordCard record={r} {...(r.module === 'finance' ? { onDelete: act.onDelete, onEdit: act.onEdit } : act)} />
              </div>
            ))}
          </div>
        </>
      )}

      {editingRecord && (
        <RecordEditModal record={editingRecord} onClose={() => setEditingRecord(null)} onSaved={runSearch} />
      )}
    </div>
  );
}
