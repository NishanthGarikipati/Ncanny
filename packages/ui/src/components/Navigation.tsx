import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: ReactNode;
  /** Unread or pending count, e.g. notifications. */
  count?: number;
}

export interface NavLinkRenderProps {
  href: string;
  className: string;
  'aria-current': 'page' | undefined;
  children: ReactNode;
}

/**
 * Links are rendered by the host app so that this package stays free of a
 * router dependency: Next.js passes `next/link`, Storybook passes an anchor.
 */
export type NavLinkRenderer = (props: NavLinkRenderProps) => ReactNode;

const defaultRenderLink: NavLinkRenderer = ({ href, className, children, ...rest }) => (
  <a href={href} className={className} {...rest}>
    {children}
  </a>
);

function CountBubble({ count }: { count: number }) {
  const display = count > 99 ? '99+' : String(count);
  return (
    <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-contrast">
      {display}
      <span className="sr-only"> unread</span>
    </span>
  );
}

export interface SideNavProps {
  items: NavItem[];
  activeId: string;
  brand?: ReactNode;
  footer?: ReactNode;
  renderLink?: NavLinkRenderer;
  className?: string;
}

/** Desktop navigation rail. Hidden below `lg`, where BottomNav takes over. */
export function SideNav({
  items,
  activeId,
  brand,
  footer,
  renderLink = defaultRenderLink,
  className,
}: SideNavProps) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'hidden w-60 shrink-0 flex-col border-r border-border bg-surface-raised px-3 py-4 lg:flex',
        className,
      )}
    >
      {brand && <div className="mb-6 px-2">{brand}</div>}

      <ul className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              {renderLink({
                href: item.href,
                'aria-current': active ? 'page' : undefined,
                className: cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium',
                  'transition-colors duration-base motion-reduce:transition-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  active
                    ? 'bg-primary-soft text-primary'
                    : 'text-content-muted hover:bg-surface-sunken hover:text-content',
                ),
                children: (
                  <>
                    <span aria-hidden="true" className="text-lg leading-none">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {item.count ? <CountBubble count={item.count} /> : null}
                  </>
                ),
              })}
            </li>
          );
        })}
      </ul>

      {footer && <div className="mt-4 border-t border-border pt-4">{footer}</div>}
    </nav>
  );
}

export interface BottomNavProps {
  /** Rendered either side of the central Create action, so an even count reads best. */
  items: NavItem[];
  activeId: string;
  onCreate: () => void;
  createLabel?: string;
  renderLink?: NavLinkRenderer;
  className?: string;
}

/**
 * Mobile navigation bar. Create sits in the middle as the single most
 * prominent action, which is the product's primary call to action.
 */
export function BottomNav({
  items,
  activeId,
  onCreate,
  createLabel = 'Create',
  renderLink = defaultRenderLink,
  className,
}: BottomNavProps) {
  const middle = Math.ceil(items.length / 2);
  const leading = items.slice(0, middle);
  const trailing = items.slice(middle);

  const renderItem = (item: NavItem) => {
    const active = item.id === activeId;
    return (
      <li key={item.id} className="flex-1">
        {renderLink({
          href: item.href,
          'aria-current': active ? 'page' : undefined,
          className: cn(
            'flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium',
            'transition-colors duration-base motion-reduce:transition-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
            active ? 'text-primary' : 'text-content-muted',
          ),
          children: (
            <>
              <span aria-hidden="true" className="text-lg leading-none">
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.count ? <span className="sr-only">{item.count} unread</span> : null}
            </>
          ),
        })}
      </li>
    );
  };

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-raised lg:hidden',
        // Keeps the bar clear of the iOS home indicator.
        'pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      <ul className="flex items-center">
        {leading.map(renderItem)}

        <li className="flex w-20 shrink-0 justify-center">
          <button
            type="button"
            onClick={onCreate}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full bg-primary text-2xl leading-none text-primary-contrast',
              'shadow-level-2 transition-transform duration-fast hover:scale-105',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised',
              'motion-reduce:transition-none motion-reduce:hover:scale-100',
            )}
          >
            <span aria-hidden="true">+</span>
            <span className="sr-only">{createLabel}</span>
          </button>
        </li>

        {trailing.map(renderItem)}
      </ul>
    </nav>
  );
}

export interface AppShellProps {
  items: NavItem[];
  activeId: string;
  onCreate: () => void;
  brand?: ReactNode;
  sideFooter?: ReactNode;
  topBar?: ReactNode;
  renderLink?: NavLinkRenderer;
  children: ReactNode;
}

/** Page frame: rail on desktop, bottom bar on mobile, one content region either way. */
export function AppShell({
  items,
  activeId,
  onCreate,
  brand,
  sideFooter,
  topBar,
  renderLink,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-surface text-content">
      <a
        href="#ncanny-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-contrast"
      >
        Skip to content
      </a>

      <SideNav
        items={items}
        activeId={activeId}
        brand={brand}
        footer={sideFooter}
        renderLink={renderLink}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {topBar}
        {/* Bottom padding clears the mobile navigation bar. */}
        <main id="ncanny-main" className="flex-1 px-4 pb-24 pt-4 sm:px-6 lg:pb-8">
          {children}
        </main>
      </div>

      <BottomNav
        items={items}
        activeId={activeId}
        onCreate={onCreate}
        renderLink={renderLink}
      />
    </div>
  );
}
