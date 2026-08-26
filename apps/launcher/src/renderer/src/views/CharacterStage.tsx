import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Shirt, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { AuthSession, ServerStatus } from '@quiby/shared';
import { DEFAULT_SKINS, CapePreset } from '../utils/chibiRenderer';
import { ChibiCharacterDisplay } from '../components/ChibiCharacterDisplay';

interface CharacterStageProps {
  session: AuthSession | null;
  serverStatus: ServerStatus | null;
  serverIp: string;
  customSkinImg: HTMLImageElement | null;
  customSkinName: string | null;
  activeDefaultSkinIdx: number;
  selectedCape: CapePreset;
  onOpenWardrobe: () => void;
  onOpenLogin: () => void;
}

export const CharacterStage: React.FC<CharacterStageProps> = ({
  session,
  serverStatus,
  serverIp,
  customSkinImg,
  customSkinName,
  activeDefaultSkinIdx,
  selectedCape,
  onOpenWardrobe,
  onOpenLogin,
}) => {
  const [copied, setCopied] = useState(false);

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
      {/* Top Header: Season Branding & Server Pill */}
      <div className="w-full flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="font-black text-2xl tracking-tight text-white">QUIBY.</span>
            <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 border border-white/10 text-[11px] font-mono font-bold text-zinc-300">
              SEASON VI • AERONAUTICS
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-mono">Minecraft 1.21.1 NeoForge</p>
        </div>

        {/* Server Address Pill with Quick Copy */}
        <button
          onClick={handleCopyIp}
          className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-zinc-900/80 hover:bg-zinc-850 border border-white/10 hover:border-white/20 text-xs text-zinc-300 hover:text-white transition-all shadow-sm backdrop-blur-md cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono">{serverIp || 'play.quiby.fun'}</span>
          <span className="text-emerald-400 font-bold font-mono">
            {serverStatus?.online ? `${serverStatus.players.online}/${serverStatus.players.max}` : 'Онлайн'}
          </span>
          <span className="text-zinc-500 ml-1">
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </span>
        </button>
      </div>

      {/* Center Stage: Animated Chibi Character */}
      <div
        className="flex flex-col items-center justify-center my-auto cursor-pointer group"
        onClick={onOpenWardrobe}
        title="Нажмите для выбора скина"
      >
        <div className="relative flex flex-col items-center">
          <div className="group-hover:scale-105 transition-transform duration-300">
            <ChibiCharacterDisplay
              customSkinImg={customSkinImg}
              activeDefaultSkinIdx={activeDefaultSkinIdx}
              selectedCape={selectedCape}
            />
          </div>

          {/* Minimal Floating Name Badge */}
          <div className="mt-3 flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-white/10 text-xs font-medium text-zinc-200 shadow-md backdrop-blur-md whitespace-nowrap group-hover:border-white/25 transition-colors">
            <Shirt size={13} className="text-zinc-400" />
            <span>{skinDisplayName}</span>
            <span className="text-zinc-600 text-[11px]">• Нажмите для смены</span>
          </div>
        </div>
      </div>

      {/* Bottom Left: Player Profile Pill */}
      <div className="w-full flex items-center justify-start">
        {session ? (
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-zinc-900/80 border border-white/10 text-xs text-white">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="font-bold font-mono">{session.user.mcUsername}</span>
            <span className="text-zinc-500 font-mono text-[11px]">(@{session.user.username})</span>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-850 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <Sparkles size={13} className="text-zinc-400" />
            <span>Войти в аккаунт (Discord)</span>
          </button>
        )}
      </div>
    </div>
  );
};
