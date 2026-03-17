import { useMemo } from "react";

interface LivePagePreviewProps {
  page: string;
}

function pageToPath(page: string) {
  if (page === "home") return "/";
  if (page === "create-your-own") return "/create";
  if (page.startsWith("global_")) return "/";
  return `/${page}`;
}

export default function LivePagePreview({ page }: LivePagePreviewProps) {
  const previewPath = useMemo(() => pageToPath(page), [page]);

  return (
    <div className="h-full w-full bg-background">
      <iframe
        key={previewPath}
        src={previewPath}
        title={`Live preview: ${page}`}
        className="h-[calc(100vh-48px)] w-full border-0 bg-white"
      />
    </div>
  );
}
