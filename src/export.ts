import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';

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
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return;
  }
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: content,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  await Share.share({ title: filename, files: [uri], dialogTitle: filename });
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
    a.download = filename;
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
  const { uri } = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
  await Share.share({ title: filename, files: [uri], dialogTitle: filename });
}
