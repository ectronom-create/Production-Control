import { useEffect, useState } from "react";

/*
 * Install-as-app support.
 * Chrome / Edge / Android fire `beforeinstallprompt` once, often before React
 * has mounted the page that shows the button — so we catch it at import time
 * (main.jsx imports this file) and keep it until the user taps "Install".
 * iPhone/iPad never fire it: there the user adds the app from Safari's
 * Share menu, so we only show instructions.
 */

let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // keep the prompt for our own button
    deferredPrompt = e;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: window-controls-overlay)").matches ||
    window.navigator.standalone === true
  );
}

export function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPadOS 13+ reports itself as Mac, but has touch.
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

export function usePwaInstall() {
  const [, force] = useState(0);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onChange = () => force((n) => n + 1);
    listeners.add(onChange);
    const mq = window.matchMedia?.("(display-mode: standalone)");
    const onMode = () => setInstalled(isStandalone());
    mq?.addEventListener?.("change", onMode);
    return () => {
      listeners.delete(onChange);
      mq?.removeEventListener?.("change", onMode);
    };
  }, []);

  const ios = isIOS();
  const canPrompt = !!deferredPrompt;

  async function install() {
    if (!deferredPrompt) return "unavailable";
    const prompt = deferredPrompt;
    deferredPrompt = null;
    notify();
    prompt.prompt();
    const choice = await prompt.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") setInstalled(true);
    return choice?.outcome || "dismissed";
  }

  return {
    installed,
    // Show the button when the browser offers install, or on iOS (instructions).
    available: !installed && (canPrompt || ios),
    needsIosInstructions: !installed && ios && !canPrompt,
    install,
  };
}
