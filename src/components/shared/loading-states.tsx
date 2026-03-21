import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <Skeleton className="aspect-square w-full" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-16 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-5">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function SectionCardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card className="border-border/80 bg-card/80 shadow-sm">
      <CardContent className="space-y-3 p-5">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export function AccountOverviewSkeleton() {
  return (
    <div className="space-y-6">
      <SectionCardSkeleton lines={4} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCardSkeleton lines={5} />
        <SectionCardSkeleton lines={5} />
      </div>
      <SectionCardSkeleton lines={6} />
    </div>
  );
}

export function OrdersListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function RewardsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <SectionCardSkeleton key={index} lines={4} />
      ))}
    </div>
  );
}

export function CartSummarySkeleton() {
  return (
    <div className="sticky top-24 rounded-2xl border bg-card p-5 shadow-sm">
      <Skeleton className="h-6 w-40" />
      <div className="mt-5 space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function ReviewCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </CardContent>
    </Card>
  );
}

export function EditorPreviewSkeleton() {
  return <Skeleton className="h-[calc(100vh-48px)] w-full rounded-none" />;
}

export function PageSkeleton() {
  return (
    <div className="container space-y-8 py-16">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-56 w-full rounded-3xl" />
      <ProductGridSkeleton count={4} />
    </div>
  );
}
