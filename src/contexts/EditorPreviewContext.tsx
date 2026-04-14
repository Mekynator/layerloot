import React, { createContext, useContext, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

type EditorPreviewState = {
  isEditorPreview: boolean;
  /** @deprecated No longer writes to sessionStorage. Kept for API compatibility. */
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

  // Editor preview is active only when:
  //   1. The URL explicitly carries ?editorPreview=1  (set by EditorPreviewFrame for the live
  //      visual-editor preview iframe), OR
  //   2. The user is directly on an admin editor route.
  //
  // sessionStorage is intentionally NOT used here. A stale sessionStorage flag from a
  // previous editor session leaks into every same-origin iframe — including Lovable's
  // generic preview pane — and causes EditorPreviewGuard to install a global capture-phase
  // click interceptor that blocks ALL anchor navigation on the live storefront.
  // The EditorPreviewFrame already injects its own click-blocking script into the preview
  // iframe via postMessage, so sessionStorage cross-page persistence is redundant.
  // Editor preview is only active when the URL carries ?editorPreview=1
  // (injected by the Admin Studio's preview iframe).
  const isEditorPreview = useMemo(() => {
    return searchParams.get("editorPreview") === "1";
  }, [searchParams]);

  // Kept for API compatibility; no longer persists to sessionStorage.
  const setEditorPreview = (_v: boolean) => {};

  return (
    <EditorPreviewContext.Provider value={{ isEditorPreview, setEditorPreview }}>
      {children}
    </EditorPreviewContext.Provider>
  );
}

export default EditorPreviewContext;
