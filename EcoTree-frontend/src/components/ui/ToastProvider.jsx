import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import ToastContainer from "./ToastContainer.jsx";

const ToastContext = createContext(null);

function getToastId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((toastId) => {
    const timer = timersRef.current.get(toastId);

    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(toastId);
    }

    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const addToast = useCallback(
    ({ duration = 4300, message, title, type = "info" }) => {
      if (!message) {
        return null;
      }

      const id = getToastId();
      const nextToast = { id, message, title, type };

      setToasts((current) => [...current, nextToast].slice(-4));

      if (duration > 0) {
        const timer = window.setTimeout(() => removeToast(id), duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [removeToast]
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const toast = useMemo(
    () => ({
      error: (message, title = "Erro") =>
        addToast({ message, title, type: "error" }),
      info: (message, title = "Informação") =>
        addToast({ message, title, type: "info" }),
      success: (message, title = "Sucesso") =>
        addToast({ message, title, type: "success" }),
      warning: (message, title = "Aviso") =>
        addToast({ message, title, type: "warning" }),
      show: addToast
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const toast = useContext(ToastContext);

  if (!toast) {
    throw new Error("useToast deve ser usado dentro de ToastProvider.");
  }

  return toast;
}
