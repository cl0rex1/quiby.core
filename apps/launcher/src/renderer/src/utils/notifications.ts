export interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  timestamp: number;
  read: boolean;
  newsRevision?: string;
  modInfo?: {
    name?: string;
    filename?: string;
    iconUrl?: string;
    status?: 'approved' | 'pending' | 'blocked' | 'unverified';
    hashSha1?: string;
    description?: string;
    reviewStage?: 'uploading' | 'queued' | 'pending' | 'approved' | 'rejected' | 'error';
  };
}

/** One evolving card per file; unchanged polling must not reorder or mark it unread. */
export function upsertNotification(items: NotificationItem[], incoming: NotificationItem): NotificationItem[] {
  const previous = items.find(item => item.id === incoming.id);
  if (previous && previous.newsRevision === incoming.newsRevision && previous.title === incoming.title && previous.message === incoming.message && previous.type === incoming.type
    && JSON.stringify(previous.modInfo) === JSON.stringify(incoming.modInfo)) return items;
  return [incoming, ...items.filter(item => item.id !== incoming.id)].slice(0, 100);
}

/** Receipts survive clearing the inbox; a new decision can still notify again. */
export function notificationRevision(item: NotificationItem): string {
  // Local upload messages and server wording can differ for the same stage.
  if (item.modInfo?.reviewStage) return item.modInfo.reviewStage;
  return JSON.stringify([item.title, item.message, item.type, item.newsRevision, item.modInfo?.reviewStage, item.modInfo?.status]);
}
