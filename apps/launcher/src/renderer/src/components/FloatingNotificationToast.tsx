import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, Bell } from 'lucide-react';

export interface ToastData {
  id: string;
  title: string;
  message?: string;
  type?: 'success' | 'info' | 'warning' | 'error';
}

interface FloatingNotificationToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

export const FloatingNotificationToast: React.FC<FloatingNotificationToastProps> = ({
  toast,
  onDismiss,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [cachedToast, setCachedToast] = useState<ToastData | null>(toast);

  useEffect(() => {
    if (toast) {
      setCachedToast(toast);
      setIsExiting(false);

      // Start smooth slide-down exit animation 300ms before unmount
      const exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, 3900);

      const dismissTimer = setTimeout(() => {
        onDismiss();
      }, 4200);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(dismissTimer);
      };
    } else {
      setIsExiting(true);
    }
  }, [toast, onDismiss]);

  const displayToast = toast || cachedToast;
  if (!displayToast) return null;

  const isVisible = Boolean(toast) && !isExiting;
  const type = displayToast.type || 'success';
  const isSuccess = type === 'success';
  const isError = type === 'error';
  const isWarning = type === 'warning';

  // Crisp, vibrant solid stroke colors
  const strokeColor = isSuccess
    ? '#34d399' // emerald-400
    : isError
    ? '#f43f5e' // rose-500
    : isWarning
    ? '#fbbf24' // amber-400
    : '#38bdf8'; // sky-400

  // Window geometry: fixed 360x52 matching FloatingActionDeck dimensions exactly
  // Path starts at top center (180, 1) and loops clockwise around the perimeter
  const pathD = 'M 180 1 H 335 A 25 25 0 0 1 359 26 A 25 25 0 0 1 335 51 H 25 A 25 25 0 0 1 1 26 A 25 25 0 0 1 25 1 H 180';

  return (
    <>
      <style>{`
        @keyframes toastContourAppear {
          0% {
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
      `}</style>

      {/* Physics, scale, blur, and slide transitions identical to FloatingActionDeck */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-40 select-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isVisible
            ? 'translate-y-0 opacity-100 scale-100 blur-0 pointer-events-auto'
            : 'translate-y-8 opacity-0 scale-95 blur-[2px] pointer-events-none'
        }`}
      >
        <div className="relative flex items-center gap-3 px-5 py-2.5 h-[52px] w-[360px] rounded-full glass-floating">
          {/* Animated SVG Contour: Starts from Top-Center and draws clockwise around the entire window */}
          <svg
            className="absolute -inset-[1px] w-[362px] h-[54px] pointer-events-none overflow-visible"
            viewBox="0 0 360 52"
          >
            <path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
              pathLength="100"
              style={{
                strokeDasharray: '100 100',
                strokeDashoffset: '100',
                animation: 'toastContourAppear 3.9s linear forwards',
              }}
            />
          </svg>

          {/* Status Icon */}
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
              isSuccess
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : isError
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : isWarning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 size={16} />
            ) : isError ? (
              <AlertCircle size={16} />
            ) : isWarning ? (
              <Bell size={16} />
            ) : (
              <Info size={16} />
            )}
          </div>

          {/* Clean Title Text with Apple Optical Tracking */}
          <span className="text-xs font-bold text-white truncate flex-1 pr-1 apple-subheading">
            {displayToast.title}
          </span>
        </div>
      </div>
    </>
  );
};
