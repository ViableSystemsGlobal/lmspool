import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      {...props}
    />
  )
}

function SkeletonSidebar() {
  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      <div className="flex h-20 items-center justify-center border-b border-gray-200 px-2">
        <Skeleton className="h-16 w-16 rounded-lg" />
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </nav>
      <div className="border-t border-gray-200 p-4">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  )
}

export { Skeleton, SkeletonSidebar }

