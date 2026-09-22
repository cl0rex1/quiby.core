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
    <div className="relative flex-1 flex flex-col p-6 sm:p-8 overflow-y-auto select-none z-10 pb-24">
      {/* 1. Header Banner: Title & Quick Meta */}
      <div className="flex items-center justify-between pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-[11px] font-mono font-bold text-purple-300">
              SEASON VI
            </span>
            <span className="text-xs text-zinc-400 font-mono">Minecraft 1.21.1 NeoForge</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 apple-display">
            quiby. <span className="text-zinc-400 font-normal">Aeronautics Ecosystem</span>
          </h1>
        </div>

        {/* Server Host Pill */}
        <button
          onClick={handleCopyIp}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl glass-card text-xs text-zinc-300 hover:text-white transition-all cursor-pointer press-feedback border border-white/10"
          title="Скопировать IP сервера"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="font-mono font-bold">{serverIp || 'play.quiby.fun'}</span>
          <span className="text-zinc-500 ml-1">
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </span>
        </button>
      </div>

      {/* 2. Balanced 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-stretch">
        {/* Left Column: Season Info & Patch Notes (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Season VI Hero Feature Card */}
          <div className="rounded-2xl glass-panel overflow-hidden border border-white/10 flex flex-col">
            <div className="h-32 bg-zinc-900 relative overflow-hidden flex items-center justify-center">
              <img
                src={quibySeasonLogo}
                alt="Season VI Aeronautics"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                <span className="text-xs font-bold text-white tracking-wide apple-subheading">
                  Create: Aeronautics & Steam Power
                </span>
                <span className="text-[10px] text-zinc-400 font-mono bg-black/60 px-2 py-0.5 rounded">
                  Версия 6.1.0
                </span>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-zinc-300 leading-relaxed apple-body">
                Полноценная инженерная сборка 6-го сезона: управляемые дирижабли, скоростные поезда,
                автоматизированные кинетические заводы и оптимизированный рендеринг Sodium/Iris на базе Java 21.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-[11px] font-mono text-zinc-300">
                  ⚙️ Create 6.0
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-[11px] font-mono text-zinc-300">
                  🚀 Aeronautics
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-[11px] font-mono text-zinc-300">
                  ⚡ G1GC 8-16 GB
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-[11px] font-mono text-zinc-300">
                  🛡️ Anti-Cheat Shield
                </span>
              </div>
            </div>
          </div>

          {/* Patch Notes & Changelog Card */}
          <div className="rounded-2xl glass-card p-4 border border-white/10 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
                <div className="flex items-center gap-2">
                  <Newspaper size={14} className="text-purple-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Что нового в Season VI
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">Обновлено 29 авг</span>
              </div>

              <ul className="space-y-2 text-xs text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Добавлена поддержка собственных клиентских модов с предварительной проверкой безопасности.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Оптимизирован запуск Minecraft 1.21.1 NeoForge с прямым входом на сервер (Fast-Connect).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Интегрирован каталог схем Create (.nbt) и шейдеров Iris прямо в лаунчере.</span>
                </li>
              </ul>
            </div>

            {onOpenNews && (
              <button
                type="button"
                onClick={onOpenNews}
                className="mt-4 pt-3 border-t border-white/5 text-xs font-semibold text-purple-300 hover:text-purple-200 transition-colors flex items-center justify-between cursor-pointer press-feedback"
              >
                <span>Открыть центр уведомлений и новостей</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Grounded Character Stage & Identity (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl glass-panel p-6 border border-white/10 flex flex-col items-center justify-between relative overflow-hidden">
          {/* Top Stage Badges */}
          <div className="w-full flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-zinc-500" />
              <span className="font-mono">{formatPlaytime(totalPlaytimeSeconds)} в игре</span>
            </div>
            {session ? (
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                Вайтлист активен
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">
                Не авторизован
              </span>
            )}
          </div>

          {/* Central Chibi Pedestal */}
          <div
            className="my-auto py-6 flex flex-col items-center justify-center relative cursor-pointer group"
            onClick={onOpenWardrobe}
            title="Открыть гардероб скинов и плащей"
          >
            {/* Pedestal Shadow & Subtle Glow */}
            <div className="absolute bottom-2 w-48 h-8 bg-purple-500/15 rounded-full blur-lg pointer-events-none group-hover:bg-purple-500/25 transition-all duration-300" />
            <div className="absolute bottom-4 w-32 h-3 bg-black/40 rounded-full blur-sm pointer-events-none" />

            <div className="relative z-10 transition-transform duration-300 group-hover:scale-105">
              <ChibiCharacterDisplay
                customSkinImg={customSkinImg}
                activeDefaultSkinIdx={activeDefaultSkinIdx}
                selectedCape={selectedCape}
                animation={isInGame ? 'walk' : 'idle'}
              />
            </div>

            {/* In-Game Status */}
            {isInGame && (
              <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>В игре на quiby. S6</span>
              </div>
            )}
          </div>

          {/* Bottom Identity & Wardrobe Action */}
          <div className="w-full space-y-3 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">Игровой ник</p>
                <p className="text-sm font-bold text-white tracking-wide">
                  {session ? session.user.mcUsername : 'Гость (Требуется вход)'}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-zinc-400">Текущий скин</p>
                <p className="text-xs font-semibold text-purple-300 truncate max-w-[120px]">
                  {skinDisplayName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onOpenWardrobe}
                className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer press-feedback"
              >
                <Shirt size={14} className="text-purple-400" />
                <span>Сменить скин / плащ</span>
              </button>

              {!session && (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer press-feedback shrink-0"
                >
                  <Sparkles size={14} />
                  <span>Войти</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
