import React from 'react';

export default function EmptyState({ icon = 'bi-inbox', title, subtitle }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <i className={`bi ${icon}`} />
      </div>
      <h6 className="mb-1 fw-semibold">{title}</h6>
      {subtitle && <p className="mb-0 small">{subtitle}</p>}
    </div>
  );
}
