import { useState } from 'react';
import type { BackgroundSetting } from '@quiby/shared';
import { useMotion } from './MotionProvider';

export function SceneBackground({ setting, fallback }: { setting?: BackgroundSetting; fallback?: string }) {
  const { active } = useMotion();
  const [failed, setFailed] = useState('');
  if (setting?.mode === 'none') return null;
  const id = setting?.mode === 'custom' ? setting.imageId : undefined;
  const source = id ? `quiby-media://background/${id}${!active && /\.(gif|webp)$/.test(id) ? '.poster.png' : ''}` : fallback;
  if (!source || source === failed) return null;
  return <img className="scene-custom-background" src={source} alt="" draggable={false} onError={() => setFailed(source)}/>;
}
