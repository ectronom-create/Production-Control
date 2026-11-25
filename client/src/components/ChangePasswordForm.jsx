import { useState } from "react";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { passwordProblem, MIN_PASSWORD_LENGTH } from "../utils/userSecurity";
import { C } from "./dashboard/dashTheme";

/*
 * Set a new password for the signed-in user.
 *  • forced: shown full-screen after the first login (or after an admin reset)
 *    — the user cannot use the app until the password is changed.
 *  • otherwise: used inside My Profile.
 */
export default function ChangePasswordForm({ forced = false, onDone }) {
  const { user, changePassword, logout } = useAuth();
  const { isArabic } = useLanguage();
  const L = (ar, en) => (isArabic ? ar : en);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const problem = passwordProblem(pw, {
      companyId: user?.company_id,
      name: user?.name,
      isArabic,
    });
    if (problem) return setError(problem);
    if (pw !== pw2) return setError(L("كلمتا المرور غير متطابقتين.", "The two passwords do not match."));

    setSaving(true);
    try {
      await changePassword(pw);
      setPw("");
      setPw2("");
      setDone(true);
      onDone?.();
    } catch (err) {
      const msg = String(err?.message || "");
      setError(
        /different from the old/i.test(msg)
          ? L("كلمة المرور الجديدة لازم تختلف عن القديمة.", "The new password must be different from the old one.")
          : msg || L("تعذر تغيير كلمة المرور.", "Could not change the password."),
      );
    } finally {
      setSaving(false);
    }
  }

  const form = (
    <form onSubmit={handleSubmit} noValidate style={{ display: "grid", gap: 12 }}>
      {error && (
        <div className="login-error" style={{ fontSize: "0.85rem" }}>
          {error}
        </div>
      )}
      {done && !forced && (
        <div
          style={{
            background: `${C.good}14`,
            color: C.good,
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          {L("تم تغيير كلمة المرور.", "Password changed.")}
        </div>
      )}
      <div className="form-group" style={{ margin: 0 }}>
        <label htmlFor="new-pw">{L("كلمة المرور الجديدة", "New password")}</label>
        <div style={{ position: "relative" }}>
          <input
            id="new-pw"
            type={show ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="new-password"
            disabled={saving}
            style={{ width: "100%", paddingInlineEnd: 40 }}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? L("إخفاء", "Hide") : L("إظهار", "Show")}
            style={{
              position: "absolute",
              insetInlineEnd: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.muted,
              padding: 4,
            }}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label htmlFor="new-pw2">{L("أعد كتابة كلمة المرور", "Repeat the password")}</label>
        <input
          id="new-pw2"
          type={show ? "text" : "password"}
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          autoComplete="new-password"
          disabled={saving}
        />
      </div>
      <p style={{ margin: 0, fontSize: "0.78rem", color: C.muted }}>
        {L(
          `${MIN_PASSWORD_LENGTH} خانات على الأقل (أرقام بس مقبولة)، ولا تكون نفس الرقم الوظيفي أو الاسم، ولا أرقام متكررة أو متسلسلة.`,
          `At least ${MIN_PASSWORD_LENGTH} characters (numbers only is fine), not your company ID or name, no repeated or sequential digits.`,
        )}
      </p>
      <button
        type="submit"
        className="btn-primary"
        disabled={saving}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        {saving ? <span className="spinner" /> : <KeyRound size={16} />}
        {L("حفظ كلمة المرور", "Save password")}
      </button>
      {forced && (
        <button type="button" className="btn-secondary" onClick={() => logout()} disabled={saving}>
          {L("تسجيل الخروج", "Sign out")}
        </button>
      )}
    </form>
  );

  if (!forced) return form;

  return (
    <div className="login-page" dir={isArabic ? "rtl" : "ltr"}>
      <div className="login-card" style={{ maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <KeyRound size={34} color={C.teal} />
          <h2 style={{ margin: "8px 0 4px", color: C.navy, fontSize: "1.2rem" }}>
            {L("غيّر كلمة المرور", "Change your password")}
          </h2>
          <p style={{ margin: 0, color: C.muted, fontSize: "0.85rem" }}>
            {L(
              `أهلاً ${user?.name || ""}، لازم تختار كلمة مرور جديدة قبل ما تكمل.`,
              `Welcome ${user?.name || ""}. Choose a new password before you continue.`,
            )}
          </p>
        </div>
        {form}
      </div>
    </div>
  );
}
