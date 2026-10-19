import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

/**
 * Loading Spinner Component
 *
 * Displays an animated loading spinner with optional text
 */
export function Loading({ className, size = "md", text }: LoadingProps) {
  const sizeClasses = {
    sm: "h-6 w-6 border-2",
    md: "h-12 w-12 border-3",
    lg: "h-16 w-16 border-4",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 py-12", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-lime border-t-transparent",
          sizeClasses[size]
        )}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <p className="text-ink/60 text-sm font-medium">{text}</p>
      )}
    </div>
  );
}
