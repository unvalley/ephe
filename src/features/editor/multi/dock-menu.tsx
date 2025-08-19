import { useAtom } from "jotai";
import { activeDocumentIndexAtom, documentsAtom } from "../../../utils/atoms/multi-document";
import { useState } from "react";
import { motion } from "motion/react";

const SPRING_CONFIG = {
  stiffness: 200,
  damping: 30,
};

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

export const calculateCardStyle = (
  index: number,
  total: number,
  hoveredIndex: number | null,
  isDockHovered: boolean,
): CardStyle => {
  if (!isDockHovered) {
    return { x: 0, y: 0, rotate: 0, scale: 0, zIndex: 1 };
  }

  const centerIndex = (total - 1) / 2;
  const offsetFromCenter = index - centerIndex;

  const x = offsetFromCenter * 80;
  const y = 0;
  const rotation = (offsetFromCenter / Math.max(centerIndex, 1)) * 15;
  const scale = hoveredIndex === index ? 1.15 : 1.0;
  const zIndex = 100 - offsetFromCenter;

  return { x, y, rotate: rotation, scale, zIndex };
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const documentPreviews = documents.map((doc) => generatePreviewContent(doc.content) || "Empty");

  const cardStyles = documents.map((_, index) =>
    calculateCardStyle(index, documents.length, hoveredIndex, isDockHovered),
  );

  return (
    <div
      role="toolbar"
      className="relative"
      style={{
        padding: isDockHovered ? "100px 150px" : "60px 100px",
      }}
      onMouseEnter={() => setIsDockHovered(true)}
      onMouseLeave={() => {
        setIsDockHovered(false);
        setHoveredIndex(null);
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
              onMouseLeave={() => setHoveredIndex(null)}
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
