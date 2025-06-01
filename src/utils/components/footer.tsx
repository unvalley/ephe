import { type ButtonProps, Button } from "@headlessui/react";
import { useUserActivity } from "../hooks/use-user-activity";

type FooterProps = {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  autoHide?: boolean;
};

export const Footer = ({ leftContent, rightContent, autoHide = false }: FooterProps) => {
  const { isHidden } = useUserActivity({
    showDelay: 1500,
  });

  const shouldHide = autoHide && isHidden;

  return (
    <footer
      className={`fixed inset-x-0 bottom-0 bg-transparent transition-opacity duration-300 ease-in-out ${
        shouldHide ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="mx-auto flex items-center justify-between px-2 py-1 text-sm">
        <div className="relative">{leftContent}</div>
        <div className="flex min-w-0 items-center gap-1">{rightContent}</div>
      </div>
    </footer>
  );
};

export const FooterButton = ({ children, ...props }: ButtonProps) => {
  return (
    <Button
      as={props.as}
      className="whitespace-nowrap rounded-md bg-white px-2 py-1 transition-colors hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800"
      {...props}
    >
      {children}
    </Button>
  );
};
