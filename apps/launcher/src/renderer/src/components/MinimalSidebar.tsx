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
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed top-0 left-0 bottom-0 z-40 flex flex-col justify-between items-start py-6 bg-zinc-950/90 border-r border-white/10 select-none backdrop-blur-2xl transition-all duration-300 ease-out shadow-2xl ${
        isHovered ? 'w-56 px-4 shadow-[0_0_40px_rgba(0,0,0,0.8)]' : 'w-[72px] px-3.5'
      }`}
    >
      {/* Top Brand Mark */}
      <div className="w-full flex items-center gap-3 px-1 h-9">
        <div className="w-7 h-7 rounded-xl bg-white flex items-center justify-center text-black font-black text-xs shrink-0 shadow-sm">
          Q
        </div>
        <div
          className={`flex flex-col transition-all duration-200 overflow-hidden whitespace-nowrap ${
            isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'
          }`}
        >
          <span className="text-xs font-black tracking-wider text-white">QUIBY.CORE</span>
          <span className="text-[10px] text-zinc-500 font-mono">SEASON VI</span>
        </div>
      </div>

      {/* Navigation Icons Centered Vertically */}
      <div className="flex flex-col space-y-3 w-full my-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-3.5 w-full rounded-2xl transition-all cursor-pointer ${
                isHovered ? 'px-3 py-2.5' : 'p-2.5 justify-center'
              } ${
                isActive
                  ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80 border border-transparent'
              }`}
              title={!isHovered ? item.label : undefined}
            >
              <div className="shrink-0 flex items-center justify-center">
                <Icon
                  size={item.size}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive && item.id === 'home' ? 'fill-white' : ''}
                />
              </div>

              {/* Animated Label */}
              <span
                className={`text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none hidden'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom User Profile Section */}
      <div className="w-full">
        {session ? (
          <button
            onClick={onOpenProfile}
            className={`flex items-center gap-3 w-full rounded-2xl transition-all cursor-pointer hover:bg-zinc-900/80 p-1.5 ${
              isHovered ? 'border border-white/5' : 'justify-center border-transparent'
            }`}
            title={!isHovered ? `Профиль: ${session.user.mcUsername}` : undefined}
          >
            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/15 shrink-0 relative">
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

            {/* Profile Info revealed on hover */}
            <div
              className={`flex flex-col text-left overflow-hidden transition-all duration-200 ${
                isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none hidden'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate max-w-[100px]">
                  {session.user.mcUsername}
                </span>
                <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
              </div>
              <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[110px]">
                @{session.user.username}
              </span>
            </div>
          </button>
        ) : (
          <button
            onClick={onOpenProfile}
            className={`flex items-center gap-2.5 w-full rounded-2xl transition-all cursor-pointer p-2 ${
              isHovered ? 'bg-white text-black font-semibold' : 'bg-zinc-900 text-zinc-300 hover:text-white justify-center'
            }`}
            title={!isHovered ? 'Войти через Discord' : undefined}
          >
            <LogIn size={16} className="shrink-0" />
            <span
              className={`text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none hidden'
              }`}
            >
              Войти
            </span>
          </button>
        )}
      </div>
    </aside>
  );
};
