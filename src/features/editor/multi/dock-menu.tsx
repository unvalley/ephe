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
    const lines = content.split("\n").slice(0, 5);
    return lines.join("\n").substring(0, 100) + (content.length > 100 ? "..." : "");
  };

  const getCardStyle = (index: number, total: number) => {
    if (!isDockHovered) return {};
    
    const centerIndex = (total - 1) / 2;
    const offsetFromCenter = index - centerIndex;
    
    // Horizontal spacing - tighter distribution
    const cardSpacing = 80; // Space between cards
    const x = offsetFromCenter * cardSpacing;
    
    // No vertical offset - keep horizontal line
    const y = 0;
    
    // Subtle rotation - only slight tilt for outer cards
    const maxRotation = 15; // Maximum rotation in degrees
    const rotation = (offsetFromCenter / Math.max(centerIndex, 1)) * maxRotation;
    
    // Uniform scale
    const scale = hoveredIndex === index ? 1.1 : 1.0;
    
    // Z-index for stacking - left cards on top
    const zIndex = 100 - offsetFromCenter;
    
    return {
      x,
      y,
      rotate: rotation,
      scale,
      zIndex,
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
                className="absolute"
                initial={false}
                animate={{
                  scale: isDockHovered ? (cardStyle.scale || 1) : 0.8,
                  opacity: 1,
                  x: isDockHovered ? cardStyle.x : index * 20 - (documents.length - 1) * 10,
                  y: isDockHovered ? cardStyle.y : 0,
                  rotate: isDockHovered ? cardStyle.rotate : 0,
                  width: isDockHovered ? 140 : isActive ? 32 : 12,
                  height: isDockHovered ? 180 : 12,
                  zIndex: isDockHovered ? cardStyle.zIndex : 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  mass: 0.7,
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
                  className={`relative overflow-hidden ${
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
                  <motion.div 
                    className="flex h-full flex-col p-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isDockHovered ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex-1 overflow-hidden">
                      <pre className="text-[10px] text-left text-gray-500 leading-tight dark:text-gray-500">
                        {getPreviewContent(doc.content) || "Empty"}
                      </pre>
                    </div>
                    {isActive && (
                      <div className="mt-1 h-1 w-full rounded-full bg-blue-500" />
                    )}
                  </motion.div>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </nav>
    </div>
  );
};
