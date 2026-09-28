import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 select-none [&>svg]:size-3 shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-xs",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-xs",
        outline: "text-foreground border-border",
        success: "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold",
        warning: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold",
        danger: "border-rose-500/40 bg-rose-500/20 text-rose-700 dark:text-rose-400 font-bold",
        info: "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-cyan-300 font-bold",
        statutory: "border-indigo-500/40 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
