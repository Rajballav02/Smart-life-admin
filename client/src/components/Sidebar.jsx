import React from 'react';
import { NavLink } from 'react-router-dom';
import Logo from './Logo.jsx';

const NAV_ITEMS = [
  { to: '/app', label: 'Life Hub', icon: 'bi-house-heart', end: true },
  { to: '/app/personal', label: 'Personal', icon: 'bi-brightness-high' },
  { to: '/app/finance', label: 'Finance', icon: 'bi-wallet2' },
  { to: '/app/documents', label: 'Documents & Assets', icon: 'bi-file-earmark-lock2' },
  { to: '/app/notes', label: 'Smart Notes', icon: 'bi-journal-text' },
  { to: '/app/calendar', label: 'Calendar', icon: 'bi-calendar3' },
  { to: '/app/search', label: 'Search', icon: 'bi-search' },
  { to: '/app/notifications', label: 'Notifications', icon: 'bi-bell' },
  { to: '/app/profile', label: 'Profile', icon: 'bi-person-circle' },
  { to: '/app/settings', label: 'Settings', icon: 'bi-gear' },
];

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={`sla-sidebar d-none d-md-flex flex-column p-3 ${collapsed ? 'collapsed' : ''}`}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <Logo showText={!collapsed} />
      </div>

      <nav className="d-flex flex-column gap-1 flex-grow-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sla-nav-link ${isActive ? 'active' : ''}`}
          >
            <i className={`bi ${item.icon}`} />
            <span className="sla-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <button className="btn btn-light btn-sm mt-3 d-flex align-items-center justify-content-center gap-2" onClick={onToggle}>
        <i className={`bi ${collapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'}`} />
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}
