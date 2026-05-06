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

// Hook for responsive behavior
export function useResponsive() {
  if (typeof window === 'undefined') {
    return { isMobile: false, isTablet: false, isDesktop: true };
  }

  const [dimensions, setDimensions] = React.useState({
    isMobile: window.innerWidth <= BREAKPOINTS.mobile,
    isTablet: window.innerWidth > BREAKPOINTS.mobile && window.innerWidth <= BREAKPOINTS.tablet,
    isDesktop: window.innerWidth > BREAKPOINTS.tablet,
  });

  React.useEffect(() => {
    function handleResize() {
      setDimensions({
        isMobile: window.innerWidth <= BREAKPOINTS.mobile,
        isTablet: window.innerWidth > BREAKPOINTS.mobile && window.innerWidth <= BREAKPOINTS.tablet,
        isDesktop: window.innerWidth > BREAKPOINTS.tablet,
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return dimensions;
}

import * as React from 'react';