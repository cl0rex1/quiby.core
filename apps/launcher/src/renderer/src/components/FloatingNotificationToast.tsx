import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, Bell } from 'lucide-react';

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
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    if (!toast) return;
    setExiting(false);
    const exitTimer = window.setTimeout(() => setExiting(true), 3900);
    const dismissTimer = window.setTimeout(() => dismiss.current(), 4200);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(dismissTimer);
    };
  }, [toast]);
  if (!toast) return null;
  const type = toast.type || 'success';
  const Icon = { success: CheckCircle2, error: AlertCircle, warning: Bell, info: Info }[type];
  return (
    <div className={'launcher-toast ' + (exiting ? 'is-exiting' : '')} role="status" aria-live="polite">
      <Icon size={18} className={'toast-icon is-' + type} />
      <span>{toast.title}</span>
    </div>
  );
}
