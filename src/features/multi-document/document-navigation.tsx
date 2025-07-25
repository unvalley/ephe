import { useAtom } from "jotai";
import { activeDocumentIndexAtom, documentsAtom } from "../../utils/atoms/editor";
import { useState, useEffect } from "react";
import { CaretLeftIcon, CaretRightIcon} from "@phosphor-icons/react";

type NavigationCardProps = {
  direction: "left" | "right";
  isVisible: boolean;
  onClick: () => void;
  documentIndex: number;
  documentPreview?: string;
}

const NavigationCard = ({ direction, isVisible, onClick }: NavigationCardProps) => {

  return (
    <div
      className={`-translate-y-1/2 absolute top-1/2 z-50 transition-all duration-500 ease-out ${
        direction === "left" ? "left-6" : "right-6"
      } ${
        isVisible 
          ? "pointer-events-auto translate-x-0 scale-100 opacity-100" 
          : `pointer-events-none scale-95 opacity-0 ${
              direction === "left" ? "-translate-x-4" : "translate-x-4"
            }`
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="group relative flex h-16 w-16 items-center justify-center rounded-xl bg-white shadow-xl transition-all duration-400 ease-out hover:scale-110 hover:bg-gray-50 hover:shadow-2xl dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-750"
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        
        <div className="text-gray-600 transition-colors duration-300 group-hover:text-gray-800 dark:text-gray-400 dark:group-hover:text-gray-200">
          {direction === "left" ? <CaretLeftIcon size={24} weight="bold" /> : <CaretRightIcon size={24} weight="bold" />}
        </div>
        
        {/* Floating indicator */}
        <div className="-bottom-8 -translate-x-1/2 absolute left-1/2 rounded-md bg-gray-800 px-2 py-1 text-white text-xs opacity-0 transition-all delay-200 duration-300 group-hover:opacity-100 dark:bg-gray-200 dark:text-gray-800">
          {direction === "left" ? "Previous" : "Next"}
        </div>
      </button>
    </div>
  );
};

export const DocumentNavigation = () => {
  const [activeIndex] = useAtom(activeDocumentIndexAtom);
  const [documents] = useAtom(documentsAtom);
  const [showLeftCard, setShowLeftCard] = useState(false);
  const [showRightCard, setShowRightCard] = useState(false);

  const canGoLeft = activeIndex > 0;
  const canGoRight = activeIndex < documents.length - 1;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const threshold = 120; // pixels from edge - increased for better UX
      const { clientX } = e;
      const windowWidth = window.innerWidth;

      if (canGoLeft && clientX < threshold) {
        setShowLeftCard(true);
      } else {
        setShowLeftCard(false);
      }

      if (canGoRight && clientX > windowWidth - threshold) {
        setShowRightCard(true);
      } else {
        setShowRightCard(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [canGoLeft, canGoRight]);

  const navigateToDocument = (newIndex: number) => {
    window.dispatchEvent(new CustomEvent("navigate-to-document", { detail: { index: newIndex } }));
  };

  return (
    <>
      {canGoLeft && (
        <NavigationCard
          direction="left"
          isVisible={showLeftCard}
          onClick={() => navigateToDocument(activeIndex - 1)}
          documentIndex={activeIndex - 1}
          documentPreview={documents[activeIndex - 1]?.content}
        />
      )}
      {canGoRight && (
        <NavigationCard
          direction="right"
          isVisible={showRightCard}
          onClick={() => navigateToDocument(activeIndex + 1)}
          documentIndex={activeIndex + 1}
          documentPreview={documents[activeIndex + 1]?.content}
        />
      )}
    </>
  );
};