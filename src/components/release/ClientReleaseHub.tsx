import React from 'react';
import { X, Download } from 'lucide-react';
export const RELEASE_URL = 'https://github.com/DeeJayKyle/Deep-Tutor-Pro/releases/tag/v1.6.14';
const downloads = 'https://github.com/DeeJayKyle/Deep-Tutor-Pro/releases/download/v1.6.14';
export const RELEASE_ASSETS = [
  { label: 'Download Windows installer', file: 'Deep-Tutor-Pro-1.6.14-Windows-x64-Setup.exe', detail: 'Windows x64 · unsigned installer' },
  { label: 'Download Android APK', file: 'Deep-Tutor-Pro-1.6.14-Android-test.apk', detail: 'Android 7+ · debug-signed test build' },
  { label: 'Download native source archive', file: 'Deep-Tutor-Pro-1.6.14-Native-Source.zip', detail: 'Source used for the native packages' },
  { label: 'Download SHA-256 checksums', file: 'SHA256SUMS.txt', detail: 'Checksums published alongside the packages' }
];
export function ClientReleaseHub({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
    <section role="dialog" aria-modal="true" aria-label="Installers and release notes" className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-auto space-y-4">
      <div className="flex justify-between items-center"><h2 className="text-lg font-bold">Deep Tutor Pro v1.6.14</h2><button aria-label="Close release hub" onClick={onClose}><X /></button></div>
      <p className="text-sm text-slate-300">These links download the actual GitHub release assets. The Windows and Android packages are test builds. Data stays on this device; there is no automatic cloud sync.</p>
      {RELEASE_ASSETS.map(asset => <div key={asset.file} className="border border-slate-700 rounded-lg p-3">
        <a className="text-sky-300 flex items-center gap-2" href={`${downloads}/${asset.file}`} target="_blank" rel="noreferrer"><Download size={16} />{asset.label}</a>
        <p className="text-xs text-slate-400 mt-1">{asset.detail}</p>
      </div>)}
      <a className="text-sky-300 underline" href={RELEASE_URL} target="_blank" rel="noreferrer">Release notes and build details</a>
    </section>
  </div>;
}
