import { useRef, useEffect } from "react";
import * as monaco from "monaco-editor";
import { editorOptions } from "./editor-utils";

export const NewMonacoEditor = () => {
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (editorContainerRef.current) {
      editorRef.current = monaco.editor.create(editorContainerRef.current, {
        ...editorOptions,
        automaticLayout: true, // コンテナのリサイズに合わせてエディタもリサイズ
      });
    }


    return () => {
      if (editorRef.current) {
        console.log("Disposing Monaco Editor instance.");
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []); 

  // エディタの内容を取得する例 (必要に応じて)
  // const showValue = () => {
  //   if (editorRef.current) {
  //     alert(editorRef.current.getValue());
  //   }
  // };

  return (
      <div ref={editorContainerRef} className="h-full" />
  );
}