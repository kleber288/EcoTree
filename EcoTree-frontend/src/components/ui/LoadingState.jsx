export default function LoadingState({ children = "Carregando..." }) {
  return (
    <p className="loading-state" role="status" aria-live="polite">
      <span aria-hidden="true" />
      {children}
    </p>
  );
}
