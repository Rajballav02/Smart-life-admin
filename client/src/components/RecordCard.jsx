import React, { useState } from 'react';

const MODULE_CONFIG = {
  personal: { icon: 'bi-brightness-high', badgeClass: 'badge-personal', iconBg: 'bg-personal-soft text-personal', label: 'Personal' },
  finance: { icon: 'bi-wallet2', badgeClass: 'badge-finance', iconBg: 'bg-finance-soft text-finance', label: 'Finance' },
  documents: { icon: 'bi-file-earmark-lock2', badgeClass: 'badge-documents', iconBg: 'bg-documents-soft text-documents', label: 'Documents' },
};

const TYPE_ICONS = {
  meeting: 'bi-people', appointment: 'bi-calendar-heart', call: 'bi-telephone',
  assignment: 'bi-journal-text', task: 'bi-check2-square',
  income: 'bi-arrow-down-circle', expense: 'bi-arrow-up-circle', bill: 'bi-receipt', subscription: 'bi-repeat',
  insurance: 'bi-shield-check', warranty: 'bi-award', service: 'bi-tools', document: 'bi-file-earmark-text', asset: 'bi-laptop',
};

export default function RecordCard({ record, onComplete, onDelete, onSnooze, onPin, onEdit }) {
  const [busy, setBusy] = useState(false);
  const cfg = MODULE_CONFIG[record.module] || MODULE_CONFIG.personal;
  const icon = TYPE_ICONS[record.type] || cfg.icon;

  const isOverdue = record.status === 'overdue';
  const isCompleted = record.status === 'completed';

  const runAction = async (fn) => {
    if (!fn) return;
    setBusy(true);
    try { await fn(record); } finally { setBusy(false); }
  };

  return (
    <div className={`record-card ${isOverdue ? 'is-overdue' : ''} ${isCompleted ? 'is-completed' : ''}`}>
      <div className="d-flex align-items-start gap-3">
        <div className={`record-icon ${cfg.iconBg}`}>
          <i className={`bi ${icon}`} />
        </div>

        <div className="flex-grow-1 min-w-0">
          <div className="d-flex align-items-start justify-content-between gap-2">
            <div className="min-w-0">
              <h6 className="mb-1 fw-semibold text-truncate">{record.title}</h6>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className={`badge-module ${cfg.badgeClass}`}>{record.category}</span>
                {record.priority && record.priority !== 'low' && (
                  <span className={`badge-module badge-priority-${record.priority}`}>
                    {record.priority === 'high' ? 'High priority' : 'Medium priority'}
                  </span>
                )}
                {record.recurring && (
                  <span className="badge-module" style={{ background: '#EEF1F6', color: 'var(--sla-text-muted)' }}>
                    <i className="bi bi-arrow-repeat" /> {record.frequency}
                  </span>
                )}
              </div>
            </div>
            {record.pinned && <i className="bi bi-pin-angle-fill text-warning" />}
          </div>

          <div className="d-flex flex-wrap align-items-center gap-3 mt-2 small text-muted">
            {record.dateLabel && (
              <span><i className="bi bi-calendar3 me-1" />{record.dateLabel}</span>
            )}
            {record.time && <span><i className="bi bi-clock me-1" />{record.time}</span>}
            {record.amount !== null && record.amount !== undefined && (
              <span className={`fw-semibold ${record.type === 'income' ? 'text-finance' : ''}`}>
                {record.type === 'income' ? '+' : '−'}₹{Number(record.amount).toLocaleString('en-IN')}
              </span>
            )}
            {record.attachments && record.attachments.length > 0 && (
              <span><i className="bi bi-paperclip me-1" />{record.attachments.length}</span>
            )}
          </div>

          <div className="record-actions d-flex align-items-center gap-2 mt-3">
            {!isCompleted && record.module !== 'finance' && (
              <button className="btn btn-sm btn-outline-primary" disabled={busy} onClick={() => runAction(onComplete)}>
                <i className="bi bi-check2" /> Complete
              </button>
            )}
            {!isCompleted && record.reminderEnabled && (
              <button className="btn btn-sm btn-light" disabled={busy} onClick={() => runAction(onSnooze)}>
                <i className="bi bi-alarm" /> Snooze
              </button>
            )}
            <button className="btn btn-sm btn-light" disabled={busy} onClick={() => runAction(onEdit)}>
              <i className="bi bi-pencil" />
            </button>
            <button className="btn btn-sm btn-light" disabled={busy} onClick={() => runAction(onPin)}>
              <i className="bi bi-pin-angle" />
            </button>
            <button className="btn btn-sm btn-light text-danger ms-auto" disabled={busy} onClick={() => runAction(onDelete)}>
              <i className="bi bi-trash3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
