"use client";

import { Link } from "react-router-dom";
import { memo } from "react";
import Avatar from "boring-avatars";
import { EyeIcon } from "./icons";
// TODO: organize depndency direction, don't import from features
import { SystemMenu } from "../features/system/system-menu";
import { useSystemMenu } from "../features/system/system-context";
import { DaysDisplay } from "./days-display";

type FooterProps = {
  previewMode?: boolean;
  togglePreview?: () => void;
};

const EPHE_VERSION = "0.0.1";

const _Footer = ({ previewMode = false, togglePreview }: FooterProps) => {
  const { isSystemMenuOpen, toggleSystemMenu } = useSystemMenu();

  return (
    <footer className="fixed inset-x-0 bottom-0 bg-transparent">
      <div className="flex mx-auto px-2 py-1 text-sm justify-between items-center">
        <nav className="flex">
          <div className="relative">
            <button
              id="system-menu-trigger"
              type="button"
              onClick={toggleSystemMenu}
              className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <span>System</span>
            </button>
            {isSystemMenuOpen && (
              <div className="absolute bottom-full mb-2 left-0 z-10">
                <div className="border border-neutral-100 dark:border-neutral-700 rounded-md overflow-hidden shadow-lg">
                  <SystemMenu />
                </div>
              </div>
            )}
          </div>
          <Link
            to="/"
            className="flex items-center px-2 py-1 rounded-md transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Editor
          </Link>
          <Link
            to="/history"
            className="flex items-center px-2 py-1 rounded-md transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            History
          </Link>
        </nav>

        <div className="flex items-center gap-1 min-w-0">
          <DaysDisplay />

          {togglePreview && (
            <button
              onClick={togglePreview}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
                previewMode
                  ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                  : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              <EyeIcon className={`h-3.5 w-3.5 ${previewMode ? "text-primary-500" : ""}`} />
              <span>{previewMode ? "Edit" : "Preview"}</span>
            </button>
          )}

          <div className="flex items-center">
            <Avatar
              size={12}
              name="Georgia O"
              colors={["#6c788e", "#a6aec1", "#cfd5e1", "#ededf2", "#fcfdff"]}
              variant="marble"
              className="flex-shrink-0 mr-1"
            />
            <Link to="/landing" className="whitespace-nowrap">
              Ephe v{EPHE_VERSION}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export const Footer = memo(_Footer);
