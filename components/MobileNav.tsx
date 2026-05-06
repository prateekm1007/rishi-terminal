'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/',          icon: 'DB', label: 'Home' },
  { href: '/screener',  icon: 'SC', label: 'Screen' },
  { href: '/portfolio', icon: 'PF', label: 'Portfolio' },
  { href: '/rishis',    icon: 'RS', label: 'Rishis' },
  { href: '/news',      icon: 'NW', label: 'News' },
];

export function MobileNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href) ?? false;

  return (
    <nav className="mobile-nav">
      {NAV_ITEMS.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={'mobile-nav-item' + (isActive(item.href) ? ' active' : '')}
        >
          <span className="mobile-nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}