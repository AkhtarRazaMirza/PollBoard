const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-[3px]",
  lg: "h-10 w-10 border-[3px]",
};

export default function LoadingSpinner({
  label = "Loading",
  size = "md",
  tone = "brand",
  className = "",
}) {

  const toneClasses =
    tone === "light"
      ? "border-white/30 border-t-white"
      : "border-gray-200 border-t-blue-600";

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full ${toneClasses} ${sizeClasses[size] || sizeClasses.md
          }`}
        aria-label={label}
        role="status"
      />
    </div>
  );
}