import { memo } from "react";
import { useTheme } from "../hooks/use-theme";
import Avatar from "boring-avatars";

type FooterProps = {
  charCount?: number;
  pageName?: "Editor" | "Completed";
};

const EPHE_VERSION = "0.0.1";

const _Footer = ({ charCount, pageName }: FooterProps) => {
  const { toggleTheme, toggleTargetTheme } = useTheme();

  return (
    <footer className="fixed inset-x-0 bottom-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm space-mono">
      <div className="mx-auto px-2 py-0.5 text-sm text-gray-600 dark:text-gray-400 flex justify-between">
        <nav className="flex gap-4">
          <a href="/" className="hover:text-gray-900 dark:hover:text-gray-100">
            Editor
          </a>
          <a href="/completed-tasks" className="hover:text-gray-900 dark:hover:text-gray-100">
            Completed
          </a>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleTheme();
            }}
            className="hover:text-gray-900 dark:hover:text-gray-100"
            aria-label={`Switch to ${toggleTargetTheme} mode`}
          >
            {toggleTargetTheme === "light" ? "Light" : "Dark"}
          </button>
        </nav>
        <div className="flex items-center space-x-2 min-w-0">
          {pageName === "Editor" && charCount !== undefined && (
            <span className="text-gray-500 whitespace-nowrap">{charCount} chars</span>
          )}
          <a
            href="https://github.com/unvalley/ephe"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-900 dark:hover:text-gray-100"
          >
            GitHub
          </a>
          <>
            <Avatar
              size={12}
              name="Georgia O"
              colors={["#6c788e", "#a6aec1", "#cfd5e1", "#ededf2", "#fcfdff"]}
              variant="marble"
              className="flex-shrink-0"
            />
            <a href="/landing" className="hover:text-gray-900 dark:hover:text-gray-100 whitespace-nowrap">
              Ephe v{EPHE_VERSION}
            </a>
          </>
        </div>
      </div>
    </footer>
  );
};

export const Footer = memo(_Footer);
