import React, { useState } from 'react';
import { ArrowUpRight, Check, Copy, Shirt } from 'lucide-react';
import { AuthSession, ModpackManifest, ServerStatus } from '@quiby/shared';
import { DEFAULT_SKINS, CapePreset } from '../utils/chibiRenderer';
import { ChibiCharacterDisplay } from '../components/ChibiCharacterDisplay';
import { usePointerDepth } from '../hooks/usePointerDepth';
import quibySeasonLogo from '../assets/quiby_season6_logo.png';

interface CharacterStageProps {
  session: AuthSession | null;
  manifest: ModpackManifest | null;
  serverStatus: ServerStatus | null;
  serverIp: string;
  totalPlaytimeSeconds?: number;
  customSkinImg: HTMLImageElement | null;
  customSkinName: string | null;
  activeDefaultSkinIdx: number;
  selectedCape: CapePreset;
  isInGame?: boolean;
  backgroundVideoUrl?: string;
  onOpenWardrobe: () => void;
  onOpenLogin: () => void;
  onOpenNews?: () => void;
}

export const CharacterStage: React.FC<CharacterStageProps> = ({
  session,
  manifest,
  serverStatus,
  serverIp,
  totalPlaytimeSeconds = 0,
  customSkinImg,
  customSkinName,
  activeDefaultSkinIdx,
  selectedCape,
  isInGame = false,
  onOpenWardrobe,
  onOpenLogin,
  onOpenNews,
}) => {
  const depth = usePointerDepth<HTMLDivElement>();
  const [copied, setCopied] = useState(false);
  const skinName = customSkinName || DEFAULT_SKINS[activeDefaultSkinIdx % DEFAULT_SKINS.length]?.name || 'Steve';
  const hours = Math.floor(totalPlaytimeSeconds / 3600);
  const minutes = Math.floor((totalPlaytimeSeconds % 3600) / 60);
  const playtime = hours ? `${hours} ч ${minutes} мин` : `${minutes} мин`;
  const statusText = serverStatus?.online ? `${serverStatus.players.online} / ${serverStatus.players.max} игроков` : serverStatus ? 'Сервер недоступен' : 'Нет соединения с API';

  const copyIp = async () => {
    try {
      await navigator.clipboard.writeText(serverIp);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      setCopied(false);
    }
  };

  return (
    <div {...depth} className="launcher-home view-enter">
      <div className="home-heading">
        <div>
          <p className="home-kicker">QUIBY / СЕЗОН 06</p>
          <h1>Твой мир. Твой ход.</h1>
        </div>
        <button type="button" onClick={copyIp} className="home-address" title="Скопировать адрес сервера">
          <span className={serverStatus?.online ? 'status-dot is-online' : 'status-dot'} />
          <span>{serverIp}</span>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      <div className="home-content">
        <section className="pilot-panel" aria-label="Персонаж">
          <div className="pilot-panel-top">
            <span>ПЕРСОНАЖ</span>
            <span>{session ? 'АККАУНТ ПОДКЛЮЧЁН' : 'ГОСТЬ'}</span>
          </div>
          <button type="button" className="pilot-figure" onClick={onOpenWardrobe} title="Открыть гардероб">
            <span className="pilot-plinth" aria-hidden="true" /><span className="pilot-figure-number" aria-hidden="true">06</span>
            <ChibiCharacterDisplay
              customSkinImg={customSkinImg}
              activeDefaultSkinIdx={activeDefaultSkinIdx}
              selectedCape={selectedCape}
              animation={isInGame ? 'walk' : 'idle'}
              showShadow={false}
            />
          </button>
          <div className="pilot-panel-bottom">
            <div className="pilot-identity">
              <div><small>ИГРОК</small><strong>{session?.user.mcUsername || 'Не выполнен вход'}</strong></div>
              <div><small>СКИН</small><strong title={skinName}>{skinName}</strong></div>
            </div>
            <button type="button" className="quiet-action" onClick={onOpenWardrobe}>
              <Shirt size={15} /> Гардероб <ArrowUpRight size={15} />
            </button>
          </div>
        </section>

        <section className="season-panel" aria-label="Сборка и сервер">
          <div className="season-panel-intro">
            <div className="season-label"><span>МИР 06</span><span>CREATE / AERONAUTICS</span></div>
            <img src={quibySeasonLogo} alt="quiby Season 6" className="season-mark" />
            <p>Minecraft 1.21.1 · NeoForge. Сборка проверяется и обновляется перед каждым запуском.</p>
          </div>

          <dl className="season-facts">
            <div><dt>СЕРВЕР</dt><dd className={serverStatus?.online ? 'fact-online' : ''}>{statusText}</dd></div>
            <div><dt>СБОРКА</dt><dd>{manifest ? `Версия ${manifest.version}` : 'Версия недоступна'}</dd></div>
            <div><dt>ВРЕМЯ В ИГРЕ</dt><dd>{playtime}</dd></div>
          </dl>

          <div className="season-panel-footer">
            {!session ? (
              <button type="button" onClick={onOpenLogin} className="season-link">Войти через Discord <ArrowUpRight size={16} /></button>
            ) : (
              <span>Вы вошли как {session.user.mcUsername}</span>
            )}
            {onOpenNews && <button type="button" onClick={onOpenNews} className="season-link">Уведомления <ArrowUpRight size={16} /></button>}
          </div>
        </section>
      </div>
    </div>
  );
};
