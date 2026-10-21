import { useEffect, useState } from 'react';

// Hash routes (#/units/abc?tab=notes) work identically on the web, in the
// Windows app (app:// pages) and in the Android app, and every screen has a
// link that can be bookmarked or opened from anywhere in the app.

export interface Route {
  path: string;
  parts: string[];
  query: URLSearchParams;
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [p, q = ''] = raw.split('?');
  const path = '/' + p.split('/').filter(Boolean).join('/');
  return { path, parts: path.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(q) };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function href(path: string, query?: Record<string, string | undefined>): string {
  const q = query ? new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined) as [string, string][]).toString() : '';
  return `#${path}${q ? `?${q}` : ''}`;
}

export function navigate(path: string, query?: Record<string, string | undefined>, replace = false): void {
  const target = href(path, query);
  if (replace) {
    window.history.replaceState(null, '', target);
    // Dispatched after the current render so listeners registered in parent
    // effects (which run after child effects) still receive it.
    setTimeout(() => window.dispatchEvent(new HashChangeEvent('hashchange')), 0);
  } else window.location.hash = target.slice(1);
}
