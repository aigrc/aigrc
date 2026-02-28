import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/types';

interface RiskLevelBadgeProps {
  level: RiskLevel;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const RISK_LEVEL_CONFIG: Record<RiskLevel, {
  label: string;
  description: string;
  icon: string;
}> = {
  minimal: {
    label: 'Minimal',
    description: 'Low-impact AI system with minimal regulatory requirements. Suitable for internal tools and non-critical applications.',
    icon: '●',
  },
  limited: {
    label: 'Limited',
    description: 'AI system with transparency obligations. Requires clear disclosure when interacting with users (e.g., chatbots).',
    icon: '◐',
  },
  high: {
    label: 'High',
    description: 'AI system requiring significant oversight. Subject to conformity assessment and ongoing monitoring (e.g., hiring, credit scoring).',
    icon: '◉',
  },
  unacceptable: {
    label: 'Unacceptable',
    description: 'Prohibited AI application under EU AI Act. Includes social scoring, real-time biometric identification in public spaces.',
    icon: '⬤',
  },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-base px-3 py-1',
};

export function RiskLevelBadge({
  level,
  showTooltip = true,
  size = 'md',
  className,
}: RiskLevelBadgeProps) {
  const config = RISK_LEVEL_CONFIG[level];

  const badge = (
    <Badge
      variant={level}
      className={cn(SIZE_CLASSES[size], 'font-medium', className)}
    >
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="font-semibold">{config.label} Risk</p>
        <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export { RISK_LEVEL_CONFIG };
