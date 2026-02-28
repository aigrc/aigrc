import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Risk level variants
        minimal: "border-transparent bg-governance-minimal/10 text-governance-minimal",
        limited: "border-transparent bg-governance-limited/10 text-governance-limited",
        high: "border-transparent bg-governance-high/10 text-governance-high",
        unacceptable: "border-transparent bg-governance-unacceptable/10 text-governance-unacceptable",
        // Compliance variants
        compliant: "border-transparent bg-compliance-compliant/10 text-compliance-compliant",
        partial: "border-transparent bg-compliance-partial/10 text-compliance-partial",
        noncompliant: "border-transparent bg-compliance-noncompliant/10 text-compliance-noncompliant",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
