import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
Element.prototype.scrollIntoView = vi.fn();
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
