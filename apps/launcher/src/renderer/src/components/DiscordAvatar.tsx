import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import type { AuthSession } from '@quiby/shared';

export function DiscordAvatar({ user, className }: { user: AuthSession['user']; className?: string }) {
  const url = user.avatar && /^\d+$/.test(user.discordId)
    ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=128`
    : user.avatarUrl?.startsWith('https://cdn.discordapp.com/') ? user.avatarUrl : undefined;
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return url && !failed
    ? <img src={url} alt="Аватар Discord" className={className} onError={() => setFailed(true)} />
    : <span className={`${className || ''} inline-flex items-center justify-center bg-violet-400/15 text-violet-200`} aria-label="Профиль Discord"><User size={24} /></span>;
}
