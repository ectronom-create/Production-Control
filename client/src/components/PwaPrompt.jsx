import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X, CheckCircle2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const UPDATE_CHECK_MS = 60 * 60 * 1000; // the line runs all day — check hourly

/**
 * Registers the service worker and shows:
 *  • a bar when a new version is deployed ("Update" reloads into it), and
 *  • a short note the first time the app is ready to open without waiting.
 * The update is never forced, so nobody loses a form they are filling in.
 */
export default function PwaPrompt() {
  const { isArabic } = useLanguage();
  const L = (ar, en) => (isArabic ? ar : en);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      setInterval(async () => {
        if (registration.installing || !navigator.onLine) return;
        try {
          const resp = await fetch(swUrl, { cache: "no-store", headers: { "cache-control": "no-cache" } });
          if (resp.status === 200) await registration.update();
        } catch {
          /* offline — try again next hour */
        }
      }, UPDATE_CHECK_MS);
    },
    onRegisterError(err) {
      console.warn("Service worker registration failed:", err);
    },
  });

  useEffect(() => {
    if (!offlineReady) return undefined;
    const t = setTimeout(() => setOfflineReady(false), 5000);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (needRefresh) {
    return (
      <div className="pwa-bar" role="alert">
        <RefreshCw size={18} className="pwa-bar-icon" aria-hidden="true" />
        <span className="pwa-bar-text">
          {L("فيه نسخة جديدة من التطبيق.", "A new version of the app is available.")}
        </span>
        <button type="button" className="pwa-bar-btn" onClick={() => updateServiceWorker(true)}>
          {L("تحديث", "Update")}
        </button>
        <button
          type="button"
          className="pwa-bar-close"
          onClick={() => setNeedRefresh(false)}
          aria-label={L("لاحقاً", "Later")}
          title={L("لاحقاً", "Later")}
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div className="pwa-bar pwa-bar--ok" role="status">
        <CheckCircle2 size={18} className="pwa-bar-icon" aria-hidden="true" />
        <span className="pwa-bar-text">
          {L("التطبيق جاهز ويفتح بسرعة من الحين.", "The app is ready and will now open instantly.")}
        </span>
        <button
          type="button"
          className="pwa-bar-close"
          onClick={() => setOfflineReady(false)}
          aria-label={L("إغلاق", "Close")}
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return null;
}
