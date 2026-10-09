import { Check, Loader2, X } from 'lucide-react';
import type { NotificationItem } from '../utils/notifications';

export function ReviewTimeline({ info }: { info: NonNullable<NotificationItem['modInfo']> }) {
  const stage = info.reviewStage || (info.status === 'blocked' ? 'rejected' : info.status === 'approved' ? 'approved' : 'pending');
  const current = { uploading: 0, queued: 1, pending: 2, approved: 3, rejected: 3, error: 0 }[stage];
  const terminal = ['approved', 'rejected', 'error'].includes(stage);
  const labels = ['Отправка', 'Доставка', 'Рассмотрение', stage === 'rejected' ? 'Отклонено' : stage === 'approved' ? 'Одобрено' : 'Решение'];
  return <ol className={`review-timeline is-${stage}`} aria-label="Статус заявки">
    {labels.map((label, index) => <li key={index} className={index < current || (index === current && stage === 'approved') ? 'is-complete' : index === current ? 'is-current' : ''} aria-current={index === current ? 'step' : undefined}>
      <span className="review-step-dot">{index < current || (index === current && stage === 'approved') ? <Check size={15}/> : index === current && ['error', 'rejected'].includes(stage) ? <X size={15}/> : index === current && !terminal ? <Loader2 className="loading-spinner" size={15}/> : index + 1}</span>
      <span>{index === 0 && stage === 'error' ? 'Не отправлено' : label}</span>
    </li>)}
  </ol>;
}
