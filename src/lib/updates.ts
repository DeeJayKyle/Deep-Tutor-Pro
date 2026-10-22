import { APP_VERSION } from './version';

// Keeps every copy of the app on the latest release:
// - Windows: the desktop shell downloads and installs updates itself (electron-updater).
// - Android: the app checks GitHub Releases and offers the new APK.
// - Web (/pro/): the service worker fetches the new build; the page reloads into it.

export const RELEASES_API = 'https://api.github.com/repos/DeeJayKyle/Deep-Tutor-Pro/releases/latest';
export const RELEASES_PAGE = 'https://github.com/DeeJayKyle/Deep-Tutor-Pro/releases/latest';

export interface Release {
  version: string;
  page: string;
  apk?: string;
  /** The APK was signed with a one-off key: it cannot install over the current app. */
  reinstall?: boolean;
}

/** True when version a is newer than b (numeric x.y.z; anything after '-' is ignored). */
export function isNewer(a: string, b: string): boolean {
  const parts = (v: string) => v.replace(/^v/, '').split('-')[0].split('.').map((n) => parseInt(n, 10) || 0);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  }
  return false;
}

interface GithubRelease {
  tag_name?: string;
  html_url?: string;
  draft?: boolean;
  body?: string;
  prerelease?: boolean;
  assets?: { name: string; browser_download_url: string }[];
}

/** Reads a GitHub "latest release" reply; null unless it is a newer, published release. */
export function parseRelease(data: GithubRelease, current = APP_VERSION): Release | null {
  if (!data?.tag_name || data.draft || data.prerelease) return null;
  const version = data.tag_name.replace(/^v/, '');
  if (!/^\d+\.\d+\.\d+/.test(version) || !isNewer(version, current)) return null;
  const apk = data.assets?.find((a) => /\.apk$/i.test(a.name))?.browser_download_url;
  // release.yml states in the notes which key signed the APK.
  const reinstall = /temporary key generated for this build/i.test(data.body ?? '');
  return { version, page: data.html_url || RELEASES_PAGE, apk, ...(reinstall ? { reinstall } : {}) };
}

/** Asks GitHub for the latest release; null when up to date, offline or unreachable. */
export async function checkForRelease(): Promise<Release | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  try {
    const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' }, credentials: 'omit' });
    if (!res.ok) return null;
    return parseRelease((await res.json()) as GithubRelease);
  } catch {
    return null;
  }
}
