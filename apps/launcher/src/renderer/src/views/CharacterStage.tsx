import { SceneBackground } from '../components/SceneBackground';
import type { BackgroundSetting } from '@quiby/shared';
import { memo } from 'react';
import type { ModpackManifest } from '@quiby/shared';
import quibySeasonLogo from '../assets/quiby_season6_logo.png';
import { BUILD_PROFILES, type BuildId } from '../utils/buildProfiles';
import { buildPoster } from '../utils/buildScreenshots';

export const CharacterStage = memo(function CharacterStage({ manifest, buildId, totalPlaytimeSeconds, launching = false, background }: { manifest: ModpackManifest | null; buildId: BuildId; totalPlaytimeSeconds: number; launching?: boolean; background?: BackgroundSetting }) {
  const minutes = Math.floor(Math.max(0, Number.isFinite(totalPlaytimeSeconds) ? totalPlaytimeSeconds : 0) / 60);
  const playtime = minutes >= 60 ? `${Math.floor(minutes / 60)} ч ${minutes % 60} мин` : `${minutes} мин`;
  return <section className={`home-scene view-enter ${launching ? 'is-launching' : ''}`} aria-busy={launching} data-build={buildId} aria-label="Мир Quiby">
    <div className="home-scene-art" key={buildId}>
      <SceneBackground setting={background} fallback={buildPoster(buildId)}/>
    </div>
    <div className="home-scene-shade" aria-hidden="true"/>
    <div className="home-build"><strong>{BUILD_PROFILES.find(build => build.id === buildId)?.name}</strong><span>{manifest?.version || '—'}</span></div>
    <div className="home-playtime" aria-label="Время в игре"><small>В игре</small><span>{playtime}</span></div>
    <img className="home-season-logo" src={quibySeasonLogo} alt="quiby Season 6"/>
  </section>;
});
