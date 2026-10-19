import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Input Component - MIVO Design System
 *
 * Features:
 * - 2px border with ink/20 opacity
 * - Lime focus state with ring
 * - Placeholder at 40% opacity
 * - Full-width by default
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "w-full px-4 py-3",
          "border-2 border-ink/20 rounded-lg",
          "bg-white text-ink",
          "placeholder:text-ink/40",
          "focus:border-lime focus:ring-2 focus:ring-lime/20 focus:outline-none",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all duration-200",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
