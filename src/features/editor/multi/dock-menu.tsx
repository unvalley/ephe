import { useAtom } from "jotai";
import { activeDocumentIndexAtom, documentsAtom } from "../../../utils/atoms/multi-document";
import { useCallback, useMemo, useRef, useState, type DragEvent } from "react";
import { motion } from "motion/react";

const SPRING_CONFIG = {
  stiffness: 180,
  damping: 40,
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

export const generatePreviewContent = (content: string): string => {
  const lines = content.split("\n").slice(0, 5).join("\n");
  return lines.length > 100 ? `${lines.substring(0, 100)}...` : lines;
};

export const calculateCardStyle = (
  index: number,
  total: number,
  hoveredIndex: number | null,
  dockActive: boolean,
): CardStyle => {
  if (!dockActive) {
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

const useCardStyles = (total: number, hoveredIndex: number | null, dockActive: boolean) => {
  return useMemo(
    () => Array.from({ length: total }, (_, index) => calculateCardStyle(index, total, hoveredIndex, dockActive)),
    [total, hoveredIndex, dockActive],
  );
};

type DockDragState = {
  isDockHovered: boolean;
  hoveredIndex: number | null;
  draggedIndex: number | null;
};

const useDockDragState = () => {
  const [dockState, setDockState] = useState<DockDragState>({
    isDockHovered: false,
    hoveredIndex: null,
    draggedIndex: null,
  });

  const isDragging = dockState.draggedIndex !== null;
  const dockActive = dockState.isDockHovered || isDragging;

  const handleDockMouseLeave = useCallback(() => {
    if (isDragging) return;
    setDockState((prev) => ({
      ...prev,
      isDockHovered: false,
      hoveredIndex: null,
    }));
  }, [isDragging]);

  const handleDragStart = useCallback(
    (index: number) => (event: DragEvent<HTMLButtonElement>) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", `${index}`);

      setDockState((prev) => ({
        ...prev,
        isDockHovered: true,
        draggedIndex: index,
        hoveredIndex: null,
      }));
    },
    [],
  );

  const handleDragEnd = useCallback((keepOpen: boolean) => {
    setDockState({
      isDockHovered: keepOpen,
      hoveredIndex: null,
      draggedIndex: null,
    });
  }, []);

  return {
    dockActive,
    dockState,
    handleDockMouseLeave,
    handleDragEnd,
    handleDragStart,
    isDragging,
    setDockState,
  };
};

type DocumentDockProps = {
  onNavigate: (index: number) => void;
};

export const DocumentDock = ({ onNavigate }: DocumentDockProps) => {
  const dockRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useAtom(activeDocumentIndexAtom);
  const [documents, setDocuments] = useAtom(documentsAtom);
  const { dockActive, handleDockMouseLeave, handleDragEnd, handleDragStart, isDragging, dockState, setDockState } =
    useDockDragState();

  const documentPreviews = useMemo(() => documents.map((doc) => generatePreviewContent(doc.content)), [documents]);
  const hoveredIndexForStyle = isDragging ? null : dockState.hoveredIndex;
  const cardStyles = useCardStyles(documents.length, hoveredIndexForStyle, dockActive);

  const handleDrop = useCallback(
    (targetIndex: number) => {
      if (dockState.draggedIndex === null || dockState.draggedIndex === targetIndex) return;

      const fromIndex = dockState.draggedIndex;
      const toIndex = targetIndex;
      if (fromIndex < 0 || toIndex < 0) return;
      if (fromIndex >= documents.length || toIndex >= documents.length) return;

      setDocuments((prev) => {
        const moved = prev[fromIndex];
        if (!moved) return prev;
        const withoutMoved = prev.filter((_, index) => index !== fromIndex);
        return [...withoutMoved.slice(0, toIndex), moved, ...withoutMoved.slice(toIndex)];
      });

      setActiveIndex((current) => {
        if (current === fromIndex) return toIndex;
        if (fromIndex < toIndex && current > fromIndex && current <= toIndex) return current - 1;
        if (fromIndex > toIndex && current < fromIndex && current >= toIndex) return current + 1;
        return current;
      });
    },
    [dockState.draggedIndex, documents.length, setActiveIndex, setDocuments],
  );

  const insertionIndex =
    isDragging &&
    dockState.hoveredIndex !== null &&
    dockState.draggedIndex !== null &&
    dockState.hoveredIndex !== dockState.draggedIndex
      ? dockState.hoveredIndex
      : null;

  return (
    <div
      ref={dockRef}
      role="toolbar"
      className="relative"
      style={{
        padding: dockActive ? DOCK_PADDING.active : DOCK_PADDING.idle,
      }}
      onMouseEnter={() => setDockState((prev) => ({ ...prev, isDockHovered: true }))}
      onMouseLeave={handleDockMouseLeave}
    >
      <nav aria-label="Document navigation" className="relative flex items-center justify-center">
        {documents.map((doc, index) => {
          const isActive = index === activeIndex;
          const cardStyle = cardStyles[index];
          const isDragged = dockState.draggedIndex === index;
          const cardOpacity = isDragged ? 0 : dockActive ? 1 : 0;
          const insertionGap = insertionIndex !== null ? 26 : 0;
          const insertionGapOffset =
            insertionIndex === null
              ? 0
              : index === insertionIndex
                ? insertionGap
                : index === insertionIndex - 1
                  ? -insertionGap
                  : 0;

          return (
            <motion.div
              key={doc.id}
              className="absolute"
              animate={{
                scale: cardStyle.scale,
                opacity: cardOpacity,
                x: cardStyle.x + insertionGapOffset,
                y: cardStyle.y,
                rotate: cardStyle.rotate,
                width: dockActive ? CARD_SIZE.width : 0,
                height: dockActive ? CARD_SIZE.height : 0,
                zIndex: cardStyle.zIndex,
              }}
              transition={SPRING_CONFIG}
              onMouseEnter={() => {
                if (isDragging) return;
                setDockState((prev) => ({
                  ...prev,
                  hoveredIndex: index,
                }));
              }}
              onMouseLeave={() => {
                if (isDragging) return;
                setDockState((prev) => ({
                  ...prev,
                  hoveredIndex: null,
                }));
              }}
              onDragOver={(event) => {
                if (dockState.draggedIndex === null || dockState.draggedIndex === index) return;
                event.preventDefault();
                setDockState((prev) => (prev.hoveredIndex === index ? prev : { ...prev, hoveredIndex: index }));
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(index);
              }}
            >
              <button
                type="button"
                draggable={dockActive}
                onDragStart={handleDragStart(index)}
                onDragEnd={() => handleDragEnd(dockRef.current?.matches(":hover") ?? false)}
                onClick={() => {
                  if (isDragging) return;
                  onNavigate(index);
                }}
                className={`${getCardButtonClasses(isActive, dockActive)} ${
                  isDragged ? "cursor-grabbing opacity-60" : "cursor-grab"
                }`}
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
