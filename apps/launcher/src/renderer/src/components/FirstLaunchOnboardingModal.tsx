import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { LauncherSettings } from '@quiby/shared';

interface FirstLaunchOnboardingModalProps {
  isOpen: boolean;
  settings: LauncherSettings;
  onClose: () => void;
  onApplyPreset: (updatedSettings: Partial<LauncherSettings>, profile: 'clean' | 'optimal' | 'full') => void;
}

const memoryOptions = [
  { id: 'potato' as const, value: 4, note: 'Минимум для сборки' },
  { id: 'optimal' as const, value: 8, note: 'Рекомендуемое значение' },
  { id: 'ultra' as const, value: 12, note: 'Для систем с запасом памяти' },
];

const modOptions = [
  { id: 'clean' as const, title: 'Без клиентских модов', note: 'Только серверная сборка' },
  { id: 'optimal' as const, title: 'Рекомендуемые', note: 'Одобренные моды без графических дополнений' },
  { id: 'full' as const, title: 'Все одобренные', note: 'Включить все одобренные клиентские моды' },
];

export const FirstLaunchOnboardingModal: React.FC<FirstLaunchOnboardingModalProps> = ({ isOpen, settings, onClose, onApplyPreset }) => {
  const [memory, setMemory] = useState<'potato' | 'optimal' | 'ultra'>(settings.graphicsPreset || 'optimal');
  const [profile, setProfile] = useState<'clean' | 'optimal' | 'full'>(settings.modpackProfile || 'optimal');

  if (!isOpen) return null;

  const apply = () => {
    const ramMaxMb = memoryOptions.find((option) => option.id === memory)!.value * 1024;
    onApplyPreset({ ramMaxMb, ramMinMb: Math.min(ramMaxMb, 4096), graphicsPreset: memory, modpackProfile: profile }, profile);
    localStorage.setItem('quiby_onboarded', 'true');
    onClose();
  };

  return (
    <div className="onboarding-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <section className="onboarding-panel" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <p className="home-kicker">QUIBY / ПЕРВЫЙ ЗАПУСК</p>
        <h2 id="onboarding-title">Настройка игры</h2>
        <p className="onboarding-copy">Выберите память для Minecraft и правило для клиентских модов. Официальная сборка обновится перед запуском.</p>

        <fieldset className="onboarding-group">
          <legend>ПАМЯТЬ ДЛЯ ИГРЫ</legend>
          <div className="onboarding-memory">
            {memoryOptions.map((option) => (
              <button key={option.id} type="button" aria-pressed={memory === option.id} onClick={() => setMemory(option.id)} className={memory === option.id ? 'is-selected' : ''}>
                <strong>{option.value} ГБ</strong><small>{option.note}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="onboarding-group">
          <legend>КЛИЕНТСКИЕ МОДЫ</legend>
          <div className="onboarding-mods">
            {modOptions.map((option) => (
              <button key={option.id} type="button" aria-pressed={profile === option.id} onClick={() => setProfile(option.id)} className={profile === option.id ? 'is-selected' : ''}>
                <span><strong>{option.title}</strong><small>{option.note}</small></span>
                {profile === option.id && <Check size={16} />}
              </button>
            ))}
          </div>
        </fieldset>

        <button type="button" onClick={apply} className="launcher-primary-button onboarding-apply">Сохранить и продолжить <ArrowRight size={17} /></button>
      </section>
    </div>
  );
};
