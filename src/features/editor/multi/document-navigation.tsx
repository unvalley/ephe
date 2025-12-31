import { useAtom } from "jotai";
import { activeDocumentIndexAtom, documentsAtom } from "../../../utils/atoms/multi-document";
import { useState, useEffect } from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useMultiDocument } from "./multi-context";
import { Tooltip } from "../../../utils/components/tooltip";

type NavigationCardProps = {
  direction: "left" | "right";
  isVisible: boolean;
  onClick: () => void;
  documentIndex: number;
  documentPreview?: string;
};

const NavigationCard = ({ direction, isVisible, onClick }: NavigationCardProps) => {
  return (
    <div
      className={`absolute top-1/2 z-50 -translate-y-1/2 transition-all duration-500 ease-out ${
        direction === "left" ? "left-6" : "right-6"
      } ${
        isVisible
          ? "pointer-events-auto translate-x-0 scale-100 opacity-100"
          : `pointer-events-none scale-95 opacity-0 ${direction === "left" ? "-translate-x-4" : "translate-x-4"}`
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="group relative flex h-16 w-16 items-center justify-center rounded-xl bg-white shadow-xl transition-all duration-400 ease-out hover:scale-110 hover:bg-primary-50 hover:shadow-2xl dark:border-gray-700 dark:bg-primary-700 dark:hover:bg-primary-750"
        style={{
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="text-primary-600 transition-colors duration-300 group-hover:text-primary-800 dark:text-primary-400 dark:group-hover:text-primary-200">
          {direction === "left" ? (
            <CaretLeftIcon size={24} weight="bold" />
          ) : (
            <CaretRightIcon size={24} weight="bold" />
          )}
        </div>

        <Tooltip isVisible={false} position="bottom" className="group-hover:opacity-100">
          {direction === "left" ? "Previous" : "Next"}
        </Tooltip>
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

  const { navigateToDocument } = useMultiDocument();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const yThreshold = 80; // Vertical threshold for showing cards
      const xThreshold = 100; // Horizontal threshold for showing cards
      const inVerticalRange = clientY > yThreshold && clientY < window.innerHeight - yThreshold;

      setShowLeftCard(canGoLeft && clientX < xThreshold && inVerticalRange);
      setShowRightCard(canGoRight && clientX > window.innerWidth - xThreshold && inVerticalRange);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [canGoLeft, canGoRight]);

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
