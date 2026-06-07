"use client";

import { useTheme } from "../../utils/hooks/use-theme";
import { usePaperMode, type PaperMode } from "../../utils/hooks/use-paper-mode";
import { useEditorWidth, type EditorWidth } from "../../utils/hooks/use-editor-width";
import { useCharCount } from "../../utils/hooks/use-char-count";
import { useWordCount } from "../../utils/hooks/use-word-count";
import { FONT_FAMILY_OPTIONS, fontFamilyAtom, currentFontDisplayValueAtom } from "../../utils/hooks/use-font";
import { CURSOR_COLORS, CURSOR_COLOR_OPTIONS, useCursorColor, type CursorColor } from "../../utils/hooks/use-cursor-color";
import { useEditorMode, type EditorMode } from "../../utils/hooks/use-editor-mode";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { COLOR_THEME, type ColorTheme } from "../../utils/theme-initializer";
import {
  CheckCircleIcon,
  SunIcon,
  MoonIcon,
  DesktopIcon,
  TextAaIcon,
  ArrowsInLineHorizontalIcon,
  ArrowsOutLineHorizontalIcon,
} from "@phosphor-icons/react";
import { taskStorage } from "../editor/tasks/task-storage";
import { snapshotStorage } from "../snapshots/snapshot-storage";
import { useTaskAutoFlush, type TaskAutoFlushMode } from "../../utils/hooks/use-task-auto-flush";
import { useAtom, useAtomValue } from "jotai";

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

const panelClassName =
  "cosmos-menu-panel absolute bottom-full left-0 z-20 mb-2 w-[248px] max-w-[calc(100vw-1rem)] select-none overflow-hidden rounded-xl bg-white/95 p-2 text-[13px] text-neutral-950 shadow-xl backdrop-blur-xl focus:outline-none dark:bg-neutral-950/95 dark:text-neutral-50";

const rowBaseClassName =
  "flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 text-left transition-[background-color,transform,color] duration-150 ease-out";

const actionRowClassName = cx(
  rowBaseClassName,
  "focus:outline-none hover:bg-neutral-100/80 active:scale-[0.985] data-[focus]:bg-neutral-100/80 dark:hover:bg-white/10 dark:data-[focus]:bg-white/10",
);

const staticRowClassName = cx(rowBaseClassName, "hover:bg-neutral-50/80 dark:hover:bg-white/[0.06]");

const dividerClassName = "my-1 h-px bg-neutral-200/60 dark:bg-white/10";

type SystemMenuProps = {
  onOpenHistoryModal?: (tabIndex: number) => void;
};

type SegmentOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

type MenuRowProps = {
  label: string;
  children?: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
};

