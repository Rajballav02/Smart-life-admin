import React, { useState, Suspense, lazy } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import PageBackground from '../components/PageBackground.jsx';

const ThreeScene = lazy(() => import('../components/ThreeScene.jsx').catch(() => ({ default: () => null })));

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.identifier.trim(), form.password);
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <PageBackground name="login" />
      <div className="col-lg-6 d-flex align-items-center justify-content-center p-4">
        <div style={{ maxWidth: 380, width: '100%' }}>
          <Link to="/" className="d-inline-block mb-5"><Logo /></Link>
          <h3 className="mb-1">Welcome back</h3>
          <p className="text-muted mb-4">Log in to continue organizing your life.</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="identifier">Email or phone number</label>
              <input
                id="identifier" className="form-control" required
                autoComplete="username" inputMode="email" autoCapitalize="none" autoCorrect="off"
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                placeholder="you@example.com or 98765 43210"
              />
            </div>
            <div className="mb-2">
              <label className="form-label" htmlFor="password">Password</label>
              <PasswordInput
                id="password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="text-end mb-3">
              <Link to="/forgot-password" className="small text-personal fw-semibold">Forgot password?</Link>
            </div>

            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            <button className="btn btn-primary w-100 mt-2" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p className="text-center text-muted small mt-4">
            Don&apos;t have an account? <Link to="/register" className="text-personal fw-semibold">Sign up</Link>
          </p>
        </div>
      </div>

      <div className="col-lg-6 auth-visual d-none d-lg-flex align-items-center justify-content-center">
        <div className="text-center text-white px-5">
          <Suspense fallback={<div style={{ height: 260 }} />}>
            <ThreeScene height={260} compact hubColor={0xffffff} />
          </Suspense>
          <h3 className="text-white mt-2">Write naturally.</h3>
          <p className="text-white-50">We organize the rest — tasks, finances, and documents, all in one hub.</p>
        </div>
      </div>
    </div>
  );
}
