import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api.js';
import Navbar from '../components/Navbar.jsx';
import RecordCard from '../components/RecordCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import RecordEditModal from '../components/RecordEditModal.jsx';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MODULE_DOT = { personal: 'var(--sla-personal)', finance: 'var(--sla-finance)', documents: 'var(--sla-documents)' };

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Calendar() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
      const { data } = await api.get('/records', {
        params: { from: from.toISOString(), to: to.toISOString() },
      });
      setRecords(data.records.filter((r) => r.date));
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => { load(); setSelectedDay(null); }, [load]);

  const eventsByDay = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const key = dateKey(new Date(r.date));
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [records]);

  const grid = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startOffset; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
    return cells;
  }, [cursor]);

  const today = new Date();
  const isToday = (d) => d && d.toDateString() === today.toDateString();

  const selectedEvents = selectedDay ? (eventsByDay[dateKey(selectedDay)] || []) : [];

  const act = {
    onComplete: async (r) => { await api.post(`/records/${r._id}/complete`); load(); },
    onDelete: async (r) => { await api.delete(`/records/${r._id}`); load(); },
    onSnooze: async (r) => { await api.post(`/records/${r._id}/snooze`, { minutes: 60 }); load(); },
    onPin: async (r) => { await api.put(`/records/${r._id}`, { pinned: !r.pinned }); load(); },
    onEdit: (r) => setEditingRecord(r),
  };

  return (
    <div>
      <Navbar title="Calendar" subtitle="All your dated tasks, appointments, expiries, and renewals in one view." />

      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-light btn-icon" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}>
            <i className="bi bi-chevron-left" />
          </button>
          <h5 className="mb-0" style={{ minWidth: 160, textAlign: 'center' }}>
            {cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </h5>
          <button className="btn btn-light btn-icon" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}>
            <i className="bi bi-chevron-right" />
          </button>
        </div>
        <button className="btn btn-sm btn-light" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }}>Today</button>
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          {loading ? (
            <div className="skeleton" style={{ height: 420 }} />
          ) : (
          <div className="surface-card p-3">
            <div className="row g-0 mb-1">
              {WEEKDAY_LABELS.map((w) => (
                <div className="col text-center small fw-semibold text-muted py-1" key={w}>{w}</div>
              ))}
            </div>
            <div className="row g-1">
              {grid.map((d, i) => {
                const key = d ? dateKey(d) : `empty-${i}`;
                const dayEvents = d ? (eventsByDay[key] || []) : [];
                return (
                  <div className="col" key={key} style={{ flex: '0 0 14.28%', maxWidth: '14.28%' }}>
                    {d ? (
                      <button
                        type="button"
                        className="btn w-100 p-2 text-start"
                        style={{
                          minHeight: 76,
                          borderRadius: 12,
                          border: selectedDay && dateKey(selectedDay) === key ? '1.5px solid var(--sla-primary)' : '1px solid var(--sla-border)',
                          background: isToday(d) ? 'var(--sla-primary-light)' : 'var(--sla-surface)',
                        }}
                        onClick={() => setSelectedDay(d)}
                      >
                        <div className={`small ${isToday(d) ? 'fw-bold text-personal' : ''}`}>{d.getDate()}</div>
                        <div className="d-flex flex-wrap gap-1 mt-1">
                          {dayEvents.slice(0, 4).map((ev) => (
                            <span key={ev._id} style={{ width: 6, height: 6, borderRadius: '50%', background: MODULE_DOT[ev.module] }} />
                          ))}
                        </div>
                      </button>
                    ) : <div style={{ minHeight: 76 }} />}
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>

        <div className="col-lg-4">
          <div className="divider-label mb-2">
            {selectedDay ? selectedDay.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Select a day'}
          </div>

          {!selectedDay && (
            <div className="surface-card"><EmptyState icon="bi-calendar3" title="Tap a date to see what's on it." /></div>
          )}

          {selectedDay && selectedEvents.length === 0 && (
            <div className="surface-card"><EmptyState icon="bi-calendar3" title="Nothing scheduled this day." /></div>
          )}

          <div className="d-flex flex-column gap-2">
            {selectedEvents.map((r) => (
              <RecordCard key={r._id} record={r} {...(r.module === 'finance' ? { onDelete: act.onDelete, onEdit: act.onEdit } : act)} />
            ))}
          </div>
        </div>
      </div>

      {editingRecord && (
        <RecordEditModal record={editingRecord} onClose={() => setEditingRecord(null)} onSaved={load} />
      )}
    </div>
  );
}
