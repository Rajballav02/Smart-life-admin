import React, { useState } from 'react';

/** Password field with a show/hide toggle (important on phones where typos are common). */
export default function PasswordInput({ value, onChange, placeholder = '••••••••', autoComplete = 'current-password', minLength, required = true, id }) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-field">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className="form-control"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
      />
      <button type="button" className="password-toggle" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} tabIndex={-1}>
        <i className={`bi ${show ? 'bi-eye-slash' : 'bi-eye'}`} />
      </button>
    </div>
  );
}
