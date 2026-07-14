const toastIcons = {
  success: "✓",
  error: "!",
  warning: "!",
  info: "i"
};

export default function Toast({ toast, onClose }) {
  return (
    <article
      className={`toast toast-${toast.type}`}
      role={toast.type === "error" ? "alert" : "status"}
    >
      <span className="toast-icon" aria-hidden="true">
        {toastIcons[toast.type] || toastIcons.info}
      </span>
      <div className="toast-copy">
        {toast.title && <strong>{toast.title}</strong>}
        <p>{toast.message}</p>
      </div>
      <button
        className="toast-close"
        type="button"
        onClick={() => onClose(toast.id)}
        aria-label="Fechar notificação"
      >
        ×
      </button>
    </article>
  );
}
