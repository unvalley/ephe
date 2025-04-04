import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

type SystemContextType = {
  isSystemMenuOpen: boolean;
  openSystemMenu: () => void;
  closeSystemMenu: () => void;
  toggleSystemMenu: () => void;
};

const SystemContext = createContext<SystemContextType>({
  isSystemMenuOpen: false,
  openSystemMenu: () => {},
  closeSystemMenu: () => {},
  toggleSystemMenu: () => {},
});

type SystemProviderProps = {
  children: ReactNode;
};

export const SystemProvider = ({ children }: SystemProviderProps) => {
  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);

  const openSystemMenu = useCallback(() => {
    setIsSystemMenuOpen(true);
  }, []);

  const closeSystemMenu = useCallback(() => {
    setIsSystemMenuOpen(false);
  }, []);

  const toggleSystemMenu = useCallback(() => {
    setIsSystemMenuOpen((prev) => !prev);
  }, []);

  const handleOutsideClick = useCallback(
    (event: MouseEvent) => {
      if (isSystemMenuOpen) {
        const target = event.target as Node;
        const menuContainer = document.getElementById("system-menu-container");
        const menuTrigger = document.getElementById("system-menu-trigger");

        if (menuContainer && !menuContainer.contains(target) && menuTrigger && !menuTrigger.contains(target)) {
          setIsSystemMenuOpen(false);
        }
      }
    },
    [isSystemMenuOpen],
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [handleOutsideClick]);

  return (
    <SystemContext.Provider
      value={{
        isSystemMenuOpen,
        openSystemMenu,
        closeSystemMenu,
        toggleSystemMenu,
      }}
    >
      {children}
    </SystemContext.Provider>
  );
};

export const useSystemMenu = () => {
  return useContext(SystemContext);
};
