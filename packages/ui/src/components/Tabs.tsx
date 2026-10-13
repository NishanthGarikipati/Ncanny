'use client';

import { useCallback, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  'aria-label': string;
}

/**
 * Tab list with the arrow-key navigation the WAI-ARIA tabs pattern requires.
 * Only the active tab is in the tab order, so keyboard users traverse the list
 * with arrows rather than tabbing through every option.
 */
export function Tabs({ items, activeId, onChange, className, ...props }: TabsProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const currentIndex = items.findIndex((item) => item.id === activeId);
      let nextIndex: number | null = null;

      if (event.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % items.length;
      } else if (event.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + items.length) % items.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = items.length - 1;
      }

      if (nextIndex !== null) {
        event.preventDefault();
        const next = items[nextIndex];
        if (next) {
          onChange(next.id);
        }
      }
    },
    [activeId, items, onChange],
  );

  return (
    <div
      role="tablist"
      aria-label={props['aria-label']}
      className={cn('flex gap-1 overflow-x-auto border-b border-border', className)}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={active}
            aria-controls={`panel-${item.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={handleKeyDown}
            className={cn(
              'flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5',
              'text-sm font-medium transition-colors duration-base motion-reduce:transition-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-content-muted hover:text-content',
            )}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && (
              <span className="rounded-full bg-surface-sunken px-1.5 text-xs text-content-muted">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface TabPanelProps {
  id: string;
  activeId: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ id, activeId, children, className }: TabPanelProps) {
  if (id !== activeId) {
    return null;
  }
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className={cn('pt-4 focus-visible:outline-none', className)}
    >
      {children}
    </div>
  );
}
