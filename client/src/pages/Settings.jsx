import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { pushSupported, getPushSubscription, enablePush, disablePush, isIOS, isStandalone } from '../pwa.js';

const DEFAULT_PREFS = {
  personal: { inApp: true, alarm: true, sms: false, email: false },
  documents: { inApp: true, alarm: true, sms: false, email: false },
};

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [prefs, setPrefs] = useState(user?.notificationPreferences || DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState(null); // { type, text }

  useEffect(() => {
    getPushSubscription().then((sub) => setPushOn(!!sub)).catch(() => {});
  }, []);

  const togglePush = async () => {
    setPushMsg(null); setPushBusy(true);
    try {
      if (pushOn) {
        await disablePush(api);
        setPushOn(false);
        setPushMsg({ type: 'secondary', text: 'Push notifications are off on this device.' });
      } else {
        await enablePush(api);
        setPushOn(true);
        setPushMsg({ type: 'success', text: 'Push notifications are on. You will get reminders even when the app is closed.' });
      }
    } catch (err) {
      setPushMsg({ type: 'danger', text: err.response?.data?.message || err.message || 'Could not change push settings.' });
    } finally { setPushBusy(false); }
  };

  const sendTestPush = async () => {
    setPushMsg(null);
    try {
      const { data } = await api.post('/push/test');
      setPushMsg({ type: 'success', text: data.message });
    } catch (err) {
      setPushMsg({ type: 'danger', text: err.response?.data?.message || 'Test failed.' });
    }
  };

  const toggle = (module, channel) => {
    setPrefs((p) => ({
      ...p,
      [module]: { ...p[module], [channel]: !p[module][channel] },
    }));
  };

  const save = async () => {
    const { data } = await api.put('/auth/me', { notificationPreferences: prefs });
    updateUser(data.user);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h4 className="mb-4">Settings</h4>

      <div className="surface-card p-4" style={{ maxWidth: 560 }}>
        <h6 className="mb-1">Notification preferences</h6>
        <p className="text-muted small mb-1">
          Finance is tracking &amp; analysis only, so it doesn&apos;t have reminder settings.
        </p>
        <p className="text-muted small mb-4">
          <i className="bi bi-info-circle me-1" />
          Turning on <strong>Alarm</strong> also sends the reminder as an SMS to your registered
          phone number (see Profile), so it reaches you even if the app isn&apos;t open.
        </p>

        {['personal', 'documents'].map((moduleKey) => (
          <div className="mb-4" key={moduleKey}>
            <div className="divider-label mb-2">{moduleKey === 'personal' ? 'Personal' : 'Documents & Assets'}</div>
            <div className="row g-2">
              {[['inApp', 'In-App', 'bi-app-indicator'], ['alarm', 'Alarm', 'bi-alarm'], ['sms', 'SMS', 'bi-chat-dots'], ['email', 'Email', 'bi-envelope']].map(([key, label, icon]) => (
                <div className="col-6" key={key}>
                  <label className="d-flex align-items-center justify-content-between p-2 rounded-3" style={{ background: 'var(--sla-surface-alt)', border: '1px solid var(--sla-border)' }}>
                    <span className="d-flex align-items-center gap-2 small"><i className={`bi ${icon}`} />{label}</span>
                    <input
                      type="checkbox"
                      className="form-check-input mt-0"
                      checked={!!prefs[moduleKey]?.[key]}
                      onChange={() => toggle(moduleKey, key)}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button className="btn btn-primary" onClick={save}>{saved ? 'Saved ✓' : 'Save preferences'}</button>
      </div>

      <div className="surface-card p-4 mt-3" style={{ maxWidth: 560 }}>
        <h6 className="mb-1"><i className="bi bi-phone-vibrate me-2 text-personal" />Push notifications</h6>
        <p className="text-muted small mb-3">
          Get reminders on this device even when the app is closed.
          {isIOS() && !isStandalone() && ' On iPhone, first add the app to your Home Screen (Share > Add to Home Screen), then open it from there.'}
        </p>
        {pushSupported() ? (
          <div className="d-flex flex-wrap gap-2">
            <button className={`btn ${pushOn ? 'btn-light' : 'btn-primary'}`} onClick={togglePush} disabled={pushBusy}>
              <i className={`bi ${pushOn ? 'bi-bell-slash' : 'bi-bell'} me-1`} />
              {pushBusy ? 'Please wait…' : pushOn ? 'Turn off on this device' : 'Turn on push notifications'}
            </button>
            {pushOn && <button className="btn btn-light" onClick={sendTestPush}><i className="bi bi-send me-1" /> Send test</button>}
          </div>
        ) : (
          <div className="text-muted small">This browser does not support push notifications.</div>
        )}
        {pushMsg && <div className={`alert alert-${pushMsg.type} py-2 small mt-3 mb-0`}>{pushMsg.text}</div>}
      </div>
    </div>
  );
}
