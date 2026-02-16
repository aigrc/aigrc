import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ComplianceStatus } from '@/types';

interface ComplianceStatusBadgeProps {
  status: ComplianceStatus;
  score?: number;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const COMPLIANCE_STATUS_CONFIG: Record<ComplianceStatus, {
  label: string;
  description: string;
  icon: string;
}> = {
  compliant: {
    label: 'Compliant',
    description: 'All required controls are implemented and verified. System meets regulatory requirements.',
    icon: '✓',
  },
  partial: {
    label: 'Partial',
    description: 'Some controls are implemented but gaps remain. Remediation plan may be required.',
    icon: '◐',
  },
  noncompliant: {
    label: 'Non-Compliant',
    description: 'Critical controls are missing. Immediate remediation required before deployment.',
    icon: '✗',
  },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-base px-3 py-1',
};

export function ComplianceStatusBadge({
  status,
  score,
  showTooltip = true,
  size = 'md',
  className,
}: ComplianceStatusBadgeProps) {
  const config = COMPLIANCE_STATUS_CONFIG[status];

  const badge = (
    <Badge
      variant={status}
      className={cn(SIZE_CLASSES[size], 'font-medium', className)}
    >
      <span className="mr-1">{config.icon}</span>
      {config.label}
      {score !== undefined && (
        <span className="ml-1.5 opacity-80">({score}%)</span>
      )}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="font-semibold">{config.label}</p>
        <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
        {score !== undefined && (
          <p className="text-xs mt-2">
            Compliance Score: <span className="font-semibold">{score}%</span>
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export { COMPLIANCE_STATUS_CONFIG };
