import { useAtom } from "jotai";
import { activeDocumentIndexAtom, documentsAtom } from "../../../utils/atoms/multi-document";
import { useState } from "react";
import { motion, type Transition } from "framer-motion";

const SPRING_CONFIG = {
  stiffness: 100,
  damping: 30,
  mass: 1.2,
} satisfies Transition;

type CardStyle = {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  zIndex: number;
};

type DocumentDockProps = {
  onNavigate: (index: number) => void;
};
export const generatePreviewContent = (content: string): string => {
  const lines = content.split("\n").slice(0, 5).join("\n");
  return lines.length > 100 ? `${lines.substring(0, 100)}...` : lines;
};

export const calculateCardStyle = (index: number, total: number, hoveredIndex: number | undefined): CardStyle => {
  const centerIndex = (total - 1) / 2;
  const offsetFromCenter = index - centerIndex;

  return {
    x: offsetFromCenter * 80,
    y: 0,
    rotate: (offsetFromCenter / Math.max(centerIndex, 1)) * 15,
    scale: hoveredIndex === index ? 1.15 : 1.0,
    zIndex: total - index,
  };
};

export const getCardButtonClasses = (isActive: boolean, isDockHovered: boolean): string => {
  const baseClasses = "w-full h-full relative overflow-hidden";

  const shapeClasses = isDockHovered ? "rounded-lg border shadow-lg backdrop-blur-sm" : "rounded-md";

  const stateClasses = isActive
    ? isDockHovered
      ? "border-2 border-blue-500 bg-white shadow-2xl dark:border-blue-400 dark:bg-neutral-800"
      : "bg-gray-200 dark:bg-gray-100"
    : isDockHovered
      ? "border-gray-300 bg-white/90 hover:border-gray-400 dark:border-gray-600 dark:bg-neutral-800/90"
      : "bg-gray-100 dark:bg-gray-600";

  return `${baseClasses} ${shapeClasses} ${stateClasses}`;
};

export const DocumentDock = ({ onNavigate }: DocumentDockProps) => {
  const [activeIndex] = useAtom(activeDocumentIndexAtom);
  const [documents] = useAtom(documentsAtom);
  const [isDockHovered, setIsDockHovered] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | undefined>(undefined);

  const documentPreviews = documents.map((doc) => generatePreviewContent(doc.content) || "Empty");

  const cardStyles = documents.map((_, index) => calculateCardStyle(index, documents.length, hoveredIndex));

  return (
    <div
      role="toolbar"
      className="relative"
      style={{
        padding: isDockHovered ? "100px 150px" : "100px 120px",
      }}
      onMouseEnter={() => setIsDockHovered(true)}
      onMouseLeave={() => {
        setIsDockHovered(false);
        setHoveredIndex(undefined);
      }}
    >
      <nav aria-label="Document navigation" className="relative flex items-center justify-center">
        {documents.map((doc, index) => {
          const isActive = index === activeIndex;
          const cardStyle = cardStyles[index];

          return (
            <motion.div
              key={doc.id}
              className="absolute"
              animate={{
                scale: cardStyle.scale,
                opacity: isDockHovered ? 1 : 0,
                x: cardStyle.x,
                y: cardStyle.y,
                rotate: cardStyle.rotate,
                width: isDockHovered ? 140 : 0,
                height: isDockHovered ? 180 : 0,
                zIndex: cardStyle.zIndex,
              }}
              transition={SPRING_CONFIG}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(undefined)}
            >
              <button
                type="button"
                onClick={() => onNavigate(index)}
                className={getCardButtonClasses(isActive, isDockHovered)}
                aria-label={`Go to document ${index + 1}`}
              >
                {isDockHovered && (
                  <div className="flex h-full flex-col p-3">
                    <div className="flex-1 overflow-hidden">
                      <pre className="text-left text-[10px] text-gray-500 leading-tight dark:text-gray-300">
                        {documentPreviews[index]}
                      </pre>
                    </div>
                    {isActive && <div className="mt-1 h-1 w-full rounded-full bg-blue-500" />}
                  </div>
                )}
              </button>
            </motion.div>
          );
        })}
      </nav>
    </div>
  );
};
