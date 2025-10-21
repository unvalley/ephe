import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";
import { LOCAL_STORAGE_KEYS } from "../constants";

export const taskAgingEnabledAtom = atomWithStorage<boolean>(LOCAL_STORAGE_KEYS.TASK_AGING_ENABLED, true);

export const useTaskAging = () => {
  const [taskAgingMode, setTaskAgingMode] = useAtom(taskAgingEnabledAtom);

  const toggleTaskAgingMode = (): boolean => {
    const newState = !taskAgingMode;
    setTaskAgingMode(newState);
    return newState;
  };

  return {
    taskAgingMode,
    toggleTaskAgingMode,
    setTaskAgingMode,
  };
};
