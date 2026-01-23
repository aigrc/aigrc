import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /** Visual variant for the progress bar */
  variant?: 'default' | 'minimal' | 'limited' | 'high' | 'unacceptable' | 'compliance';
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, variant = 'default', ...props }, ref) => {
  const indicatorColors = {
    default: 'bg-primary',
    minimal: 'bg-governance-minimal',
    limited: 'bg-governance-limited',
    high: 'bg-governance-high',
    unacceptable: 'bg-governance-unacceptable',
    compliance: value && value >= 80 ? 'bg-compliance-compliant' :
                value && value >= 50 ? 'bg-compliance-partial' :
                'bg-compliance-noncompliant',
  };

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn("h-full w-full flex-1 transition-all", indicatorColors[variant])}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
