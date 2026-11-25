import { useEffect, useRef, useState } from "react";
import {
  UserCircle,
  Briefcase,
  HeartPulse,
  Phone,
  KeyRound,
  ClipboardCheck,
  Camera,
  Save,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { C, card, sectionTitle } from "../components/dashboard/dashTheme";
import ChangePasswordForm from "../components/ChangePasswordForm";
import { resizeImage } from "../utils/image";

/*
 * My Profile — every role, operators included.
 *  • Job details (title, department, hire date, shift, stations) are shown
 *    read-only; only an admin / supervisor changes them.
 *  • Personal details, phone, e-mail and photo are saved through the
 *    database function update_my_profile, which only accepts those fields.
 *  • The evaluation card fills in when the evaluation module (phase 3) lands.
 */

const PERSONAL_FIELDS = [
  "full_name_ar",
  "dob",
  "gender",
  "nationality",
  "marital_status",
  "blood_type",
  "address",
  "emergency_name",
  "emergency_relation",
  "emergency_phone",
  "education",
  "languages",
];

const ROLE_LABELS = {
  admin: { ar: "مدير النظام", en: "Admin" },
  supervisor: { ar: "مشرف", en: "Supervisor" },
  viewer: { ar: "الإدارة", en: "Management" },
  operator: { ar: "مشغّل", en: "Operator" },
};
const GENDER = { male: ["ذكر", "Male"], female: ["أنثى", "Female"] };
const MARITAL = { single: ["أعزب", "Single"], married: ["متزوج", "Married"], other: ["أخرى", "Other"] };
const SHIFT = { Morning: ["صباحية", "Morning"], Night: ["ليلية", "Night"], Rotating: ["متناوبة", "Rotating"] };
const CONTRACT = {
  permanent: ["دائم", "Permanent"],
  temporary: ["مؤقت", "Temporary"],
  contractor: ["مقاول / شركة توريد", "Contractor"],
  trainee: ["متدرب", "Trainee"],
};
const STATION_AR = {
  Assembly: "التجميع",
  Insulation: "العزل",
  RF: "التردد اللاسلكي",
  Calibration: "المعايرة",
  "Multin test": "الفحص الشامل",
  Perso: "التخصيص",
  Packaging: "التغليف",
  "Firmware update": "تحديث الفيرموير",
};
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function Section({ icon: Icon, title, children }) {
  return (
    <section style={{ ...card, padding: 18 }}>
      <h3 style={{ ...sectionTitle, display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Icon size={18} color={C.teal} />
        {title}
      </h3>
      {children}
    </section>
  );
}

function ReadRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ color: C.muted, fontSize: "0.85rem" }}>{label}</span>
      <span style={{ color: C.text, fontWeight: 600, fontSize: "0.88rem", textAlign: "end" }}>{value || "—"}</span>
    </div>
  );
}

