export default function ActionButton({
  children,
  className = "",
  variant = "primary",
  ...props
}) {
  const variantClass =
    variant === "secondary"
      ? "secondary-button"
      : variant === "danger"
        ? "danger-button"
        : "primary-button";

  return (
    <button className={`${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
