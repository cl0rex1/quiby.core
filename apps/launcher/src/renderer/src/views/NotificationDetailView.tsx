import { ReviewTimeline } from '../components/ReviewTimeline';
import { Disclosure } from '../components/Disclosure';
import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Copy, Download, Loader2, Mail, Newspaper, Trash2 } from 'lucide-react';
import { NewsArticle } from '@quiby/shared';
import type { NotificationItem } from '../utils/notifications';

interface NotificationDetailViewProps {
  news: NewsArticle[];
  newsAvailable: boolean;
  newsLoading?: boolean;
  notification: NotificationItem | null;
  onDeleteNotification: (id: string) => void;
  onNavigateToMods: () => void;
  onToast: (title: string, type: 'success' | 'error') => void;
}

export const NotificationDetailView: React.FC<NotificationDetailViewProps> = ({ news, newsAvailable, newsLoading, notification, onDeleteNotification, onNavigateToMods, onToast }) => {
  const [tab, setTab] = useState<'news' | 'notifications'>(notification ? 'notifications' : 'news');

  useEffect(() => {
    if (notification) setTab('notifications');
  }, [notification?.id]);

  const copyNotification = async () => {
    if (!notification) return;
    const lines = [notification.title, notification.message, notification.modInfo?.name && `Мод: ${notification.modInfo.name}`, notification.modInfo?.filename && `Файл: ${notification.modInfo.filename}`, notification.modInfo?.hashSha1 && `SHA-1: ${notification.modInfo.hashSha1}`];
    try {
      await navigator.clipboard.writeText(lines.filter(Boolean).join('\n'));
      onToast('Уведомление скопировано', 'success');
    } catch {
      onToast('Не удалось скопировать уведомление', 'error');
    }
  };
  const downloadCrashLog = async () => {
    if (!notification?.message) return;
    try {
      if (await window.quibyApi.exportCrashLog(notification.message)) onToast('Лог сохранён', 'success');
    } catch { onToast('Не удалось сохранить лог', 'error'); }
  };

  const dateLabel = (date: string | number) => {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? String(date) : parsed.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="message-hub view-enter">
        <div className="section-tabs message-top-tabs" role="tablist" aria-label="Разделы сообщений">
          <button type="button" role="tab" aria-selected={tab === 'news'} onClick={() => setTab('news')}><Newspaper size={15} /> Новости</button>
          <button type="button" role="tab" aria-selected={tab === 'notifications'} onClick={() => setTab('notifications')}><Mail size={15} /> Уведомления</button>
        </div>
      <div className="message-hub-body" key={tab}>
      {tab === 'news' ? (
        <div className="message-hub-list">
          {newsLoading ? <div className="message-empty" role="status"><Loader2 className="loading-spinner" size={22}/>Загружаем новости…</div> : news.length === 0 ? <div className="message-empty">{newsAvailable ? 'Новостей пока нет. Опубликованные записи сервера появятся здесь.' : 'Не удалось загрузить новости. Проверьте соединение с API.'}</div> : news.map((article) => (
            <article key={article.id} className="message-article">
              <div className="message-meta"><span>{article.tag}</span><time dateTime={article.date}>{dateLabel(article.date)}</time><span>{article.author}</span></div>
              <h2>{article.title}</h2>
              <p>{article.excerpt}</p>
              {article.content && article.content !== article.excerpt && <Disclosure title="Читать полностью"><p>{article.content}</p></Disclosure>}
            </article>
          ))}
        </div>
      ) : notification ? (
        <article className="message-article message-detail">
          <div className="message-meta"><span>{{ success: 'Готово', info: 'Информация', warning: 'Внимание', error: 'Ошибка' }[notification.type || 'info']}</span><time dateTime={new Date(notification.timestamp).toISOString()}>{dateLabel(notification.timestamp)}</time></div>
          <div className="message-detail-title"><h2>{notification.title}</h2><div className="message-actions">{notification.title === 'Сбой Minecraft' && notification.message && <button className="message-copy" type="button" onClick={() => void downloadCrashLog()} title="Сохранить полный лог"><Download size={15} /><span>Скачать лог</span></button>}<button className="message-copy" type="button" onClick={copyNotification} title="Скопировать уведомление"><Copy size={15} /><span>Копировать</span></button><button type="button" className="delete-action" onClick={() => onDeleteNotification(notification.id)} title="Удалить уведомление" aria-label="Удалить уведомление"><Trash2 size={16} /></button></div></div>
          {notification.modInfo?.reviewStage && <ReviewTimeline info={notification.modInfo}/>}
          {notification.message && <p>{notification.message}</p>}
          {notification.modInfo && (
            <dl className="message-mod-info">
              {notification.modInfo.name && <div><dt>МОД</dt><dd>{notification.modInfo.name}</dd></div>}
              {notification.modInfo.filename && <div><dt>ФАЙЛ</dt><dd>{notification.modInfo.filename}</dd></div>}

            </dl>
          )}
          {notification.modInfo && <button type="button" onClick={onNavigateToMods} className="message-open-mods">Открыть контент <ArrowUpRight size={15} /></button>}
        </article>
      ) : <div className="message-empty">Выберите уведомление в списке слева.</div>}
      </div>
    </div>
  );
};
