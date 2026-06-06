import { type ButtonProps, Button } from "@headlessui/react";
import { useUserActivity } from "../hooks/use-user-activity";

type FooterProps = {
  leftContent: React.ReactNode;
  centerContent?: React.ReactNode;
  rightContent: React.ReactNode;
  autoHide?: boolean;
};

export const Footer = ({ leftContent, rightContent, centerContent, autoHide = false }: FooterProps) => {
  const { isHidden } = useUserActivity({
    showDelay: 800,
  });

  const shouldHide = autoHide && isHidden;

  return (
    <footer
      className={`fixed inset-x-0 bottom-0 bg-transparent transition-opacity duration-300 ease-in-out ${
        shouldHide ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="mx-auto flex items-center justify-between px-2 py-1 text-sm">
        <div>{leftContent}</div>
        {centerContent ? (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">{centerContent}</div>
        ) : null}
        <div className="flex min-w-0 items-center gap-1">{rightContent}</div>
      </div>
    </footer>
  );
};

export const FooterButton = ({ children, ...props }: ButtonProps) => {
  return (
    <Button
      as={props.as}
      className="inline-flex h-9 select-none items-center whitespace-nowrap rounded-md bg-white/90 px-3 text-[13px] text-neutral-950 backdrop-blur-xl transition-[background-color,transform] duration-150 ease-out hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 active:translate-y-px dark:bg-neutral-950/85 dark:text-neutral-50 dark:focus-visible:ring-neutral-600 dark:hover:bg-neutral-900"
      {...props}
    >
      {children}
    </Button>
  );
};