export default function MyProfile() {
  const { user, refreshUser } = useAuth();
  const { isArabic } = useLanguage();
  const L = (ar, en) => (isArabic ? ar : en);
  const opt = (map, k) => (map[k] ? map[k][isArabic ? 0 : 1] : k);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({});
  const [form, setForm] = useState({});
  const [photo, setPhoto] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("employee_profiles")
        .select("data, photo")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) console.warn("Profile load failed:", error);
      const p = data?.data || {};
      setProfile(p);
      setForm(Object.fromEntries(PERSONAL_FIELDS.map((k) => [k, p[k] || ""])));
      setPhoto(data?.photo || "");
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhoto(await resizeImage(file));
    } catch {
      setMessage({ type: "bad", text: L("تعذر قراءة الصورة.", "Could not read the image.") });
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.rpc("update_my_profile", {
      p_personal: form,
      p_photo: photo,
      p_phone: phone.trim(),
      p_email: email.trim(),
    });
    setSaving(false);
    if (error) {
      console.warn("Profile save failed:", error);
      setMessage({ type: "bad", text: L("فشل الحفظ. حاول مرة ثانية.", "Save failed. Please try again.") });
      return;
    }
    setProfile((p) => ({ ...p, ...form }));
    refreshUser?.();
    setMessage({ type: "good", text: L("تم حفظ بياناتك.", "Your details were saved.") });
  }

  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 };
  const role = ROLE_LABELS[user?.access] || ROLE_LABELS.operator;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-container" dir={isArabic ? "rtl" : "ltr"} style={{ display: "grid", gap: 16 }}>
      {/* Header */}
      <div style={{ ...card, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          {photo ? (
            <img
              src={photo}
              alt={user?.name}
              style={{ width: 84, height: 84, borderRadius: "50%", objectFit: "cover", border: `3px solid ${C.teal}` }}
            />
          ) : (
            <UserCircle size={84} color={C.muted} strokeWidth={1.2} />
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label={L("تغيير الصورة", "Change photo")}
            style={{
              position: "absolute",
              bottom: 0,
              insetInlineEnd: 0,
              background: C.teal,
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              width: 30,
              height: 30,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <Camera size={15} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h2 style={{ margin: 0, color: C.navy, fontSize: "1.25rem" }}>{user?.name}</h2>
          {profile.full_name_ar && <div style={{ color: C.text, marginTop: 2 }}>{profile.full_name_ar}</div>}
          <div style={{ color: C.muted, fontSize: "0.85rem", marginTop: 4 }}>
            {profile.job_title || (isArabic ? role.ar : role.en)}
            {user?.company_id ? ` · ${user.company_id}` : ""}
            {user?.team_name ? ` · ${user.team_name}` : ""}
          </div>
        </div>
      </div>

      {/* Evaluation (phase 3) */}
      <Section icon={ClipboardCheck} title={L("تقييمي", "My evaluation")}>
        <p style={{ margin: 0, color: C.muted, fontSize: "0.88rem" }}>
          {L(
            "ما في تقييم لحد الحين. لما يقيّمك المدير بتشوف هنا النتيجة لكل محطة ومستواك.",
            "No evaluation yet. When the admin evaluates you, your result for each station and your level will show here.",
          )}
        </p>
      </Section>

      {/* Job details — read only */}
      <Section icon={Briefcase} title={L("البيانات الوظيفية", "Job details")}>
        <ReadRow label={L("المسمى الوظيفي", "Job title")} value={profile.job_title} />
        <ReadRow label={L("القسم", "Department")} value={profile.department} />
        <ReadRow label={L("تاريخ التعيين", "Hire date")} value={profile.hire_date} />
        <ReadRow label={L("نوع العقد", "Contract")} value={profile.contract_type && opt(CONTRACT, profile.contract_type)} />
        <ReadRow label={L("الوردية", "Shift")} value={profile.shift && opt(SHIFT, profile.shift)} />
        <ReadRow
          label={L("المحطات المعتمدة", "Certified stations")}
          value={(profile.certified_stations || []).map((id) => (isArabic ? STATION_AR[id] || id : id)).join(isArabic ? "، " : ", ")}
        />
        <p style={{ margin: "10px 0 0", fontSize: "0.78rem", color: C.muted }}>
          {L("هذي البيانات يعدلها المدير أو المشرف.", "These details are changed by the admin or supervisor.")}
        </p>
      </Section>

      {/* Personal details — editable */}
      <form onSubmit={handleSave} style={{ display: "grid", gap: 16 }}>
        <Section icon={UserCircle} title={L("بياناتي الشخصية", "My personal details")}>
          <div style={grid}>
            <div className="form-group">
              <label>{L("الاسم الكامل بالعربي", "Full name (Arabic)")}</label>
              <input value={form.full_name_ar} onChange={set("full_name_ar")} />
            </div>
            <div className="form-group">
              <label>{L("تاريخ الميلاد", "Date of birth")}</label>
              <input type="date" value={form.dob} onChange={set("dob")} />
            </div>
            <div className="form-group">
              <label>{L("الجنس", "Gender")}</label>
              <select value={form.gender} onChange={set("gender")}>
                <option value="">—</option>
                {Object.keys(GENDER).map((k) => (
                  <option key={k} value={k}>{opt(GENDER, k)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{L("الجنسية", "Nationality")}</label>
              <input value={form.nationality} onChange={set("nationality")} />
            </div>
            <div className="form-group">
              <label>{L("الحالة الاجتماعية", "Marital status")}</label>
              <select value={form.marital_status} onChange={set("marital_status")}>
                <option value="">—</option>
                {Object.keys(MARITAL).map((k) => (
                  <option key={k} value={k}>{opt(MARITAL, k)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{L("فصيلة الدم", "Blood type")}</label>
              <select value={form.blood_type} onChange={set("blood_type")}>
                <option value="">—</option>
                {BLOOD_TYPES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{L("المؤهل الدراسي", "Education")}</label>
              <input value={form.education} onChange={set("education")} />
            </div>
            <div className="form-group">
              <label>{L("اللغات", "Languages")}</label>
              <input value={form.languages} onChange={set("languages")} />
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>{L("العنوان", "Address")}</label>
              <input value={form.address} onChange={set("address")} />
            </div>
          </div>
        </Section>

        <Section icon={Phone} title={L("التواصل", "Contact")}>
          <div style={grid}>
            <div className="form-group">
              <label>{L("رقم الهاتف", "Phone")}</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{L("البريد الإلكتروني", "E-mail")}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
        </Section>

        <Section icon={HeartPulse} title={L("جهة اتصال للطوارئ", "Emergency contact")}>
          <div style={grid}>
            <div className="form-group">
              <label>{L("الاسم", "Name")}</label>
              <input value={form.emergency_name} onChange={set("emergency_name")} />
            </div>
            <div className="form-group">
              <label>{L("صلة القرابة", "Relation")}</label>
              <input value={form.emergency_relation} onChange={set("emergency_relation")} />
            </div>
            <div className="form-group">
              <label>{L("رقم الهاتف", "Phone")}</label>
              <input type="tel" value={form.emergency_phone} onChange={set("emergency_phone")} />
            </div>
          </div>
        </Section>

        {message && (
          <div
            style={{
              background: `${message.type === "good" ? C.good : C.bad}14`,
              color: message.type === "good" ? C.good : C.bad,
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 600,
              fontSize: "0.88rem",
            }}
          >
            {message.text}
          </div>
        )}
        <button
          type="submit"
          className="btn-primary"
          disabled={saving}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, justifySelf: "start", minWidth: 180 }}
        >
          {saving ? <span className="spinner" /> : <Save size={16} />}
          {L("حفظ بياناتي", "Save my details")}
        </button>
      </form>

      <Section icon={KeyRound} title={L("تغيير كلمة المرور", "Change password")}>
        <div style={{ maxWidth: 420 }}>
          <ChangePasswordForm />
        </div>
      </Section>
    </div>
  );
}
