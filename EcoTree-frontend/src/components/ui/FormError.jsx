export default function FormError({ children, id }) {
  if (!children) {
    return null;
  }

  return (
    <p className="form-error" id={id} role="alert">
      {children}
    </p>
  );
}
