import { useFileDrop } from '../utils/useFileDrop';
import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Check, AlertCircle, Download, User, ArrowRight, X, Sparkles, Lock, Pencil } from 'lucide-react';
import { DEFAULT_SKINS, CAPE_PRESETS, CapePreset } from '../utils/chibiRenderer';
import { ChibiCharacterDisplay } from '../components/ChibiCharacterDisplay';
import { validateSkinFile } from '../utils/skinValidator';
import {
  SavedSkinItem,
  renameSavedSkin,
  getSavedSkinLibrary,
  addSkinToLibrary,
  removeSkinFromLibrary,
  createChibiPreviewUri,
} from '../utils/skinLibrary';

interface SkinWardrobeViewProps {
  customSkinImg: HTMLImageElement | null;
  customSkinName: string | null;
  activeDefaultSkinIdx: number;
  selectedCape: CapePreset;
  onSetCustomSkin: (img: HTMLImageElement | null, name: string | null) => void;
  onSetDefaultSkinIdx: (idx: number) => void;
  onSelectCape: (cape: CapePreset) => void;
}

interface PendingSkinData {
  name: string;
  canvas: HTMLCanvasElement;
  convertedImg: HTMLImageElement;
  previewUri: string;
}

export const SkinWardrobeView: React.FC<SkinWardrobeViewProps> = ({
  customSkinImg,
  customSkinName,
  activeDefaultSkinIdx,
  selectedCape,
  onSetCustomSkin,
  onSetDefaultSkinIdx,
  onSelectCape,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);
  const isDragging = useFileDrop(files => { if (files[0]) void processSkinFile(files[0]); });
  const [library, setLibrary] = useState<SavedSkinItem[]>([]);
  const [pendingSkin, setPendingSkin] = useState<PendingSkinData | null>(null);

  const [editingSkin, setEditingSkin] = useState<SavedSkinItem | null>(null);
  const [caption, setCaption] = useState('');
  const [captionError, setCaptionError] = useState('');

  // Load saved skin library on mount
  useEffect(() => {
    setLibrary(getSavedSkinLibrary());
  }, []);

  const processSkinFile = async (file: File) => {
    setValidationError(null);

    const validation = await validateSkinFile(file);
    if (!validation.valid) {
      setValidationError(validation.error || 'Некорректный файл скина');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        const previewUri = createChibiPreviewUri(canvas);

        const currentLib = getSavedSkinLibrary();
        if (currentLib.length >= 6) {
          setPendingSkin({
            name: cleanName,
            canvas,
            convertedImg: img,
            previewUri,
          });
        } else {
          commitAddSkinToLibrary(cleanName, canvas, img);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const commitAddSkinToLibrary = (
    name: string,
    canvas: HTMLCanvasElement,
    img: HTMLImageElement
  ) => {
    addSkinToLibrary(name, canvas);
    setLibrary(getSavedSkinLibrary());
    onSetCustomSkin(img, name);
  };

  const handleConfirmReplaceSkin = () => {
    if (!pendingSkin) return;
    commitAddSkinToLibrary(pendingSkin.name, pendingSkin.canvas, pendingSkin.convertedImg);
    setPendingSkin(null);
  };

  const handleSelectLibraryItem = (item: SavedSkinItem) => {
    const img = new Image();
    img.onload = () => {
      onSetCustomSkin(img, item.name);
      setValidationError(null);
    };
    img.src = item.dataUri;
  };

  const handleDeleteLibraryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = removeSkinFromLibrary(id);
    setLibrary(updated);

    const deletedItem = library.find((i) => i.id === id);
    if (deletedItem && customSkinName === deletedItem.name) {
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

  const currentDisplayName = customSkinImg
    ? library.find(item => item.name === customSkinName)?.caption || customSkinName || 'Пользовательский скин'
    : DEFAULT_SKINS[activeDefaultSkinIdx % DEFAULT_SKINS.length]?.name || 'Скин';

  const oldestSkinToReplace = library.length >= 6 ? library[library.length - 1] : null;

  return (
    <div className="wardrobe-page view-enter">
      <header className="page-heading"><div><p className="page-kicker">ТВОЙ ПЕРСОНАЖ</p><h1>Будь собой.</h1><p>Скины, детали и узнаваемый силуэт.</p></div><span className="content-edition">ГАРДЕРОБ / S6</span></header>
      {editingSkin && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Название скина">
        <form className="surface-panel rounded-3xl p-6 w-full max-w-sm space-y-4" onSubmit={event => { event.preventDefault(); try { setLibrary(renameSavedSkin(editingSkin.id, caption)); setEditingSkin(null); } catch (error) { setCaptionError(error instanceof Error ? error.message : 'Не удалось сохранить подпись'); } }}>
          <label className="block text-sm font-semibold">Название скина<input autoFocus className="ui-input mt-3 w-full" value={caption} maxLength={24} onChange={event => setCaption(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setEditingSkin(null); }} /></label>
          <p className="text-xs text-zinc-400">До 24 символов</p>
          {captionError && <p role="alert" className="text-rose-400 text-xs">{captionError}</p>}
          <div className="flex justify-end gap-2"><button type="button" className="ui-button" onClick={() => setEditingSkin(null)}>Отмена</button><button type="submit" className="ui-button is-primary" disabled={!caption.trim()}>Сохранить</button></div>
        </form>
      </div>}
      <div className="wardrobe-layout">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90  p-4 animate-in fade-in duration-200">
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
        </div>
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
          <div className="mt-2 flex items-center gap-2 px-3.5 py-1.5 rounded-full surface-panel text-xs font-medium text-zinc-200 shadow-sm">
            <User size={12} className="text-zinc-400" />
            <span className="truncate max-w-[200px] apple-subheading">{currentDisplayName}</span>
          </div>
        </div>
      </div>

      {/* Right Column: Control Panel with Glass Components */}
      <div className="flex-1 flex flex-col space-y-4 overflow-y-auto pr-1">
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
                processSkinFile(e.target.files[0]);
              }
            }}
          />
        </label>

        {/* Section 2: Library Grid (3 on row 1, 3 on row 2, Max 6 Skins) */}
        {library.length > 0 && (
          <div className="surface-panel rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider apple-micro-tag">
                Моя коллекция
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                {library.length}/6
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {library.map((item) => {
                const isSelected = customSkinImg && customSkinName === item.name;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectLibraryItem(item)}
                    title={item.caption || item.name}
                    className={`group relative flex flex-col items-center justify-center p-2 rounded-2xl border transition-all cursor-pointer aspect-square overflow-hidden press-feedback ${
                      isSelected
                        ? 'bg-zinc-800/90 border-white/30 shadow-md ring-1 ring-white/15 border-t-white/40'
                        : 'surface-card text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {/* Live Chibi Thumbnail */}
                    <div className="w-full h-full flex items-center justify-center p-1">
                      <img
                        src={item.chibiPreviewUri}
                        alt={item.name}
                        className="max-w-full max-h-full object-contain [image-rendering:pixelated] drop-shadow-md pointer-events-none select-none transition-transform group-hover:scale-105"
                      />
                    </div>

                    <span className="skin-collection-caption" title={item.caption || item.name}>{item.caption || item.name}</span>
                    {/* Active Checkmark */}
                    {isSelected && (
                      <div className="absolute bottom-2 left-2 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center shadow-sm z-10">
                        <Check size={9} className="text-zinc-950 stroke-[3]" />
                      </div>
                    )}

                    {/* Action buttons in Top-Right Corner */}
                    <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-20">
                      <button type="button" onClick={event => { event.stopPropagation(); setEditingSkin(item); setCaption(item.caption || item.name); setCaptionError(''); }} title="Подписать скин" className="p-1.5 rounded-lg bg-zinc-900/95 text-zinc-300 hover:text-white press-feedback"><Pencil size={12} /></button>
                      <button
                        onClick={(e) => handleDownloadChibi(e, item)}
                        title="Скачать чиби-аватар"
                        className="p-1.5 rounded-lg bg-zinc-900/95 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all shadow-md press-feedback cursor-pointer"
                      >
                        <Download size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteLibraryItem(e, item.id)}
                        title="Удалить скин"
                        className="p-1.5 rounded-lg bg-zinc-900/95 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition-all shadow-md press-feedback cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 3: Default Skins (Steve & Alex) */}
        <div className="surface-panel rounded-2xl p-4 space-y-2.5">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block apple-micro-tag">
            Базовые скины
          </span>

          <div className="grid grid-cols-2 gap-2">
            {DEFAULT_SKINS.map((skin, idx) => {
              const isSelected = !customSkinImg && activeDefaultSkinIdx === idx;
              return (
                <button
                  key={skin.id}
                  onClick={() => {
                    onSetCustomSkin(null, null);
                    onSetDefaultSkinIdx(idx);
                    setValidationError(null);
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer press-feedback ${
                    isSelected
                      ? 'bg-zinc-800/90 border-white/25 text-white shadow-sm border-t-white/35'
                      : 'bg-zinc-900/60 hover:bg-zinc-850 border-white/5 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="apple-subheading">{skin.name}</span>
                  {isSelected && <Check size={13} className="text-zinc-200" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Cape Presets (Плащи Quiby Season VI - Заблокировано) */}
        <div className="surface-panel rounded-2xl p-4 space-y-2.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block apple-micro-tag">
              Плащи Quiby (Season VI)
            </span>
            <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
              <Lock size={11} className="text-zinc-400" />
              Скоро
            </span>
          </div>

          {/* Locked Grid Container with Centered Lock Overlay */}
          <div className="relative rounded-xl overflow-hidden">
            {/* Background Dimmed Grid */}
            <div className="grid grid-cols-2 gap-2 opacity-25 blur-[1.5px] pointer-events-none select-none">
              {CAPE_PRESETS.map((cape) => (
                <div
                  key={cape.id}
                  className="p-2.5 rounded-xl border border-white/5 bg-zinc-900/60 flex items-center gap-2.5 text-left"
                >
                  <div
                    className="w-4 h-6 rounded-sm border border-white/10 shrink-0"
                    style={{
                      background: `linear-gradient(to bottom, ${cape.gradient[0]}, ${cape.gradient[1]})`,
                    }}
                  />
                  <div className="truncate flex-1">
                    <span className="block truncate text-[11px] font-bold text-white">
                      {cape.name}
                    </span>
                    <span className="block text-[9px] text-zinc-400 font-mono">
                      Эксклюзив
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Minimalist Center Lock Badge */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="w-11 h-11 rounded-2xl surface-panel border border-white/15 flex items-center justify-center text-zinc-300 shadow-xl">
                <Lock size={18} className="text-zinc-300" />
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
