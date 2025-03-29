import { useEffect, useState } from "react";
import { ErrorIcon, InfoIcon, SuccessIcon } from "./icons";

type ToastProps = {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
};

export const Toast = ({ message, type = "success", duration = 3000, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor =
    type === "success"
      ? "bg-green-50 dark:bg-green-900/30"
      : type === "error"
        ? "bg-red-50 dark:bg-red-900/30"
        : "bg-blue-50 dark:bg-blue-900/30";

  const textColor =
    type === "success"
      ? "text-green-800 dark:text-green-300"
      : type === "error"
        ? "text-red-800 dark:text-red-300"
        : "text-blue-800 dark:text-blue-300";

  const borderColor =
    type === "success"
      ? "border-green-200 dark:border-green-800"
      : type === "error"
        ? "border-red-200 dark:border-red-800"
        : "border-blue-200 dark:border-blue-800";

  const icon = type === "success" ? <SuccessIcon /> : type === "error" ? <ErrorIcon /> : <InfoIcon />;

  return (
    <div
      className={`fixed bottom-16 right-4 z-50 transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className={`flex items-center p-3 rounded-lg shadow-lg border ${bgColor} ${textColor} ${borderColor}`}>
        <div className="flex-shrink-0 mr-2">{icon}</div>
        <div>{message}</div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="ml-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <title>Close icon</title>
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export const ToastContainer = () => {
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" | "info" }[]>([]);

  useEffect(() => {
    const handleToast = (event: CustomEvent) => {
      const { message, type } = event.detail;
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, message, type }]);
    };

    window.addEventListener("show-toast", handleToast as EventListener);

    return () => {
      window.removeEventListener("show-toast", handleToast as EventListener);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <>
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}
    </>
  );
};

export const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
  const event = new CustomEvent("show-toast", {
    detail: { message, type },
  });
  window.dispatchEvent(event);
};
