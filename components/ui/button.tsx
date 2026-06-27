import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  // Forest-green primary.
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  // Teal/cyan secondary (e.g. "Import file").
  secondary: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm",
  outline: "border border-border bg-card hover:bg-muted text-foreground",
  ghost: "hover:bg-muted text-foreground",
  danger: "bg-danger text-danger-foreground hover:bg-danger/90 shadow-sm",
};

const sizes: Record<Size, string> = {
  // Roomier pills: generous horizontal padding so the label isn't cramped
  // against the rounded edges. `md` keeps h-10 to stay aligned with inputs
  // (which are h-10) when a button sits next to one in a form/toolbar.
  sm: "h-8 px-5 text-sm",
  md: "h-10 px-7 text-sm",
  lg: "h-12 px-10 text-base",
  icon: "h-9 w-9",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
