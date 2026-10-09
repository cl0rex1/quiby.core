import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';

const MotionContext = createContext({ reduced: false, systemReduced: false, active: true, toggle: () => {} });
export const useMotion = () => useContext(MotionContext);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [manualReduced, setManualReduced] = useState(
    () => localStorage.getItem('quiby_reduce_motion') === 'true',
  );
  const [systemReduced, setSystemReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [visible, setVisible] = useState(() => !document.hidden);
  const reduced = manualReduced || systemReduced;
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMedia = () => setSystemReduced(media.matches);
    const onVisibility = () => setVisible(!document.hidden);
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'quiby_reduce_motion') setManualReduced(event.newValue === 'true');
    };
    media.addEventListener('change', onMedia);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('storage', onStorage);
    return () => {
      media.removeEventListener('change', onMedia);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  useLayoutEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
    document.documentElement.dataset.motionPaused = String(!visible);
  }, [reduced, visible]);
  const toggle = () =>
    setManualReduced((previous) => {
      localStorage.setItem('quiby_reduce_motion', String(!previous));
      return !previous;
    });
  return (
    <MotionContext.Provider value={{ reduced, systemReduced, active: !reduced && visible, toggle }}>
      {children}
    </MotionContext.Provider>
  );
}

export function MotionToggle({ compact = false }: { compact?: boolean }) {
  const { reduced, systemReduced, toggle } = useMotion();
  return <label className={`motion-switch app-no-drag ${compact ? 'is-compact' : ''}`} title={systemReduced ? 'Уменьшение движения включено в системе' : undefined}>
    <span>Меньше движения</span><input className="setting-switch" type="checkbox" role="switch" aria-label="Меньше движения" checked={reduced} onChange={toggle} disabled={systemReduced}/>
  </label>;
}
