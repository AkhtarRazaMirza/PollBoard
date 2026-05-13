export default function SkeletonCard({
  lines = 3,
  className = "",
}) {
  return (
    <div className={`panel p-5 ${className}`}>
      <div className="skeleton-block h-5 w-40" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className={`skeleton-block h-4 ${
              index === lines - 1 ? "w-2/3" : "w-full"
            }`}
          />
        ))}
      </div>
    </div>
  );
}