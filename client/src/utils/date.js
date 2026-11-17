// Local-time date helpers.
// Avoid `toISOString().slice(0, 10)`: it returns the UTC date, which in Oman
// (UTC+4) is still "yesterday" between midnight and 4 AM.

export function toLocalDateStr(input = new Date()) {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getTodayString() {
  return toLocalDateStr(new Date());
}
