import type { FC } from "react";
import { useEffect, useState } from "react";
import { useCharCount } from "../../utils/hooks/use-char-count";
import { useEditorWidth } from "../../utils/hooks/use-editor-width";
import { useFontFamily, FONT_FAMILIES } from "../../utils/hooks/use-font";
import { usePaperMode } from "../../utils/hooks/use-paper-mode";
import { useTaskAutoFlush } from "../../utils/hooks/use-task-auto-flush";
import { useTheme } from "../../utils/hooks/use-theme";
import { snapshotStorage } from "../snapshots/snapshot-storage";
import { taskStorage } from "../editor/tasks/task-storage";

const SegmentedControl: FC<{
	options: Array<{ value: string; label: string }>;
	value: string;
	onChange: (value: string) => void;
}> = ({ options, value, onChange }) => {
	return (
		<div className="inline-flex rounded-md bg-gray-100 p-0.5 shadow-sm dark:bg-gray-700">
			{options.map((option) => (
				<button
					key={option.value}
					type="button"
					onClick={() => onChange(option.value)}
					className={`rounded-md px-3 py-1 font-medium text-xs transition-all ${
							value === option.value
								? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-gray-100"
								: "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
						}
					`}
				>
					{option.label}
				</button>
			))}
		</div>
	);
};

const ToggleSwitch: FC<{
	checked: boolean;
	onChange: (checked: boolean) => void;
}> = ({ checked, onChange }) => {
	return (
		<button
			type="button"
			onClick={() => onChange(!checked)}
			className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${checked ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"}
			`}
		>
			<span
				className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}
				`}
			/>
		</button>
	);
};

const SettingRow: FC<{
	label: string;
	children: React.ReactNode;
}> = ({ label, children }) => {
	return (
		<div className="flex items-center justify-between py-2">
			<span className="text-gray-600 text-sm dark:text-gray-400">{label}</span>
			{children}
		</div>
	);
};

const SettingSection: FC<{
	title: string;
	children: React.ReactNode;
}> = ({ title, children }) => {
	return (
		<div className="mb-6 rounded-lg bg-gray-50 dark:bg-gray-800/50">
			<h3 className="border-gray-200 border-b px-4 py-3 font-medium text-gray-700 text-sm dark:border-gray-700 dark:text-gray-300">
				{title}
			</h3>
			<div className="space-y-4 p-4">{children}</div>
		</div>
	);
};

export const SettingsTab: FC = () => {
	const { theme, setTheme } = useTheme();
	const { paperMode, setPaperMode } = usePaperMode();
	const { editorWidth, setNormalWidth, setWideWidth } = useEditorWidth();
	const { fontFamily, setFontFamily } = useFontFamily();
	const { taskAutoFlushMode, setTaskAutoFlushMode } = useTaskAutoFlush();
	const { charCount } = useCharCount();

	// Calculate today's task count
	const [todayTasksCount, setTodayTasksCount] = useState(0);
	useEffect(() => {
		const today = new Date();
		const tasksByDate = taskStorage.getByDate({
			year: today.getFullYear(),
			month: today.getMonth() + 1,
			day: today.getDate(),
		});
		const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
		const todayTasks = tasksByDate[todayDateStr] || [];
		setTodayTasksCount(todayTasks.length);
	}, []);

	// Calculate snapshot count
	const [snapshotCount, setSnapshotCount] = useState(0);
	useEffect(() => {
		const snapshots = snapshotStorage.getAll();
		setSnapshotCount(snapshots.length);
	}, []);

	const themeOptions = [
		{ value: "system", label: "Auto" },
		{ value: "light", label: "Light" },
		{ value: "dark", label: "Dark" },
	];

	const widthOptions = [
		{ value: "normal", label: "Normal" },
		{ value: "wide", label: "Wide" },
	];

	const fontOptions = Object.entries(FONT_FAMILIES).map(([key, font]) => ({
		value: key,
		label: font.displayValue.split(" ")[0], // Shorten labels for compact display
	}));

	const flushOptions = [
		{ value: "off", label: "Off" },
		{ value: "instant", label: "Instant" },
	];

	return (
		<div className="h-full overflow-y-auto p-6">
			<SettingSection title="Appearance">
				<SettingRow label="Theme">
					<SegmentedControl
						options={themeOptions}
						value={theme}
						onChange={(value) => setTheme(value as "system" | "light" | "dark")}
					/>
				</SettingRow>
				<SettingRow label="Paper Mode">
					<ToggleSwitch
						checked={paperMode !== "normal"}
						onChange={(checked) => {
							if (checked) {
								setPaperMode(paperMode === "graph" ? "dots" : "graph");
							} else {
								setPaperMode("normal");
							}
						}}
					/>
				</SettingRow>
				<SettingRow label="Editor Width">
					<SegmentedControl
						options={widthOptions}
						value={editorWidth}
						onChange={(value) => {
							if (value === "wide") {
								setWideWidth();
							} else {
								setNormalWidth();
							}
						}}
					/>
				</SettingRow>
				<SettingRow label="Font">
					<SegmentedControl
						options={fontOptions}
						value={fontFamily}
						onChange={(value) => setFontFamily(value as keyof typeof FONT_FAMILIES)}
					/>
				</SettingRow>
			</SettingSection>

			<SettingSection title="Tasks">
				<SettingRow label="Auto-flush">
					<SegmentedControl
						options={flushOptions}
						value={taskAutoFlushMode}
						onChange={(value) => setTaskAutoFlushMode(value as "off" | "instant")}
					/>
				</SettingRow>
			</SettingSection>

			<SettingSection title="Statistics">
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-gray-600 text-sm dark:text-gray-400">Characters</span>
						<span className="font-mono text-gray-900 text-sm dark:text-gray-100">
							{charCount.toLocaleString()}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-gray-600 text-sm dark:text-gray-400">Tasks Today</span>
						<span className="font-mono text-gray-900 text-sm dark:text-gray-100">
							{todayTasksCount}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-gray-600 text-sm dark:text-gray-400">Total Snapshots</span>
						<span className="font-mono text-gray-900 text-sm dark:text-gray-100">
							{snapshotCount}
						</span>
					</div>
				</div>
			</SettingSection>
		</div>
	);
};