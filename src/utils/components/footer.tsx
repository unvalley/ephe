import { type ButtonProps, Button } from "@headlessui/react";
import { memo } from "react";

type FooterProps = {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
};

const _Footer = ({ leftContent, rightContent }: FooterProps) => {
  return (
    <footer className="fixed inset-x-0 bottom-0 bg-transparent">
      <div className="mx-auto flex items-center justify-between px-2 py-1 text-sm">
        <div className="relative">{leftContent}</div>
        <div className="flex min-w-0 items-center gap-3">{rightContent}</div>
      </div>
    </footer>
  );
};

export const Footer = memo(_Footer);

export const FooterButton = ({ children, ...props }: ButtonProps) => {
  return (
    <Button
      as={props.as}
      className="rounded-md px-2 py-1 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
      {...props}
    >
      {children}
    </Button>
  );
};
