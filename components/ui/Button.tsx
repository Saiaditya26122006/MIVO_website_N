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
      primary: "bg-ink text-cream hover:shadow-lg",
      secondary: "bg-cream text-ink border-2 border-ink hover:bg-ink hover:text-cream",
      accent: "bg-lime text-ink hover:shadow-xl",
      ghost: "bg-transparent text-ink hover:bg-ink/5",
    };

    const sizeStyles = {
      sm: "px-4 py-2 text-sm rounded-lg",
      md: "px-6 py-3 text-base rounded-xl",
      lg: "px-8 py-4 text-lg rounded-xl",
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
