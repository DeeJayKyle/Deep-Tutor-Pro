import { describe, expect, it } from 'vitest';
import { isNewer, parseRelease } from '../src/lib/updates';

describe('update check', () => {
  it('compares versions numerically', () => {
    expect(isNewer('2.10.0', '2.9.9')).toBe(true);
    expect(isNewer('v2.2.0', '2.1.0')).toBe(true);
    expect(isNewer('2.1.0', '2.1.0')).toBe(false);
    expect(isNewer('2.0.9', '2.1.0')).toBe(false);
    expect(isNewer('3', '2.9.9')).toBe(true);
  });

  it('offers only newer, published releases and finds the APK', () => {
    const release = {
      tag_name: 'v2.2.0',
      html_url: 'https://github.com/DeeJayKyle/Deep-Tutor-Pro/releases/tag/v2.2.0',
      assets: [
        { name: 'Deep-Tutor-Pro-2.2.0-Windows-x64-Setup.exe', browser_download_url: 'https://example.org/setup.exe' },
        { name: 'Deep-Tutor-Pro-2.2.0-Android.apk', browser_download_url: 'https://example.org/app.apk' },
      ],
    };
    expect(parseRelease(release, '2.1.0')).toEqual({ version: '2.2.0', page: release.html_url, apk: 'https://example.org/app.apk' });
    expect(parseRelease(release, '2.2.0')).toBeNull();
    expect(parseRelease({ ...release, prerelease: true }, '2.1.0')).toBeNull();
    expect(parseRelease({ ...release, draft: true }, '2.1.0')).toBeNull();
    expect(parseRelease({ tag_name: 'nightly' }, '2.1.0')).toBeNull();
    expect(parseRelease({ ...release, assets: [] }, '2.1.0')?.apk).toBeUndefined();
  });

  it('warns when the new APK cannot install over the current app', () => {
    const base = { tag_name: 'v2.2.0', assets: [] };
    expect(parseRelease({ ...base, body: '- Android APK: signed with a **temporary key generated for this build**.' }, '2.1.0')?.reinstall).toBe(true);
    expect(parseRelease({ ...base, body: "- Android APK: signed with the project's release key." }, '2.1.0')?.reinstall).toBeUndefined();
  });
});
