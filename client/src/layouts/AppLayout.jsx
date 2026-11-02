import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import AlarmManager from '../components/AlarmManager.jsx';
import PageBackground from '../components/PageBackground.jsx';
import InstallPrompt from '../components/InstallPrompt.jsx';

// Which background artwork each route uses (matches the page label).
const ROUTE_BACKGROUNDS = {
  '/app': 'hub',
  '/app/personal': 'personal',
  '/app/finance': 'finance',
  '/app/documents': 'documents',
  '/app/notes': 'notes',
  '/app/calendar': 'calendar',
  '/app/search': 'search',
  '/app/notifications': 'notifications',
  '/app/profile': 'profile',
  '/app/settings': 'settings',
};

const MOBILE_NAV_ITEMS = [
  { to: '/app', label: 'Hub', icon: 'bi-house-heart', end: true },
  { to: '/app/personal', label: 'Personal', icon: 'bi-brightness-high' },
  { to: '/app/finance', label: 'Finance', icon: 'bi-wallet2' },
  { to: '/app/documents', label: 'Docs', icon: 'bi-file-earmark-lock2' },
];

const MORE_ITEMS = [
  { to: '/app/notes', label: 'Smart Notes', icon: 'bi-journal-text' },
  { to: '/app/calendar', label: 'Calendar', icon: 'bi-calendar3' },
  { to: '/app/search', label: 'Search', icon: 'bi-search' },
  { to: '/app/notifications', label: 'Alerts', icon: 'bi-bell' },
  { to: '/app/profile', label: 'Profile', icon: 'bi-person-circle' },
  { to: '/app/settings', label: 'Settings', icon: 'bi-gear' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const backgroundName = ROUTE_BACKGROUNDS[location.pathname.replace(/\/+$/, '') || '/app'] || 'hub';

  return (
    <div className="d-flex">
      <PageBackground name={backgroundName} />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <main className="flex-grow-1 app-content-area" style={{ minWidth: 0 }}>
        <div className="container-fluid p-3 p-md-4 page-fade" key={location.pathname}>
          <InstallPrompt banner />
          <Outlet />
        </div>
      </main>

      {moreOpen && (
        <>
          <div className="more-backdrop d-md-none" onClick={() => setMoreOpen(false)} />
          <div className="more-sheet d-md-none" role="menu">
            <div className="more-handle" />
            <div className="more-grid">
              {MORE_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) => `more-item ${isActive ? 'active' : ''}`}
                >
                  <i className={`bi ${item.icon}`} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}

      <nav className="mobile-bottom-nav d-md-none">
        {MOBILE_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMoreOpen(false)}
            className={({ isActive }) => `mb-nav-item ${isActive ? 'active' : ''}`}
          >
            <i className={`bi ${item.icon}`} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={`mb-nav-item ${MORE_ITEMS.some((m) => location.pathname.startsWith(m.to)) || moreOpen ? 'active' : ''}`}
          onClick={() => setMoreOpen((v) => !v)}
        >
          <i className="bi bi-grid-3x3-gap" />
          <span>More</span>
        </button>
      </nav>

      <AlarmManager />
    </div>
  );
}
