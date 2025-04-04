import { toast as sonnerToast, Toaster as SonnerToaster } from "sonner";

type ToastType = "success" | "error" | "info" | "default";

export const ToastContainer = () => {
  return <SonnerToaster position="top-right" closeButton richColors />;
};

export const showToast = (message: string, type: ToastType = "default") => {
  switch (type) {
    case "success":
      sonnerToast.success(message);
      break;
    case "error":
      sonnerToast.error(message);
      break;
    case "info":
      sonnerToast.info(message);
      break;
    default:
      sonnerToast(message);
  }
};
