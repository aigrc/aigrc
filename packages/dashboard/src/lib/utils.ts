import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Convert risk level to color class
 */
export function riskLevelToColor(level: 'minimal' | 'limited' | 'high' | 'unacceptable'): string {
  const colors = {
    minimal: 'text-governance-minimal bg-governance-minimal/10',
    limited: 'text-governance-limited bg-governance-limited/10',
    high: 'text-governance-high bg-governance-high/10',
    unacceptable: 'text-governance-unacceptable bg-governance-unacceptable/10',
  };
  return colors[level] || colors.minimal;
}

/**
 * Convert compliance status to color class
 */
export function complianceStatusToColor(status: 'compliant' | 'partial' | 'noncompliant'): string {
  const colors = {
    compliant: 'text-compliance-compliant bg-compliance-compliant/10',
    partial: 'text-compliance-partial bg-compliance-partial/10',
    noncompliant: 'text-compliance-noncompliant bg-compliance-noncompliant/10',
  };
  return colors[status] || colors.partial;
}
