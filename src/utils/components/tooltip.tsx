import type { ReactNode } from "react";

type TooltipProps = {
  children: ReactNode;
  isVisible: boolean;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
};

export const Tooltip = ({ children, isVisible, position = "bottom", className = "" }: TooltipProps) => {
  const positionClasses = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2",
  };

  return (
    <div
      className={`-translate-x-1/2 absolute left-1/2 whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-white text-xs transition-all delay-200 duration-300 dark:bg-gray-200 dark:text-primary-800 ${
        positionClasses[position]
      } ${isVisible ? "opacity-100" : "opacity-0"} ${className}`}
    >
      {children}
    </div>
  );
};
