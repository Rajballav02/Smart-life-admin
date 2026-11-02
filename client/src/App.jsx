import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';

const Landing = lazy(() => import('./pages/Landing.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const LifeHub = lazy(() => import('./pages/LifeHub.jsx'));
const Personal = lazy(() => import('./pages/Personal.jsx'));
const Finance = lazy(() => import('./pages/Finance.jsx'));
const Documents = lazy(() => import('./pages/Documents.jsx'));
const SmartNotes = lazy(() => import('./pages/SmartNotes.jsx'));
const Calendar = lazy(() => import('./pages/Calendar.jsx'));
const Search = lazy(() => import('./pages/Search.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

export default function App() {
  return (
    <Suspense fallback={<div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}><div className="spinner-border text-primary" role="status" /></div>}>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route
        path="/app"
        element={(
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        )}
      >
        <Route index element={<LifeHub />} />
        <Route path="personal" element={<Personal />} />
        <Route path="finance" element={<Finance />} />
        <Route path="documents" element={<Documents />} />
        <Route path="notes" element={<SmartNotes />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="search" element={<Search />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
