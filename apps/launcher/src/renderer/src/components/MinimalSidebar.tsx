import React, { useState } from 'react';
import { 
  Play, 
  Shirt, 
  FolderGit2, 
  Sliders,
  ShieldCheck,
  LogIn
} from 'lucide-react';
import { AuthSession } from '@quiby/shared';

export type ActiveTab = 'home' | 'wardrobe' | 'mods' | 'settings';

interface MinimalSidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  session: AuthSession | null;
  onOpenProfile: () => void;
}

export const MinimalSidebar: React.FC<MinimalSidebarProps> = ({
  activeTab,
  onSelectTab,
  session,
  onOpenProfile,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const navItems = [
    { id: 'home' as ActiveTab, label: 'Главная', icon: Play, size: 20 },
    { id: 'wardrobe' as ActiveTab, label: 'Гардероб', icon: Shirt, size: 20 },
    { id: 'mods' as ActiveTab, label: 'Моды', icon: FolderGit2, size: 20 },
    { id: 'settings' as ActiveTab, label: 'Настройки', icon: Sliders, size: 20 },
  ];

  return (
    <>
      {/* Full-Window Smooth Backdrop Blur Overlay on Hover */}
      <div
        className={`fixed inset-0 z-30 bg-black/45 backdrop-blur-md transition-opacity duration-300 ease-out pointer-events-none ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Interactive Expandable Sidebar (w-[72px] collapsed with 36px center axis) */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 left-0 bottom-0 z-40 flex flex-col justify-between items-start py-6 px-3 bg-zinc-950/95 border-r border-white/10 select-none backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-2xl overflow-hidden ${
          isHovered ? 'w-60 shadow-[0_0_50px_rgba(0,0,0,0.85)]' : 'w-[72px]'
        }`}
      >
        {/* Top Brand Mark (48px wide anchor for exact 36px center) */}
        <div className="w-full flex items-center h-12 shrink-0">
          <div className="w-12 h-12 flex items-center justify-center shrink-0">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-black font-black text-xs shadow-sm">
              Q
            </div>
          </div>
          <div
            className={`flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pl-2 ${
              isHovered
                ? 'max-w-[140px] opacity-100 translate-x-0'
                : 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
            }`}
          >
            <span className="text-xs font-black tracking-wider text-white">QUIBY.CORE</span>
            <span className="text-[10px] text-zinc-500 font-mono">SEASON VI</span>
          </div>
        </div>

        {/* Navigation Icons Centered Vertically */}
        <div className="flex flex-col space-y-2.5 w-full my-auto shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center w-full h-12 rounded-2xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
                }`}
                title={!isHovered ? item.label : undefined}
              >
                {/* 48px fixed icon slot for perfect center alignment */}
                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                  <Icon
                    size={item.size}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={isActive && item.id === 'home' ? 'fill-white' : ''}
                  />
                </div>

                {/* Smooth Animated Label without Layout Shift */}
                <span
                  className={`text-xs font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pl-1 ${
                    isHovered
                      ? 'max-w-[130px] opacity-100 translate-x-0'
                      : 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom User Profile Section */}
        <div className="w-full shrink-0">
          {session ? (
            <button
              onClick={onOpenProfile}
              className="flex items-center w-full h-12 rounded-2xl transition-all duration-200 cursor-pointer hover:bg-zinc-900 border border-transparent hover:border-white/5"
              title={!isHovered ? `Профиль: ${session.user.mcUsername}` : undefined}
            >
              {/* 48px fixed avatar slot */}
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-white/15 shrink-0 relative shadow-sm">
                  <img
                    src={
                      session.user.avatarUrl ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'
                    }
                    alt="User Avatar"
                    className="w-full h-full object-cover"
                  />
                  {session.user.isWhitelisted && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black" />
                  )}
                </div>
              </div>

              {/* Profile Info revealed on hover smoothly */}
              <div
                className={`flex flex-col text-left whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pl-1.5 ${
                  isHovered
                    ? 'max-w-[130px] opacity-100 translate-x-0'
                    : 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate max-w-[95px]">
                    {session.user.mcUsername}
                  </span>
                  <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                </div>
                <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[105px]">
                  @{session.user.username}
                </span>
              </div>
            </button>
          ) : (
            <button
              onClick={onOpenProfile}
              className="flex items-center w-full h-12 rounded-2xl transition-all duration-200 cursor-pointer bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-white/5"
              title={!isHovered ? 'Войти через Discord' : undefined}
            >
              {/* 48px fixed login icon slot */}
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <LogIn size={18} />
              </div>
              <span
                className={`text-xs font-bold whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pl-1 ${
                  isHovered
                    ? 'max-w-[130px] opacity-100 translate-x-0'
                    : 'max-w-0 opacity-0 -translate-x-3 pointer-events-none'
                }`}
              >
                Войти в Discord
              </span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
