export default function AuthField({
  action,
  className = "",
  id,
  label,
  ...inputProps
}) {
  const classes = ["redesign-field", className].filter(Boolean).join(" ");

  return (
    <label className={classes} htmlFor={id}>
      <span>{label}</span>
      <span className={`redesign-input-shell${action ? " has-action" : ""}`}>
        <input id={id} className="redesign-input" {...inputProps} />
        {action}
      </span>
    </label>
  );
}
