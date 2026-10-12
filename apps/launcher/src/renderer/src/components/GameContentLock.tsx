import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Lock } from 'lucide-react';

export function GameContentLock({ locked, title, children, className = '' }: {
  locked: boolean; title: string; children: ReactNode; className?: string;
}) {
  const content = useRef<HTMLDivElement>(null);
  const notice = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!content.current) return;
    const hadFocus = content.current.contains(document.activeElement);
    content.current.inert = locked;
    if (locked && hadFocus) notice.current?.focus();
  }, [locked]);
  return <div className={`game-content-lock ${className} ${locked ? 'is-locked' : ''}`}>
    <div ref={content} className="game-content-lock-body">{children}</div>
    {locked && <div ref={notice} className="game-content-lock-notice" role="status" tabIndex={-1}>
      <span className="game-lock-icon"><Lock size={23}/></span><h2>{title}</h2>
      <p>Закройте Minecraft, чтобы изменить этот раздел.</p>
    </div>}
  </div>;
}
