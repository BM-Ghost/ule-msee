export default function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse" />
      </div>
    </div>
  )
}
