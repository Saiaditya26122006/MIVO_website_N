import { cn } from "@/lib/utils";
import { Button } from "./Button";
import Link from "next/link";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

/**
 * Empty State Component
 *
 * Displays a message when no content is available
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6",
        className
      )}
    >
      {icon && <div className="mb-6 text-ink/20">{icon}</div>}

      <h3 className="text-2xl font-handwritten font-bold text-ink mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-ink/60 max-w-md mb-8">{description}</p>
      )}

      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button variant="accent" size="lg">
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}
