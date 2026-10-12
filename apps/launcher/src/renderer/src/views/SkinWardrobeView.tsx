import { GameContentLock } from '../components/GameContentLock';
import { ModalDialog } from '../components/ModalDialog';
import { useFileDrop } from '../utils/useFileDrop';
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Check, AlertCircle, Download, User, ArrowRight, X, Lock, Pencil } from 'lucide-react';
import { DEFAULT_SKINS, CapePreset } from '../utils/chibiRenderer';
import { ChibiCharacterDisplay } from '../components/ChibiCharacterDisplay';
import { validateSkinFile } from '../utils/skinValidator';
import {
  SavedSkinItem,
  renameSavedSkin,
  renameActiveSkin,
  renameDefaultSkin,
  getDefaultSkinCaption,
  getSavedSkinLibrary,
  getSkinDisplayName,
  addSkinToLibrary,
  removeSkinFromLibrary,
  createChibiPreviewUri,
} from '../utils/skinLibrary';

interface SkinWardrobeViewProps {
  gameActive?: boolean;
  customSkinImg: HTMLImageElement | null;
  customSkinName: string | null;
  activeDefaultSkinIdx: number;
  selectedCape: CapePreset;
  onSetCustomSkin: (img: HTMLImageElement | null, name: string | null) => void;
  onSetDefaultSkinIdx: (idx: number) => void;
  onSelectCape: (cape: CapePreset) => void;
  onLibraryChange?: () => void;
}

interface PendingSkinData {
  name: string;
  canvas: HTMLCanvasElement;
  convertedImg: HTMLImageElement;
  previewUri: string;
}

