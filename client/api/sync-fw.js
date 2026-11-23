// Vercel serverless function: firmware-update count for one production shift.
// Proxies the Google Apps Script that reads LOG.csv on Google Drive.
//
// Security:
//  • same-origin only (no "Access-Control-Allow-Origin: *") — only the app
//    itself can call it from a browser;
//  • strict input validation (date = YYYY-MM-DD, shift = Morning | Evening);
//  • internal error details are logged, not returned.

const GOOGLE_APPS_SCRIPT_URL =
  process.env.FW_SYNC_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbxHUCPbr7nKCtK9x1NuQ_ObGoyOlbB6GCUWw09dYhAVJODPpAdPuW7OBDxtZgyqRrq1Pw/exec";

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const SHIFTS = new Set(["Morning", "Evening"]);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const date = String(req.query.date || "");
  const shift = String(req.query.shift || "");
  if (!DATE_RE.test(date) || !SHIFTS.has(shift)) {
    return res.status(400).json({ error: "Invalid date or shift" });
  }

  const targetUrl = `${GOOGLE_APPS_SCRIPT_URL}?date=${encodeURIComponent(date)}&shift=${encodeURIComponent(shift)}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`Apps Script HTTP ${response.status}`);
    const data = await response.json();
    // Only pass through the fields the app uses.
    if (!data || data.success !== true || !Number.isFinite(Number(data.count))) {
      return res.status(502).json({ success: false, error: "Firmware count is temporarily unavailable" });
    }
    return res.status(200).json({
      success: true,
      date,
      shift,
      count: Number(data.count),
      pcStats: typeof data.pcStats === "object" && data.pcStats !== null ? data.pcStats : {},
    });
  } catch (err) {
    console.error("sync-fw failed:", err);
    return res.status(502).json({ error: "Firmware count is temporarily unavailable" });
  }
}
