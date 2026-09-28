import type { LauncherSettings } from '@quiby/shared';

export const BUILD_PROFILES = [
  {
    id: 'visual',
    name: 'Visual',
    profile: 'full',
    ramGb: 8,
    tagline: 'Максимум графики и атмосферы.',
    description: 'Все возможности Standard, больше клиентских дополнений и улучшенная графика: анимации, освещение и шейдеры.',
    detail: 'Для тех, кто хочет красивую картинку и готов выделить игре больше ресурсов.',
    features: ['Всё из Standard', 'Fresh Animations', 'Complementary Unbound'],
  },
  {
    id: 'standard',
    name: 'Standard',
    profile: 'optimal',
    ramGb: 8,
    tagline: 'Рекомендуем большинству игроков.',
    description: 'Standard — лучший выбор для большинства игроков: баланс производительности и удобства, все основные возможности сервера без тяжёлых графических дополнений.',
    detail: 'Комфортный вариант для повседневной игры.',
    features: ['Основная сборка сервера', 'Одобренные клиентские моды', 'Без графических дополнений'],
  },
  {
    id: 'draft',
    name: 'Draft',
    profile: 'clean',
    ramGb: 4,
    tagline: 'Только главное.',
    description: 'Основная серверная сборка. Пользовательские клиентские моды выключены.',
    detail: 'Чистая отправная точка для своего мира.',
    features: [
      'Основная сборка сервера',
      'Клиентские дополнения выключены',
      'Минимум дополнительных настроек',
    ],
  },
] as const;
export type BuildId = (typeof BUILD_PROFILES)[number]['id'];
export const selectedBuild = (settings: Pick<LauncherSettings, 'modpackProfile'>) =>
  BUILD_PROFILES.find((build) => build.profile === settings.modpackProfile) || BUILD_PROFILES[1];

export function applyBuildToMods<
  T extends { safetyStatus?: string; categories?: string[]; enabled: boolean },
>(mods: T[], profile: LauncherSettings['modpackProfile']): T[] {
  return mods.map((mod) => ({
    ...mod,
    enabled:
      mod.safetyStatus === 'approved' &&
      profile !== 'clean' &&
      (profile === 'full' || !mod.categories?.includes('graphics')),
  }));
}
