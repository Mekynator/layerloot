import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useEditorPreview } from "@/contexts/EditorPreviewContext";

function findEditorBlock(el: HTMLElement | null): HTMLElement | null {
  while (el) {
    if (el.dataset && (el.dataset.editorBlockId || el.hasAttribute("data-editor-block-id"))) return el;
    el = el.parentElement;
  }
  return null;
}

/** True when the page is running inside an iframe. */
function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export default function EditorPreviewGuard() {
  const { isEditorPreview } = useEditorPreview();
  const location = useLocation();

  useEffect(() => {
    if (!isEditorPreview) return;

    // Extra safety: never install the click interceptor on the live storefront when
    // running as a top-level window. It is only valid inside the editor's iframe
    // or when explicitly on an editor/visual-editor admin route.
    const onEditorRoute =
      location.pathname.startsWith("/admin/visual-editor") ||
      location.pathname.startsWith("/admin/editor");
    if (!isInIframe() && !onEditorRoute) return;

    const handleClick = (ev: MouseEvent) => {
      try {
        const target = ev.target as HTMLElement | null;
        if (!target) return;

        const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
        const form = target.closest("form") as HTMLFormElement | null;

        const block = findEditorBlock(target);

        // Prevent navigation or real actions
        if (anchor) {
          ev.preventDefault();
          ev.stopPropagation();
        }

        if (form) {
          ev.preventDefault();
          ev.stopPropagation();
        }

        // If inside a block, mark it selected (visual feedback)
        if (block) {
          // clear previous selection
          const prev = document.querySelectorAll<HTMLElement>("[data-editor-selected]");
          prev.forEach((p) => p.removeAttribute("data-editor-selected"));
          block.setAttribute("data-editor-selected", "true");

          // notify parent window if inside iframe editor
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ source: "layerloot-editor-preview", type: "select-block", blockId: block.dataset.editorBlockId }, window.location.origin);
          }
        }
      } catch {}
    };

    const handleMouseOver = (ev: MouseEvent) => {
      try {
        const target = ev.target as HTMLElement | null;
        if (!target) return;
        const block = findEditorBlock(target);
        document.querySelectorAll<HTMLElement>("[data-editor-hover]").forEach((el) => el.removeAttribute("data-editor-hover"));
        if (block) block.setAttribute("data-editor-hover", "true");
      } catch {}
    };

    const handleMouseOut = (ev: MouseEvent) => {
      try {
        const target = ev.target as HTMLElement | null;
        if (!target) return;
        const block = findEditorBlock(target);
        if (block) block.removeAttribute("data-editor-hover");
      } catch {}
    };

    const handleSubmit = (ev: Event) => {
      if (!isEditorPreview) return;
      try {
        ev.preventDefault();
        ev.stopPropagation();
      } catch {}
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    document.addEventListener("submit", handleSubmit, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("mouseover", handleMouseOver, true);
      document.removeEventListener("mouseout", handleMouseOut, true);
      document.removeEventListener("submit", handleSubmit, true);
      document.querySelectorAll<HTMLElement>("[data-editor-hover]").forEach((el) => el.removeAttribute("data-editor-hover"));
      document.querySelectorAll<HTMLElement>("[data-editor-selected]").forEach((el) => el.removeAttribute("data-editor-selected"));
    };
  }, [isEditorPreview]);

  return null;
}
