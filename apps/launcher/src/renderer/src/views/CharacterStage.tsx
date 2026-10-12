import { memo, useEffect, useRef } from 'react';
import type { ModpackManifest } from '@quiby/shared';
import quibySeasonLogo from '../assets/quiby_season6_logo.png';
import { BUILD_PROFILES, type BuildId } from '../utils/buildProfiles';
import { buildVideo, buildPoster } from '../utils/buildScreenshots';
import { useMotion } from '../components/MotionProvider';

export const CharacterStage = memo(function CharacterStage({ manifest, buildId, totalPlaytimeSeconds, launching = false }: { manifest: ModpackManifest | null; buildId: BuildId; totalPlaytimeSeconds: number; launching?: boolean }) {
  const { active } = useMotion();
  const minutes = Math.floor(Math.max(0, Number.isFinite(totalPlaytimeSeconds) ? totalPlaytimeSeconds : 0) / 60);
  const playtime = minutes >= 60 ? `${Math.floor(minutes / 60)} ч ${minutes % 60} мин` : `${minutes} мин`;
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (active) void video.current?.play().catch(() => {});
    else video.current?.pause();
  }, [buildId, active]);
  return <section className={`home-scene view-enter ${launching ? 'is-launching' : ''}`} aria-busy={launching} data-build={buildId} aria-label="Мир Quiby">
    <div className="home-scene-art" key={buildId}>
      <img className="home-scene-poster" src={buildPoster(buildId)} alt=""/>
      <video key={buildId} ref={video} className="home-scene-video" src={buildVideo(buildId)} poster={buildPoster(buildId)} autoPlay={active} muted loop playsInline preload="none" aria-hidden="true"/>
    </div>
    <div className="home-scene-shade" aria-hidden="true"/>
    <div className="home-build"><strong>{BUILD_PROFILES.find(build => build.id === buildId)?.name}</strong><span>{manifest?.version || '—'}</span></div>
    <div className="home-playtime" aria-label="Время в игре"><small>В игре</small><span>{playtime}</span></div>
    <img className="home-season-logo" src={quibySeasonLogo} alt="quiby Season 6"/>
  </section>;
});
