export default function ProgressBar({ label, value = 0, max = 100 }) {
  const numericValue = Number(value) || 0;
  const numericMax = Number(max) || 100;
  const percentage = Math.min(
    Math.max(Math.round((numericValue / numericMax) * 100), 0),
    100
  );

  return (
    <div className="progress-block">
      {label && (
        <div className="progress-label">
          <span>{label}</span>
          <strong>{percentage}%</strong>
        </div>
      )}
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={percentage}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
