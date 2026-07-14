export default function EmptyState({
  actionLabel,
  children,
  onAction,
  title
}) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {actionLabel && onAction && (
        <div className="empty-state-actions">
          <button className="secondary-button" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
