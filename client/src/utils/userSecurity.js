/*
 * Users-table safety helpers.
 *
 * The `password` column must never be requested by the browser: list the
 * columns explicitly instead of select("*"). After security step B runs in
 * Supabase, the anon role can no longer read that column at all, so any
 * select("*") on users would fail.
 */
export const USER_COLUMNS =
  "id,name,company_id,email,phone,access,team_name,created_at,updated_at";

// Fields the app is allowed to write on a users row.
const WRITABLE_USER_FIELDS = ["name", "company_id", "email", "phone", "access", "team_name", "password"];

export const MIN_PASSWORD_LENGTH = 8;

/** Keep only writable fields; drop an empty password so it isn't overwritten. */
export function cleanUserPayload(form) {
  const out = {};
  for (const k of WRITABLE_USER_FIELDS) {
    if (form[k] !== undefined) out[k] = typeof form[k] === "string" ? form[k].trim() : form[k];
  }
  if (!out.password) delete out.password;
  return out;
}

/** Password rule for people who can log in. Returns an error message or "". */
export function passwordProblem(password, { companyId = "", name = "", isArabic = false } = {}) {
  const p = password || "";
  if (p.length < MIN_PASSWORD_LENGTH) {
    return isArabic
      ? `كلمة المرور لازم تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل.`
      : `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  const lower = p.toLowerCase();
  if (
    (companyId && lower === companyId.trim().toLowerCase()) ||
    (name && lower === name.trim().toLowerCase()) ||
    ["password", "admin@1234", "ectron123", "qwerty123"].includes(lower) ||
    isTrivialSequence(p)
  ) {
    return isArabic
      ? "كلمة المرور سهلة التخمين (نفس الرقم الوظيفي أو الاسم، أو أرقام متكررة أو متسلسلة مثل 11111111 و12345678)."
      : "Password is too easy to guess (company ID, name, or repeated / sequential digits like 11111111 or 12345678).";
  }
  return "";
}

/** True for one repeated character (11111111) or a straight run (12345678, 87654321). */
export function isTrivialSequence(p) {
  if (!p || p.length < 2) return false;
  if (/^(.)\1+$/.test(p)) return true;
  if (!/^\d+$/.test(p)) return false;
  const step = p.charCodeAt(1) - p.charCodeAt(0);
  if (Math.abs(step) !== 1) return false;
  for (let i = 2; i < p.length; i++) {
    const d = p.charCodeAt(i) - p.charCodeAt(i - 1);
    // allow wrap-around 9→0 / 0→9 (e.g. 67890123)
    if (d !== step && d !== -9 * step) return false;
  }
  return true;
}

/**
 * Random password that is easy to read out / type (no 0/O, 1/l/I).
 * Uses the browser's cryptographic random generator.
 */
export function generatePassword(length = 10) {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const all = letters + digits;
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => all[b % all.length]);
  // guarantee at least one letter and one digit
  chars[0] = letters[bytes[0] % letters.length];
  chars[length - 1] = digits[bytes[length - 1] % digits.length];
  return chars.join("");
}
