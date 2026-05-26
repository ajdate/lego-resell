"use client";

import { useEffect, type ReactNode } from "react";

export function ModalSheet({
  title,
  titleId,
  children,
  footer,
  onClose,
}: {
  title: string;
  titleId: string;
  children: ReactNode;
  footer: ReactNode;
  onClose?: () => void;
}) {
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={
        onClose ? (e) => e.target === e.currentTarget && onClose() : undefined
      }
    >
      <div className="modal-sheet mt-4 md:mt-0 md:my-auto">
        <div className="modal-header">
          <div className="flex items-start justify-between gap-3">
            <h4 id={titleId} className="text-sm font-semibold text-white">
              {title}
            </h4>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="touch-target shrink-0 rounded-lg px-2 text-zinc-500 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="modal-scroll overflow-y-auto max-h-[70vh] pb-8">
          {children}
        </div>
        <div className="modal-footer">{footer}</div>
      </div>
    </div>
  );
}
