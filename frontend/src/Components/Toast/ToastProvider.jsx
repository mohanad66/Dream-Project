import { useCallback, useMemo, useRef, useState } from "react";
import {
  FaCheck,
  FaCircleInfo,
  FaTriangleExclamation,
  FaXmark,
} from "react-icons/fa6";
import ToastContext from "./ToastContext";
import "./css/style.scss";

let toastIdCounter = 0;

const TYPE_META = {
  success: { icon: FaCheck },
  error: { icon: FaTriangleExclamation },
  warning: { icon: FaTriangleExclamation },
  info: { icon: FaCircleInfo },
};

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback(
    (type, message, options = {}) => {
      const id = ++toastIdCounter;
      const { title, duration = 4000 } = options;
      setToasts((prev) => [...prev.slice(-3), { id, type, message, title }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (message, options) => push("success", message, options),
      error: (message, options) => push("error", message, options),
      warning: (message, options) => push("warning", message, options),
      info: (message, options) => push("info", message, options),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = TYPE_META[toast.type].icon;
          return (
            <div
              key={toast.id}
              className={`toast toast--${toast.type}`}
              role="status"
            >
              <span className="toast__icon">
                <Icon />
              </span>
              <div className="toast__body">
                {toast.title && <p className="toast__title">{toast.title}</p>}
                <p className="toast__message">{toast.message}</p>
              </div>
              <button
                type="button"
                className="toast__close"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
              >
                <FaXmark />
              </button>
              <span className="toast__progress" />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
