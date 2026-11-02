import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api.js';
import Navbar from '../components/Navbar.jsx';
import EmptyState from '../components/EmptyState.jsx';

const CHANNEL_ICON = { in_app: 'bi-app-indicator', alarm: 'bi-alarm', sms: 'bi-chat-dots', email: 'bi-envelope' };

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => { await api.put('/notifications/read-all'); load(); };
  const markRead = async (n) => { await api.put(`/notifications/${n._id}/read`); load(); };
  const dismiss = async (n) => { await api.put(`/notifications/${n._id}/dismiss`); load(); };
  const snooze = async (n) => { await api.put(`/notifications/${n._id}/snooze`, { minutes: 15 }); load(); };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="mb-0">Notifications</h4>
          <p className="text-muted mb-0 small">In-app alerts, alarms, SMS and email reminders.</p>
        </div>
        <button className="btn btn-light btn-sm" onClick={markAllRead}>Mark all as read</button>
      </div>

      {loading && <div className="skeleton" style={{ height: 100 }} />}

      {!loading && notifications.length === 0 && (
        <div className="surface-card"><EmptyState icon="bi-bell" title="You're all caught up." subtitle="Reminders will appear here as they come due." /></div>
      )}

      <div className="d-flex flex-column gap-2">
        {notifications.map((n) => (
          <div key={n._id} className={`surface-card p-3 d-flex align-items-start gap-3 ${n.status === 'read' ? 'opacity-75' : ''}`}>
            <div className="record-icon bg-personal-soft text-personal">
              <i className={`bi ${CHANNEL_ICON[n.channel] || 'bi-bell'}`} />
            </div>
            <div className="flex-grow-1">
              <div className="d-flex align-items-center gap-2">
                <h6 className="mb-0">{n.title}</h6>
                <span className="badge-module" style={{ background: '#EEF1F6', color: 'var(--sla-text-muted)' }}>{n.channel.replace('_', ' ')}</span>
                {n.status === 'failed' && <span className="badge-module badge-priority-high">failed</span>}
              </div>
              <p className="text-muted small mb-2">{n.message}</p>
              <span className="text-muted small">{new Date(n.createdAt).toLocaleString('en-IN')}</span>
            </div>
            <div className="d-flex gap-2 flex-shrink-0">
              {n.status !== 'read' && (
                <button className="btn btn-sm btn-light" onClick={() => markRead(n)}><i className="bi bi-check2" /></button>
              )}
              <button className="btn btn-sm btn-light" onClick={() => snooze(n)}><i className="bi bi-alarm" /></button>
              <button className="btn btn-sm btn-light text-danger" onClick={() => dismiss(n)}><i className="bi bi-x-lg" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
