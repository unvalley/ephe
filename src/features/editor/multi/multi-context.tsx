import { createContext, useContext, type ReactNode } from "react";

type MultiDocumentContextValue = {
  navigateToDocument: (index: number) => void;
};

const MultiDocumentContext = createContext<MultiDocumentContextValue | null>(null);

export const MultiDocumentProvider = ({
  children,
  navigateToDocument,
}: {
  children: ReactNode;
  navigateToDocument: (index: number) => void;
}) => {
  return <MultiDocumentContext.Provider value={{ navigateToDocument }}>{children}</MultiDocumentContext.Provider>;
};

export const useMultiDocument = () => {
  const context = useContext(MultiDocumentContext);
  if (!context) {
    throw new Error("useMultiDocument must be used within MultiDocumentProvider");
  }
  return context;
};
