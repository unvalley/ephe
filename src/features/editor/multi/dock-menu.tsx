import { useAtom } from "jotai";
import { activeDocumentIndexAtom, documentsAtom } from "../../../utils/atoms/multi-document";
import { useCallback, useMemo, useState, type DragEvent } from "react";
import { motion } from "motion/react";

const SPRING_CONFIG = {
  stiffness: 200,
  damping: 30,
};

const CARD_SIZE = { width: 140, height: 180 } as const;
const DOCK_PADDING = {
  idle: "60px 100px",
  active: "100px 150px",
} as const;

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
  const y = hoveredIndex === index ? -30 : 0;
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
  const [activeIndex, setActiveIndex] = useAtom(activeDocumentIndexAtom);
  const [documents, setDocuments] = useAtom(documentsAtom);
  const [isDockHovered, setIsDockHovered] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const documentPreviews = useMemo(
    () => documents.map((doc) => generatePreviewContent(doc.content) || ""),
    [documents],
  );

  const isDragging = draggedIndex !== null;
  const dockActive = isDockHovered || isDragging;

  const cardStyles = useMemo(
    () => documents.map((_, index) => calculateCardStyle(index, documents.length, hoveredIndex, dockActive)),
    [documents.length, hoveredIndex, dockActive],
  );

  const reorderDocuments = useCallback(
    (items: typeof documents, fromIndex: number, toIndex: number) => {
      const moved = items[fromIndex];
      if (!moved) return items;

      const withoutMoved = items.filter((_, index) => index !== fromIndex);
      return [...withoutMoved.slice(0, toIndex), moved, ...withoutMoved.slice(toIndex)];
    },
    [],
  );

  const getNextActiveIndex = useCallback((current: number, fromIndex: number, toIndex: number) => {
    if (current === fromIndex) return toIndex;
    if (fromIndex < toIndex && current > fromIndex && current <= toIndex) return current - 1;
    if (fromIndex > toIndex && current < fromIndex && current >= toIndex) return current + 1;
    return current;
  }, []);

  const moveDocument = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
      if (fromIndex >= documents.length || toIndex >= documents.length) return;

      setDocuments((prev) => reorderDocuments(prev, fromIndex, toIndex));
      setActiveIndex((current) => getNextActiveIndex(current, fromIndex, toIndex));
    },
    [documents.length, getNextActiveIndex, reorderDocuments, setActiveIndex, setDocuments],
  );

  const handleDrop = useCallback(
    (targetIndex: number) => {
      if (draggedIndex === null || draggedIndex === targetIndex) return;
      moveDocument(draggedIndex, targetIndex);
    },
    [draggedIndex, moveDocument],
  );

  const handleDockMouseLeave = useCallback(() => {
    if (isDragging) return;
    setIsDockHovered(false);
    setHoveredIndex(null);
  }, [isDragging]);

  const handleDragStart = useCallback(
    (index: number) => (event: DragEvent<HTMLButtonElement>) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", `${index}`);

      setIsDockHovered(true);
      setDraggedIndex(index);
      setHoveredIndex(null);
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setHoveredIndex(null);
    setIsDockHovered(false);
  }, []);

  return (
    <div
      role="toolbar"
      className="relative"
      style={{
        padding: dockActive ? DOCK_PADDING.active : DOCK_PADDING.idle,
      }}
      onMouseEnter={() => setIsDockHovered(true)}
      onMouseLeave={handleDockMouseLeave}
    >
      <nav aria-label="Document navigation" className="relative flex items-center justify-center">
        {documents.map((doc, index) => {
          const isActive = index === activeIndex;
          const cardStyle = cardStyles[index];
          const isDragged = draggedIndex === index;
          const isDropTarget = isDragging && hoveredIndex === index && draggedIndex !== index;
          const cardOpacity = isDragged ? 0 : dockActive ? 1 : 0;

          return (
            <motion.div
              key={doc.id}
              className="absolute"
              animate={{
                scale: cardStyle.scale,
                opacity: cardOpacity,
                x: cardStyle.x,
                y: cardStyle.y,
                rotate: cardStyle.rotate,
                width: dockActive ? CARD_SIZE.width : 0,
                height: dockActive ? CARD_SIZE.height : 0,
                zIndex: cardStyle.zIndex,
              }}
              transition={SPRING_CONFIG}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onDragOver={(event) => {
                if (draggedIndex === null) return;
                event.preventDefault();
                if (hoveredIndex !== index) {
                  setHoveredIndex(index);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(index);
                setDraggedIndex(null);
                setHoveredIndex(null);
                setIsDockHovered(false);
              }}
            >
              <button
                type="button"
                draggable={dockActive}
                onDragStart={handleDragStart(index)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  if (isDragging) return;
                  onNavigate(index);
                }}
                className={`${getCardButtonClasses(isActive, dockActive)} ${
                  isDragged ? "cursor-grabbing opacity-60" : "cursor-grab"
                } ${isDropTarget ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900" : ""}`}
                aria-label={`Go to document ${index + 1}`}
              >
                {dockActive && (
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
