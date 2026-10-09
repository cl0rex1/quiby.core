import { Package } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export function ModIcon({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setFailed(false); setLoaded(false); }, [src]);
  return (
    <div className="relative w-10 h-10 rounded-xl bg-surface-850 border border-surface-border flex items-center justify-center shrink-0 overflow-hidden font-mono font-bold text-xs text-[#bb74ff]">
      {!loaded && <Package size={19} aria-hidden="true" className={src && !failed ? 'icon-loading' : ''}/>}
      {src && !failed && <img src={src} alt="" loading="lazy" decoding="async" className={`mod-icon-image ${loaded ? 'is-loaded' : ''}`} onLoad={() => setLoaded(true)} onError={() => { setFailed(true); setLoaded(false); }}/>}
    </div>
  );
}
