import React, { useState, useEffect } from 'react';
import { 
  Newspaper,
  Mail,
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Trash2, 
  FolderGit2, 
  ShieldCheck,
  Clock,
  FileCode,
  Hash,
  Sparkles,
  Calendar,
  Layers,
  Zap,
  Tag,
  Radio
} from 'lucide-react';
import { NotificationItem } from '../components/NotificationsModal';

interface NotificationDetailViewProps {
  notification: NotificationItem | null;
  onDeleteNotification: (id: string) => void;
  onNavigateToMods: () => void;
}

interface NewsArticle {
  id: string;
  badge: string;
  badgeColor: string;
  title: string;
  date: string;
  author: string;
  summary: string;
  highlights: { title: string; desc: string }[];
  versionTag: string;
}

const SEASON_NEWS_ARTICLES: NewsArticle[] = [
  {
    id: 'patch-6-2-0',
    badge: 'ПАТЧ-НОУТ • 6.2.0',
    badgeColor: 'border-[#d4975c]/40 bg-[#d4975c]/15 text-[#eab683]',
    title: 'Сезон VI: Запуск Создания и Аэронавтики',
    date: '20 сентября 2026',
    author: 'quiby.team',
    summary: 'Глобальное индустриальное обновление quiby.core. Мы добавили Create Aeronautics — теперь каждый игрок и фракция могут конструировать дирижабли, летающие корабли и грузовые платформы с кинематической физикой.',
    highlights: [
      {
        title: 'Create 6.0 Кинематика',
        desc: 'Новые подшипники вращения, цепные передачи, улучшенные стрелочные стрелки и скоростные роторные двигатели.'
      },
      {
        title: 'Управляемые Дирижабли',
        desc: 'Пропеллеры, горелки подъемной силы, штурвалы и бортовые навигационные приборы.'
      },
      {
        title: 'Оптимизация Рендеринга',
        desc: 'Sodium Core, FerriteCore и Entity Culling обеспечивают 90+ FPS даже при пролете над сложными фабриками.'
      }
    ],
    versionTag: 'Minecraft 1.21.1 NeoForge',
  },
  {
    id: 'patch-6-2-1',
    badge: 'ОБНОВЛЕНИЕ • 6.2.1',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    title: 'Патч 6.2.1: Оптимизация сетевого стека и акустики',
    date: '22 сентября 2026',
    author: 'quiby.engine',
    summary: 'Устранены микрофризы при стыковке дирижаблей с железнодорожными станциями. Обновлен протокол Fast-Connect и калибровка звукового движка.',
    highlights: [
      {
        title: 'Сетевой протокол Fast-Connect',
        desc: 'Мгновенное подключение к серверу play.quiby.fun без задержек на сканирование локальной сети.'
      },
      {
        title: 'Sound Physics Remastered',
        desc: 'Реалистичная 3D реверберация внутри замкнутых кают дирижаблей и приглушение звука через обшивку.'
      }
    ],
    versionTag: 'Hotfix v6.2.1',
  },
  {
    id: 'event-regatta',
    badge: 'СОБЫТИЕ • СКОРО',
    badgeColor: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
    title: 'Кубок Инженеров — Первая Воздушная Регата',
    date: '27 сентября 2026 • 19:00 МСК',
    author: 'quiby.events',
    summary: 'В субботу на сервере стартует первая открытая гонка на дирижаблях по маршруту «Вулканский Хребет — Небесная Гавань». Приглашаются как соло-пилоты, так и фракционные экипажи.',
    highlights: [
      {
        title: 'Призовой фонд',
        desc: 'Эксклюзивные латунные паруса, редкие двигатели Create и памятный трофей Мастера Инженерии.'
      },
      {
        title: 'Регистрация',
        desc: 'Подать заявку на участие можно в канале Discord сервера до пятницы 23:59.'
      }
    ],
    versionTag: 'Season VI Event',
  },
  {
    id: 'chibi-live-feature',
    badge: 'ТЕХНОЛОГИЯ • ДВИЖОК',
    badgeColor: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
    title: 'Движок Chibi Live: Обновление Гардероба',
    date: '18 сентября 2026',
    author: 'quiby.ui',
    summary: 'Запущен новый модуль отрисовки скинов Chibi Live с поддержкой геометрий Alex (3px slim) и Steve (4px classic), мягким контуром и динамической кинематикой шага.',
    highlights: [
      {
        title: 'Умная обводка пикселей',
        desc: 'Алгоритм mlEdgeColor сохраняет гармонию теплых оттенков кожи и одежды без грубых черных линий.'
      },
      {
        title: 'Локальное хранилище скинов',
        desc: 'Быстрое переключение между 6 пресетами персонажа без необходимости перезапуска игры.'
      }
    ],
    versionTag: 'Client Core v2.0',
  },
];

