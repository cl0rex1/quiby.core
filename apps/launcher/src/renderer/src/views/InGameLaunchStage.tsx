import { Disclosure } from '../components/Disclosure';
import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Square, Terminal, Trash2 } from 'lucide-react';
import { AuthSession, DownloadProgress, LaunchState, LogEntry } from '@quiby/shared';
import { CapePreset } from '../utils/chibiRenderer';
import { ChibiCharacterDisplay } from '../components/ChibiCharacterDisplay';

export interface InGameLaunchStageProps {
  session: AuthSession | null;
  launchState: LaunchState;
  downloadProgress: DownloadProgress | null;
  logs: LogEntry[];
  totalPlaytimeSeconds?: number;
  customSkinImg: HTMLImageElement | null;
  customSkinName: string | null;
  activeDefaultSkinIdx: number;
  selectedCape: CapePreset;
  onKill: () => void;
  onClearLogs?: () => void;
}

export const InGameLaunchStage: React.FC<InGameLaunchStageProps> = ({
  session, launchState, downloadProgress, logs, customSkinImg,
  activeDefaultSkinIdx, selectedCape, onKill, onClearLogs,
}) => {
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [copyState, setCopyState] = useState('');
  const logViewport = useRef<HTMLDivElement>(null);
  const followLogs = useRef(true);
  const stage = launchState.status === 'running' ? 2 : launchState.status === 'starting' ? 1 : 0;
  const titles = ['Собираем\nтвой мир.', 'Время\nотправляться.', 'Увидимся\nв игре.'];
  const descriptions = [
    'Проверяем сборку и загружаем нужные файлы.',
    'Запускаем Minecraft. Окно игры скоро появится.',
    'Minecraft запущен в отдельном окне.',
  ];
  const progress = Math.max(0, Math.min(100, downloadProgress?.progressPercent || 0));
  useEffect(() => {
    const viewport = logViewport.current;
    if (consoleOpen && followLogs.current && viewport && !document.hidden) viewport.scrollTop = viewport.scrollHeight;
  }, [logs, consoleOpen]);
  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs.map(log => `[${log.timestamp}] [${log.source}/${log.level}] ${log.message}`).join('\n'));
      setCopyState('Скопировано');
    } catch { setCopyState('Не удалось скопировать'); }
  };

  return (
    <div className="launch-experience view-enter" data-stage={stage}>
      <header className="launch-topline">
        <span>QUIBY / СЕЗОН 06</span>
        <span>{session?.user.mcUsername || 'Игрок'} <i /> MINECRAFT 1.21.1</span>
      </header>
      <div className="launch-composition">
        <div className="launch-scene" aria-hidden="true">
          <span className="launch-scene-word">PLAY</span>
          <div className="launch-assembly">
            <i className="assembly-frame frame-back" />
            <i className="assembly-frame frame-middle" />
            <i className="assembly-frame frame-front" />
            <span className="assembly-platform" />
          </div>
          <div className="launch-avatar">
            <ChibiCharacterDisplay customSkinImg={customSkinImg} activeDefaultSkinIdx={activeDefaultSkinIdx}
              selectedCape={selectedCape} animation={stage === 2 ? 'idle' : 'walk'} showShadow={false} />
          </div>
          <span className="launch-scene-caption">{stage === 2 ? 'ТВОЙ ХОД.' : 'МИР СТАНОВИТСЯ БЛИЖЕ.'}</span>
        </div>
        <section className="launch-story" aria-label="Запуск игры">
          <div className="launch-story-copy" key={stage} aria-live="polite" aria-atomic="true">
            <p className="page-kicker">{['ПОДГОТОВКА СБОРКИ', 'ЗАПУСК ИГРЫ', 'MINECRAFT ЗАПУЩЕН'][stage]}</p>
            <h1>{titles[stage]}</h1>
            <p>{descriptions[stage]}</p>
          </div>
          <ol className="launch-steps" aria-label="Этапы запуска">
            {['Файлы', 'Запуск', 'Игра'].map((label, index) => (
              <li key={label} className={index < stage ? 'is-done' : index === stage ? 'is-current' : ''} aria-current={index === stage ? 'step' : undefined}>
                <span>{index < stage ? <Check size={13} /> : `0${index + 1}`}</span>{label}
              </li>
            ))}
          </ol>
          <div className="launch-progress-area">
            {stage === 0 ? <>
              <div className="launch-progress-label"><span>{downloadProgress?.stageLabel || 'Проверяем сборку'}</span><strong>{downloadProgress ? `${Math.round(progress)}%` : '…'}</strong></div>
              <div className={`launch-progress-track ${downloadProgress ? '' : 'is-indeterminate'}`} role="progressbar" aria-label={downloadProgress?.stageLabel || 'Проверка сборки'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={downloadProgress ? progress : undefined}>
                <span style={downloadProgress ? { transform: `scaleX(${progress / 100})` } : undefined} />
              </div>
              <div className="launch-file"><span title={downloadProgress?.currentFile}>{downloadProgress?.currentFile || 'Подготавливаем файлы к запуску'}</span>{!!downloadProgress?.speedBps && <span>{(downloadProgress.speedBps / 1048576).toFixed(1)} МБ/с</span>}</div>
            </> : stage === 1 ? <div className="launch-wait"><span />Открываем окно игры</div> : <button type="button" className="ui-button launch-stop" onClick={onKill}><Square size={13} /> Остановить игру</button>}
          </div>
        </section>
      </div>
      <Disclosure className="launch-console" open={consoleOpen} onOpenChange={setConsoleOpen}
        title={<><Terminal size={15}/><span>Журнал запуска</span><small>{logs.length} строк</small></>}>
        <>
          <div className="launch-console-tools"><span role="status">{copyState || 'Вывод Minecraft'}</span><button type="button" title="Скопировать журнал" onClick={copyLogs} disabled={!logs.length}><Copy size={14} /></button>{onClearLogs && <button type="button" title="Очистить журнал" onClick={onClearLogs} disabled={!logs.length}><Trash2 size={14} /></button>}</div>
          <div ref={logViewport} className="launch-log-lines" onScroll={event => { const el = event.currentTarget; followLogs.current = el.scrollHeight - el.scrollTop - el.clientHeight < 32; }}>
            {logs.length ? logs.slice(-500).map(log => <p key={log.id} data-level={log.level}><time>{log.timestamp}</time><span>{log.message}</span></p>) : <p>Ожидаем сообщения Minecraft…</p>}
          </div>
        </>
      </Disclosure>
    </div>
  );
};
