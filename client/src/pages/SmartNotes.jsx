import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api.js';
import SmartNoteInput from '../components/SmartNoteInput.jsx';
import Navbar from '../components/Navbar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import RecordCard from '../components/RecordCard.jsx';

export default function SmartNotes() {
  const [notes, setNotes] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedRecords, setExpandedRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notes');
      setNotes(data.notes);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = async (note) => {
    if (expandedId === note._id) { setExpandedId(null); return; }
    const { data } = await api.get(`/notes/${note._id}`);
    setExpandedRecords(data.records);
    setExpandedId(note._id);
  };

  const deleteNote = async (note) => {
    await api.delete(`/notes/${note._id}`);
    load();
  };

  return (
    <div>
      <Navbar title="Smart Notes" subtitle="Everything you've written, and what it turned into." />

      <SmartNoteInput onCreated={load} />

      <div className="divider-label mt-4 mb-2">History</div>

      {loading && <div className="skeleton" style={{ height: 100 }} />}

      {!loading && notes.length === 0 && (
        <div className="surface-card"><EmptyState icon="bi-journal-text" title="No notes yet." subtitle="Write your first Smart Note above." /></div>
      )}

      <div className="d-flex flex-column gap-2">
        {notes.map((note) => (
          <div className="surface-card p-3" key={note._id}>
            <div className="d-flex align-items-start justify-content-between gap-3">
              <div className="flex-grow-1">
                <p className="mb-1">{note.originalText}</p>
                <span className="text-muted small">
                  {note.itemsExtracted} item{note.itemsExtracted !== 1 ? 's' : ''} organized · {new Date(note.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-light" onClick={() => toggleExpand(note)}>
                  <i className={`bi ${expandedId === note._id ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                </button>
                <button className="btn btn-sm btn-light text-danger" onClick={() => deleteNote(note)}>
                  <i className="bi bi-trash3" />
                </button>
              </div>
            </div>

            {expandedId === note._id && (
              <div className="row g-2 mt-2">
                {expandedRecords.map((r) => (
                  <div className="col-md-6" key={r._id}><RecordCard record={r} /></div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
