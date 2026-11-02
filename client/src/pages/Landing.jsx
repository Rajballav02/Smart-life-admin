import React, { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import PageBackground from '../components/PageBackground.jsx';

const ThreeScene = lazy(() => import('../components/ThreeScene.jsx').catch(() => ({ default: () => null })));

const FEATURES = [
  {
    icon: 'bi-brightness-high', color: 'personal',
    title: 'Personal management',
    text: 'Tasks, meetings, appointments and plans — extracted with dates, times and priority.',
  },
  {
    icon: 'bi-wallet2', color: 'finance',
    title: 'Finance tracking',
    text: 'Income and expenses sorted into categories, with weekly and monthly savings analysis.',
  },
  {
    icon: 'bi-file-earmark-lock2', color: 'documents',
    title: 'Documents & assets',
    text: 'Insurance, warranties and renewals tracked with expiry reminders, before it\u2019s too late.',
  },
];

const STEPS = [
  { n: 1, title: 'Write a note', text: 'Type it or speak it, in English or Hindi \u2014 just write it naturally.' },
  { n: 2, title: 'We understand it', text: 'Dates, amounts, categories and priority are picked out automatically.' },
  { n: 3, title: 'It\u2019s organized', text: 'Separate cards land in Personal, Finance or Documents \u2014 instantly.' },
];

export default function Landing() {
  return (
    <div>
      <PageBackground name="landing" calm={false} />
      <nav className="landing-nav sticky-top py-3">
        <div className="container d-flex align-items-center justify-content-between">
          <Logo />
          <div className="d-flex align-items-center gap-2">
            <Link to="/login" className="btn btn-light">Log in</Link>
            <Link to="/register" className="btn btn-primary">Get started</Link>
          </div>
        </div>
      </nav>

      <section className="hero-gradient-bg py-5">
        <div className="container py-5 position-relative" style={{ zIndex: 1 }}>
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <span className="badge-module badge-personal mb-3 d-inline-flex">
                <i className="bi bi-stars" /> AI-powered organizing
              </span>
              <h1 className="hero-heading display-4 mb-3">Your life, organized intelligently.</h1>
              <p className="text-muted fs-5 mb-4" style={{ maxWidth: 480 }}>
                Write naturally. Smart Life Admin turns your thoughts into organized tasks,
                finances, documents and reminders — automatically.
              </p>
              <div className="d-flex gap-3 flex-wrap">
                <Link to="/register" className="btn btn-primary btn-lg px-4">Get Started</Link>
                <a href="#features" className="btn btn-light btn-lg px-4">Explore Features</a>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="position-relative" style={{ height: 440 }}>
                <div className="position-absolute top-0 start-0 w-100 h-100" style={{ zIndex: 0 }}>
                  <Suspense fallback={<div style={{ height: 440 }} />}>
                    <ThreeScene height={440} />
                  </Suspense>
                </div>

                <div className="surface-card p-3 position-absolute top-0 start-0" style={{ width: '76%', zIndex: 3 }}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="bi bi-stars text-personal" />
                    <span className="small fw-semibold text-muted">SMART NOTE</span>
                  </div>
                  <p className="mb-0 small text-muted">
                    &ldquo;18 Sept electricity bill ₹1200, Friday 5 PM meeting, bike insurance expires 20 Oct&rdquo;
                  </p>
                </div>

                <div className="floating-card p-3 position-absolute" style={{ width: 200, top: 160, left: 0, zIndex: 2 }}>
                  <span className="badge-module badge-personal mb-2 d-inline-flex"><i className="bi bi-brightness-high" /> Personal</span>
                  <div className="fw-semibold small">Project Meeting</div>
                  <div className="text-muted small">Friday — 5:00 PM</div>
                </div>

                <div className="floating-card delay-2 p-3 position-absolute" style={{ width: 200, bottom: 10, right: 10, zIndex: 2 }}>
                  <span className="badge-module badge-documents mb-2 d-inline-flex"><i className="bi bi-file-earmark-lock2" /> Documents</span>
                  <div className="fw-semibold small">Bike Insurance</div>
                  <div className="text-muted small">Expiry — 20 Oct</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-5">
        <div className="text-center mb-5">
          <span className="divider-label">How it works</span>
          <h2 className="mt-2 mb-0">From one note to three organized cards.</h2>
        </div>
        <div className="row g-4">
          {STEPS.map((s) => (
            <div className="col-md-4" key={s.n}>
              <div className="surface-card square-card card-hover h-100">
                <div className="step-badge">{s.n}</div>
                <h5>{s.title}</h5>
                <p className="text-muted">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="container py-5">
        <div className="text-center mb-5">
          <span className="divider-label">Three modules</span>
          <h2 className="mt-2 mb-0">One note. Three organized modules.</h2>
        </div>
        <div className="row g-4">
          {FEATURES.map((f) => (
            <div className="col-md-4" key={f.title}>
              <div className="surface-card square-card card-hover h-100">
                <div className={`feature-icon-tile bg-${f.color}-soft text-${f.color}`}>
                  <i className={`bi ${f.icon}`} />
                </div>
                <h5>{f.title}</h5>
                <p className="text-muted">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container pb-5">
        <div className="surface-card p-5 text-center position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #00B894 140%)' }}>
          <h2 className="text-white mb-2">Write it once. We organize it for you.</h2>
          <p className="text-white-50 mb-4">Create your free account and try your first Smart Note in seconds.</p>
          <Link to="/register" className="btn btn-light btn-lg px-4">Get Started — it&apos;s free</Link>
        </div>
      </section>

      <footer className="border-top py-4">
        <div className="container d-flex align-items-center justify-content-between flex-wrap gap-2">
          <Logo size={30} />
          <span className="text-muted small">© {new Date().getFullYear()} Smart Life Admin</span>
        </div>
      </footer>
    </div>
  );
}
