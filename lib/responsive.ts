import * as React from 'react';

// Responsive breakpoint utilities
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
} as const;

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= BREAKPOINTS.mobile;
}

export function isTablet(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth > BREAKPOINTS.mobile && window.innerWidth <= BREAKPOINTS.tablet;
}

export function isDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth > BREAKPOINTS.tablet;
}

// Hook for responsive behavior.
// T18 fix: the old version returned early during SSR and called hooks after
// that branch — a real rules-of-hooks bug (hook order differed between server
// and client render). Defaults are now lazy and measured in an effect.
export function useResponsive() {
  const [dimensions, setDimensions] = React.useState(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  }));

  React.useEffect(() => {
    function measure() {
      setDimensions({
        isMobile: window.innerWidth <= BREAKPOINTS.mobile,
        isTablet: window.innerWidth > BREAKPOINTS.mobile && window.innerWidth <= BREAKPOINTS.tablet,
        isDesktop: window.innerWidth > BREAKPOINTS.tablet,
      });
    }

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return dimensions;
}