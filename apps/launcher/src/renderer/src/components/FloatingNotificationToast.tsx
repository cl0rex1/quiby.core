import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, Bell, X } from 'lucide-react';

export interface ToastData {
  id: string;
  title: string;
  message?: string;
  type?: 'success' | 'info' | 'warning' | 'error';
}

export function FloatingNotificationToast({
  toast,
  onDismiss,
}: {
  toast: ToastData | null;
  onDismiss: () => void;
}) {
  const [exiting, setExiting] = useState(false);
  const [paused, setPaused] = useState(false);
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    if (!toast || paused) return;
    setExiting(false);
    const duration = toast.type === 'error' || toast.type === 'warning' ? 10000 : 6000;
    const exitTimer = window.setTimeout(() => setExiting(true), duration - 300);
    const dismissTimer = window.setTimeout(() => dismiss.current(), duration);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(dismissTimer);
    };
  }, [toast, paused]);
  useEffect(() => { setPaused(false); setExiting(false); }, [toast?.id]);
  if (!toast) return null;
  const type = toast.type || 'success';
  const Icon = { success: CheckCircle2, error: AlertCircle, warning: Bell, info: Info }[type];
  return (
    <div key={toast.id} className={'launcher-toast ' + (exiting ? 'is-exiting' : '')} role={type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => { setPaused(true); setExiting(false); }} onMouseLeave={() => setPaused(false)}
      onFocus={() => { setPaused(true); setExiting(false); }} onBlur={() => setPaused(false)}>
      <Icon size={18} className={'toast-icon is-' + type} />
      <div className="toast-copy"><strong>{toast.title}</strong>{toast.message && <p>{toast.message}</p>}</div>
      <button type="button" className="icon-button" aria-label="Закрыть уведомление" onClick={onDismiss}><X size={15} /></button>
    </div>
  );
}
