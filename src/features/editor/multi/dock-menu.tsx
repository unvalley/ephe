import { useAtom } from "jotai";
import { activeDocumentIndexAtom, documentsAtom } from "../../../utils/atoms/multi-document";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type DocumentDockProps = {
  onNavigate: (index: number) => void;
};

export const DocumentDock = ({ onNavigate }: DocumentDockProps) => {
  const [activeIndex] = useAtom(activeDocumentIndexAtom);
  const [documents] = useAtom(documentsAtom);
  const [isDockHovered, setIsDockHovered] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const getPreviewContent = (content: string) => {
    const lines = content.split("\n").slice(0, 3);
    return lines.join("\n").substring(0, 50) + (content.length > 50 ? "..." : "");
  };

  const getCardStyle = (index: number, total: number) => {
    if (!isDockHovered) return {};
    
    // Simple arc with golden ratio
    const phi = 1.618033988749895; // Golden ratio
    const centerIndex = (total - 1) / 2;
    const offsetFromCenter = index - centerIndex;
    
    // Simple arc angle
    const angleRange = 80;
    const angle = (offsetFromCenter / centerIndex) * (angleRange / 2);
    const radians = (angle * Math.PI) / 180;
    
    // Simple radius with slight variation
    const radius = 60;
    const x = Math.sin(radians) * radius;
    
    // Gentle parabolic curve for vertical - much subtler
    const yParabolic = -Math.pow(offsetFromCenter, 2) * 0.3 + 10;
    
    // Simple rotation following the arc
    const rotation = angle / phi;
    
    // Subtle scale variation using gaussian
    const gaussian = Math.exp(-Math.pow(offsetFromCenter / 3, 2));
    const baseScale = 0.95 + gaussian * 0.1;
    
    return {
      x,
      y: yParabolic,
      rotate: rotation,
      scale: hoveredIndex === index ? baseScale * 1.15 : baseScale,
    };
  };


  return (
    <div
      role="toolbar"
      className="relative transition-all duration-500 ease-out"
      style={{
        padding: isDockHovered ? "100px 160px 32px 160px" : "32px 48px 32px 48px",
        margin: isDockHovered ? "-100px -160px -32px -160px" : "-32px -48px -32px -48px",
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
      onMouseEnter={() => setIsDockHovered(true)}
      onMouseLeave={() => {
        setIsDockHovered(false);
        setHoveredIndex(null);
      }}
    >
      <nav
        aria-label="Document navigation"
        className="relative flex items-center justify-center"
      >
        <AnimatePresence>
          {documents.map((doc, index) => {
            const isActive = index === activeIndex;
            const cardStyle = getCardStyle(index, documents.length);
            
            return (
              <motion.div
                key={doc.id}
                className="absolute will-change-transform"
                initial={false}
                animate={{
                  scale: isDockHovered ? (cardStyle.scale || 1) : 0.5,
                  opacity: 1,
                  x: isDockHovered ? cardStyle.x : index * 16 - (documents.length - 1) * 8,
                  y: isDockHovered ? cardStyle.y : 0,
                  rotate: isDockHovered ? cardStyle.rotate : 0,
                  width: isDockHovered ? 80 : isActive ? 24 : 8,
                  height: isDockHovered ? 100 : 8,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                  mass: 0.8,
                }}
                whileHover={{
                  scale: isDockHovered ? 1.15 : 1,
                  transition: { duration: 0.15 },
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <button
                  type="button"
                  onClick={() => onNavigate(index)}
                  className={`relative overflow-hidden transition-colors duration-200 ${
                    isDockHovered
                      ? "rounded-lg border shadow-lg backdrop-blur-sm"
                      : "rounded-full"
                  } ${
                    isActive
                      ? isDockHovered
                        ? "border-blue-500 bg-white shadow-xl dark:border-blue-400 dark:bg-neutral-800"
                        : "bg-gray-800 dark:bg-gray-200"
                      : isDockHovered
                        ? "border-gray-300 bg-white/90 hover:border-gray-400 dark:border-gray-600 dark:bg-neutral-800/90"
                        : "bg-gray-400 dark:bg-gray-600"
                  }`}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                  aria-label={`Go to document ${index + 1}`}
                >
                  {isDockHovered && (
                    <div className="flex h-full flex-col p-2">
                      <div className="flex-1 overflow-hidden">
                        <pre className="text-[8px] text-gray-500 leading-tight dark:text-gray-500">
                          {getPreviewContent(doc.content) || "Empty"}
                        </pre>
                      </div>
                      {isActive && (
                        <div className="mt-1 h-1 w-full rounded-full bg-blue-500" />
                      )}
                    </div>
                  )}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </nav>
    </div>
  );
};
