export function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 animate-pulse shadow-sm">
      <div className="h-3 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-10 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-2/3" />
    </div>
  );
}
export function SkeletonRow() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 animate-pulse shadow-sm">
      <div className="flex justify-between">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-16" />
      </div>
    </div>
  );
}
