import { atomWithStorage } from "jotai/utils";
import { LOCAL_STORAGE_KEYS } from "../../../utils/constants";

export type TaskAutoFlushMode = "off" | "instant";

export const taskAutoFlushAtom = atomWithStorage<TaskAutoFlushMode>(
  LOCAL_STORAGE_KEYS.TASK_AUTO_FLUSH_MODE,
  "off",
);
