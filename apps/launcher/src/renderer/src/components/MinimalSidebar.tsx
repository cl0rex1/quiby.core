import React from 'react';
import { 
  Home, 
  Shirt, 
  Layers, 
  Sliders 
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
  return (
    <aside className="w-[72px] bg-onyx-900 border-r border-onyx-border flex flex-col justify-between items-center py-6 select-none shrink-0 z-30">
      {/* Exactly 4 Clean Navigation Icons */}
      <div className="flex flex-col items-center space-y-7 w-full">
        {/* 1. Home / Character Stage */}
        <button
          onClick={() => onSelectTab('home')}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
            activeTab === 'home'
              ? 'text-white bg-white/10 shadow-sm'
              : 'text-quiby-textMuted hover:text-white hover:bg-white/5'
          }`}
          title="Главная сцена"
        >
          <Home size={22} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
        </button>

        {/* 2. Skin & Cape Wardrobe */}
        <button
          onClick={() => onSelectTab('wardrobe')}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
            activeTab === 'wardrobe'
              ? 'text-white bg-white/10 shadow-sm'
              : 'text-quiby-textMuted hover:text-white hover:bg-white/5'
          }`}
          title="Скин и Плащ"
        >
          <Shirt size={22} strokeWidth={activeTab === 'wardrobe' ? 2.5 : 2} />
        </button>

        {/* 3. Mods Manager (Official + Custom) */}
        <button
          onClick={() => onSelectTab('mods')}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
            activeTab === 'mods'
              ? 'text-white bg-white/10 shadow-sm'
              : 'text-quiby-textMuted hover:text-white hover:bg-white/5'
          }`}
          title="Моды сборки"
        >
          <Layers size={22} strokeWidth={activeTab === 'mods' ? 2.5 : 2} />
        </button>

        {/* 4. Settings */}
        <button
          onClick={() => onSelectTab('settings')}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
            activeTab === 'settings'
              ? 'text-white bg-white/10 shadow-sm'
              : 'text-quiby-textMuted hover:text-white hover:bg-white/5'
          }`}
          title="Настройки"
        >
          <Sliders size={20} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
        </button>
      </div>

      {/* Bottom User Circular Avatar (Discord Profile) */}
      <div className="flex flex-col items-center">
        <button
          onClick={onOpenProfile}
          className="w-10 h-10 rounded-full overflow-hidden border-2 border-onyx-border hover:border-quiby-purple hover:scale-105 transition-all shadow-md cursor-pointer relative"
          title={session ? `Профиль: ${session.user.mcUsername}` : 'Войти через Discord'}
        >
          <img
            src={
              session?.user.avatarUrl ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'
            }
            alt="User Avatar"
            className="w-full h-full object-cover"
          />
          {session?.user.isWhitelisted && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black"></span>
          )}
        </button>
      </div>
    </aside>
  );
};
