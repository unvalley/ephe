import { useState, useEffect } from "react";
import { LOCAL_STORAGE_KEYS } from "../constants";

type EditorType = "monaco" | "codemirror";

export function useEditorType() {
  const [editorType, setEditorType] = useState<EditorType>("monaco");

  useEffect(() => {
    // Check local storage for saved preference
    const savedPreference = localStorage.getItem(LOCAL_STORAGE_KEYS.USE_CODEMIRROR);
    if (savedPreference === "true") {
      setEditorType("codemirror");
    }
  }, []);

  const toggleEditorType = () => {
    const newType = editorType === "monaco" ? "codemirror" : "monaco";
    setEditorType(newType);
    localStorage.setItem(LOCAL_STORAGE_KEYS.USE_CODEMIRROR, newType === "codemirror" ? "true" : "false");
  };

  return {
    editorType,
    isMonaco: editorType === "monaco",
    isCodeMirror: editorType === "codemirror",
    toggleEditorType,
  };
}
