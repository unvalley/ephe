import { useEffect, useState } from "react";

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

  const icon =
    type === "success" ? (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-green-500 dark:text-green-400"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <title>Success icon</title>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ) : type === "error" ? (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-red-500 dark:text-red-400"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <title>Error icon</title>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ) : (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-blue-500 dark:text-blue-400"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <title>Info icon</title>
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    );

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
