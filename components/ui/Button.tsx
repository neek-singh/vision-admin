import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  href?: string;
  target?: string;
  rel?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", href, ...props }, ref) => {
    // 1. Upgraded base styles for robustness and tactile feedback
    const baseStyles =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    // 2. Refined color palettes and shadows for depth
    const variants = {
      primary:
        "bg-blue-600 text-white shadow-sm hover:bg-blue-500 hover:shadow-md border border-transparent",
      secondary:
        "bg-slate-100 text-slate-900 shadow-sm hover:bg-slate-200 border border-transparent",
      outline:
        "border border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-100 hover:border-slate-300",
      ghost:
        "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
    };

    // 3. Adjusted sizing to standard modern UI heights
    const sizes = {
      sm: "h-9 px-4 text-xs",
      md: "h-10 px-6 py-2 text-sm",
      lg: "h-12 px-8 text-base",
    };

    const classes = cn(baseStyles, variants[variant], sizes[size], className);

    if (href) {
      return (
        <Link href={href} className={classes} {...(props as any)}>
          {props.children}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };