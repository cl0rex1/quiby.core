import React, { useEffect, useState } from 'react';

export function ModIcon({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <div className="w-10 h-10 rounded-xl bg-surface-850 border border-surface-border flex items-center justify-center shrink-0 overflow-hidden font-mono font-bold text-xs text-[#bb74ff]">
      {src && !failed ? <img src={src} alt="" loading="lazy" decoding="async" className="w-full h-full object-contain" onError={() => setFailed(true)} />
        : <span aria-label={name}>{name.split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase()}</span>}
    </div>
  );
}
