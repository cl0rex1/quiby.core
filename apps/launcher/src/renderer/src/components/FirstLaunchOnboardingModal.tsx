import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  X,
  Sparkles,
  Layers,
  PencilRuler,
} from 'lucide-react';
import { LauncherSettings } from '@quiby/shared';
import { BUILD_PROFILES, BuildId, selectedBuild } from '../utils/buildProfiles';
import { buildVideo } from '../utils/buildScreenshots';
import { MotionToggle, useMotion } from './MotionProvider';

interface Props {
  isOpen: boolean;
  settings: LauncherSettings;
  onClose: () => void;
  onApplyPreset: (
    settings: Partial<LauncherSettings>,
    profile: 'clean' | 'optimal' | 'full',
  ) => Promise<void>;
}
const icons = { visual: Sparkles, standard: Layers, draft: PencilRuler };

export function FirstLaunchOnboardingModal({ isOpen, settings, onClose, onApplyPreset }: Props) {
  const [buildId, setBuildId] = useState<BuildId>('standard');
  const [ramGb, setRamGb] = useState(8);
  const [totalRam, setTotalRam] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const build = BUILD_PROFILES.find((item) => item.id === buildId)!;
  const { active: motionActive } = useMotion();
  const firstRun = !localStorage.getItem('quiby_onboarded');
  useEffect(() => {
    if (!isOpen) {
      dialog.current?.close();
      return;
    }
    setBuildId(selectedBuild(settings).id);
    setRamGb(Math.max(4, Math.round(settings.ramMaxMb / 1024)));
    setError('');
    dialog.current?.showModal();
    document.getElementById('build-tab-' + selectedBuild(settings).id)?.focus();
    let cancelled = false;
    window.quibyApi
      ?.getTotalRamMb()
      .then((ram) => {
        if (!cancelled && ram) setTotalRam(Math.floor(ram / 1024));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!video.current) return;
    if (motionActive && isOpen) void video.current.play().catch(() => {});
    else video.current.pause();
  }, [buildId, motionActive, isOpen]);

  const apply = async () => {
    setSaving(true);
    setError('');
    try {
      await onApplyPreset(
        { ramMaxMb: ramGb * 1024, ramMinMb: Math.min(ramGb * 1024, 4096), modpackProfile: build.profile },
        build.profile,
      );
      localStorage.setItem('quiby_onboarded', 'true');
      onClose();
    } catch {
      setError('Не удалось сохранить настройки. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      className="build-dialog"
      aria-labelledby="build-title"
      onCancel={(event) => {
        if (saving) event.preventDefault();
        else onClose();
      }}
    >
      <div className="build-dialog-inner">
        <header className="build-header">
          <div>
            <p className="page-kicker">{firstRun ? 'ПЕРВЫЙ ЗАПУСК / QUIBY' : 'ТВОЯ СБОРКА / QUIBY'}</p>
            <h1 id="build-title">Начни по-своему.</h1>
            <p>Один сервер. Три способа настроить игру.</p>
          </div>
          <div className="build-header-actions">
            <MotionToggle compact />
            <button
              className="icon-button"
              onClick={onClose}
              disabled={saving}
              aria-label="Закрыть выбор сборки"
            >
              <X size={19} />
            </button>
          </div>
        </header>
        <div className="build-tabs" role="tablist" aria-label="Сборки">
          {BUILD_PROFILES.map((item, index) => {
            const Icon = icons[item.id];
            return (
              <button
                id={'build-tab-' + item.id}
                key={item.id}
                role="tab"
                aria-controls="build-preview"
                aria-selected={item.id === buildId}
                tabIndex={item.id === buildId ? 0 : -1}
                disabled={saving}
                onKeyDown={(event) => {
                  if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
                    event.preventDefault();
                    const next =
                      event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? 2
                          : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
                    setBuildId(BUILD_PROFILES[next].id);
                    document.getElementById('build-tab-' + BUILD_PROFILES[next].id)?.focus();
                  }
                }}
                onClick={() => setBuildId(item.id)}
              >
                <span className="build-tab-top">
                  <Icon size={18} />
                  {item.id === buildId ? <Check size={14} /> : <ArrowRight size={14} />}
                </span>
                <strong>{item.name}{item.id === 'standard' && <span className="ml-2 rounded bg-violet-400/20 px-2 py-0.5 text-[10px] text-violet-200">Рекомендуем</span>}</strong>
                <small>{item.tagline}</small>
              </button>
            );
          })}
        </div>
        <section
          id="build-preview"
          className="build-details"
          role="tabpanel"
          aria-labelledby={'build-tab-' + buildId}
        >
          <div className="build-gallery">
            <video key={buildId} ref={video} src={buildVideo(buildId)}
              className="build-screenshot view-enter" autoPlay={motionActive} muted loop playsInline preload="metadata"
              aria-label={build.name + ' — видео сборки'} />
          </div>
          <div className="build-description view-enter" key={buildId}>
            <p className="page-kicker">{build.name.toUpperCase()} / СЕЗОН 06</p>
            <h2>{build.tagline}</h2>
            <p>{build.description}</p>
            <ul>
              {build.features.map((feature) => (
                <li key={feature}>
                  <Check size={13} />
                  {feature}
                </li>
              ))}
            </ul>
            <small>Профиль управляет уже добавленными одобренными модами. Шейдеры выбираются в игре.</small>
          </div>
        </section>
        <footer className="build-footer">
          <div className="build-memory">
            <div>
              <strong>Память для игры</strong>
              <small>{totalRam ? totalRam + ' ГБ в системе' : 'Выбери объём RAM'}</small>
            </div>
            <div role="group" aria-label="Память для игры">
              {Array.from(new Set([4, 8, 12, ramGb]))
                .sort((a, b) => a - b)
                .map((gb) => (
                  <button
                    key={gb}
                    aria-pressed={ramGb === gb}
                    disabled={saving || Boolean(totalRam && gb > Math.max(4, totalRam - 2))}
                    onClick={() => setRamGb(gb)}
                  >
                    {gb} ГБ
                  </button>
                ))}
            </div>
          </div>
          <button
            className="launcher-primary-button"
            disabled={saving || Boolean(totalRam && ramGb > Math.max(4, totalRam - 2))}
            onClick={() => void apply()}
          >
            {saving ? 'Сохраняем…' : 'Выбрать ' + build.name}
            <ArrowRight size={17} />
          </button>
        </footer>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </dialog>
  );
}
