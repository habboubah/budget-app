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
