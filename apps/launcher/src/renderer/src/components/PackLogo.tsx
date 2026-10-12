import { useState } from 'react';
import { Layers, Sun } from 'lucide-react';

export function PackLogo({ src, kind }: { src?: string; kind: 'resourcepacks' | 'shaderpacks' }) {
  const [failed, setFailed] = useState<string>();
  return <span className={`pack-logo is-${kind}`}>
    {src && failed !== src ? <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(src)}/>
      : kind === 'shaderpacks' ? <Sun size={25} strokeWidth={1.5}/> : <Layers size={25} strokeWidth={1.5}/>}
  </span>;
}
