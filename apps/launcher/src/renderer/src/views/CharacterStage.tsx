import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Shirt, 
  Sparkles, 
  Layers, 
  Activity,
  Clock,
  Newspaper
} from 'lucide-react';
import { AuthSession, ServerStatus } from '@quiby/shared';
import { DEFAULT_SKINS, CapePreset } from '../utils/chibiRenderer';
import { ChibiCharacterDisplay } from '../components/ChibiCharacterDisplay';
import quibySeasonLogo from '../assets/quiby_season6_logo.png';

interface CharacterStageProps {
  session: AuthSession | null;
  serverStatus: ServerStatus | null;
  serverIp: string;
  totalPlaytimeSeconds?: number;
  customSkinImg: HTMLImageElement | null;
  customSkinName: string | null;
  activeDefaultSkinIdx: number;
  selectedCape: CapePreset;
  isInGame?: boolean;
  onOpenWardrobe: () => void;
  onOpenLogin: () => void;
  onOpenNews?: () => void;
}

export const CharacterStage: React.FC<CharacterStageProps> = ({
  session,
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
  const [copied, setCopied] = useState(false);

  const formatPlaytime = (seconds: number) => {
    if (seconds < 60) return '< 1 мин';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} мин`;
    const hours = (seconds / 3600).toFixed(1);
    return `${hours} ч`;
  };

  const handleCopyIp = () => {
    navigator.clipboard.writeText(serverIp || 'play.quiby.fun:25565');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const skinDisplayName = customSkinName
    ? customSkinName
    : (DEFAULT_SKINS[activeDefaultSkinIdx % DEFAULT_SKINS.length]?.name || 'Steve');

  return (
    <div className="relative flex-1 flex flex-col justify-between items-center p-8 overflow-hidden select-none z-10">
      {/* Top Header: News Card Widget (Left) & Server Address Pill (Right) */}
      <div className="w-full flex items-start justify-between gap-4 flex-wrap">
        {/* Top-Left: News Widget Card (matching reference layout - wider & lower) */}
        <button
          type="button"
          onClick={onOpenNews}
          className="w-56 sm:w-64 rounded-2xl glass-card border border-white/10 hover:border-white/25 overflow-hidden transition-all duration-300 group cursor-pointer press-feedback shadow-lg flex flex-col text-left"
          title="Открыть новости Season VI"
        >
          {/* Top Half: Wider Aspect Image Preview */}
          <div className="w-full h-16 sm:h-18 bg-gradient-to-br from-purple-950/80 via-zinc-900 to-black relative overflow-hidden flex items-center justify-center border-b border-white/5">
            <img
              src={quibySeasonLogo}
              alt="Season VI"
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Bottom Half: Title Line & Metadata Row */}
          <div className="px-3 py-2 space-y-0.5 bg-zinc-950/60 backdrop-blur-md">
            <p className="text-xs font-bold text-white truncate apple-subheading group-hover:text-purple-300 transition-colors">
              Сезон VI: Aeronautics
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
              <span className="truncate">Create S6</span>
              <span className="text-zinc-600 font-bold">•</span>
              <span className="text-zinc-500 shrink-0">29 авг</span>
            </div>
          </div>
        </button>

        {/* Server Address Pill with Quick Copy & Live Status */}
        <button
          onClick={handleCopyIp}
          className="flex items-center gap-2.5 px-4 py-2 rounded-full glass-card hover:bg-zinc-800/80 text-xs text-zinc-200 hover:text-white transition-all shadow-md cursor-pointer press-feedback"
          title="Нажмите, чтобы скопировать IP сервера"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="font-mono font-bold tracking-tight">{serverIp || 'play.quiby.fun'}</span>
          <span className="text-emerald-400 font-bold font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px]">
            {serverStatus?.online ? `${serverStatus.players.online}/${serverStatus.players.max}` : 'Онлайн'}
          </span>
          <span className="text-zinc-500 ml-0.5">
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </span>
        </button>
      </div>

      {/* Center Stage: Hero Pedestal with Animated Chibi Character (Transforms in-game) */}
      <div
        className={`flex flex-col items-center justify-center my-auto relative transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isInGame
            ? '-translate-x-28 sm:-translate-x-44 md:-translate-x-60 scale-110 sm:scale-125'
            : 'translate-x-0 scale-100 cursor-pointer group'
        }`}
        onClick={!isInGame ? onOpenWardrobe : undefined}
        title={!isInGame ? 'Нажмите для выбора скина и плаща' : undefined}
      >
        {/* Volumetric stage light bloom beneath the character */}
        <div className="absolute -bottom-8 w-64 h-24 bg-gradient-to-t from-fuchsia-600/25 via-purple-500/15 to-transparent rounded-[100%] blur-xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute -bottom-4 w-44 h-8 bg-purple-400/20 rounded-[100%] blur-md pointer-events-none" />

        <div className="relative flex flex-col items-center z-10">
          <div className="transition-transform duration-300">
            <ChibiCharacterDisplay
              customSkinImg={customSkinImg}
              activeDefaultSkinIdx={activeDefaultSkinIdx}
              selectedCape={selectedCape}
              animation={isInGame ? 'walk' : 'idle'}
            />
          </div>

          {/* Minimal Floating Name or In-Game Status Badge */}
          {isInGame ? (
            <div className="mt-3 flex items-center gap-2.5 px-4 py-1.5 rounded-full glass-floating text-xs font-bold text-white shadow-lg border-emerald-500/30 whitespace-nowrap animate-in fade-in zoom-in-95 duration-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="apple-subheading text-emerald-300 font-bold tracking-wide">
                В игре на quiby. S6
              </span>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 px-4 py-1.5 rounded-full glass-floating text-xs font-medium text-zinc-200 shadow-md whitespace-nowrap group-hover:border-white/30 transition-colors press-feedback">
              <Shirt size={13} className="text-purple-400" />
              <span className="apple-subheading font-bold">{skinDisplayName}</span>
              {selectedCape.id !== 'none' && (
                <span className="text-[10px] text-purple-300 font-mono px-1.5 py-0.2 rounded-full bg-purple-500/20 border border-purple-400/30">
                  {selectedCape.name}
                </span>
              )}
              <span className="text-zinc-500 text-[11px] font-normal hidden sm:inline">• Сменить</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Ultra-minimal login or empty spacer */}
      <div className="w-full flex items-center justify-start gap-3 flex-wrap min-h-[36px]">
        {!session && (
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel hover:bg-zinc-850 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm press-feedback border border-white/10"
          >
            <Sparkles size={14} className="text-purple-400" />
            <span className="apple-subheading">Войти в аккаунт (Discord)</span>
          </button>
        )}
      </div>
    </div>
  );
};
