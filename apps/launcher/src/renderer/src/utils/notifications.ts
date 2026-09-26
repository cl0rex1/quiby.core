export interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  timestamp: number;
  read: boolean;
  modInfo?: {
    name?: string;
    filename?: string;
    iconUrl?: string;
    status?: 'approved' | 'pending' | 'blocked' | 'unverified';
    hashSha1?: string;
    description?: string;
  };
}
