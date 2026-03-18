import { useMemo } from "react";

interface EditorPreviewFrameProps {
  page: string;
}

function normalizePreviewRoute(page: string) {
  const safePage = page && page.trim() ? page : "home";
  return `/admin/page-preview/${safePage}`;
}

export default function EditorPreviewFrame({ page }: EditorPreviewFrameProps) {
  const previewSrc = useMemo(() => normalizePreviewRoute(page), [page]);

  return (
    <div className="relative h-full w-full bg-background">
      <div className="h-full w-full overflow-hidden">
        <iframe
          key={previewSrc}
          src={previewSrc}
          title={`Editor preview: ${page}`}
          className="h-[calc(100vh-48px)] w-full border-0 bg-background"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}
