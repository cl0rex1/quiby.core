import React from 'react';
import { Rocket, Layers, Newspaper, Terminal, Sliders, Server, ExternalLink } from 'lucide-react';

export type NavTab = 'play' | 'modpack' | 'news' | 'console' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  logsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, logsCount }) => {
  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: string | number }> = [
    { id: 'play', label: 'Главная / Играть', icon: <Rocket size={18} /> },
    { id: 'modpack', label: 'Моды сборки', icon: <Layers size={18} /> },
    { id: 'news', label: 'Новости', icon: <Newspaper size={18} /> },
    { id: 'console', label: 'Консоль логов', icon: <Terminal size={18} />, badge: logsCount > 0 ? logsCount : undefined },
    { id: 'settings', label: 'Настройки', icon: <Sliders size={18} /> },
  ];

  return (
    <aside className="w-56 bg-quiby-card border-r border-quiby-border flex flex-col justify-between p-3 select-none">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Навигация
        </div>
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-quiby-500/15 text-emerald-400 font-semibold border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-quiby-panel/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Info Box */}
      <div className="p-3 rounded-xl bg-quiby-panel/50 border border-quiby-border/70 text-xs text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between font-medium text-slate-300">
          <span>quiby. Season 6</span>
          <span className="text-emerald-400 font-mono text-[10px]">v6.0.0</span>
        </div>
        <p className="text-[11px] text-slate-400">
          Minecraft 1.21.1 NeoForge + Create Aeronautics
        </p>
      </div>
    </aside>
  );
};
