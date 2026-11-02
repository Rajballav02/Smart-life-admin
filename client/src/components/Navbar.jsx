import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

export default function Navbar({ title, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const { data } = await api.get('/notifications', { params: { limit: 1 } });
        if (mounted) setUnreadCount(data.unreadCount);
      } catch { /* silent */ }
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  return (
    <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
      <div>
        <h4 className="mb-0">{title}</h4>
        {subtitle && <p className="text-muted mb-0 small">{subtitle}</p>}
      </div>

      <div className="d-flex align-items-center gap-2">
        <button
          className="btn btn-light btn-icon position-relative"
          onClick={() => navigate('/app/notifications')}
        >
          <i className={`bi bi-bell ${unreadCount > 0 ? 'bell-ring' : ''}`} />
          {unreadCount > 0 && <span className="bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>

        <div className="position-relative">
          <button className="btn btn-light d-flex align-items-center gap-2" onClick={() => setMenuOpen((v) => !v)}>
            <div
              className="rounded-circle bg-personal-soft text-personal d-flex align-items-center justify-content-center fw-semibold"
              style={{ width: 30, height: 30, fontSize: '0.8rem' }}
            >
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="d-none d-sm-inline small fw-semibold">{user?.name}</span>
            <i className="bi bi-chevron-down small" />
          </button>

          {menuOpen && (
            <div
              className="surface-card position-absolute end-0 mt-2 p-2"
              style={{ minWidth: 180, zIndex: 20 }}
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button className="sla-nav-link w-100 text-start border-0 bg-transparent" onClick={() => { setMenuOpen(false); navigate('/app/profile'); }}>
                <i className="bi bi-person" /> Profile
              </button>
              <button className="sla-nav-link w-100 text-start border-0 bg-transparent" onClick={() => { setMenuOpen(false); navigate('/app/settings'); }}>
                <i className="bi bi-gear" /> Settings
              </button>
              <button className="sla-nav-link w-100 text-start border-0 bg-transparent text-danger" onClick={logout}>
                <i className="bi bi-box-arrow-right" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
