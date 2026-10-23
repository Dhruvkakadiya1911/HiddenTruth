'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Disable default browser scroll restoration to prevent landing halfway down the page
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const resetToTop = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    };

    // 1. Immediate reset on route change
    resetToTop();

    // 2. Next animation frame (after initial DOM render)
    const rafId = requestAnimationFrame(resetToTop);

    // 3. Short timeouts to handle async elements (Three.js models, Framer Motion transitions)
    const t1 = setTimeout(resetToTop, 25);
    const t2 = setTimeout(resetToTop, 100);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname]);

  return null;
}
