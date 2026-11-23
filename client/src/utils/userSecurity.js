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
    ["12345678", "password", "admin@1234", "ectron123", "qwerty123"].includes(lower)
  ) {
    return isArabic
      ? "كلمة المرور سهلة التخمين (نفس الرقم الوظيفي أو الاسم أو كلمة شائعة)."
      : "Password is too easy to guess (same as company ID, name, or a common password).";
  }
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) {
    return isArabic
      ? "كلمة المرور لازم تحتوي على حروف وأرقام."
      : "Password must contain letters and numbers.";
  }
  return "";
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
