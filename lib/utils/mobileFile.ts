/** Detect iOS / iPadOS (incl. desktop-mode iPad). */
export function isAppleTouchDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS 13+ reports as Macintosh with touch
  return /Macintosh/i.test(ua) && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
}

/** Standalone PWA (home-screen) — window.open is unreliable / blocked. */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return Boolean(mq || iosStandalone);
}

/**
 * Trigger a file download from a Blob. Works better on mobile than
 * cross-origin `<a download>` against Supabase signed URLs.
 * On iOS, falls back to Web Share when available.
 */
export async function downloadBlob(blob: Blob, fileName: string): Promise<"downloaded" | "shared" | "opened"> {
  const url = URL.createObjectURL(blob);
  try {
    const canShareFile =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function";

    // iOS / PWA: Web Share is the reliable way to save or open a PDF.
    if ((isAppleTouchDevice() || isStandalonePwa()) && canShareFile) {
      const file = new File([blob], fileName, { type: blob.type || "application/pdf" });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: fileName });
          return "shared";
        } catch (err) {
          // User cancelled share sheet — don't fall through as an error toast.
          if (err instanceof DOMException && err.name === "AbortError") {
            return "shared";
          }
        }
      }
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return "downloaded";
  } finally {
    // Keep blob URL alive briefly so the browser can start the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
