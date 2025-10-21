import { toast as sonnerToast, Toaster as SonnerToaster, type ExternalToast } from "sonner";

type ToastType = "success" | "error" | "info" | "default";

export const ToastContainer = () => {
  return <SonnerToaster position="top-right" closeButton richColors />;
};

export const showToast = (message: string, type: ToastType = "default", options?: ExternalToast) => {
  switch (type) {
    case "success":
      sonnerToast.success(message, options);
      break;
    case "error":
      sonnerToast.error(message, options);
      break;
    case "info":
      sonnerToast.info(message, options);
      break;
    default:
      sonnerToast(message, options);
  }
};