export const NotificationDetailView: React.FC<NotificationDetailViewProps> = ({
  notification,
  onDeleteNotification,
  onNavigateToMods,
}) => {
  const [hubTab, setHubTab] = useState<'news' | 'notifications'>(
    notification ? 'notifications' : 'news'
  );

  // Auto-switch to notifications tab if user explicitly selected a notification
  useEffect(() => {
    if (notification) {
      setHubTab('notifications');
    }
  }, [notification?.id]);

  const type = notification?.type || 'info';
  const isSuccess = type === 'success';
  const isError = type === 'error';
  const isWarning = type === 'warning';

  const formatFullTime = (ts: number) => {
    return new Date(ts).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex-1 h-full flex flex-col overflow-y-auto p-6 md:p-8 max-w-5xl select-none animate-in fade-in duration-200 space-y-6">
      {/* Top Header & Segmented Tab Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-surface-border shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-[#d4975c]/15 border border-[#d4975c]/30 text-[10px] font-mono font-bold text-[#eab683] flex items-center gap-1">
              <Sparkles size={11} />
              <span>QUIBY. HUB</span>
            </span>
            <span className="text-xs text-zinc-500 font-mono">• Season VI</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Почта и Новости quiby.
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Сводка обновлений сборки, патч-ноуты и статус модерации модов
          </p>
        </div>

        {/* Segmented Switcher */}
        <div className="inline-flex p-1 rounded-2xl bg-surface-900 border border-surface-border shadow-inner gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setHubTab('news')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer press-feedback ${
              hubTab === 'news'
                ? 'bg-surface-800 text-white border border-[#d4975c]/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Newspaper size={14} className={hubTab === 'news' ? 'text-[#d4975c]' : ''} />
            <span>Новости сборки</span>
          </button>

          <button
            type="button"
            onClick={() => setHubTab('notifications')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer press-feedback relative ${
              hubTab === 'notifications'
                ? 'bg-surface-800 text-white border border-[#d4975c]/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mail size={14} className={hubTab === 'notifications' ? 'text-[#d4975c]' : ''} />
            <span>Уведомления</span>
            {notification && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4975c]" />
            )}
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. NEWS TAB: RICH ARTICLES LIST                                       */}
      {/* ===================================================================== */}
      {hubTab === 'news' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {SEASON_NEWS_ARTICLES.map((article) => (
            <article
              key={article.id}
              className="p-5 md:p-6 rounded-2xl bg-surface-900 border border-surface-border hover:border-surface-borderLight transition-all duration-200 shadow-sm space-y-4"
            >
              {/* Meta row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider ${article.badgeColor}`}>
                    {article.badge}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                    <Calendar size={12} className="text-zinc-500" />
                    {article.date}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-500">
                    @{article.author}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-surface-850 border border-surface-border text-[10px] font-mono text-zinc-400">
                    {article.versionTag}
                  </span>
                </div>
              </div>

              {/* Title & Summary */}
              <div>
                <h2 className="text-base md:text-lg font-bold text-white tracking-tight leading-snug">
                  {article.title}
                </h2>
                <p className="text-xs text-zinc-300 leading-relaxed mt-1.5">
                  {article.summary}
                </p>
              </div>

              {/* Highlights List */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-3 border-t border-surface-border/60">
                {article.highlights.map((h, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-surface-850/80 border border-surface-border/60 space-y-1"
                  >
                    <p className="text-xs font-semibold text-[#eab683] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d4975c] inline-block shrink-0" />
                      {h.title}
                    </p>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      {h.desc}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. NOTIFICATIONS TAB: VERDICTS & DETAILS                              */}
      {/* ===================================================================== */}
      {hubTab === 'notifications' && (
        <div className="flex-1 flex flex-col animate-in fade-in duration-200">
          {!notification ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center select-none bg-surface-900/50 border border-surface-border rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-surface-850 border border-surface-border flex items-center justify-center text-[#d4975c] mb-3 shadow-md">
                <Mail size={24} />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                Нет выбранного уведомления
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                Выберите входящее сообщение из списка слева для подробного просмотра деталей вердикта модерации, SHA-1 хэша или логов
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Notification Header Card */}
              <div className="p-5 rounded-2xl bg-surface-900 border border-surface-border flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${
                      isSuccess
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : isError
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                        : isWarning
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                    }`}
                  >
                    {isSuccess ? (
                      <CheckCircle2 size={22} />
                    ) : isError ? (
                      <AlertCircle size={22} />
                    ) : isWarning ? (
                      <Clock size={22} />
                    ) : (
                      <Info size={22} />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          isSuccess
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isError
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : isWarning
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        }`}
                      >
                        {isSuccess ? 'Одобрено' : isError ? 'Отклонено' : isWarning ? 'На рассмотрении' : 'Система'}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono flex items-center gap-1">
                        <Clock size={12} />
                        {formatFullTime(notification.timestamp)}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-white">
                      {notification.title}
                    </h2>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => onDeleteNotification(notification.id)}
                  className="h-8 px-3 rounded-lg bg-surface-850 hover:bg-rose-950/60 border border-surface-border hover:border-rose-500/40 text-xs font-semibold text-zinc-300 hover:text-rose-300 transition-all flex items-center gap-1.5 cursor-pointer press-feedback shrink-0"
                  title="Удалить уведомление"
                >
                  <Trash2 size={13} />
                  <span>Удалить</span>
                </button>
              </div>

              {/* Mod Specific Meta Card if available */}
              {notification.modInfo && (
                <div className="p-5 rounded-2xl bg-surface-900 border border-surface-border space-y-4">
                  <div className="flex items-center gap-3.5">
                    {notification.modInfo.iconUrl ? (
                      <img
                        src={notification.modInfo.iconUrl}
                        alt={notification.modInfo.name || 'Mod'}
                        className="w-12 h-12 rounded-xl object-cover border border-surface-border shrink-0 bg-surface-850"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-surface-850 border border-surface-border flex items-center justify-center text-[#d4975c] shrink-0 font-mono font-bold text-sm">
                        {notification.modInfo.name ? notification.modInfo.name.substring(0, 2).toUpperCase() : <FileCode size={20} />}
                      </div>
                    )}

                    <div className="space-y-0.5 truncate flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white truncate">
                          {notification.modInfo.name || 'Кастомный мод'}
                        </h3>
                        {notification.modInfo.filename && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-850 border border-surface-border text-zinc-400">
                            {notification.modInfo.filename}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 truncate">
                        {notification.modInfo.description || 'Мод добавлен в клиентскую сборку Quiby.'}
                      </p>
                    </div>
                  </div>

                  {/* Technical Verification Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-surface-border font-mono text-[11px]">
                    <div className="p-2.5 rounded-xl bg-surface-850 border border-surface-border flex items-center gap-2 text-zinc-300">
                      <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                      <span className="truncate">Антивирус: чисто (0 угроз)</span>
                    </div>
                    {notification.modInfo.hashSha1 && (
                      <div className="p-2.5 rounded-xl bg-surface-850 border border-surface-border flex items-center gap-2 text-zinc-300 truncate">
                        <Hash size={14} className="text-sky-400 shrink-0" />
                        <span className="truncate">SHA-1: {notification.modInfo.hashSha1.substring(0, 16)}...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Message Paragraph */}
              {notification.message && (
                <div className="p-5 rounded-2xl bg-surface-900 border border-surface-border">
                  <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                    {notification.message}
                  </p>
                </div>
              )}

              {/* Guidance Box */}
              <div className="p-4 rounded-xl bg-surface-850 border border-surface-border flex items-start gap-3">
                <Info size={16} className="text-[#d4975c] shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-400 leading-relaxed">
                  Модерация клиентских модов происходит через защищенный канал Discord. Ответ по вайтлисту синхронизируется с лаунчером в реальном времени.
                </div>
              </div>

              {/* Bottom Shortcut */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={onNavigateToMods}
                  className="h-10 px-5 rounded-xl bg-surface-850 hover:bg-surface-800 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer press-feedback border border-[#d4975c]/40 hover:border-[#d4975c]"
                >
                  <FolderGit2 size={15} className="text-[#d4975c]" />
                  <span>Перейти во вкладку «Контент»</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
