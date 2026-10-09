import { useLayoutEffect, useRef, type ReactNode } from 'react';

/** Native focus trapping, Escape handling and focus restoration for transient dialogs. */
export function ModalDialog({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef(document.activeElement);
  useLayoutEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => {
      element.close();
      if (previousFocus.current instanceof HTMLElement && previousFocus.current.isConnected) previousFocus.current.focus();
    };
  }, []);
  return <dialog ref={dialog} className="launcher-dialog skin-dialog" aria-label={label}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>{children}</dialog>;
}
