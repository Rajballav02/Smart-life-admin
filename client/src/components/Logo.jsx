import React from 'react';

export default function Logo({ showText = true, size = 38 }) {
  return (
    <div className="d-flex align-items-center gap-2">
      <div className="sla-logo-mark" style={{ width: size, height: size, padding: size * 0.14 }}>
        <svg viewBox="0 0 48 48" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Central hub node */}
          <circle cx="24" cy="24" r="6.5" fill="white" />
          {/* Brain-like connecting arc, flowing into orbiting "cards" */}
          <path
            d="M24 10c-8 0-14 5.5-14 13"
            stroke="white" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.9"
          />
          {/* Three small orbiting cards representing Personal / Finance / Documents */}
          <rect x="6" y="19" width="7" height="5.5" rx="1.6" fill="white" opacity="0.95" />
          <rect x="34" y="9" width="7" height="5.5" rx="1.6" fill="white" opacity="0.95" />
          <rect x="34" y="31" width="7" height="5.5" rx="1.6" fill="white" opacity="0.95" />
          {/* Checkmark inside the hub */}
          <path
            d="M21 24l2.2 2.2L27.5 21.5"
            stroke="#6C5CE7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none"
          />
        </svg>
      </div>
      {showText && (
        <span className="sla-logo-text">Smart Life <span style={{ color: 'var(--sla-primary)' }}>Admin</span></span>
      )}
    </div>
  );
}
