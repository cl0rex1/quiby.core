import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Wifi, 
  Shirt, 
  Heart,
  ShieldCheck
} from 'lucide-react';
import { AuthSession, ServerStatus } from '@quiby/shared';
import { 
  renderChibiCharacter, 
  DEFAULT_SKINS, 
  CapePreset 
} from '../utils/chibiRenderer';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  // Animation Loop for Chibi Canvas
  useEffect(() => {
    let animationFrameId: number;
    let startTime = performance.now();

    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const time = (performance.now() - startTime) / 1000;
          renderChibiCharacter(
            ctx,
            canvas.width,
            canvas.height,
            time,
            customSkinImg,
            activeDefaultSkinIdx,
            selectedCape
          );
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [customSkinImg, activeDefaultSkinIdx, selectedCape]);

  const handleCopyIp = () => {
    navigator.clipboard.writeText(serverIp || 'play.quiby.fun:25565');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const skinDisplayName = customSkinName ? customSkinName : DEFAULT_SKINS[activeDefaultSkinIdx].name;

  return (
    <div className="relative flex-1 flex flex-col justify-between items-center p-8 overflow-hidden select-none z-10">
      {/* Top Header: Season Branding & Server Pill */}
      <div className="w-full flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="font-black text-2xl tracking-tight text-white">QUIBY.</span>
            <span className="px-2.5 py-0.5 rounded-full bg-onyx-850 border border-onyx-border text-[11px] font-mono font-bold text-quiby-purpleLight">
              SEASON VI • AERONAUTICS
            </span>
          </div>
          <p className="text-xs text-quiby-textMuted font-mono">Minecraft 1.21.1 NeoForge</p>
        </div>

        {/* Server Address Pill with Quick Copy */}
        <button
          onClick={handleCopyIp}
          className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-onyx-850/80 hover:bg-onyx-800 border border-onyx-border text-xs text-quiby-text hover:text-white transition-all shadow-onyx-card backdrop-blur-md cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-mono">{serverIp || 'play.quiby.fun'}</span>
          <span className="text-emerald-400 font-bold font-mono">
            {serverStatus?.online ? `${serverStatus.players.online}/${serverStatus.players.max}` : '1.21.1'}
          </span>
          <span className="text-quiby-textDim ml-1">
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </span>
        </button>
      </div>

      {/* Center Stage: Animated Chibi Character */}
      <div className="flex flex-col items-center justify-center my-auto cursor-pointer group" onClick={onOpenWardrobe} title="Нажмите для смены скина и плаща">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={340}
            height={340}
            className="w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] drop-shadow-2xl group-hover:scale-105 transition-transform duration-300"
          />

          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-onyx-900/90 border border-onyx-border text-xs font-mono text-quiby-purpleLight shadow-onyx-card backdrop-blur-md whitespace-nowrap group-hover:border-quiby-purple transition-colors">
            <Shirt size={13} className="text-quiby-purple" />
            <span>{skinDisplayName}</span>
            {selectedCape.id !== 'none' && (
              <span className="text-quiby-textDim text-[11px]">• {selectedCape.name}</span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Left: Player Profile Pill */}
      <div className="w-full flex items-center justify-start">
        {session ? (
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-onyx-850/80 border border-onyx-border text-xs text-white">
            <ShieldCheck size={14} className="text-quiby-purpleLight" />
            <span className="font-bold font-mono">{session.user.mcUsername}</span>
            <span className="text-quiby-textDim font-mono text-[11px]">(@{session.user.username})</span>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-onyx-850 hover:bg-onyx-800 border border-onyx-border text-xs font-bold text-quiby-purpleLight hover:text-white transition-all cursor-pointer"
          >
            <span>Войти в аккаунт (Discord)</span>
          </button>
        )}
      </div>
    </div>
  );
};