export const SkinWardrobeView: React.FC<SkinWardrobeViewProps> = ({
  gameActive = false,
  customSkinImg,
  customSkinName,
  activeDefaultSkinIdx,
  selectedCape,
  onSetCustomSkin,
  onSetDefaultSkinIdx,
  onSelectCape,
  onLibraryChange,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);
  const isDragging = useFileDrop(files => { if (files[0]) void processSkinFile(files[0]); }, !gameActive);
  const [library, setLibrary] = useState<SavedSkinItem[]>([]);
  const [pendingSkin, setPendingSkin] = useState<PendingSkinData | null>(null);

  const [editingSkin, setEditingSkin] = useState<SavedSkinItem | null>(null);
  const [editingActive, setEditingActive] = useState(false);
  const [editingDefault, setEditingDefault] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [captionError, setCaptionError] = useState('');

  const skinRequest = useRef(0);
  useEffect(() => { skinRequest.current++; if (gameActive) { setPendingSkin(null); closeCaption(); } }, [gameActive]);
  useEffect(() => () => { skinRequest.current++; }, []);

  // Load saved skin library on mount
  useEffect(() => {
    setLibrary(getSavedSkinLibrary());
  }, []);

  const processSkinFile = async (file: File) => {
    if (gameActive) return;
    const request = ++skinRequest.current;
    setValidationError(null);
    try {
      const validation = await validateSkinFile(file);
      if (request !== skinRequest.current) return;
      if (!validation.valid || !validation.convertedImg) throw new Error(validation.error || 'Некорректный файл скина');
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Не удалось обработать изображение');
      ctx.imageSmoothingEnabled = false;
      // The validator converts legacy limbs; HD textures must be scaled, not cropped.
      ctx.drawImage(validation.convertedImg, 0, 0, 64, 64);
      const img = new Image();
      img.src = canvas.toDataURL('image/png');
      await img.decode();
      if (request !== skinRequest.current) return;
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      if (getSavedSkinLibrary().length >= 6) {
        setPendingSkin({ name: cleanName, canvas, convertedImg: img, previewUri: createChibiPreviewUri(canvas) });
      } else commitAddSkinToLibrary(cleanName, canvas, img);
    } catch (error) {
      if (request === skinRequest.current) setValidationError(error instanceof Error ? error.message : 'Не удалось сохранить скин');
    }
  };

  const commitAddSkinToLibrary = (
    name: string,
    canvas: HTMLCanvasElement,
    img: HTMLImageElement
  ) => {
    addSkinToLibrary(name, canvas);
    setLibrary(getSavedSkinLibrary());
    onLibraryChange?.();
    onSetCustomSkin(img, name);
  };

  const handleConfirmReplaceSkin = () => {
    if (!pendingSkin) return;
    try {
      commitAddSkinToLibrary(pendingSkin.name, pendingSkin.canvas, pendingSkin.convertedImg);
      setPendingSkin(null);
    } catch (error) { setPendingSkin(null); setValidationError(error instanceof Error ? error.message : 'Не удалось сохранить скин'); }
  };

  const handleSelectLibraryItem = (item: SavedSkinItem) => {
    if (gameActive) return;
    const request = ++skinRequest.current;
    const img = new Image();
    img.onload = () => {
      if (request !== skinRequest.current) return;
      onSetCustomSkin(img, item.name);
      setValidationError(null);
    };
    img.src = item.dataUri;
  };

  const handleDeleteLibraryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    let updated: SavedSkinItem[];
    try { updated = removeSkinFromLibrary(id); }
    catch (error) { setValidationError(error instanceof Error ? error.message : 'Не удалось удалить скин'); return; }
    setLibrary(updated);
    onLibraryChange?.();

    const deletedItem = library.find((i) => i.id === id);
    if (deletedItem && activeLibraryItem?.id === deletedItem.id) {
      onSetCustomSkin(null, null);
    }
  };

  const handleDownloadChibi = (e: React.MouseEvent, item: SavedSkinItem) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = item.chibiPreviewUri;
    a.download = `chibi_${item.name.replace(/\.[^/.]+$/, '')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const activeLibraryItem = customSkinImg
    ? library.find(item => item.dataUri === customSkinImg.src) || library.find(item => item.name === customSkinName)
    : undefined;
  const currentDisplayName = customSkinImg
    ? getSkinDisplayName(library, customSkinName, customSkinImg.src) || 'Пользовательский скин'
    : getDefaultSkinCaption(DEFAULT_SKINS[activeDefaultSkinIdx % DEFAULT_SKINS.length]?.name || 'Steve');
  const closeCaption = () => { setEditingSkin(null); setEditingDefault(null); setEditingActive(false); };
  const editActiveCaption = () => {
    if (gameActive) return;
    setEditingActive(Boolean(customSkinImg && !activeLibraryItem));
    setEditingSkin(activeLibraryItem || null);
    setEditingDefault(customSkinImg ? null : DEFAULT_SKINS[activeDefaultSkinIdx % DEFAULT_SKINS.length]?.name || 'Steve');
    setCaption(currentDisplayName); setCaptionError('');
  };

  const oldestSkinToReplace = library.length >= 6 ? library[library.length - 1] : null;

  return (
    <div className="wardrobe-page view-enter">
      <header className="page-titlebar"><h1>Гардероб<span>.</span></h1><span className="page-caption">Твой персонаж</span></header>
      {(editingSkin || editingDefault || editingActive) && <ModalDialog label="Название скина" onClose={closeCaption}>
        <form className="surface-panel rounded-3xl p-6 w-full max-w-sm space-y-4" onSubmit={event => { event.preventDefault(); try { const name = caption.trim() || editingSkin?.name || editingDefault || customSkinName || 'Пользовательский скин'; if (editingSkin) setLibrary(renameSavedSkin(editingSkin.id, name)); else if (editingActive && customSkinImg) renameActiveSkin(customSkinImg.src, name); else renameDefaultSkin(editingDefault!, name); onLibraryChange?.(); closeCaption(); } catch (error) { setCaptionError(error instanceof Error ? error.message : 'Не удалось сохранить подпись'); } }}>
          <label className="skin-caption-field">Название скина<input autoFocus value={caption} placeholder={editingSkin?.name || editingDefault || customSkinName || 'Пользовательский скин'} maxLength={24} onChange={event => setCaption(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') closeCaption(); }} /></label>
          <p className="text-xs text-zinc-400">До 24 символов. Пустое поле вернёт исходное название.</p>
          {captionError && <p role="alert" className="text-rose-400 text-xs">{captionError}</p>}
          <div className="flex justify-end gap-2"><button type="button" className="ui-button" onClick={closeCaption}>Отмена</button><button type="submit" className="ui-button is-primary">Сохранить</button></div>
        </form>
      </ModalDialog>}
      <GameContentLock locked={gameActive} title="Гардероб доступен после игры" className="wardrobe-lock"><fieldset disabled={gameActive} className="wardrobe-layout wardrobe-fieldset">
      {/* Full-Window Drag & Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90  border-4 border-dashed border-[#bb74ff] p-8 pointer-events-none animate-in fade-in duration-150">
          <div className="flex flex-col items-center gap-3.5 p-8 rounded-3xl surface-panel shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-[#bb74ff]/30 flex items-center justify-center text-purple-300">
              <Upload size={32} className="animate-bounce" />
            </div>
            <p className="text-base font-bold text-white apple-heading">Отпустите скин (.png) здесь</p>
            <p className="text-xs text-zinc-400 apple-body">Скин автоматически проверится и добавится в коллекцию</p>
          </div>
        </div>
      )}

      {/* Confirmation Modal when Collection is Full (6/6) */}
      {pendingSkin && (
        <ModalDialog label="Коллекция заполнена" onClose={() => setPendingSkin(null)}>
          <div className="surface-panel rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white apple-subheading">Коллекция заполнена</h3>
                  <p className="text-xs text-zinc-400 font-mono">Лимит: 6 скинов</p>
                </div>
              </div>

              <button
                onClick={() => setPendingSkin(null)}
                aria-label="Закрыть"
                className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors press-feedback"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed apple-body">
              Чтобы добавить новый скин <span className="font-semibold text-white">«{pendingSkin.name}»</span>, самый ранний скин <span className="font-semibold text-zinc-400">«{oldestSkinToReplace?.name}»</span> будет заменен.
            </p>

            {/* Visual comparison of replacement */}
            <div className="flex items-center justify-center gap-4 py-3 px-4 rounded-2xl bg-zinc-950/60 border border-white/5">
              {oldestSkinToReplace && (
                <div className="flex flex-col items-center">
                  <img
                    src={oldestSkinToReplace.chibiPreviewUri}
                    alt="Old"
                    className="w-14 h-14 object-contain opacity-40 [image-rendering:pixelated]"
                  />
                  <span className="text-[10px] text-zinc-500 truncate max-w-[90px] mt-1 font-mono">
                    Удалится
                  </span>
                </div>
              )}

              <ArrowRight size={18} className="text-zinc-600 shrink-0" />

              <div className="flex flex-col items-center">
                <img
                  src={pendingSkin.previewUri}
                  alt="New"
                  className="w-14 h-14 object-contain [image-rendering:pixelated] drop-shadow-md"
                />
                <span className="text-[10px] text-emerald-400 font-semibold truncate max-w-[90px] mt-1 font-mono">
                  Новый скин
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setPendingSkin(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer press-feedback"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmReplaceSkin}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-neutral-100 transition-all shadow-md press-feedback cursor-pointer"
              >
                Заменить и добавить
              </button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* Left Column: Character Stage Preview with Glass Depth */}
      <div className="flex-[1.1] flex flex-col items-center justify-center surface-panel rounded-3xl p-6 relative overflow-hidden">
        {/* Luminous stage light bloom */}
        <div className="absolute inset-0 pointer-events-none wardrobe-stage-grid" />

        {/* Live Chibi Character */}
        <div className="relative z-10 flex flex-col items-center">
          <ChibiCharacterDisplay
            customSkinImg={customSkinImg}
            activeDefaultSkinIdx={activeDefaultSkinIdx}
            selectedCape={selectedCape}
          />

          {/* Minimal Floating Name Badge */}
          <button type="button" disabled={gameActive} onClick={editActiveCaption} title="Изменить название скина" className="skin-caption-badge mt-2 flex items-center gap-2 px-3.5 py-1.5 rounded-full surface-panel text-xs font-medium text-zinc-200 shadow-sm">
            <User size={12} className="text-zinc-400" />
            <span className="truncate max-w-[200px] apple-subheading">{currentDisplayName}</span>
          </button>
        </div>
      </div>

      {/* Right Column: Control Panel with Glass Components */}
      <div className="wardrobe-controls">
        {/* Validation Error Banner */}
        {validationError && (
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-in fade-in">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <p className="font-semibold text-rose-200 apple-subheading">Неверный скин</p>
              <p className="text-[11px] text-rose-300/80 mt-0.5 apple-body">{validationError}</p>
            </div>
          </div>
        )}

        {/* Section 1: Upload Zone */}
        <label
          className="group flex items-center justify-between p-4 rounded-2xl surface-card cursor-pointer press-feedback"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-[#bb74ff]/25 flex items-center justify-center text-purple-300 group-hover:text-white transition-colors shadow-sm">
              <Upload size={16} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors apple-subheading">
                Загрузить скин
              </span>
              <span className="text-[11px] text-zinc-400 apple-body">
                PNG 64×64
              </span>
            </div>
          </div>

          <span className="text-[11px] font-medium text-zinc-300 px-3 py-1 rounded-xl bg-zinc-800/80 border border-white/10 group-hover:border-white/20 apple-body">
            Обзор
          </span>

          <input
            type="file"
            accept=".png"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                void processSkinFile(e.target.files[0]);
                e.target.value = '';
              }
            }}
          />
        </label>

        <section className="skin-collection">
          <header><h2>Моя коллекция</h2><span>{library.length} / 6</span></header>
          {library.length ? <div className="skin-collection-grid">{library.map(item => {
            const selected = activeLibraryItem?.id === item.id;
            return <article key={item.id} className={`skin-tile ${selected ? 'is-selected' : ''}`}>
              <button type="button" className="skin-tile-select" aria-label={`Выбрать скин ${item.caption || item.name}`} aria-pressed={selected} onClick={() => handleSelectLibraryItem(item)}>
                <img src={item.chibiPreviewUri} alt=""/><span>{item.caption || item.name}</span>{selected && <Check size={13}/>}
              </button>
              <div className="skin-tile-actions">
                <button type="button" title="Подписать скин" aria-label={`Переименовать ${item.caption || item.name}`} onClick={() => { setEditingSkin(item); setCaption(item.caption || item.name); setCaptionError(''); }}><Pencil size={13}/></button>
                <button type="button" title="Скачать чиби-аватар" aria-label={`Скачать ${item.caption || item.name}`} onClick={event => handleDownloadChibi(event, item)}><Download size={13}/></button>
                <button type="button" className="delete-action" title="Удалить скин" aria-label={`Удалить ${item.caption || item.name}`} onClick={event => handleDeleteLibraryItem(event, item.id)}><Trash2 size={13}/></button>
              </div>
            </article>;
          })}</div> : <p className="skin-collection-empty">Добавьте скин, чтобы сохранить его в коллекции.</p>}
        </section>
        <section className="skin-collection skin-defaults">
          <header><h2>Базовые скины</h2><span>2 образа</span></header>
          <div className="skin-default-grid">{DEFAULT_SKINS.map((skin, index) => {
            const selected = !customSkinImg && activeDefaultSkinIdx === index;
            return <button key={skin.id} type="button" aria-pressed={selected} onClick={() => { skinRequest.current++; onSetCustomSkin(null, null); onSetDefaultSkinIdx(index); setValidationError(null); }}>
              <span className={`default-skin-mark is-${skin.name.toLowerCase()}`} aria-hidden="true">{skin.name[0]}</span><span>{skin.name}</span>{selected && <Check size={14}/>}
            </button>;
          })}</div>
        </section>
        <section className="cape-coming-soon"><span><Lock size={18}/></span><div><h2>Плащи Quiby</h2><p>Образы сезона VI появятся здесь.</p></div><small>Скоро</small></section>
      </div>
      </fieldset></GameContentLock>
    </div>
  );
};
