import { Skeleton } from "@/components/ui/skeleton";

const PageSkeleton = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-16">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-72" />
    <div className="mt-8 grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-56 w-full rounded-xl" />
      ))}
    </div>
  </div>
);

export default PageSkeleton;
