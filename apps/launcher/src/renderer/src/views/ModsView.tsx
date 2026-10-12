import { useFileDrop } from '../utils/useFileDrop';
import React, { useState, useRef, useEffect } from 'react';
import {
  Package,
  Loader2,
  Palette,
  Upload,
  Layers,
  Sun,
  Image as ImageIcon,
  SlidersHorizontal,
  ToggleRight
} from 'lucide-react';
import { canDisableBundledMod } from '../../../shared/modpackProfiles';
import { ModpackManifest, AuthSession } from '@quiby/shared';
import { resolveModMetadata, MOD_FILTERS, ModFilter, matchesModFilter } from '../utils/knownMods';
import { ModWhitelistModal } from '../components/ModWhitelistModal';
import { SchematicsExplorer } from '../components/SchematicsExplorer';
import { ShadersExplorer } from '../components/ShadersExplorer';
import { ResourcePacksExplorer } from '../components/ResourcePacksExplorer';
import { ScreenshotGallery } from '../components/ScreenshotGallery';
import type { NotificationItem } from '../utils/notifications';
import { ContentToolbar, ContentSearch, useContentView } from '../components/ContentToolbar';
import { ContentSelectionDock } from '../components/ContentSelectionDock';
import { allVisibleSelected, toggleVisibleSelection } from '../utils/contentSelection';
import { GameContentLock } from '../components/GameContentLock';
import { ContentFileCard } from '../components/ContentFileCard';
import { SelectMenu } from '../components/SelectMenu';
import { useFileRemoval } from '../utils/useFileRemoval';

export interface CustomModItem {
  id: string;
  name: string;
  filename: string;
  size: number;
  enabled: boolean;
  hashSha1?: string;
  safetyStatus?: 'approved' | 'pending' | 'blocked' | 'unverified';
  safetyReason?: string;
  reviewDeliveryFailed?: boolean;
  categories?: string[];
  projectUrl?: string;
  iconUrl?: string;
  description?: string;
}

interface ModsViewProps {
  gameActive?: boolean;
  manifest: ModpackManifest | null;
  serverUrl: string;
  gameDir: string;
  customMods: CustomModItem[];
  session?: AuthSession | null;
  selectedModIds: string[];
  onUpdateSelectedModIds: (ids: string[]) => void;
  onUpdateCustomMods: (mods: React.SetStateAction<CustomModItem[]>) => void;
  disabledBundledMods?: string[];
  onToggleBundledMod?: (modId: string) => void;
  onNotify?: (
    title: string,
    message?: string,
    type?: 'success' | 'info' | 'warning' | 'error',
    modInfo?: NotificationItem['modInfo']
  ) => void;
}

export type SwitcherMode = 'official' | 'custom';
export type ContentCategory = 'mods' | 'schematics' | 'shaders' | 'screenshots' | 'resourcepacks';
export type ModFilterCategory = ModFilter;

