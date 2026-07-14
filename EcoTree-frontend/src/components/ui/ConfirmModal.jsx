import { useEffect, useId, useRef } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(",");

export default function ConfirmModal({
  cancelLabel = "Cancelar",
  children,
  confirmLabel = "Confirmar",
  loading = false,
  onCancel,
  onConfirm,
  open,
  title,
  tone = "danger"
}) {
  const modalRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const loadingRef = useRef(loading);
  const onCancelRef = useRef(onCancel);
  const previousFocusRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    loadingRef.current = loading;
    onCancelRef.current = onCancel;
  }, [loading, onCancel]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    previousFocusRef.current = document.activeElement;
    const modal = modalRef.current;
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    window.setTimeout(() => {
      const initialFocus = cancelButtonRef.current || modal;
      initialFocus?.focus();
    }, 0);

    function getFocusableElements() {
      if (!modal) {
        return [];
      }

      return Array.from(modal.querySelectorAll(focusableSelector)).filter(
        (element) => element.offsetParent !== null
      );
    }

    function handleKeyDown(event) {
      if (event.key === "Escape" && !loadingRef.current) {
        event.preventDefault();
        onCancelRef.current?.();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements();

      if (focusableElements.length === 0) {
        event.preventDefault();
        modal?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;

      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-describedby={children ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={`confirm-modal ${tone}`}
        ref={modalRef}
        role="alertdialog"
        tabIndex="-1"
      >
        <div className="confirm-modal-icon" aria-hidden="true">
          !
        </div>
        <div className="confirm-modal-copy">
          <h2 id={titleId}>{title}</h2>
          {children && <p id={descriptionId}>{children}</p>}
        </div>
        <div className="confirm-modal-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={onCancel}
            disabled={loading}
            ref={cancelButtonRef}
          >
            {cancelLabel}
          </button>
          <button
            className="danger-button"
            type="button"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Excluindo..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
