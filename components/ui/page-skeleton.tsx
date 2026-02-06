export function PageSkeleton() {
  return (
    <div className="animate-pulse p-6 max-w-7xl mx-auto">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6" />
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
      </div>
    </div>
  )
}
