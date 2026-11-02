import React, { useState, Suspense, lazy } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import PageBackground from '../components/PageBackground.jsx';

const ThreeScene = lazy(() => import('../components/ThreeScene.jsx').catch(() => ({ default: () => null })));

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <PageBackground name="register" />
      <div className="col-lg-6 auth-visual d-none d-lg-flex align-items-center justify-content-center order-lg-2">
        <div className="text-center text-white px-5">
          <Suspense fallback={<div style={{ height: 260 }} />}>
            <ThreeScene height={260} compact hubColor={0xffffff} />
          </Suspense>
          <h3 className="text-white mt-2">One note. Three modules.</h3>
          <p className="text-white-50">Personal, Finance and Documents — organized automatically from what you write.</p>
        </div>
      </div>

      <div className="col-lg-6 d-flex align-items-center justify-content-center p-4 order-lg-1">
        <div style={{ maxWidth: 380, width: '100%' }}>
          <Link to="/" className="d-inline-block mb-4"><Logo /></Link>
          <h3 className="mb-1">Create your account</h3>
          <p className="text-muted mb-4">Start writing. We&apos;ll organize the rest.</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input className="form-control" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
            </div>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" required autoComplete="email" autoCapitalize="none" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
            </div>
            <div className="mb-3">
              <label className="form-label">Phone (optional)</label>
              <input className="form-control" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98765 43210" />
            </div>
            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label">Password</label>
                <PasswordInput autoComplete="new-password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="col-6">
                <label className="form-label">Confirm</label>
                <PasswordInput autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
              </div>
            </div>

            <p className="text-muted small mb-3">Use at least 8 characters with a letter and a number.</p>

            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            <button className="btn btn-primary w-100 mt-2" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-muted small mt-4">
            Already have an account? <Link to="/login" className="text-personal fw-semibold">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
