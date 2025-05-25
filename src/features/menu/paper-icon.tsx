import { PaperMode } from "../../utils/hooks/use-paper-mode";

export const PaperModeIcon = ({ paperMode }: { paperMode: PaperMode }) => {
  return (
    <>
      {paperMode === "normal" ? (
        <span className="h-4 w-4 border border-neutral-500 dark:border-neutral-600" />
      ) : paperMode === "graph" ? (
        <span className="grid h-4 w-4 grid-cols-3 border border-neutral-500 opacity-70 dark:border-neutral-600">
          <span className="col-span-3 border-neutral-500 border-b dark:border-neutral-500" style={{ height: "33%" }} />
          <span className="col-span-3 border-neutral-500 border-b dark:border-neutral-500" style={{ height: "66%" }} />
        </span>
      ) : (
        <span className="flex h-4 w-4 items-center justify-center border border-neutral-500 dark:border-neutral-600">
          <span className="h-1 w-1 rounded-full bg-neutral-400 dark:bg-neutral-500" />
        </span>
      )}
    </>
  );
};
