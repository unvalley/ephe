import { atomWithStorage } from "jotai/utils";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { useAtom } from "jotai";

export type TaskAutoFlushMode = "off" | "instant";

export const taskAutoFlushAtom = atomWithStorage<TaskAutoFlushMode>(LOCAL_STORAGE_KEYS.TASK_AUTO_FLUSH_MODE, "off");

export const useTaskAutoFlush = () => {
  const [taskAutoFlushMode, setTaskAutoFlushMode] = useAtom(taskAutoFlushAtom);
  return { taskAutoFlushMode, setTaskAutoFlushMode };
};