const useTodayCompletedTasks = (menuOpen: boolean) => {
  const [todayCompletedTasks, setTodayCompletedTasks] = useState(0);

  useEffect(() => {
    const today = new Date();
    const tasksByDate = taskStorage.getByDate({
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    });
    const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(today.getDate()).padStart(2, "0")}`;

    setTodayCompletedTasks(tasksByDate[todayDateStr]?.length ?? 0);
  }, [menuOpen]);

  return { todayCompletedTasks };
};

const useSnapshotCount = (menuOpen: boolean) => {
  const [snapshotCount, setSnapshotCount] = useState(0);

  useEffect(() => {
    setSnapshotCount(snapshotStorage.getAll().length);
  }, [menuOpen]);

  return { snapshotCount };
};

const ValuePill = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex min-w-0 max-w-28 items-center justify-center rounded-md bg-neutral-100 px-2.5 py-1 text-[12px] text-neutral-600 leading-none dark:bg-white/10 dark:text-neutral-300">
    <span className="truncate">{children}</span>
  </span>
);

const MenuRowContent = ({ label, children, icon }: Omit<MenuRowProps, "onClick">) => (
  <>
    <span className="min-w-0 truncate">{label}</span>
    {children ? (
      children
    ) : (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md text-neutral-900 transition-colors dark:text-neutral-100">
        {icon}
      </span>
    )}
  </>
);

const StaticMenuRow = ({ label, children, icon }: Omit<MenuRowProps, "onClick">) => (
  <div className={staticRowClassName}>
    <MenuRowContent label={label} icon={icon}>
      {children}
    </MenuRowContent>
  </div>
);

const ActionMenuRow = ({ label, children, icon, onClick }: MenuRowProps) => (
  <MenuItem as="div">
    <button type="button" className={actionRowClassName} onClick={onClick}>
      <MenuRowContent label={label} icon={icon}>
        {children}
      </MenuRowContent>
    </button>
  </MenuItem>
);

const SegmentedControl = <T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  variant = "icon",
}: {
  ariaLabel: string;
  value: T;
  options: Array<SegmentOption<T>>;
  onChange: (value: T) => void;
  variant?: "icon" | "text";
}) => (
  <span
    className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md bg-neutral-100 p-0.5 text-neutral-500 dark:bg-white/10 dark:text-neutral-400"
    title={ariaLabel}
  >
    {options.map((option) => {
      const active = option.value === value;

      return (
        <button
          type="button"
          key={option.value}
          aria-label={option.label}
          aria-pressed={active}
          className={cx(
            "flex h-7 items-center justify-center rounded text-[11px] leading-none transition-[background-color,color,transform,box-shadow] duration-150 ease-out hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 active:scale-95 dark:focus-visible:ring-neutral-600",
            variant === "icon" ? "w-7" : "min-w-9 px-2",
            active
              ? "bg-neutral-200 text-neutral-950 dark:bg-white/20 dark:text-neutral-50"
              : "hover:bg-white/80 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-neutral-50",
          )}
          onClick={(event) => {
            event.stopPropagation();
            onChange(option.value);
          }}
        >
          {variant === "icon" ? (option.icon ?? option.label) : option.label}
        </button>
      );
    })}
  </span>
);

const CursorColorControl = ({
  value,
  isDarkMode,
  onChange,
}: {
  value: CursorColor;
  isDarkMode: boolean;
  onChange: (value: CursorColor) => void;
}) => (
  <span
    className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md bg-neutral-100 p-0.5 dark:bg-white/10"
    title="Cursor color"
  >
    {CURSOR_COLOR_OPTIONS.map((option) => {
      const active = option === value;
      const color = CURSOR_COLORS[option];

      return (
        <button
          type="button"
          key={option}
          aria-label={color.label}
          aria-pressed={active}
          className={cx(
            "flex size-7 items-center justify-center rounded transition-[background-color,color,transform,box-shadow] duration-150 ease-out hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 active:scale-95 dark:focus-visible:ring-neutral-600",
            active
              ? "bg-neutral-200 text-neutral-950 dark:bg-white/20 dark:text-neutral-50"
              : "hover:bg-white/80 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-neutral-50",
          )}
          onClick={(event) => {
            event.stopPropagation();
            onChange(option);
          }}
        >
          <span
            className="size-3.5 rounded-full border border-black/10 dark:border-white/20"
            style={{ backgroundColor: isDarkMode ? color.valueDark : color.valueLight }}
          />
        </button>
      );
    })}
  </span>
);

export const SystemMenu = ({ onOpenHistoryModal }: SystemMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const { theme, setTheme, isDarkMode } = useTheme();
  const { paperMode, setPaperMode } = usePaperMode();
  const [fontFamily, setFontFamily] = useAtom(fontFamilyAtom);
  const currentFontDisplayValue = useAtomValue(currentFontDisplayValueAtom);
  const { editorMode, setSingleMode, setMultiMode } = useEditorMode();
  const { editorWidth, setNormalWidth, setWideWidth } = useEditorWidth();
  const { cursorColor, setCursorColor } = useCursorColor();
  const { charCount } = useCharCount();
  const { wordCount } = useWordCount();
  const { todayCompletedTasks } = useTodayCompletedTasks(menuOpen);
  const { snapshotCount } = useSnapshotCount(menuOpen);
  const { taskAutoFlushMode, setTaskAutoFlushMode } = useTaskAutoFlush();

  const themeOptions: Array<SegmentOption<ColorTheme>> = [
    { value: COLOR_THEME.LIGHT, label: "Light", icon: <SunIcon className="size-4" weight="regular" /> },
    { value: COLOR_THEME.DARK, label: "Dark", icon: <MoonIcon className="size-4" weight="regular" /> },
    { value: COLOR_THEME.SYSTEM, label: "System", icon: <DesktopIcon className="size-4" weight="regular" /> },
  ];

  const paperOptions: Array<SegmentOption<PaperMode>> = [
    { value: "normal", label: "Plain" },
    { value: "graph", label: "Grid" },
    { value: "dots", label: "Dots" },
  ];

  const widthOptions: Array<SegmentOption<EditorWidth>> = [
    { value: "normal", label: "Normal", icon: <ArrowsInLineHorizontalIcon className="size-4" weight="regular" /> },
    { value: "wide", label: "Wide", icon: <ArrowsOutLineHorizontalIcon className="size-4" weight="regular" /> },
  ];

  const editorOptions: Array<SegmentOption<EditorMode>> = [
    { value: "single", label: "Single" },
    { value: "multi", label: "Multi" },
  ];

  const taskFlushOptions: Array<SegmentOption<TaskAutoFlushMode>> = [
    { value: "off", label: "Off" },
    { value: "instant", label: "On" },
  ];

  const openTaskSnapshotModal = (tabIndex: number) => {
    if (!onOpenHistoryModal) return;
    setMenuOpen(false);
    onOpenHistoryModal(tabIndex);
  };

  const cycleFont = () => {
    const currentIndex = FONT_FAMILY_OPTIONS.indexOf(fontFamily);
    setFontFamily(FONT_FAMILY_OPTIONS[(currentIndex + 1) % FONT_FAMILY_OPTIONS.length]);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && menuOpen) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <Menu as="div" className="relative" ref={menuRef}>
      {({ open }) => (
        <>
          <MenuButton
            className="inline-flex h-9 select-none items-center rounded-md bg-white/90 px-3 text-[13px] text-neutral-950 backdrop-blur-xl transition-[background-color,transform] duration-150 ease-out hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 active:translate-y-px dark:bg-neutral-950/85 dark:text-neutral-50 dark:focus-visible:ring-neutral-600 dark:hover:bg-neutral-900"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            System
          </MenuButton>

          {(open || menuOpen) && (
            <MenuItems className={panelClassName} portal={false} static>
              <StaticMenuRow label="Characters">
                <ValuePill>{charCount > 0 ? charCount.toLocaleString() : "None"}</ValuePill>
              </StaticMenuRow>
              <StaticMenuRow label="Words">
                <ValuePill>{wordCount > 0 ? wordCount.toLocaleString() : "None"}</ValuePill>
              </StaticMenuRow>
              <ActionMenuRow
                label="Closed today"
                onClick={() => openTaskSnapshotModal(0)}
                icon={
                  <CheckCircleIcon
                    className={cx("size-5", todayCompletedTasks > 0 && "text-green-600 dark:text-green-400")}
                    weight="regular"
                  />
                }
              >
                <ValuePill>{todayCompletedTasks > 0 ? todayCompletedTasks : "None"}</ValuePill>
              </ActionMenuRow>
              <ActionMenuRow label="Snapshots" onClick={() => openTaskSnapshotModal(1)}>
                <ValuePill>{snapshotCount > 0 ? snapshotCount : "None"}</ValuePill>
              </ActionMenuRow>

              <div className={dividerClassName} />

              <StaticMenuRow label="Theme">
                <SegmentedControl ariaLabel="Theme" value={theme} options={themeOptions} onChange={setTheme} />
              </StaticMenuRow>
              <StaticMenuRow label="Paper">
                <SegmentedControl
                  ariaLabel="Paper"
                  value={paperMode}
                  options={paperOptions}
                  onChange={setPaperMode}
                  variant="text"
                />
              </StaticMenuRow>
              <StaticMenuRow label="Width">
                <SegmentedControl
                  ariaLabel="Editor width"
                  value={editorWidth}
                  options={widthOptions}
                  onChange={(next) => {
                    next === "normal" ? setNormalWidth() : setWideWidth();
                  }}
                />
              </StaticMenuRow>
              <ActionMenuRow label="Font" onClick={cycleFont} icon={<TextAaIcon className="size-5" weight="regular" />}>
                <ValuePill>{currentFontDisplayValue}</ValuePill>
              </ActionMenuRow>
              <StaticMenuRow label="Cursor">
                <CursorColorControl value={cursorColor} isDarkMode={isDarkMode} onChange={setCursorColor} />
              </StaticMenuRow>
              <StaticMenuRow label="Editor">
                <SegmentedControl
                  ariaLabel="Editor mode"
                  value={editorMode}
                  options={editorOptions}
                  onChange={(next) => {
                    if (next === editorMode) return;
                    next === "single" ? setSingleMode() : setMultiMode();
                  }}
                  variant="text"
                />
              </StaticMenuRow>

              <div className={dividerClassName} />

              <StaticMenuRow label="Task flush">
                <SegmentedControl
                  ariaLabel="Task flush"
                  value={taskAutoFlushMode}
                  options={taskFlushOptions}
                  onChange={setTaskAutoFlushMode}
                  variant="text"
                />
              </StaticMenuRow>
            </MenuItems>
          )}
        </>
      )}
    </Menu>
  );
};
