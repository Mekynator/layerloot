import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

type EditorPreviewState = {
  isEditorPreview: boolean;
  setEditorPreview: (v: boolean) => void;
};

const EditorPreviewContext = createContext<EditorPreviewState | null>(null);

export function useEditorPreview() {
  const ctx = useContext(EditorPreviewContext);
  if (!ctx) throw new Error("useEditorPreview must be used within EditorPreviewProvider");
  return ctx;
}

export function EditorPreviewProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [sessionFlag, setSessionFlag] = useState(() => sessionStorage.getItem("layerloot.editorPreview") === "1");

  useEffect(() => {
    const handler = (ev: StorageEvent) => {
      if (ev.key === "layerloot.editorPreview") setSessionFlag(sessionStorage.getItem("layerloot.editorPreview") === "1");
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const isEditorPreview = useMemo(() => {
    const param = searchParams.get("editorPreview") === "1";
    const inAdminEditor = location.pathname.startsWith("/admin/visual-editor") || location.pathname.startsWith("/admin/editor");
    return param || sessionFlag || inAdminEditor;
  }, [searchParams, sessionFlag, location.pathname]);

  const setEditorPreview = (v: boolean) => {
    try {
      if (v) sessionStorage.setItem("layerloot.editorPreview", "1");
      else sessionStorage.removeItem("layerloot.editorPreview");
      setSessionFlag(v);
    } catch {}
  };

  return (
    <EditorPreviewContext.Provider value={{ isEditorPreview, setEditorPreview }}>
      {children}
    </EditorPreviewContext.Provider>
  );
}

export default EditorPreviewContext;
