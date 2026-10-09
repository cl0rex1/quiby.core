import { Disclosure } from '../components/Disclosure';
import React, { useEffect, useRef, useState } from 'react';
import {
  Cpu,
  FolderOpen,
  RefreshCw,
  Monitor,
  ArrowUpRight,
  Check,
  SlidersHorizontal,
  Waves,
  Download,
} from 'lucide-react';
import { LauncherSettings } from '@quiby/shared';
import { buildVideo, buildPoster } from '../utils/buildScreenshots';
import { selectedBuild } from '../utils/buildProfiles';
import { RamSlider } from '../components/RamSlider';
import { MotionToggle, useMotion } from '../components/MotionProvider';
import type { UpdateState } from '../../../main/updates';
import { parseCustomJvmArgs } from '../../../shared/jvmArgs';
import { windowLimits } from '../../../shared/launcherSettings';
import { SettingsField } from '../components/SettingsField';

interface SettingsViewProps {
  onChooseBuild: () => void;
  hasServerAddress: boolean;
  settings: LauncherSettings;
  saveStatus: 'loading' | 'saved' | 'saving' | 'error';
  onRetrySave: () => void;
  onUpdateSettings: (newSettings: LauncherSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, saveStatus, onRetrySave, onUpdateSettings, onChooseBuild, hasServerAddress }) => {
  const build = selectedBuild(settings);
  const [section, setSection] = useState<'game' | 'appearance' | 'files'>('game');
  const [totalRamGb, setTotalRamGb] = useState(16);
  const [javaList, setJavaList] = useState<Array<{ path: string; version: number; versionString: string }>>(
    [],
  );
  const [detectingJava, setDetectingJava] = useState(false);
  const [error, setError] = useState('');
  const [jvmDraft, setJvmDraft] = useState(settings.customJvmArgs || '');
  useEffect(() => setJvmDraft(settings.customJvmArgs || ''), [settings.customJvmArgs]);
  let jvmCount = 0, jvmError = '';
  try { jvmCount = parseCustomJvmArgs(jvmDraft).length; }
  catch (cause) { jvmError = cause instanceof Error ? cause.message : 'Проверьте параметры Java.'; }
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);
  const { reduced, systemReduced, active: motionActive } = useMotion();
  const buildPreview = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!buildPreview.current) return;
    if (motionActive) void buildPreview.current.play().catch(() => {});
    else buildPreview.current.pause();
  }, [build.id, motionActive, section]);
  const update = (patch: Partial<LauncherSettings>) => onUpdateSettings({ ...settings, ...patch });
  const detectJava = async () => {
    if (!window.quibyApi) return;
    setDetectingJava(true);
    setError('');
    try {
      const res = await window.quibyApi.detectJava();
      setJavaList(res.installations || []);
      if (res.totalRamMb) setTotalRamGb(Math.floor(res.totalRamMb / 1024));
    } catch {
      setError('Не удалось найти установленную Java. При запуске игры Java 21 скачается автоматически.');
    } finally {
      setDetectingJava(false);
    }
  };
  useEffect(() => {
    void detectJava();
    const unsubscribe = window.quibyApi?.onUpdateState(setUpdateState);
    void window.quibyApi?.getUpdateState().then(setUpdateState).catch(() => setError('Не удалось получить состояние обновления. Откройте раздел ещё раз.'));
    return () => unsubscribe?.();
  }, []);
  const updateAction = async () => {
    try {
      if (updateState?.status === 'available') await window.quibyApi.downloadUpdate();
      else if (updateState?.status === 'ready') await window.quibyApi.installUpdate();
      else await window.quibyApi.checkForUpdates();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось проверить обновления.');
    }
  };
  const browse = async (kind: 'java' | 'game') => {
    try {
      const selected =
        kind === 'java' ? await window.quibyApi?.selectJavaPath() : await window.quibyApi?.selectGameDir();
      if (selected) update(kind === 'java' ? { javaPath: selected } : { gameDir: selected });
    } catch {
      setError('Не удалось открыть выбор файла. Попробуйте ещё раз.');
    }
  };

  return (
    <div className="settings-page view-enter">
      <header className="page-heading">
        <div>
          <p className="page-kicker">ТВОЁ ПРОСТРАНСТВО</p>
          <h1>Под тебя.</h1>
          <p>Комфорт в деталях. Основные настройки сохраняются автоматически.</p>
        </div>
        <span className="quiet-status" role="status" data-state={saveStatus}>
          <Check size={13} /> {saveStatus === 'saved' ? 'Сохранено' : saveStatus === 'saving' ? 'Сохраняем…' : saveStatus === 'loading' ? 'Загружаем…' : 'Не сохранено'}
          {saveStatus === 'error' && <button type="button" className="ui-button" onClick={onRetrySave}>Повторить</button>}
        </span>
      </header>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Разделы настроек">
          {(
            [
              ['game', 'Игра', Monitor],
              ['appearance', 'Интерфейс', Waves],
              ['files', 'Файлы и Java', Cpu],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              type="button"
              key={id}
              aria-current={section === id ? 'page' : undefined}
              onClick={() => setSection(id)}
            >
              <Icon size={17} />
              <span>{label}</span>
              <ArrowUpRight size={13} />
            </button>
          ))}
          <div className="settings-note">
            <span>QUIBY CORE</span>
            <p>
              Minecraft 1.21.1
              <br />
              NeoForge · Java 21
            </p>
          </div>
        </nav>
        <div className="settings-body view-enter" key={section}>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          {section === 'game' && (
            <>
              <button type="button" className="current-build" onClick={onChooseBuild}>
                <video key={build.id} ref={buildPreview} className="current-build-video" src={buildVideo(build.id)} poster={buildPoster(build.id)} autoPlay={motionActive} muted loop playsInline preload="metadata" aria-hidden="true" />
                <span className="current-build-copy"><small>ТВОЯ СБОРКА</small><strong>{build.name}</strong><span>{build.tagline}</span></span>
                <span className="current-build-action">Выбрать сборку <ArrowUpRight size={17}/></span>
              </button>
              <RamSlider
                ramMb={settings.ramMaxMb}
                totalSystemRamGb={totalRamGb}
                onChange={(ramMb) =>
                  update({ ramMaxMb: ramMb, ramMinMb: Math.min(settings.ramMinMb, ramMb) })
                }
              />
              <div className="memory-presets" aria-label="Профили памяти">
                {(
                  [
                    { gb: 4, name: 'Легко' },
                    { gb: 8, name: 'Сбалансированно' },
                    { gb: 12, name: 'С запасом' },
                  ] as const
                ).map(({ gb, name }) => (
                  <button
                    key={gb}
                    type="button"
                    disabled={totalRamGb < gb + 2}
                    aria-pressed={settings.ramMaxMb === gb * 1024}
                    onClick={() => update({ ramMaxMb: gb * 1024, ramMinMb: Math.min(4096, gb * 512) })}
                  >
                    <span>
                      <strong>{gb}</strong> ГБ
                    </span>
                    <small>{name}</small>
                    {settings.ramMaxMb === gb * 1024 && <Check size={13} />}
                  </button>
                ))}
              </div>
              <section className="settings-group">
                <div className="settings-group-heading">
                  <Monitor size={17} />
                  <h2>Окно игры</h2>
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Разрешение</strong>
                    <p>Размер окна Minecraft в пикселях.</p>
                  </div>
                  <div className="resolution-fields">
                    <SettingsField
                      aria-label="Ширина окна"
                      type="number"
                      min={windowLimits.width.min}
                      max={windowLimits.width.max}
                      value={settings.windowWidth}
                      onCommit={value => update({ windowWidth: Number(value) })}
                    />
                    <span>×</span>
                    <SettingsField
                      aria-label="Высота окна"
                      type="number"
                      min={windowLimits.height.min}
                      max={windowLimits.height.max}
                      value={settings.windowHeight}
                      onCommit={value => update({ windowHeight: Number(value) })}
                    />
                  </div>
                </div>
                <label className="setting-row">
                  <div>
                    <strong>На весь экран</strong>
                    <p>Запускать Minecraft в полноэкранном режиме.</p>
                  </div>
                  <input
                    className="setting-switch"
                    type="checkbox"
                    checked={settings.fullscreen}
                    onChange={(e) => update({ fullscreen: e.target.checked })}
                  />
                </label>
                <label className="setting-row">
                  <div><strong>Discord Rich Presence</strong><p>Показывать в Discord выбранную сборку, запуск и время в игре.</p></div>
                  <input className="setting-switch" type="checkbox" checked={settings.enableDiscordRpc !== false} onChange={(e) => update({ enableDiscordRpc: e.target.checked })} />
                </label>
              {hasServerAddress && <label className="setting-row">
                <div>
                  <strong>Сразу на сервер</strong>
                    <p>Подключаться после запуска игры.</p>
                  </div>
                  <input
                    className="setting-switch"
                    type="checkbox"
                    checked={settings.autoJoinServer !== false}
                    onChange={(e) => update({ autoJoinServer: e.target.checked })}
                  />
              </label>}
              </section>
            </>
          )}
          {section === 'appearance' && (
            <>
              <section className="motion-showcase">
                <div className="motion-sample" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
                <div>
                  <span className="page-kicker">ИНТЕРФЕЙС / ДВИЖЕНИЕ</span>
                  <h2>
                    Глубина.
                    <br />
                    Без лишнего.
                  </h2>
                  <p>
                    {reduced
                      ? 'Спокойный интерфейс. Пространственные эффекты и движение персонажей отключены.'
                      : 'Короткие переходы и объём реагируют на действия. В фоне анимации приостанавливаются.'}
                  </p>
                </div>
              </section>
              <section className="settings-group">
                <div className="setting-row">
                  <div>
                    <strong>Уменьшить движение</strong>
                    <p>
                      {systemReduced
                        ? 'Включено в настройках операционной системы.'
                        : 'Отключает наклоны, появления и анимацию персонажа.'}
                    </p>
                  </div>
                  <MotionToggle />
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Onyx Black</strong>
                    <p>Нейтральные поверхности. Фиолетовый для акцентов.</p>
                  </div>
                  <div className="theme-swatches" role="img" aria-label="Чёрный, графитовый, фиолетовый">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </section>
            </>
          )}
          {section === 'files' && (
            <>
              <section className={`settings-group settings-update-card ${updateState && ['available', 'downloading', 'ready'].includes(updateState.status) ? 'has-update' : ''}`}>
                <div className="settings-group-heading settings-update-heading">
                  <span className="settings-update-icon"><Download size={19} /></span>
                  <div><small>QUIBY CORE / ОБНОВЛЕНИЕ</small><h2>Обновление лаунчера</h2></div>
                  {updateState && ['available', 'downloading', 'ready'].includes(updateState.status) && <span className="settings-update-badge">НОВАЯ ВЕРСИЯ</span>}
                </div>
                <p className="settings-update-status" role="status">
                  {updateState?.status === 'checking' ? 'Проверяем GitHub Releases…'
                    : updateState?.status === 'available' ? `Доступна версия ${updateState.latestVersion}`
                    : updateState?.status === 'downloading' ? `Загрузка: ${updateState.percent ?? 0}%`
                    : updateState?.status === 'ready' ? `Версия ${updateState.latestVersion} готова к установке`
                    : updateState?.status === 'current' ? `Установлена актуальная версия ${updateState.currentVersion}`
                    : updateState?.status === 'development' ? 'Проверка работает в установленной Windows-версии.'
                    : updateState?.status === 'error' ? `Ошибка: ${updateState.message}`
                    : `Установлена версия ${updateState?.currentVersion || '…'}`}
                </p>
                {updateState?.status === 'downloading' && <div className="settings-update-progress" role="progressbar" aria-label="Скачивание обновления" aria-valuenow={Math.max(0, Math.min(100, updateState.percent ?? 0))} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.max(0, Math.min(100, updateState.percent ?? 0))}%` }} /></div>}
                <button type="button" className={`ui-button ${updateState && ['available', 'ready'].includes(updateState.status) ? 'settings-update-action' : ''}`} onClick={() => void updateAction()}
                  disabled={!updateState || ['checking', 'downloading', 'development'].includes(updateState.status)}>
                  {updateState && ['available', 'ready'].includes(updateState.status) ? <Download size={15} /> : <RefreshCw size={14} />}
                  {updateState?.status === 'available' ? 'Скачать обновление'
                    : updateState?.status === 'ready' ? 'Перезапустить и установить' : 'Проверить обновления'}
                </button>
              </section>
              <section className="settings-group">
                <div className="settings-group-heading">
                  <Cpu size={17} />
                  <h2>Среда Java</h2>
                  <button
                    className="ui-button"
                    type="button"
                    disabled={detectingJava || !window.quibyApi}
                    onClick={detectJava}
                  >
                    <RefreshCw size={13} className={detectingJava ? 'animate-spin' : ''} />
                    {detectingJava ? 'Поиск…' : 'Найти Java'}
                  </button>
                </div>
                <p className="section-copy">
                  Нужна Java 21 (64-битная). Если подходящей версии нет, лаунчер скачает её при запуске игры. Путь можно выбрать вручную.
                </p>
                {javaList.length > 0 && (
                  <select
                    aria-label="Установленные версии Java"
                    value={settings.javaPath}
                    onChange={(e) => update({ javaPath: e.target.value })}
                  >
                    <option value={settings.javaPath}>{settings.javaPath}</option>
                    {javaList
                      .filter((j) => j.path !== settings.javaPath)
                      .map((j) => (
                        <option key={j.path} value={j.path}>
                          {j.versionString} — {j.path}
                        </option>
                      ))}
                  </select>
                )}
                <label className="field-label" htmlFor="java-path">
                  Исполняемый файл
                </label>
                <div className="path-field">
                  <SettingsField
                    id="java-path"
                    value={settings.javaPath}
                    onCommit={value => update({ javaPath: value || 'java' })}
                    placeholder="java или путь к javaw.exe"
                  />
                  <button className="ui-button" onClick={() => browse('java')} disabled={!window.quibyApi}>
                    Выбрать
                  </button>
                </div>
              </section>
              <section className="settings-group">
                <div className="settings-group-heading">
                  <FolderOpen size={17} />
                  <h2>Папка игры</h2>
                </div>
                <p className="section-copy">Здесь хранятся сборка, шейдеры и схематики.</p>
                <label className="field-label" htmlFor="game-dir">
                  Расположение
                </label>
                <div className="path-field">
                  <SettingsField
                    id="game-dir"
                    value={settings.gameDir}
                    onCommit={value => update({ gameDir: value })}
                    placeholder="Папка по умолчанию"
                  />
                  <button className="ui-button" onClick={() => browse('game')} disabled={!window.quibyApi}>
                    Выбрать
                  </button>
                </div>
              </section>
              <Disclosure className="settings-group jvm-options" title={<>
                  <SlidersHorizontal size={16} /><span>Дополнительные параметры Java<small>{settings.customJvmArgs ? 'Свои параметры' : 'По умолчанию'}</small></span>
                </>}>
                <form onSubmit={event => { event.preventDefault(); if (!jvmError) update({ customJvmArgs: jvmDraft.trim() }); }}>
                  <p>Обычно менять их не требуется. Память задаётся во вкладке «Игра», путь Java — выше. Эти параметры применятся при следующем запуске.</p>
                  <label className="field-label" htmlFor="jvm-args">Ваши параметры JVM</label>
                  <textarea id="jvm-args" rows={4} maxLength={4096} spellCheck={false} value={jvmDraft} onChange={event => setJvmDraft(event.target.value)} aria-invalid={Boolean(jvmError)} aria-describedby="jvm-help" placeholder={'Например:\n-Dfile.encoding=UTF-8\n-Xlog:gc'}/>
                  <p id="jvm-help" role={jvmError ? 'alert' : 'status'} className={jvmError ? 'inline-error' : ''}>{jvmError || `Параметров: ${jvmCount}. Разделяйте пробелами или переносами строк; значения с пробелами заключайте в кавычки.`}</p>
                  <div className="jvm-options-actions"><button type="button" className="ui-button" disabled={!jvmDraft && !settings.customJvmArgs} onClick={() => { setJvmDraft(''); update({ customJvmArgs: '' }); }}>Вернуть по умолчанию</button><button type="submit" className="ui-button is-primary" disabled={Boolean(jvmError) || jvmDraft.trim() === (settings.customJvmArgs || '').trim()}>Сохранить параметры</button></div>
                </form>
              </Disclosure>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
