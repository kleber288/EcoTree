export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
export const TOKEN_KEY = "token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    auth = true,
    headers = {}
  } = options;

  const requestHeaders = {
    Accept: "application/json",
    ...headers
  };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();

    if (!token) {
      window.dispatchEvent(new Event("auth:logout"));
      throw new ApiError("Faça login para continuar.", 401);
    }

    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (response.status === 401) {
    clearToken();
    window.dispatchEvent(new Event("auth:logout"));
  }

  if (!response.ok) {
    const message =
      typeof data === "object"
        ? data.detail || data.mensagem || "Erro ao acessar a API."
        : data || "Erro ao acessar a API.";

    throw new ApiError(message, response.status, data);
  }

  return data;
}
