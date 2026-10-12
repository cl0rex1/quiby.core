import { memo, useEffect, useRef, useState } from 'react';
import type { ModpackManifest } from '@quiby/shared';
import quibySeasonLogo from '../assets/quiby_season6_logo.png';
import { BUILD_PROFILES, type BuildId } from '../utils/buildProfiles';
import { buildVideo, buildPoster } from '../utils/buildScreenshots';
import { useMotion } from '../components/MotionProvider';

function HomeClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      if (document.hidden) return;
      setNow(new Date());
      timer = setTimeout(update, 60000 - Date.now() % 60000);
    };
    update();
    document.addEventListener('visibilitychange', update);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', update); };
  }, []);
  return <time className="home-clock" aria-label="Местное время" dateTime={now.toISOString()}>{now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</time>;
}

export const CharacterStage = memo(function CharacterStage({ manifest, buildId }: { manifest: ModpackManifest | null; buildId: BuildId }) {
  const { active } = useMotion();
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (active) void video.current?.play().catch(() => {});
    else video.current?.pause();
  }, [buildId, active]);
  return <section className="home-scene view-enter" data-build={buildId} aria-label="Мир Quiby">
    <div className="home-scene-art" key={buildId}>
    <img className="home-scene-poster" src={buildPoster(buildId)} alt=""/>
    <video key={buildId} ref={video} className="home-scene-video" src={buildVideo(buildId)} poster={buildPoster(buildId)} autoPlay={active} muted loop playsInline preload="none" aria-hidden="true"/>
    </div>
    <div className="home-scene-shade" aria-hidden="true"/>
    <div className="home-build"><span className="home-build-mark" aria-hidden="true"/><strong>{BUILD_PROFILES.find(build => build.id === buildId)?.name}</strong><span>{manifest?.version || '—'}</span></div>
    <HomeClock/>
    <img className="home-season-logo" src={quibySeasonLogo} alt="quiby Season 6"/>
  </section>;
});
