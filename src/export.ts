import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { isAndroid } from './platform';
import { onWipe } from './storage';

/** Where shared files wait in the cache: one folder, so leftovers can all go. */
const SHARE_DIR = 'share';

/**
 * A name that is safe as one file name: no folders, no "..", nothing the
 * file systems refuse. Receipt names come from the user or from an imported
 * backup, so "Rechnung 11/2026" (or worse, "../../Library/…") must not
 * become a path.
 */
export function safeFileName(name: string, fallback = 'Haushaltsbuch Einfach'): string {
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 && /^\.[A-Za-z0-9]{1,8}$/.test(name.slice(dot)) ? name.slice(dot) : '';
  const base = (ext ? name.slice(0, dot) : name)
    .replace(/[\u0000-\u001f\u007f/\\:*?"<>|]/g, '-')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, 100);
  return (base || fallback) + ext;
}

/**
 * Removes what earlier shares left in the cache — a plain CSV or an
 * unencrypted backup must not stay on the phone after it was handed on.
 * On iPhone each file goes as soon as the share sheet closes; on Android the
 * receiving app may still be reading it then, so it waits for the next share,
 * the next launch or "Reset app".
 */
export async function clearShared(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try { await Filesystem.rmdir({ path: SHARE_DIR, directory: Directory.Cache, recursive: true }); } catch { /* nothing there */ }
}
onWipe(clearShared);

/** Writes one file into the share folder (clearing older ones) and offers it in the share sheet. */
async function shareFromCache(filename: string, data: string, encoding?: Encoding): Promise<void> {
  await clearShared();
  const path = `${SHARE_DIR}/${safeFileName(filename)}`;
  const { uri } = await Filesystem.writeFile({ path, data, directory: Directory.Cache, recursive: true, ...(encoding ? { encoding } : {}) });
  try {
    await Share.share({ title: filename, files: [uri], dialogTitle: filename });
  } finally {
    if (!isAndroid()) { try { await Filesystem.deleteFile({ path, directory: Directory.Cache }); } catch { /* already gone */ } }
  }
}

/**
 * Hand a file to the user (no backend). On the web this is a download; on
 * iPhone the file is written to the cache and offered in the share sheet, so
 * it can go to Files / iCloud Drive, AirDrop or a message as a real .json or
 * .csv attachment — not pasted as a wall of text (pizza-driver-log learned
 * that the hard way).
 */
export async function downloadFile(filename: string, content: string, mime: string) {
  if (!Capacitor.isNativePlatform()) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFileName(filename);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return;
  }
  await shareFromCache(filename, content, Encoding.UTF8);
}

/**
 * Share a picture (the year review): on iPhone through the share sheet from
 * the cache, on the web through the browser's own share where it takes
 * files, else as a download. Nothing leaves the device unless the user
 * picks where it goes.
 */
export async function shareImage(filename: string, blob: Blob) {
  if (!Capacitor.isNativePlatform()) {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFileName(filename);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return;
  }
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
  await shareFromCache(filename, data);
}
