import React, { useState } from 'react';
import { Search, Copy, Check, Sparkles, TrendingUp, MoreHorizontal, ShieldCheck, ExternalLink } from 'lucide-react';
import { ServerStatus } from '@quiby/shared';

interface RightSidebarProps {
  serverStatus: ServerStatus | null;
  serverIp: string;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ serverStatus, serverIp }) => {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCopyIp = () => {
    navigator.clipboard.writeText(serverIp || 'play.quiby.fun:25565');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const trendingTopics = [
    { category: 'Сборка S6 • В тренде', title: '#CreateAeronautics', count: '1.4K игроков' },
    { category: 'Технологии • В тренде', title: 'Дирижабли и физика', count: '890 запусков' },
    { category: 'Оптимизация • В тренде', title: 'Minecraft 1.21.1 NeoForge', count: '2.1K игроков' },
    { category: 'Графика • В тренде', title: 'Шейдеры Oculus & Iris', count: '750 игроков' },
  ];

  const teamMembers = [
    {
      name: 'quiby. Team',
      handle: 'quiby_mc',
      avatar: 'https://api.dicebear.com/8.x/bottts/svg?seed=quiby',
      role: 'Официальный сервер',
      verified: true,
    },
    {
      name: 'Development',
      handle: 'quiby_dev',
      avatar: 'https://api.dicebear.com/8.x/bottts/svg?seed=dev',
      role: 'Разработчики сборки',
      verified: true,
    },
    {
      name: 'Community S6',
      handle: 'quiby_players',
      avatar: 'https://api.dicebear.com/8.x/bottts/svg?seed=community',
      role: 'Игроки и вайтлист',
      verified: false,
    },
  ];

  return (
    <aside className="w-80 bg-black border-l border-x-border p-4 space-y-4 overflow-y-auto hidden lg:flex flex-col select-none shrink-0">
      {/* 1. X-Style Pill Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-3 text-x-textMuted" size={16} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по сборке и новостям"
          className="w-full bg-x-surface hover:bg-x-surfaceHover focus:bg-black focus:border-x-purple border border-transparent rounded-full pl-11 pr-4 py-2.5 text-sm text-x-text placeholder:text-x-textMuted focus:outline-none transition-all"
        />
      </div>

      {/* 2. Premium / Server Pass Card (like 'Подпишитесь на Premium') */}
      <div className="bg-x-surface rounded-2xl p-4 border border-x-border/60 space-y-3 shadow-x-card">
        <div className="space-y-1">
          <h3 className="font-extrabold text-base text-white">Сервер quiby. Season 6</h3>
          <p className="text-xs text-x-textMuted leading-relaxed">
            Официальный сервер с дирижаблями Create Aeronautics на Minecraft 1.21.1 NeoForge.
          </p>
        </div>

        <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-black/60 border border-x-border text-xs">
          <span className="text-x-textMuted font-mono">{serverIp || 'play.quiby.fun'}</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {serverStatus?.online ? `${serverStatus.players.online}/${serverStatus.players.max}` : '1.21.1'}
          </span>
        </div>

        {/* Solid White Pill Action Button (like 'Подписаться') */}
        <button
          onClick={handleCopyIp}
          className="w-full py-2.5 rounded-full bg-white hover:bg-neutral-200 text-black font-extrabold text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
        >
          {copied ? (
            <>
              <Check size={16} className="text-emerald-600" />
              <span>IP скопирован!</span>
            </>
          ) : (
            <>
              <Copy size={16} />
              <span>Скопировать IP сервера</span>
            </>
          )}
        </button>
      </div>

      {/* 3. 'Что происходит' / 'Актуальные темы' (Trending list) */}
      <div className="bg-x-surface rounded-2xl p-4 border border-x-border/60 space-y-3 shadow-x-card">
        <h3 className="font-extrabold text-base text-white">Что происходит</h3>

        <div className="space-y-3.5">
          {trendingTopics.map((topic, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between group cursor-pointer hover:bg-white/[0.03] -mx-2 px-2 py-1 rounded-xl transition-colors"
            >
              <div className="space-y-0.5">
                <div className="text-[11px] text-x-textMuted">{topic.category}</div>
                <div className="text-sm font-bold text-white group-hover:text-x-purpleLight transition-colors">
                  {topic.title}
                </div>
                <div className="text-[11px] text-x-textDim">{topic.count}</div>
              </div>
              <button className="text-x-textDim hover:text-white p-1 rounded-full hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all">
                <MoreHorizontal size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. 'Кого читать' / 'Команда и Сообщество' */}
      <div className="bg-x-surface rounded-2xl p-4 border border-x-border/60 space-y-3 shadow-x-card">
        <h3 className="font-extrabold text-base text-white">Команда и каналы</h3>

        <div className="space-y-3">
          {teamMembers.map((member, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 truncate">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-9 h-9 rounded-full border border-x-border shrink-0"
                />
                <div className="truncate">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-sm text-white truncate hover:underline cursor-pointer">
                      {member.name}
                    </span>
                    {member.verified && (
                      <span className="text-x-purpleLight shrink-0">
                        <ShieldCheck size={14} />
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-x-textMuted truncate">@{member.handle}</div>
                </div>
              </div>

              {/* White Pill button like 'Читать' in the photo */}
              <button
                onClick={() => window.open('https://discord.gg', '_blank')}
                className="px-3.5 py-1.5 rounded-full bg-white hover:bg-neutral-200 text-black font-bold text-xs tracking-wide transition-all shrink-0 active:scale-95"
              >
                Discord
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Links */}
      <div className="px-2 text-[11px] text-x-textDim space-x-2 leading-relaxed">
        <span>quiby. Season 6</span>
        <span>•</span>
        <span>NeoForge 1.21.1</span>
        <span>•</span>
        <span>Create Aeronautics</span>
        <div className="mt-1">© 2026 quiby. core</div>
      </div>
    </aside>
  );
};
