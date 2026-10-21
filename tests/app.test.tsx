// Smoke test: the whole app boots in jsdom. jsdom has no IndexedDB and
// fake-indexeddb is not installed, so this also exercises the in-memory
// storage fallback in src/lib/db.ts.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../src/App';

describe('<App />', () => {
  it('renders the Home screen on first start', async () => {
    expect(typeof indexedDB).toBe('undefined');
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('no network in tests'))));
    if (!window.matchMedia)
      window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Welcome to Deep Tutor Pro' }, { timeout: 5000 })).toBeTruthy();
    vi.unstubAllGlobals();
  });
});
