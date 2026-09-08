import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // min-h-12 keeps every button a comfortable tap target on a 360px phone.
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-[transform,background-color,box-shadow] duration-200 select-none disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-l from-teal-700 to-teal-500 text-white shadow-warm hover:from-teal-800 hover:to-teal-600 hover:shadow-warm-lg",
        secondary:
          "border border-cream-200 bg-white/85 text-ink-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800",
        ghost: "text-ink-500 hover:bg-violet-50 hover:text-violet-800",
        coral:
          "bg-gradient-to-l from-coral-600 to-coral-400 text-white shadow-warm hover:from-coral-700 hover:to-coral-500 hover:shadow-warm-lg",
      },
      size: {
        default: "min-h-12",
        lg: "min-h-14 px-8 text-lg",
        sm: "min-h-10 px-4 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
