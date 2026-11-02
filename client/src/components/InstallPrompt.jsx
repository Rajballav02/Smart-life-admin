import React, { useEffect, useState } from 'react';
import { canInstall, isIOS, isStandalone, onInstallChange, promptInstall } from '../pwa.js';

const DISMISS_KEY = 'sla_install_dismissed';

/** Small card that offers to install the app on the home screen (Android/Chrome button, iOS instructions). */
export default function InstallPrompt({ banner = false }) {
  const [, force] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    try { return banner && localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });
  useEffect(() => onInstallChange(() => force((n) => n + 1)), []);

  if (isStandalone() || dismissed) return null;
  const ios = isIOS();
  if (!ios && !canInstall()) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  };

  return (
    <div className={`install-card surface-card d-flex align-items-center gap-3 p-3 ${banner ? 'mb-3' : ''}`}>
      <img src="/icons/icon-192.png" alt="" width="44" height="44" style={{ borderRadius: 12 }} />
      <div className="flex-grow-1">
        <div className="fw-semibold small">Install Smart Life Admin</div>
        <div className="text-muted" style={{ fontSize: '0.78rem' }}>
          {ios
            ? <>Tap <i className="bi bi-box-arrow-up" /> Share, then &ldquo;Add to Home Screen&rdquo;.</>
            : 'Add it to your home screen to use it like a normal app.'}
        </div>
      </div>
      {!ios && <button className="btn btn-primary btn-sm" onClick={promptInstall}>Install</button>}
      {banner && <button className="btn btn-light btn-sm btn-icon" aria-label="Dismiss" onClick={dismiss}><i className="bi bi-x-lg" /></button>}
    </div>
  );
}
