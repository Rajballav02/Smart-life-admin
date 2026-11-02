import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import InstallPrompt from '../components/InstallPrompt.jsx';
import api from '../services/api.js';

export default function Profile() {
  const { user, updateUser, logout, applySession } = useAuth();
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwMsg, setPwMsg] = useState(null); // { type, text }
  const [pwBusy, setPwBusy] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', countryCode: user?.countryCode || '+91' });
  const [saved, setSaved] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setProfileError('');
    try {
      const { data } = await api.put('/auth/me', form);
      updateUser(data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Could not save. Please try again.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null); setPwBusy(true);
    try {
      const { data } = await api.put('/auth/change-password', pw);
      applySession(data.token, data.user); // keep this device signed in; others are signed out
      setPw({ currentPassword: '', newPassword: '' });
      setPwMsg({ type: 'success', text: 'Password updated. Other devices were signed out.' });
    } catch (err) {
      setPwMsg({ type: 'danger', text: err.response?.data?.message || 'Could not update the password.' });
    } finally { setPwBusy(false); }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Sign out on every device, including this one?')) return;
    try { await api.post('/auth/logout-all'); } finally { logout(); }
  };

  return (
    <div>
      <h4 className="mb-4">Profile</h4>

      <div className="surface-card p-4" style={{ maxWidth: 480 }}>
        <div className="d-flex align-items-center gap-3 mb-4">
          <div className="rounded-circle bg-personal-soft text-personal d-flex align-items-center justify-content-center fw-semibold fs-4" style={{ width: 64, height: 64 }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h5 className="mb-0">{user?.name}</h5>
            <span className="text-muted small">{user?.email}</span>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input className="form-control" value={user?.email} disabled />
          </div>
          <div className="row g-2 mb-3">
            <div className="col-4">
              <label className="form-label">Code</label>
              <input className="form-control" value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })} />
            </div>
            <div className="col-8">
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="For SMS & Alarm reminders" />
            </div>
          </div>
          <p className="text-muted small mb-3">
            <i className="bi bi-info-circle me-1" />
            This number receives alarm and SMS reminders for Personal and Documents & Assets items.
          </p>
          {profileError && <div className="alert alert-danger py-2 small">{profileError}</div>}
          <button className="btn btn-primary">{saved ? 'Saved ✓' : 'Save changes'}</button>
        </form>
      </div>

      <div className="surface-card p-4 mt-3" style={{ maxWidth: 480 }}>
        <h6 className="mb-3"><i className="bi bi-shield-lock me-2 text-personal" />Security</h6>
        <form onSubmit={handleChangePassword}>
          <div className="mb-3">
            <label className="form-label">Current password</label>
            <PasswordInput autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          </div>
          <div className="mb-1">
            <label className="form-label">New password</label>
            <PasswordInput autoComplete="new-password" minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
          </div>
          <p className="text-muted small mb-3">At least 8 characters with a letter and a number.</p>
          {pwMsg && <div className={`alert alert-${pwMsg.type} py-2 small`}>{pwMsg.text}</div>}
          <button className="btn btn-primary" disabled={pwBusy}>{pwBusy ? 'Updating…' : 'Change password'}</button>
        </form>
        <hr className="my-4" />
        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-light" onClick={logout}><i className="bi bi-box-arrow-right me-1" /> Log out</button>
          <button className="btn btn-light text-danger" onClick={handleLogoutAll}><i className="bi bi-phone-flip me-1" /> Log out everywhere</button>
        </div>
      </div>

      <div className="mt-3" style={{ maxWidth: 480 }}><InstallPrompt /></div>
    </div>
  );
}
