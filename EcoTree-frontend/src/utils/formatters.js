export function toNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (value === null || value === undefined) {
    return 0;
  }

  let normalized = String(value).trim();

  if (!normalized) {
    return 0;
  }

  normalized = normalized.replace(/[^\d,.-]/g, "");

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");

    normalized =
      lastComma > lastDot
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function clampNumber(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

export function calculatePercentage(value, total) {
  const numericTotal = toNumber(total);

  if (numericTotal <= 0) {
    return 0;
  }

  return clampNumber(Math.round((toNumber(value) / numericTotal) * 100), 0, 100);
}

export function formatCurrency(value, options = {}) {
  return toNumber(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    ...options
  });
}

export function formatCompactCurrency(value) {
  return formatCurrency(value, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  });
}

export function parseApiDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const rawValue = String(value).trim();
  const hasSqliteTimestamp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(rawValue);
  const normalizedValue =
    rawValue.length === 10
      ? `${rawValue}T00:00:00`
      : hasSqliteTimestamp
        ? `${rawValue.replace(" ", "T")}Z`
        : rawValue.replace(" ", "T");
  const date = new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(
  value,
  options = { day: "2-digit", month: "short", year: "numeric" },
  fallback = "Sem data"
) {
  const date = parseApiDate(value);

  if (!date) {
    return value ? String(value) : fallback;
  }

  return date.toLocaleDateString("pt-BR", options).replace(/\./g, "");
}
