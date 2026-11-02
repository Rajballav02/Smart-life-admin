import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import PageBackground from '../components/PageBackground.jsx';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { applySession } = useAuth();
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCode = async (e) => {
    e?.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { identifier: identifier.trim() });
      setInfo(data.message);
      // Only present in development when SMS/email are in mock mode.
      if (data.devOtp) setOtp(data.devOtp);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send the code. Please try again.');
    } finally { setLoading(false); }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', { identifier: identifier.trim(), otp: otp.trim(), newPassword });
      applySession(data.token, data.user);
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset the password. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-shell auth-shell--single">
      <PageBackground name="login" />
      <div className="auth-single-card surface-card p-4 p-md-5">
        <Link to="/login" className="d-inline-block mb-4"><Logo /></Link>
        <h3 className="mb-1">Reset your password</h3>

        {step === 1 ? (
          <form onSubmit={requestCode}>
            <p className="text-muted mb-4">Enter your email or phone number. We&apos;ll send a 6-digit code by SMS and email.</p>
            <div className="mb-3">
              <label className="form-label" htmlFor="fp-id">Email or phone number</label>
              <input id="fp-id" className="form-control" required autoCapitalize="none" autoComplete="username"
                value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com or 98765 43210" />
            </div>
            {error && <div className="alert alert-danger py-2 small">{error}</div>}
            <button className="btn btn-primary w-100" disabled={loading}>{loading ? 'Sending…' : 'Send code'}</button>
          </form>
        ) : (
          <form onSubmit={resetPassword}>
            <p className="text-muted mb-4">{info}</p>
            <div className="mb-3">
              <label className="form-label" htmlFor="fp-otp">6-digit code</label>
              <input id="fp-otp" className="form-control otp-input" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
            </div>
            <div className="mb-1">
              <label className="form-label">New password</label>
              <PasswordInput autoComplete="new-password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <p className="text-muted small mb-3">At least 8 characters with a letter and a number.</p>
            {error && <div className="alert alert-danger py-2 small">{error}</div>}
            <button className="btn btn-primary w-100" disabled={loading}>{loading ? 'Saving…' : 'Reset password'}</button>
            <button type="button" className="btn btn-link w-100 mt-2" onClick={requestCode} disabled={loading}>Send a new code</button>
          </form>
        )}

        <p className="text-center text-muted small mt-4 mb-0">
          Remembered it? <Link to="/login" className="text-personal fw-semibold">Back to log in</Link>
        </p>
      </div>
    </div>
  );
}
