import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api.js';

const OFFSET_OPTIONS = [
  { label: 'At exact time', value: 0 },
  { label: '5 minutes before', value: 5 },
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 60 * 24 },
  { label: '3 days before', value: 60 * 24 * 3 },
  { label: '7 days before', value: 60 * 24 * 7 },
  { label: '30 days before', value: 60 * 24 * 30 },
];

function toDateInputValue(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function RecordEditModal({ record, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: record.title || '',
    description: record.description || '',
    category: record.category || '',
    amount: record.amount ?? '',
    dateInput: toDateInputValue(record.date),
    time: record.time || '',
    priority: record.priority || 'low',
    status: record.status || 'pending',
    reminderEnabled: !!record.reminderEnabled,
    reminderOffsetMinutes: record.reminderOffsetMinutes ?? 60,
  });
  const [attachments, setAttachments] = useState(record.attachments || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const isFinance = record.module === 'finance';
  const isDocuments = record.module === 'documents';

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError('Please choose a file under 3MB.');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAttachments((prev) => [...prev, { name: file.name, dataUrl, size: file.size }]);
    } catch {
      setError('Could not read that file. Please try another.');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (name) => {
    setAttachments((prev) => prev.filter((a) => a.name !== name));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        priority: form.priority,
        status: form.status,
        reminderEnabled: form.reminderEnabled,
        reminderOffsetMinutes: Number(form.reminderOffsetMinutes),
        attachments,
      };
      if (isFinance) payload.amount = form.amount === '' ? null : Number(form.amount);
      if (form.dateInput) {
        const d = new Date(form.dateInput);
        if (form.time) {
          const match = form.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (match) {
            let hour = Number(match[1]);
            const minute = Number(match[2]);
            if (/pm/i.test(match[3]) && hour !== 12) hour += 12;
            if (/am/i.test(match[3]) && hour === 12) hour = 0;
            d.setHours(hour, minute, 0, 0);
          }
        }
        payload.date = d.toISOString();
        payload.dateLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      } else {
        payload.date = null;
        payload.dateLabel = 'Not specified';
      }
      payload.time = form.time;

      const { data } = await api.put(`/records/${record._id}`, payload);
      onSaved?.(data.record);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="edit-modal-overlay position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{ background: 'rgba(31,29,43,0.45)', zIndex: 1050 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="edit-modal-card surface-card p-4 page-fade" style={{ maxWidth: 520, width: '100%' }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="mb-0">Edit record</h5>
          <button className="btn btn-light btn-icon" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        <form onSubmit={handleSave}>
          <div className="mb-3">
            <label className="form-label">Title</label>
            <input className="form-control" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div className="mb-3">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="row g-2 mb-3">
            <div className="col-6">
              <label className="form-label">Category</label>
              <input className="form-control" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            {isFinance && (
              <div className="col-6">
                <label className="form-label">Amount (₹)</label>
                <input type="number" className="form-control" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
            )}
            {!isFinance && (
              <div className="col-6">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            )}
          </div>

          <div className="row g-2 mb-3">
            <div className="col-6">
              <label className="form-label">Date</label>
              <input type="date" className="form-control" value={form.dateInput} onChange={(e) => setForm({ ...form, dateInput: e.target.value })} />
            </div>
            <div className="col-6">
              <label className="form-label">Time</label>
              <input type="text" placeholder="5:00 PM" className="form-control" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>

          {!isFinance && (
            <div className="mb-3">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          )}

          {!isFinance && (
            <div className="surface-card p-3 mb-3" style={{ background: 'var(--sla-surface-alt)' }}>
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input" type="checkbox" id="reminderEnabled"
                  checked={form.reminderEnabled}
                  onChange={(e) => setForm({ ...form, reminderEnabled: e.target.checked })}
                />
                <label className="form-check-label small fw-semibold" htmlFor="reminderEnabled">Reminder enabled</label>
              </div>
              {form.reminderEnabled && (
                <>
                  <label className="form-label">Remind me</label>
                  <select
                    className="form-select"
                    value={form.reminderOffsetMinutes}
                    onChange={(e) => setForm({ ...form, reminderOffsetMinutes: e.target.value })}
                  >
                    {OFFSET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <p className="text-muted small mb-0 mt-2">
                    <i className="bi bi-info-circle me-1" />
                    If Alarm is enabled in Settings, this reminder also sends an SMS to your registered phone number.
                  </p>
                </>
              )}
            </div>
          )}

          {isDocuments && (
            <div className="mb-3">
              <label className="form-label">Attachments</label>
              <div className="d-flex flex-column gap-2 mb-2">
                {attachments.map((a) => (
                  <div key={a.name} className="d-flex align-items-center justify-content-between p-2 rounded-3" style={{ background: 'var(--sla-surface-alt)', border: '1px solid var(--sla-border)' }}>
                    <span className="small text-truncate"><i className="bi bi-paperclip me-1" />{a.name}</span>
                    <button type="button" className="btn btn-sm btn-light text-danger" onClick={() => removeAttachment(a.name)}>
                      <i className="bi bi-x" />
                    </button>
                  </div>
                ))}
              </div>
              <input type="file" className="form-control form-control-sm" onChange={handleFileChange} disabled={uploading} />
              <p className="text-muted small mb-0 mt-1">Images or PDFs under 3MB (stored with this record).</p>
            </div>
          )}

          {error && <div className="alert alert-danger py-2 small">{error}</div>}

          <div className="d-flex gap-2 mt-2">
            <button type="button" className="btn btn-light flex-grow-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-grow-1" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