export const ModsView: React.FC<ModsViewProps> = ({
  manifest,
  gameActive = false,
  serverUrl,
  gameDir,
  customMods,
  session,
  selectedModIds,
  onUpdateSelectedModIds,
  onUpdateCustomMods,
  disabledBundledMods = [],
  onToggleBundledMod,
  onNotify,
}) => {
  const [contentCategory, setContentCategory] = useState<ContentCategory>('mods');
  const [switcherMode, setSwitcherMode] = useState<SwitcherMode>('custom');
  const [bundledFilter, setBundledFilter] = useState('all');
  const { container, animateRemoval } = useFileRemoval();
  const deletionInProgress = useRef(false);
  const [filterCategory, setFilterCategory] = useState<ModFilterCategory>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useContentView('mods');
  const [batchBusy, setBatchBusy] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const importInProgress = useRef(false);
  const isDragging = useFileDrop(files => handleFiles(files), contentCategory === 'mods' && !gameActive);
  const [activeWhitelistMod, setActiveWhitelistMod] = useState<CustomModItem | null>(null);
  useEffect(() => { if (gameActive) setActiveWhitelistMod(null); }, [gameActive]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const officialFiles = (manifest?.files || []).filter(file => /^mods\/.*\.jar$/i.test(file.path.replace(/\\/g, '/')));

  const handleFiles = async (files: FileList | File[]) => {
    if (gameActive || deletionInProgress.current) return;
    if (importInProgress.current) {
      onNotify?.('Проверка уже идёт', 'Дождитесь завершения импорта файлов.', 'info');
      return;
    }
    importInProgress.current = true;
    setIsVerifying(true);
    try {
      // A batch of large JARs must not be read and verified in memory all at once.
      for (const file of Array.from(files)) await handleAddCustomModFile(file);
    } finally { importInProgress.current = false; setIsVerifying(false); }
  };

  const filteredOfficial = officialFiles.filter((f) => {
    const rawName = f.modName || f.path.replace('mods/', '').replace('.jar', '');
    const meta = resolveModMetadata(rawName, f.path, f.modDescription, f.modIconUrl, f.modProjectUrl, f.modId);
    const matchesSearch =
      meta.displayName.toLowerCase().includes(search.toLowerCase()) ||
      f.path.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && matchesModFilter(meta, filterCategory) && (bundledFilter === 'all' || canDisableBundledMod(f));
  });

  const filteredCustom = customMods.filter((m) => {
    const meta = resolveModMetadata(m.name, m.filename, m.description, m.iconUrl, m.projectUrl);
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.filename.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && matchesModFilter(meta, filterCategory, m.safetyStatus);
  });

  const toggleSelectMod = (id: string) => {
    if (selectedModIds.includes(id)) {
      onUpdateSelectedModIds(selectedModIds.filter((item) => item !== id));
    } else {
      onUpdateSelectedModIds([...selectedModIds, id]);
    }
  };

  const handleSelectAllCustom = () => onUpdateSelectedModIds(toggleVisibleSelection(selectedModIds, filteredCustom.map(mod => mod.id)));
  const deleteMods = async (ids: string[]) => {
    if (deletionInProgress.current || gameActive || isVerifying) return;
    deletionInProgress.current = true;
    setBatchBusy(true);
    const removed: string[] = [];
    try {
      for (const mod of customMods.filter(item => ids.includes(item.id))) {
        await window.quibyApi.removeCustomMod(gameDir, mod.filename);
        removed.push(mod.id);
      }
    } catch (error) { onNotify?.('Не удалось удалить моды', error instanceof Error ? error.message : undefined, 'error'); }
    finally {
      await animateRemoval(removed);
      onUpdateCustomMods(previous => previous.filter(mod => !removed.includes(mod.id)));
      onUpdateSelectedModIds(selectedModIds.filter(id => !removed.includes(id)));
      setBatchBusy(false);
      deletionInProgress.current = false;
    }
    if (removed.length) onNotify?.('Моды удалены', `Файлов: ${removed.length}`, 'info');
  };

  const toggleCustomMod = (id: string) => {
    const target = customMods.find((m) => m.id === id);
    if (gameActive || batchBusy || isVerifying || target?.safetyStatus !== 'approved') return;

    const updated = customMods.map((m) =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    );
    onUpdateCustomMods(updated);
  };

  const handleAddCustomModFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.jar') || file.size > 512 * 1024 * 1024) {
      onNotify?.('Неверный файл', 'Нужен .jar размером до 512 МБ.', 'error');
      return;
    }

    const tempId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const meta = resolveModMetadata(file.name.replace('.jar', ''), file.name);

    const initialMod: CustomModItem = {
      id: tempId,
      name: meta.displayName,
      filename: file.name,
      size: file.size,
      enabled: false,
      safetyStatus: 'unverified',
      iconUrl: meta.iconUrl,
      description: meta.description,
    };

    onUpdateCustomMods((previous) => [initialMod, ...previous]);
    setSwitcherMode('custom');

    try {
      if (manifest?.files.some(entry => entry.path.replace(/\\/g, '/') === `mods/${file.name}`)) {
        throw new Error('Этот мод уже входит в сборку сервера');
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await window.quibyApi.stageCustomMod(file.name, bytes, session?.token);
      if (result.isAllowed) {
        if (!window.quibyApi) throw new Error('Установка модов доступна только в приложении лаунчера');
        await window.quibyApi.installCustomMod(gameDir, file.name, bytes, session?.token);
      }
      const verifiedMeta = resolveModMetadata(
        result.name || initialMod.name,
        file.name,
        result.description,
        result.iconUrl
      );

      const verifiedMod: CustomModItem = {
        ...initialMod,
        name: verifiedMeta.displayName,
        hashSha1: result.hashSha1,
        safetyStatus: result.status,
        safetyReason: result.reason,
        categories: result.categories,
        projectUrl: result.projectUrl,
        iconUrl: verifiedMeta.iconUrl,
        description: verifiedMeta.description,
        enabled: result.isAllowed,
      };

      onUpdateCustomMods(previous => [verifiedMod, ...previous.filter(mod => mod.id !== tempId && mod.filename !== file.name)]);
      if (result.isAllowed) onNotify?.('Мод добавлен', `${file.name} установлен в папку mods.`, 'success');
      else if (result.status === 'unverified') onNotify?.('Мод ожидает одобрения', 'Файл сохранён отдельно. Отправьте заявку для проверки.', 'warning', { name: verifiedMod.name, filename: verifiedMod.filename, hashSha1: verifiedMod.hashSha1, status: 'unverified' });
      else onNotify?.('Мод заблокирован', result.reason, 'error');
    } catch (e) {
      console.error('Failed to verify mod file:', e);
      onUpdateCustomMods((previous) => previous.filter((m) => m.id !== tempId));
      onNotify?.('Не удалось добавить мод', e instanceof Error ? e.message : 'Проверьте файл и попробуйте снова.', 'error');
    }
  };

  const handleOpenWhitelistModal = (mod: CustomModItem) => {
    setActiveWhitelistMod(mod);
  };

  const handleOpenModsFolder = () => {
    void window.quibyApi?.openContentFolder(gameDir, 'mods').catch((error: unknown) => {
      onNotify?.('Не удалось открыть папку модов', error instanceof Error ? error.message : 'Проверьте доступ к папке игры.', 'error');
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const isAllSelected = allVisibleSelected(selectedModIds, filteredCustom.map(mod => mod.id));

  const categories: { id: ModFilterCategory; label: string }[] = [{ id: 'all', label: 'Все категории' }, ...MOD_FILTERS];
  const busy = gameActive || batchBusy || isVerifying;
  const hasFilter = Boolean(search || filterCategory !== 'all' || (switcherMode === 'official' && bundledFilter !== 'all'));
  const resetFilters = () => { setSearch(''); setFilterCategory('all'); setBundledFilter('all'); };

  return (
    <div className="content-page view-enter">
      {isDragging && <div className="content-import-overlay"><Upload size={36}/><strong>Отпустите моды для проверки</strong><span>.JAR · до 512 МБ</span></div>}
      <input ref={fileInputRef} type="file" accept=".jar" multiple hidden disabled={busy}
        onChange={event => { if (event.target.files) void handleFiles(Array.from(event.target.files)); event.target.value = ''; }}/>

      <header className="page-titlebar">
        <h1>Контент<span>.</span></h1>
        <span className="content-build"><i aria-hidden="true"/>{manifest?.gameVersion || '1.21.1'}<span>NeoForge</span></span>
      </header>
      <nav className="content-category-nav section-tabs" aria-label="Тип контента">
        {([['mods', 'Моды', Package], ['resourcepacks', 'Ресурспаки', Palette], ['shaders', 'Шейдеры', Sun], ['schematics', 'Схематики', Layers], ['screenshots', 'Скриншоты', ImageIcon]] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" aria-current={contentCategory === id ? 'page' : undefined}
            onClick={() => { setContentCategory(id); onUpdateSelectedModIds([]); }}><Icon size={16}/><span>{label}</span></button>
        ))}
      </nav>

      <GameContentLock className="content-category-body" key={contentCategory} locked={gameActive && (contentCategory === 'mods' || contentCategory === 'resourcepacks')} title="Контент доступен после игры">
      {contentCategory === 'resourcepacks' ? (
        <ResourcePacksExplorer gameActive={gameActive} gameDir={gameDir} files={manifest?.files || []} session={session} onNotify={onNotify}/>
      ) : contentCategory === 'schematics' ? (
        <SchematicsExplorer gameDir={gameDir} onNotify={onNotify}/>
      ) : contentCategory === 'shaders' ? (
        <ShadersExplorer gameDir={gameDir} onNotify={onNotify}/>
      ) : contentCategory === 'screenshots' ? (
        <ScreenshotGallery gameDir={gameDir} onNotify={onNotify}/>
      ) : (
        <section className={`content-library mod-library ${switcherMode === 'custom' && selectedModIds.length ? 'has-selection' : ''}`} aria-label="Библиотека модов">
          <ContentToolbar label="Моды" total={switcherMode === 'custom' ? customMods.length : officialFiles.length} visible={switcherMode === 'custom' ? filteredCustom.length : filteredOfficial.length}
            mode={viewMode} onMode={setViewMode} busy={busy} onAdd={() => fileInputRef.current?.click()} onFolder={handleOpenModsFolder}
            selection={switcherMode === 'custom' ? { allSelected: isAllSelected, onSelectAll: handleSelectAllCustom } : undefined}>
            <div className="content-source-toggle" role="group" aria-label="Источник модов">
              <button type="button" aria-pressed={switcherMode === 'custom'} onClick={() => setSwitcherMode('custom')}>Мои моды</button>
              <button type="button" aria-pressed={switcherMode === 'official'} onClick={() => { setSwitcherMode('official'); onUpdateSelectedModIds([]); }}>Сборка</button>
            </div>
          </ContentToolbar>
          <div className="content-find-row">
            <ContentSearch value={search} onChange={setSearch} label="Поиск модов"/>
            {switcherMode === 'official' && <SelectMenu label="Моды сборки" icon={<ToggleRight size={15}/>} value={bundledFilter}
              className={bundledFilter !== 'all' ? 'is-active' : ''} onChange={setBundledFilter}
              options={[{ value: 'all', label: 'Все моды' }, { value: 'toggleable', label: 'Можно отключить' }]}/>}
            <SelectMenu label="Категория модов" icon={<SlidersHorizontal size={14}/>} value={filterCategory}
              className={filterCategory !== 'all' ? 'is-active' : ''} onChange={value => setFilterCategory(value as ModFilterCategory)}
              options={categories.map(category => ({ value: category.id, label: category.label }))}/>
          </div>
          {isVerifying && <p className="content-lock-notice server-loading" role="status"><Loader2 size={15} className="loading-spinner"/>Проверяем файлы на сервере…</p>}
          {switcherMode === 'custom' && <ContentSelectionDock count={selectedModIds.length} total={customMods.length} allSelected={isAllSelected} busy={busy}
            onSelectAll={handleSelectAllCustom} onClear={() => onUpdateSelectedModIds([])} onDelete={() => void deleteMods(selectedModIds)} deleteLabel="Удалить"
            onEnable={() => onUpdateCustomMods(previous => previous.map(mod => selectedModIds.includes(mod.id) && mod.safetyStatus === 'approved' ? { ...mod, enabled: true } : mod))}
            onDisable={() => onUpdateCustomMods(previous => previous.map(mod => selectedModIds.includes(mod.id) ? { ...mod, enabled: false } : mod))}/>}
          <div ref={container} className="mod-results library-scroll" key={switcherMode}>
            {(switcherMode === 'official' ? filteredOfficial.length : filteredCustom.length) === 0 ? (
              <div className="library-empty mod-empty">
                <div className="content-empty-icon"><Package size={28}/></div>
                <h2>{hasFilter ? 'Ничего не нашлось' : switcherMode === 'custom' ? 'Место для твоих модов' : 'В сборке пока нет модов'}</h2>
                <p>{hasFilter ? 'Попробуйте другое название или выберите все категории.' : switcherMode === 'custom' ? 'Перетащите сюда .jar или выберите файл. Мы проверим его перед установкой.' : 'Моды появятся после загрузки списка сборки.'}</p>
                {hasFilter ? <button className="ui-button" type="button" onClick={resetFilters}>Сбросить фильтры</button>
                  : switcherMode === 'custom' && <button className="ui-button is-primary" type="button" disabled={busy} onClick={() => fileInputRef.current?.click()}>Добавить первый мод</button>}
              </div>
            ) : (
              <div className={`mod-grid is-${viewMode}`}>
                {switcherMode === 'official' ? filteredOfficial.map(file => {
                  const rawName = file.modName || file.path.replace('mods/', '').replace('.jar', '');
                  const iconUrl = file.modIconUrl?.startsWith('/') ? `${serverUrl}${file.modIconUrl}` : file.modIconUrl;
                  const meta = resolveModMetadata(rawName, file.path, file.modDescription, iconUrl, file.modProjectUrl, file.modId);
                  const toggleable = canDisableBundledMod(file);
                  const disabled = toggleable && disabledBundledMods.includes(file.modId!);
                  return <ContentFileCard key={file.path} fileId={file.path} name={meta.displayName} description={meta.description} iconUrl={meta.iconUrl} projectUrl={meta.projectUrl}
                    filename={file.path} size={`${file.modVersion || '1.21.1'} · ${formatSize(file.size)}`}
                    enabled={!disabled} busy={busy || !onToggleBundledMod} onToggle={toggleable ? () => onToggleBundledMod?.(file.modId!) : undefined}/>;
                }) : filteredCustom.map(mod => {
                  const isApproved = mod.safetyStatus === 'approved';
                  const isPending = mod.safetyStatus === 'pending';
                  const isBlocked = mod.safetyStatus === 'blocked';
                  const needsReview = (!isApproved && !isPending && !isBlocked) || (isPending && mod.reviewDeliveryFailed);
                  const meta = resolveModMetadata(mod.name, mod.filename, mod.description, mod.iconUrl, mod.projectUrl);
                  return <ContentFileCard key={mod.id} fileId={mod.id} name={meta.displayName} description={meta.description} iconUrl={meta.iconUrl} projectUrl={meta.projectUrl}
                    filename={mod.filename} size={formatSize(mod.size)} reason={mod.safetyReason} deleteLabel="Удалить мод"
                    notice={isApproved ? undefined : isBlocked ? 'Заблокирован' : isPending ? 'На проверке' : 'Нужен допуск'}
                    tone={isBlocked ? 'danger' : 'warning'}
                    enabled={mod.enabled} busy={busy} selected={selectedModIds.includes(mod.id)} onSelect={() => toggleSelectMod(mod.id)}
                    onToggle={isApproved ? () => toggleCustomMod(mod.id) : undefined} onDelete={() => void deleteMods([mod.id])}>
                    {needsReview && <button type="button" className="mod-review-button" disabled={busy || !mod.hashSha1} onClick={() => handleOpenWhitelistModal(mod)}>
                      {mod.reviewDeliveryFailed ? 'Повторить отправку заявки' : 'Подать заявку в вайтлист'}
                    </button>}
                  </ContentFileCard>;
                })}
              </div>
            )}
          </div>
        </section>
      )}
      </GameContentLock>
      <ModWhitelistModal isOpen={Boolean(activeWhitelistMod)} onClose={() => setActiveWhitelistMod(null)} mod={activeWhitelistMod} session={session} serverUrl={serverUrl}/>
    </div>
  );
};
