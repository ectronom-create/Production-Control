// One small palette with fixed meaning for the management dashboard.
export const C = {
  navy: "#142547", // brand / headings
  teal: "#00afaa", // brand accent (sparingly)
  good: "#16a34a", // on target
  warn: "#d97706", // needs attention
  bad: "#dc2626", // problem
  text: "#334155",
  muted: "#64748b",
  border: "#e2e8f0",
  soft: "#f8fafc",
};

export const tint = (color) => `${color}14`;

export const card = {
  background: "#ffffff",
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: 20,
  boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
};

export const sectionTitle = {
  margin: 0,
  fontSize: "1rem",
  fontWeight: 800,
  color: C.navy,
};

// pct of target → semantic colour
export function pctColor(pct) {
  if (pct >= 100) return C.good;
  if (pct >= 85) return C.warn;
  return C.bad;
}

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export function fmtDate(dStr, isArabic, withYear = true) {
  if (!dStr) return "—";
  const [y, m, d] = dStr.split("-").map(Number);
  return `${d} ${(isArabic ? MONTHS_AR : MONTHS_EN)[m - 1]}${withYear ? ` ${y}` : ""}`;
}

export const num = (v) => Math.round(v || 0).toLocaleString("en-US");
