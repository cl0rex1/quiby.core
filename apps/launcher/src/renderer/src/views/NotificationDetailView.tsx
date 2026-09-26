import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Copy, Mail, Newspaper, Trash2 } from 'lucide-react';
import { NewsArticle } from '@quiby/shared';
import { NotificationItem } from '../components/NotificationsModal';

interface NotificationDetailViewProps {
  news: NewsArticle[];
  newsAvailable: boolean;
  notification: NotificationItem | null;
  onDeleteNotification: (id: string) => void;
  onNavigateToMods: () => void;
}

export const NotificationDetailView: React.FC<NotificationDetailViewProps> = ({ news, newsAvailable, notification, onDeleteNotification, onNavigateToMods }) => {
  const [tab, setTab] = useState<'news' | 'notifications'>(notification ? 'notifications' : 'news');
  const [copyState, setCopyState] = useState('');

  useEffect(() => {
    if (notification) setTab('notifications');
  }, [notification?.id]);

  useEffect(() => { setCopyState(''); }, [notification?.id]);

  const copyNotification = async () => {
    if (!notification) return;
    const lines = [notification.title, notification.message, notification.modInfo?.name && `Мод: ${notification.modInfo.name}`, notification.modInfo?.filename && `Файл: ${notification.modInfo.filename}`, notification.modInfo?.hashSha1 && `SHA-1: ${notification.modInfo.hashSha1}`];
    try {
      await navigator.clipboard.writeText(lines.filter(Boolean).join('\n'));
      setCopyState('Скопировано');
    } catch {
      setCopyState('Не удалось скопировать');
    }
  };

  const dateLabel = (date: string | number) => {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? String(date) : parsed.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="message-hub view-enter flex-1 h-full overflow-y-auto p-6 md:p-8">
      <header className="message-hub-header page-heading">
        <div><p className="home-kicker">QUIBY / СВЯЗЬ</p><h1>Новости и уведомления</h1></div>
        <div className="message-hub-tabs" role="tablist" aria-label="Разделы сообщений">
          <button type="button" role="tab" aria-selected={tab === 'news'} onClick={() => setTab('news')}><Newspaper size={15} /> Новости</button>
          <button type="button" role="tab" aria-selected={tab === 'notifications'} onClick={() => setTab('notifications')}><Mail size={15} /> Уведомления</button>
        </div>
      </header>

      {tab === 'news' ? (
        <div className="message-hub-list">
          {news.length === 0 ? <div className="message-empty">{newsAvailable ? 'Новостей пока нет. Опубликованные записи сервера появятся здесь.' : 'Не удалось загрузить новости. Проверьте соединение с API.'}</div> : news.map((article) => (
            <article key={article.id} className="message-article">
              <div className="message-meta"><span>{article.tag}</span><time dateTime={article.date}>{dateLabel(article.date)}</time><span>{article.author}</span></div>
              <h2>{article.title}</h2>
              <p>{article.excerpt}</p>
              {article.content && article.content !== article.excerpt && <details><summary>Читать полностью</summary><p>{article.content}</p></details>}
            </article>
          ))}
        </div>
      ) : notification ? (
        <article className="message-article message-detail">
          <div className="message-meta"><span>{notification.type}</span><time dateTime={new Date(notification.timestamp).toISOString()}>{dateLabel(notification.timestamp)}</time></div>
          <div className="message-detail-title"><h2>{notification.title}</h2><button type="button" onClick={copyNotification} title="Скопировать уведомление" aria-label="Скопировать уведомление"><Copy size={17} /></button><button type="button" onClick={() => onDeleteNotification(notification.id)} title="Удалить уведомление"><Trash2 size={17} /></button></div>
          {copyState && <span role="status">{copyState}</span>}
          {notification.message && <p>{notification.message}</p>}
          {notification.modInfo && (
            <dl className="message-mod-info">
              {notification.modInfo.name && <div><dt>МОД</dt><dd>{notification.modInfo.name}</dd></div>}
              {notification.modInfo.filename && <div><dt>ФАЙЛ</dt><dd>{notification.modInfo.filename}</dd></div>}
              {notification.modInfo.hashSha1 && <div><dt>SHA-1</dt><dd>{notification.modInfo.hashSha1}</dd></div>}
            </dl>
          )}
          <button type="button" onClick={onNavigateToMods} className="message-open-mods">Открыть контент <ArrowUpRight size={15} /></button>
        </article>
      ) : <div className="message-empty">Выберите уведомление в списке слева.</div>}
    </div>
  );
};
