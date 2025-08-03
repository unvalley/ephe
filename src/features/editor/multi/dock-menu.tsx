import { useAtom } from "jotai";
import { activeDocumentIndexAtom, documentsAtom } from "../../../utils/atoms/multi-document";
import { useState } from "react";

type DocumentDockProps = {
  onNavigate: (index: number) => void;
};

export const DocumentDock = ({ onNavigate }: DocumentDockProps) => {
  const [activeIndex] = useAtom(activeDocumentIndexAtom);
  const [documents] = useAtom(documentsAtom);
  const [isDockHovered, setIsDockHovered] = useState(false);

  return (
    <div
      role="toolbar"
      className="relative transition-all duration-400 ease-out"
      style={{
        padding: "32px 48px 48px 48px", // top, right, bottom, left - extra bottom padding
        margin: "-32px -48px -48px -48px", // offset the padding to maintain visual position
      }}
      onMouseEnter={() => setIsDockHovered(true)}
      onMouseLeave={() => setIsDockHovered(false)}
    >
      <nav
        aria-label="Document navigation"
        className={`flex items-center rounded-md bg-white px-3 py-2 transition-all duration-400 ease-out dark:bg-neutral-900 ${
          isDockHovered ? "scale-105 gap-3" : "scale-100 gap-2"
        }`}
      >
        {documents.map((doc, index) => (
          <div key={doc.id} className="relative">
            <button
              type="button"
              onClick={() => onNavigate(index)}
              className={`rounded-full transition-all duration-400 ease-out hover:scale-110 ${
                isDockHovered
                  ? `h-4 w-4 ${index === activeIndex ? "w-12" : ""}`
                  : `h-2 w-2 ${index === activeIndex ? "w-6" : ""}`
              } ${
                index === activeIndex
                  ? "bg-gray-800 shadow-lg dark:bg-gray-200"
                  : "bg-gray-300 hover:bg-gray-500 dark:bg-gray-600 dark:hover:bg-gray-400"
              }`}
              aria-label={`Go to document ${index + 1}`}
            />
          </div>
        ))}
      </nav>
    </div>
  );
};
