import { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { isNativeApp } from '../lib/exporters';
import { checkForRelease, type Release } from '../lib/updates';

const CHECK_EVERY = 6 * 60 * 60 * 1000;

/**
 * Tells the tutor when a newer version is ready:
 * - web: the service worker has installed a new build (it is used the next time
 *   the app is opened; "Update now" switches straight away);
 * - Android: a newer APK is on GitHub Releases.
 * Windows updates itself from the desktop shell, so nothing is shown there.
 */
export function UpdateBanner() {
  const [webReady, setWebReady] = useState(false);
  const [release, setRelease] = useState<Release | null>(null);
  const [hidden, setHidden] = useState('');

  useEffect(() => {
    const onReady = () => setWebReady(true);
    window.addEventListener('dtp-web-update', onReady);
    return () => window.removeEventListener('dtp-web-update', onReady);
  }, []);

  useEffect(() => {
    if (!isNativeApp()) return;
    let alive = true;
    const check = () => {
      void checkForRelease().then((r) => {
        if (alive) setRelease(r);
      });
    };
    check();
    const timer = setInterval(check, CHECK_EVERY);
    window.addEventListener('online', check);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener('online', check);
    };
  }, []);

  if (webReady)
    return (
      <Bar onClose={() => setWebReady(false)}>
        <span className="flex-1">A new version of Deep Tutor Pro is ready.</span>
        <button type="button" onClick={() => location.reload()} className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-accent-solid px-3 font-medium text-accent-ink">
          <RefreshCw className="h-4 w-4" /> Update now
        </button>
      </Bar>
    );
  if (release && hidden !== release.version)
    return (
      <Bar onClose={() => setHidden(release.version)}>
        <span className="flex-1">
          Deep Tutor Pro {release.version} is available.{' '}
          {release.reinstall ? (
            <>
              It cannot install over this version: first save a backup under <a href="#/settings?tab=data" className="underline underline-offset-2">Settings › Sync, backup & data</a> (or sync to the cloud), then uninstall and install the new version.
            </>
          ) : (
            'It installs over this version and keeps your work.'
          )}
        </span>
        <a href={release.apk ?? release.page} className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-accent-solid px-3 font-medium text-accent-ink no-underline">
          <Download className="h-4 w-4" /> Download update
        </a>
      </Bar>
    );
  return null;
}

function Bar({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div role="status" className="no-print flex flex-wrap items-center gap-2 border-b border-line bg-panel2 px-3 py-2 text-sm sm:px-5">
      {children}
      <button type="button" aria-label="Not now" onClick={onClose} className="rounded-md p-1.5 text-muted hover:text-ink">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
