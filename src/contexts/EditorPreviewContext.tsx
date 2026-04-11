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

/** True when the page is running inside an iframe (e.g. the visual editor preview pane). */
function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin parent: assume we're in an iframe.
    return true;
  }
}

export function EditorPreviewProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [sessionFlag, setSessionFlag] = useState(() => sessionStorage.getItem("layerloot.editorPreview") === "1");

  // If the page is a top-level window (not inside the editor iframe), any stale
  // sessionStorage flag must be cleared immediately so it never bleeds into the
  // live storefront and triggers the EditorPreviewGuard click interceptor.
  useEffect(() => {
    if (!isInIframe() && sessionStorage.getItem("layerloot.editorPreview") === "1") {
      sessionStorage.removeItem("layerloot.editorPreview");
      setSessionFlag(false);
    }
  }, []);

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
    // sessionFlag is only valid when the page is embedded inside the editor iframe.
    // Ignore it in a top-level browser window to prevent a stale flag from
    // activating the click interceptor on live storefront pages.
    const sessionFlagActive = sessionFlag && isInIframe();
    return param || sessionFlagActive || inAdminEditor;
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
