import { LOCAL_STORAGE_KEYS } from "../utils/constants";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

const editorWidthAtom = atomWithStorage<EditorWidth>(LOCAL_STORAGE_KEYS.EDITOR_WIDTH, "normal");

export const useEditorWidth = () => {
  const [editorWidth, setEditorWidth] = useAtom(editorWidthAtom);

  const toggleEditorWidth = () => {
    setEditorWidth((prev) => (prev === "normal" ? "wide" : "normal"));
  };

  const setNormalWidth = () => {
    setEditorWidth("normal");
  };

  const setWideWidth = () => {
    setEditorWidth("wide");
  };
  const isWideMode = editorWidth === "wide";
  return { editorWidth, toggleEditorWidth, isWideMode, setNormalWidth, setWideWidth };
};

export type EditorWidth = "normal" | "wide";

// const createEditorWidthStore = () => {
//   const subscribers = new Set<() => void>();

//   const getCurrentWidth = (): EditorWidth => {
//     if (typeof window === "undefined") return "normal";

//     const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.EDITOR_WIDTH);
//     return (saved as EditorWidth) || "normal";
//   };

//   let currentWidth = getCurrentWidth();

//   const setWidth = (width: EditorWidth) => {
//     if (currentWidth === width) return;

//     currentWidth = width;
//     localStorage.setItem(LOCAL_STORAGE_KEYS.EDITOR_WIDTH, width);

//     // Notify all subscribers
//     for (const callback of subscribers) {
//       callback();
//     }
//   };

//   const toggleWidth = () => {
//     const newWidth = currentWidth === "normal" ? "wide" : "normal";
//     setWidth(newWidth);
//     return newWidth;
//   };

//   const setNormalWidth = (): "normal" => {
//     setWidth("normal");
//     return "normal";
//   };

//   const setWideWidth = (): "wide" => {
//     setWidth("wide");
//     return "wide";
//   };

//   const subscribe = (callback: () => void) => {
//     subscribers.add(callback);
//     return () => {
//       subscribers.delete(callback);
//     };
//   };

//   const getSnapshot = () => {
//     return currentWidth;
//   };

//   return {
//     subscribe,
//     getSnapshot,
//     setWidth,
//     toggleWidth,
//     setNormalWidth,
//     setWideWidth,
//   };
// };

// const editorWidthStore = createEditorWidthStore();

// /**
//  * Custom hook to manage editor width mode
//  * @returns Editor width state and operations
//  */
// export const useEditorWidth = () => {
//   const width = useSyncExternalStore(editorWidthStore.subscribe, editorWidthStore.getSnapshot);

//   return {
//     editorWidth: width,
//     isWideMode: width === "wide",
//     setWidth: editorWidthStore.setWidth,
//     toggleWidth: editorWidthStore.toggleWidth,
//     setNormalWidth: editorWidthStore.setNormalWidth,
//     setWideWidth: editorWidthStore.setWideWidth,
//   };
// };
