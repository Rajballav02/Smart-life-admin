import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api.js';

const POLL_INTERVAL_MS = 20000;

/**
 * Plays a repeating alarm tone using the Web Audio API (no external audio file needed,
 * so it works fully offline). Browsers require a user interaction before audio can play;
 * if that hasn't happened yet, we simply skip the sound and rely on the visible popup.
 */
function useAlarmSound(active) {
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);

  const beep = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {
      // Autoplay blocked or unsupported — the visible popup still works.
    }
  }, []);

  useEffect(() => {
    if (active) {
      beep();
      intervalRef.current = setInterval(beep, 1200);
    }
    return () => clearInterval(intervalRef.current);
  }, [active, beep]);
}

export default function AlarmManager() {
  const [activeAlarm, setActiveAlarm] = useState(null);
  const dismissedIds = useRef(new Set());

  const poll = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications', { params: { channel: 'alarm', status: 'sent', limit: 5 } });
      const next = data.notifications.find((n) => !dismissedIds.current.has(n._id));
      if (next) {
        setActiveAlarm(next);
        if ('Notification' in window && Notification.permission === 'granted') {
          try { new Notification(next.title, { body: next.message }); } catch { /* ignore */ }
        }
      }
    } catch { /* silent — don't disrupt the app if this poll fails */ }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [poll]);

  useAlarmSound(!!activeAlarm);

  const stopAlarm = async () => {
    if (!activeAlarm) return;
    dismissedIds.current.add(activeAlarm._id);
    try { await api.put(`/notifications/${activeAlarm._id}/read`); } catch { /* ignore */ }
    setActiveAlarm(null);
  };

  const snoozeAlarm = async (minutes = 15) => {
    if (!activeAlarm) return;
    dismissedIds.current.add(activeAlarm._id);
    try { await api.put(`/notifications/${activeAlarm._id}/snooze`, { minutes }); } catch { /* ignore */ }
    setActiveAlarm(null);
  };

  if (!activeAlarm) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{ background: 'rgba(31,29,43,0.55)', zIndex: 1080 }}
    >
      <div className="surface-card p-4 text-center page-fade" style={{ maxWidth: 380, width: '100%' }}>
        <div
          className="mx-auto mb-3 d-flex align-items-center justify-content-center"
          style={{
            width: 76, height: 76, borderRadius: '50%',
            background: 'var(--sla-danger-bg)', color: 'var(--sla-danger)', fontSize: '2rem',
            animation: 'micPulse 1s ease-in-out infinite',
          }}
        >
          <i className="bi bi-alarm-fill" />
        </div>
        <h5 className="mb-1">{activeAlarm.title}</h5>
        <p className="text-muted mb-4">{activeAlarm.message}</p>

        <div className="d-flex gap-2">
          <button className="btn btn-light flex-grow-1" onClick={() => snoozeAlarm(15)}>
            <i className="bi bi-alarm me-1" /> Snooze 15m
          </button>
          <button className="btn btn-primary flex-grow-1" onClick={stopAlarm}>
            <i className="bi bi-check2 me-1" /> Stop Alarm
          </button>
        </div>
      </div>
    </div>
  );
}
