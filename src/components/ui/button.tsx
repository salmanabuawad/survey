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
          "bg-teal-600 text-white shadow-warm hover:bg-teal-700 hover:shadow-warm-lg",
        secondary:
          "border border-cream-200 bg-white/80 text-ink-600 hover:border-teal-300 hover:bg-white",
        ghost: "text-ink-500 hover:bg-cream-100 hover:text-ink-700",
        coral:
          "bg-coral-500 text-white shadow-warm hover:bg-coral-600 hover:shadow-warm-lg",
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
