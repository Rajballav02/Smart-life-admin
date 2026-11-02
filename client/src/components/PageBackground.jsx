import React from 'react';
import { BACKGROUNDS } from '../assets/backgrounds/index.js';

/**
 * Full-screen, fixed background artwork for a page. `name` is the page label
 * (landing, login, register, hub, personal, finance, documents, notes, calendar,
 * search, notifications, profile, settings).
 *
 * Large screens get the 3840x2160 (4K) image; small screens get the 1920x1080 version so
 * phones don't download a 4K file they can't show (see .page-bg in theme.css).
 *
 * `calm` lays a light veil over the artwork so form labels and headings stay easy to read.
 */
export default function PageBackground({ name, calm = true }) {
  const bg = BACKGROUNDS[name] || BACKGROUNDS.hub;
  return (
    <div
      key={name}
      className={`page-bg ${calm ? 'page-bg--calm' : ''}`}
      style={{ '--bg-hd': `url(${bg.hd})`, '--bg-4k': `url(${bg.k4})` }}
      aria-hidden="true"
    />
  );
}
