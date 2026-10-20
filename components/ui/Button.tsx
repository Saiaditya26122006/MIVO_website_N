import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "ghost";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
}

/**
 * Button Component - MIVO Design System
 *
 * Variants:
 * - primary: Ink background, cream text
 * - secondary: Cream background, ink text, bordered
 * - accent: Lime background, ink text (for CTAs)
 * - ghost: Transparent, ink text
 *
 * Sizes: sm, md, lg
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const baseStyles = cn(
      // Base styles
      "inline-flex items-center justify-center gap-2",
      "font-medium transition-all duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
      "hover:scale-[1.02] active:scale-[0.98]",
    );

    const variantStyles = {
      primary: "bg-ink text-cream hover:shadow-lg rounded-xl",
      secondary: "bg-transparent text-ink border-2 border-ink hover:bg-ink hover:text-cream rounded-xl",
      accent: "bg-lime text-ink hover:shadow-[0_8px_30px_rgb(183,255,42,0.3)] rounded-full shadow-[0_4px_14px_rgb(183,255,42,0.2)]",
      ghost: "bg-transparent text-ink hover:bg-ink/5 rounded-xl",
    };

    const sizeStyles = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
    };

    return (
      <Comp
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
