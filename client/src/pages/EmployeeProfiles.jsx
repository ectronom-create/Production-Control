import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import {
  User,
  Users,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  MapPin,
  Clock,
  Award,
  Camera,
  Activity,
  Heart,
  Flag,
  ArrowLeft,
  ArrowRight,
  FileText,
  Printer,
  Edit2,
  Search,
  Factory,
  ShieldCheck,
  Save,
  IdCard,
  Cake,
  Droplet,
  Sparkles,
  AlertCircle,
  Hash,
  Building2,
} from "lucide-react";
import { resizeImage } from "../utils/image";
import { USER_COLUMNS } from "../utils/userSecurity";

// ─── Constants ────────────────────────────────────────────────────────────────
const STAGES = [
  { id: "Assembly", nameAr: "التجميع", color: "#4f46e5", icon: "🔧" },
  { id: "Insulation", nameAr: "العزل", color: "#0284c7", icon: "🛡️" },
  { id: "RF", nameAr: "التردد اللاسلكي", color: "#0d9488", icon: "📡" },
  { id: "Calibration", nameAr: "المعايرة", color: "#eab308", icon: "⚖️" },
  { id: "Multin test", nameAr: "الفحص الشامل", color: "#8b5cf6", icon: "🔬" },
  { id: "Perso", nameAr: "التخصيص", color: "#ec4899", icon: "🏷️" },
  { id: "Packaging", nameAr: "التغليف", color: "#10b981", icon: "📦" },
  { id: "Firmware update", nameAr: "تحديث الفيرموير", color: "#06b6d4", icon: "💾" },
];
const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.id, s]));

const ROLE_LABELS = {
  admin: { ar: "مدير النظام", en: "Admin" },
  supervisor: { ar: "مشرف", en: "Supervisor" },
  operator: { ar: "مشغل", en: "Operator" },
  viewer: { ar: "مشاهد", en: "Viewer" },
};

const STATUS_OPTIONS = {
  active: { ar: "على رأس العمل", en: "Active", color: "#10b981", bg: "#f0fdf4" },
  on_leave: { ar: "في إجازة", en: "On Leave", color: "#f59e0b", bg: "#fffbeb" },
  inactive: { ar: "غير نشط", en: "Inactive", color: "#64748b", bg: "#f1f5f9" },
};

const GENDER_OPTIONS = {
  male: { ar: "ذكر", en: "Male" },
  female: { ar: "أنثى", en: "Female" },
};

const MARITAL_OPTIONS = {
  single: { ar: "أعزب", en: "Single" },
  married: { ar: "متزوج", en: "Married" },
  other: { ar: "أخرى", en: "Other" },
};

const CONTRACT_OPTIONS = {
  permanent: { ar: "دائم", en: "Permanent" },
  temporary: { ar: "مؤقت", en: "Temporary" },
  contractor: { ar: "مقاول / شركة توريد", en: "Contractor" },
  trainee: { ar: "متدرب", en: "Trainee" },
};

const SHIFT_OPTIONS = {
  Morning: { ar: "صباحية", en: "Morning" },
  Night: { ar: "ليلية", en: "Night" },
  Rotating: { ar: "متناوبة", en: "Rotating" },
};

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const LOCAL_KEY = "ectron_employee_profiles";
const PROFILE_TABLE = "employee_profiles";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseTeam(teamName) {
  if (!teamName) return { supervisor: "", station: "", status: "active" };
  try {
    if (teamName.startsWith("{")) {
      const p = JSON.parse(teamName);
      return {
        supervisor: p.supervisor || "",
        station: p.station || "",
        status: p.status || "active",
      };
    }
  } catch {}
  return { supervisor: "", station: "", status: "active", team: teamName };
}

function calcAge(dob) {
  if (!dob) return null;
  const b = new Date(dob);
  if (isNaN(b)) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

function daysToBirthday(dob) {
  if (!dob) return null;
  const b = new Date(dob);
  if (isNaN(b)) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
  if (next < now) next = new Date(now.getFullYear() + 1, b.getMonth(), b.getDate());
  return Math.round((next - now) / 86400000);
}

function calcService(hireDate) {
  if (!hireDate) return null;
  const h = new Date(hireDate);
  if (isNaN(h)) return null;
  const now = new Date();
  let months =
    (now.getFullYear() - h.getFullYear()) * 12 + (now.getMonth() - h.getMonth());
  if (now.getDate() < h.getDate()) months--;
  if (months < 0) return null;
  return { years: Math.floor(months / 12), months: months % 12, total: months };
}

function formatService(s, isArabic) {
  if (!s) return "—";
  const parts = [];
  if (isArabic) {
    if (s.years) parts.push(`${s.years} ${s.years === 1 ? "سنة" : s.years === 2 ? "سنتان" : s.years <= 10 ? "سنوات" : "سنة"}`);
    if (s.months) parts.push(`${s.months} ${s.months === 1 ? "شهر" : s.months === 2 ? "شهران" : s.months <= 10 ? "أشهر" : "شهراً"}`);
    return parts.length ? parts.join(" و ") : "أقل من شهر";
  }
  if (s.years) parts.push(`${s.years} yr${s.years > 1 ? "s" : ""}`);
  if (s.months) parts.push(`${s.months} mo`);
  return parts.length ? parts.join(" ") : "< 1 month";
}

function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function avatarColor(name) {
  const palette = ["#00afaa", "#4f46e5", "#0284c7", "#0d9488", "#8b5cf6", "#ec4899", "#f59e0b", "#142547"];
  let h = 0;
  for (const c of name || "") h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

function readLocalProfiles() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeLocalProfile(userId, data) {
  try {
    const all = readLocalProfiles();
    all[userId] = data;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  } catch {}
}

function optLabel(map, key, isArabic) {
  if (!key || !map[key]) return "—";
  return isArabic ? map[key].ar : map[key].en;
}

// ─── Data hook: employees + profiles + crew history ───────────────────────────
function useEmployeesData() {
  const [employees, setEmployees] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [crewHistory, setCrewHistory] = useState([]);
  const [usingLocal, setUsingLocal] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, profRes, histRes] = await Promise.all([
        supabase
          .from("users")
          .select("id,name,company_id,email,phone,access,team_name,created_at")
          .order("name"),
        supabase.from(PROFILE_TABLE).select("*"),
        supabase
          .from("pre_production_checklists")
          .select("id,date,shift,supervisor,item_details")
          .eq("form_no", "CREW-ASSIGN-2026")
          .order("id", { ascending: false }),
      ]);

      setEmployees((usersRes.data || []).filter((u) => u.access !== "viewer"));

      const local = readLocalProfiles();
      if (profRes.error) {
        // Table not created yet → keep working from browser storage
        setUsingLocal(true);
        setProfiles(local);
      } else {
        setUsingLocal(false);
        const map = {};
        (profRes.data || []).forEach((p) => {
          map[p.user_id] = { ...(p.data || {}), photo: p.photo || "" };
        });

        // One-time migration: push profiles that were saved on this device
        // (before the table existed) up to Supabase, then clear local copy.
        const validIds = new Set((usersRes.data || []).map((u) => String(u.id)));
        const pending = Object.entries(local).filter(
          ([uid]) => !map[uid] && validIds.has(String(uid)),
        );
        if (pending.length) {
          const rows = pending.map(([uid, d]) => {
            const { photo, ...data } = d || {};
            return {
              user_id: Number(uid),
              data,
              photo: photo || "",
              updated_at: new Date().toISOString(),
            };
          });
          const { error: migErr } = await supabase
            .from(PROFILE_TABLE)
            .upsert(rows, { onConflict: "user_id" });
          if (!migErr) {
            pending.forEach(([uid, d]) => (map[uid] = d));
            try {
              localStorage.removeItem(LOCAL_KEY);
            } catch {}
          }
        } else if (Object.keys(local).length) {
          try {
            localStorage.removeItem(LOCAL_KEY);
          } catch {}
        }
        setProfiles(map);
      }

      if (!histRes.error && histRes.data) {
        setCrewHistory(histRes.data);
      } else {
        try {
          setCrewHistory(
            JSON.parse(localStorage.getItem("ectron_crew_shift_history") || "[]"),
          );
        } catch {
          setCrewHistory([]);
        }
      }
    } catch (e) {
      console.warn("Employee profiles load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live sync: reflect edits made on any other device instantly
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (usingLocal) return;
    const channel = supabase
      .channel("employee-profiles-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: PROFILE_TABLE },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const uid = payload.old?.user_id;
            if (uid == null) return;
            setProfiles((prev) => {
              const next = { ...prev };
              delete next[uid];
              return next;
            });
          } else {
            const row = payload.new;
            if (!row) return;
            setProfiles((prev) => ({
              ...prev,
              [row.user_id]: { ...(row.data || {}), photo: row.photo || "" },
            }));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = payload.old?.id;
            setEmployees((prev) => prev.filter((e) => e.id !== id));
            return;
          }
          const row = payload.new;
          if (!row || row.access === "viewer") return;
          // Keep only the public columns (never password / login link).
          const safe = Object.fromEntries(
            USER_COLUMNS.split(",").filter((k) => k in row).map((k) => [k, row[k]]),
          );
          setEmployees((prev) => {
            const exists = prev.some((e) => e.id === safe.id);
            const next = exists
              ? prev.map((e) => (e.id === safe.id ? { ...e, ...safe } : e))
              : [...prev, safe];
            return next.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
          });
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [usingLocal]);

  return { employees, profiles, setProfiles, crewHistory, usingLocal, live, loading, reload: load };
}

// Per-operator shift statistics from crew assignment snapshots
function operatorShiftStats(operatorId, crewHistory) {
  const stations = {};
  let shifts = 0;
  let morning = 0;
  let night = 0;
  let lastDate = "";
  let lastStation = "";
  const seen = new Set();
  crewHistory.forEach((rec) => {
    const assignments = rec.item_details?.stationAssignments || {};
    for (const [stageId, ids] of Object.entries(assignments)) {
      const list = Array.isArray(ids) ? ids : ids ? [ids] : [];
      if (list.map(String).includes(String(operatorId))) {
        const key = `${rec.date}|${rec.shift}`;
        stations[stageId] = (stations[stageId] || 0) + 1;
        if (!seen.has(key)) {
          seen.add(key);
          shifts++;
          if (rec.shift === "Night") night++;
          else morning++;
        }
        if (!lastDate || rec.date > lastDate) {
          lastDate = rec.date;
          lastStation = stageId;
        }
      }
    }
  });
  const topStation = Object.entries(stations).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  return { shifts, morning, night, stations, lastDate, lastStation, topStation };
}

// ─── Auto-generated summary ───────────────────────────────────────────────────
function buildSummary(emp, profile, meta, stats, extra, isArabic) {
  const p = profile || {};
  const age = calcAge(p.dob);
  const service = calcService(p.hire_date);
  const role = emp.access;
  const title = p.job_title || (isArabic ? ROLE_LABELS[role]?.ar : ROLE_LABELS[role]?.en) || "";
  const station = meta.station ? (isArabic ? STAGE_MAP[meta.station]?.nameAr || meta.station : meta.station) : "";
  const s = [];

  if (isArabic) {
    let first = `${emp.name}`;
    if (age !== null) first += `، ${age} سنة`;
    if (p.nationality) first += `، ${p.nationality}`;
    first += `، يعمل بوظيفة ${title}`;
    if (p.department) first += ` في قسم ${p.department}`;
    if (role === "operator" && station) first += ` على محطة ${station}`;
    if (meta.supervisor) first += ` تحت إشراف ${meta.supervisor}`;
    s.push(first + ".");
    if (service) s.push(`مدة الخدمة في الشركة ${formatService(service, true)} (منذ ${p.hire_date}).`);
    if (role === "operator") {
      if (stats?.shifts) {
        let t = `شارك في ${stats.shifts} وردية مسجلة (${stats.morning} صباحية / ${stats.night} ليلية)`;
        if (stats.topStation)
          t += `، وأكثر محطة عمل عليها هي ${STAGE_MAP[stats.topStation]?.nameAr || stats.topStation}`;
        s.push(t + ".");
      } else {
        s.push("لا توجد ورديات مسجلة له في سجل توزيع الطاقم حتى الآن.");
      }
      const certs = p.certified_stations || [];
      if (certs.length)
        s.push(`مؤهل للعمل على ${certs.length} ${certs.length > 2 ? "محطات" : "محطة"}: ${certs.map((c) => STAGE_MAP[c]?.nameAr || c).join("، ")}.`);
    } else if (extra) {
      const bits = [];
      if (extra.teamSize) bits.push(`يشرف على ${extra.teamSize} مشغل`);
      if (extra.shiftsLed) bits.push(`قاد ${extra.shiftsLed} وردية`);
      if (extra.production) bits.push(`أدخل ${extra.production} تقرير إنتاج`);
      if (extra.downtime) bits.push(`سجّل ${extra.downtime} توقف`);
      if (extra.defects) bits.push(`سجّل ${extra.defects} عداد معيب`);
      if (bits.length) s.push(bits.join("، ") + ".");
    }
    const st = STATUS_OPTIONS[p.employment_status || meta.status || "active"];
    if (st && (p.employment_status || meta.status) !== "active") s.push(`الحالة الحالية: ${st.ar}.`);
  } else {
    let first = `${emp.name}`;
    if (age !== null) first += `, ${age} years old`;
    if (p.nationality) first += `, ${p.nationality}`;
    first += `, works as ${title}`;
    if (p.department) first += ` in ${p.department}`;
    if (role === "operator" && station) first += ` on the ${station} station`;
    if (meta.supervisor) first += ` under ${meta.supervisor}`;
    s.push(first + ".");
    if (service) s.push(`Length of service: ${formatService(service, false)} (since ${p.hire_date}).`);
    if (role === "operator") {
      if (stats?.shifts) {
        let t = `Worked ${stats.shifts} recorded shifts (${stats.morning} morning / ${stats.night} night)`;
        if (stats.topStation) t += `, most often on ${stats.topStation}`;
        s.push(t + ".");
      } else {
        s.push("No shifts recorded in the crew assignment log yet.");
      }
      const certs = p.certified_stations || [];
      if (certs.length) s.push(`Certified on ${certs.length} station(s): ${certs.join(", ")}.`);
    } else if (extra) {
      const bits = [];
      if (extra.teamSize) bits.push(`supervises ${extra.teamSize} operators`);
      if (extra.shiftsLed) bits.push(`led ${extra.shiftsLed} shifts`);
      if (extra.production) bits.push(`entered ${extra.production} production reports`);
      if (extra.downtime) bits.push(`logged ${extra.downtime} stoppages`);
      if (extra.defects) bits.push(`logged ${extra.defects} defective meters`);
      if (bits.length) s.push(bits.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".");
    }
    const key = p.employment_status || meta.status || "active";
    if (key !== "active" && STATUS_OPTIONS[key]) s.push(`Current status: ${STATUS_OPTIONS[key].en}.`);
  }
  return s;
}

// ─── Small UI pieces ──────────────────────────────────────────────────────────
function Avatar({ name, photo, size = 56 }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "3px solid var(--white)",
          boxShadow: "var(--shadow-md)",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: avatarColor(name),
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: size * 0.36,
        border: "3px solid var(--white)",
        boxShadow: "var(--shadow-md)",
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

function StatusPill({ statusKey, isArabic }) {
  const st = STATUS_OPTIONS[statusKey] || STATUS_OPTIONS.active;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: "0.72rem",
        fontWeight: 700,
        color: st.color,
        background: st.bg,
        border: `1px solid ${st.color}40`,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.color }} />
      {isArabic ? st.ar : st.en}
    </span>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px dashed var(--gray-200)",
      }}
    >
      <Icon size={16} color="var(--teal)" style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.72rem", color: "var(--gray-500)", fontWeight: 600 }}>{label}</div>
        <div
          style={{
            fontSize: "0.9rem",
            color: value && value !== "—" ? "var(--gray-900)" : "var(--gray-400)",
            fontWeight: 600,
            wordBreak: "break-word",
          }}
        >
          {value || "—"}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children, style }) {
  return (
    <div
      style={{
        background: "var(--white)",
        border: "1px solid var(--gray-200)",
        borderRadius: 14,
        padding: "18px 20px",
        boxShadow: "var(--shadow-sm)",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontWeight: 800,
          color: "var(--navy)",
          fontSize: "0.95rem",
          marginBottom: 6,
        }}
      >
        <Icon size={18} color="var(--teal)" />
        {title}
      </div>
      {children}
    </div>
  );
}

function StatTile({ label, value, color = "var(--teal)", sub }) {
  return (
    <div
      style={{
        flex: "1 1 130px",
        background: "var(--gray-50)",
        border: "1px solid var(--gray-200)",
        borderRadius: 12,
        padding: "12px 14px",
        borderTop: `3px solid ${color}`,
      }}
    >
      <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--gray-900)" }}>{value}</div>
      <div style={{ fontSize: "0.76rem", color: "var(--gray-500)", fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: "0.7rem", color: "var(--gray-400)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────
function EditProfileModal({ emp, profile, supervisors, usingLocal, onClose, onSaved }) {
  const { isArabic } = useLanguage();
  const meta = parseTeam(emp.team_name);
  const [form, setForm] = useState(() => ({
    full_name_ar: "",
    dob: "",
    gender: "",
    nationality: "",
    civil_id: "",
    marital_status: "",
    blood_type: "",
    address: "",
    emergency_name: "",
    emergency_relation: "",
    emergency_phone: "",
    job_title: "",
    department: "",
    hire_date: "",
    contract_type: "",
    shift: "",
    employment_status: meta.status || "active",
    certified_stations: [],
    education: "",
    languages: "",
    notes: "",
    photo: "",
    ...(profile || {}),
  }));
  const [phone, setPhone] = useState(emp.phone || "");
  const [email, setEmail] = useState(emp.email || "");
  const [supervisor, setSupervisor] = useState(meta.supervisor || "");
  const [station, setStation] = useState(meta.station || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function toggleCert(id) {
    setForm((f) => {
      const cur = f.certified_stations || [];
      return {
        ...f,
        certified_stations: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
      };
    });
  }

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await resizeImage(file);
      setForm((f) => ({ ...f, photo: data }));
    } catch {
      setError(isArabic ? "تعذر قراءة الصورة." : "Could not read the image.");
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const { photo, ...data } = form;
    try {
      // 1. Update core user row (phone / email / team metadata for operators)
      const userPatch = { phone: phone.trim(), email: email.trim() };
      if (emp.access === "operator") {
        userPatch.team_name = JSON.stringify({
          supervisor: supervisor || meta.supervisor || "",
          station: station || meta.station || "Assembly",
          status: form.employment_status || "active",
        });
      }
      const { error: uErr } = await supabase.from("users").update(userPatch).eq("id", emp.id);
      if (uErr) throw uErr;

      // 2. Save extended profile
      if (usingLocal) {
        writeLocalProfile(emp.id, { ...data, photo });
      } else {
        const { error: pErr } = await supabase.from(PROFILE_TABLE).upsert(
          [
            {
              user_id: emp.id,
              data,
              photo: photo || "",
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "user_id" },
        );
        if (pErr) throw pErr;
      }
      onSaved({ ...emp, ...userPatch }, { ...data, photo });
    } catch (err) {
      setError(err?.message || (isArabic ? "فشل الحفظ." : "Save failed."));
    } finally {
      setSaving(false);
    }
  }

  const L = (ar, en) => (isArabic ? ar : en);
  const grid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 12,
  };
  const sectionTitle = {
    fontWeight: 800,
    color: "var(--navy)",
    fontSize: "0.88rem",
    marginTop: 6,
    paddingBottom: 6,
    borderBottom: "1.5px solid var(--gray-200)",
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal" style={{ maxWidth: 820, maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-header">
          <span className="modal-title">
            {L("تعديل بروفايل", "Edit Profile")} — {emp.name}
          </span>
          <button className="modal-close" onClick={onClose} disabled={saving}>
            ×
          </button>
        </div>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
          <div className="modal-body" style={{ gap: 14 }}>
            {error && <div className="modal-error">{error}</div>}
            {usingLocal && (
              <div
                style={{
                  background: "var(--warning-bg)",
                  border: "1px solid #fcd34d",
                  color: "#92400e",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                {L(
                  "جدول employee_profiles غير موجود في Supabase بعد — سيتم حفظ البيانات الإضافية على هذا الجهاز فقط حتى يتم تشغيل سكربت SQL.",
                  "employee_profiles table not found in Supabase yet — extra details will be saved on this device only until the SQL script is run.",
                )}
              </div>
            )}

            {/* Photo */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar name={emp.name} photo={form.photo} size={72} />
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
              <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Camera size={15} /> {L("تغيير الصورة", "Change Photo")}
              </button>
              {form.photo && (
                <button type="button" className="btn-secondary" onClick={() => setForm((f) => ({ ...f, photo: "" }))}>
                  {L("إزالة", "Remove")}
                </button>
              )}
            </div>

            <div style={sectionTitle}>{L("البيانات الشخصية", "Personal Information")}</div>
            <div style={grid}>
              <div className="form-group">
                <label>{L("الاسم بالعربي", "Name (Arabic)")}</label>
                <input value={form.full_name_ar} onChange={set("full_name_ar")} />
              </div>
              <div className="form-group">
                <label>{L("تاريخ الميلاد", "Date of Birth")}</label>
                <input type="date" value={form.dob} onChange={set("dob")} />
              </div>
              <div className="form-group">
                <label>{L("الجنس", "Gender")}</label>
                <select className="form-select" value={form.gender} onChange={set("gender")}>
                  <option value="">—</option>
                  {Object.entries(GENDER_OPTIONS).map(([k, v]) => (
                    <option key={k} value={k}>{isArabic ? v.ar : v.en}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{L("الجنسية", "Nationality")}</label>
                <input value={form.nationality} onChange={set("nationality")} placeholder={L("مثال: عُماني", "e.g. Omani")} />
              </div>
              <div className="form-group">
                <label>{L("الرقم المدني / الإقامة", "Civil / Resident ID")}</label>
                <input value={form.civil_id} onChange={set("civil_id")} />
              </div>
              <div className="form-group">
                <label>{L("الحالة الاجتماعية", "Marital Status")}</label>
                <select className="form-select" value={form.marital_status} onChange={set("marital_status")}>
                  <option value="">—</option>
                  {Object.entries(MARITAL_OPTIONS).map(([k, v]) => (
                    <option key={k} value={k}>{isArabic ? v.ar : v.en}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{L("فصيلة الدم", "Blood Type")}</label>
                <select className="form-select" value={form.blood_type} onChange={set("blood_type")}>
                  <option value="">—</option>
                  {BLOOD_TYPES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{L("العنوان / الولاية", "Address / Wilayat")}</label>
                <input value={form.address} onChange={set("address")} />
              </div>
            </div>

            <div style={sectionTitle}>{L("التواصل والطوارئ", "Contact & Emergency")}</div>
            <div style={grid}>
              <div className="form-group">
                <label>{L("الهاتف", "Phone")}</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
              </div>
              <div className="form-group">
                <label>{L("البريد الإلكتروني", "Email")}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
              </div>
              <div className="form-group">
                <label>{L("اسم جهة الطوارئ", "Emergency Contact")}</label>
                <input value={form.emergency_name} onChange={set("emergency_name")} />
              </div>
              <div className="form-group">
                <label>{L("صلة القرابة", "Relation")}</label>
                <input value={form.emergency_relation} onChange={set("emergency_relation")} />
              </div>
              <div className="form-group">
                <label>{L("هاتف الطوارئ", "Emergency Phone")}</label>
                <input value={form.emergency_phone} onChange={set("emergency_phone")} dir="ltr" />
              </div>
            </div>

            <div style={sectionTitle}>{L("بيانات العمل", "Employment")}</div>
            <div style={grid}>
              <div className="form-group">
                <label>{L("المسمى الوظيفي", "Job Title")}</label>
                <input value={form.job_title} onChange={set("job_title")} placeholder={L("مثال: فني إنتاج", "e.g. Production Technician")} />
              </div>
              <div className="form-group">
                <label>{L("القسم", "Department")}</label>
                <input value={form.department} onChange={set("department")} placeholder={L("مثال: الإنتاج", "e.g. Production")} />
              </div>
              <div className="form-group">
                <label>{L("تاريخ التعيين", "Hire Date")}</label>
                <input type="date" value={form.hire_date} onChange={set("hire_date")} />
              </div>
              <div className="form-group">
                <label>{L("نوع العقد", "Contract Type")}</label>
                <select className="form-select" value={form.contract_type} onChange={set("contract_type")}>
                  <option value="">—</option>
                  {Object.entries(CONTRACT_OPTIONS).map(([k, v]) => (
                    <option key={k} value={k}>{isArabic ? v.ar : v.en}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{L("الوردية المعتادة", "Usual Shift")}</label>
                <select className="form-select" value={form.shift} onChange={set("shift")}>
                  <option value="">—</option>
                  {Object.entries(SHIFT_OPTIONS).map(([k, v]) => (
                    <option key={k} value={k}>{isArabic ? v.ar : v.en}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{L("حالة الموظف", "Employment Status")}</label>
                <select className="form-select" value={form.employment_status} onChange={set("employment_status")}>
                  {Object.entries(STATUS_OPTIONS).map(([k, v]) => (
                    <option key={k} value={k}>{isArabic ? v.ar : v.en}</option>
                  ))}
                </select>
              </div>
              {emp.access === "operator" && (
                <>
                  <div className="form-group">
                    <label>{L("المشرف المسؤول", "Supervisor")}</label>
                    <select className="form-select" value={supervisor} onChange={(e) => setSupervisor(e.target.value)}>
                      <option value="">—</option>
                      {supervisors.map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{L("المحطة الأساسية", "Main Station")}</label>
                    <select className="form-select" value={station} onChange={(e) => setStation(e.target.value)}>
                      {STAGES.map((s) => (
                        <option key={s.id} value={s.id}>{isArabic ? s.nameAr : s.id}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className="form-group">
                <label>{L("المؤهل الدراسي", "Education")}</label>
                <input value={form.education} onChange={set("education")} />
              </div>
              <div className="form-group">
                <label>{L("اللغات", "Languages")}</label>
                <input value={form.languages} onChange={set("languages")} placeholder={L("عربي، إنجليزي", "Arabic, English")} />
              </div>
            </div>

            <div style={sectionTitle}>{L("المحطات المؤهل للعمل عليها", "Certified Stations")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STAGES.map((s) => {
                const on = (form.certified_stations || []).includes(s.id);
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => toggleCert(s.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 20,
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      border: `1.5px solid ${on ? s.color : "var(--gray-300)"}`,
                      background: on ? `${s.color}18` : "var(--white)",
                      color: on ? s.color : "var(--gray-600)",
                    }}
                  >
                    {s.icon} {isArabic ? s.nameAr : s.id}
                  </button>
                );
              })}
            </div>

            <div className="form-group">
              <label>{L("ملاحظات", "Notes")}</label>
              <textarea
                value={form.notes}
                onChange={set("notes")}
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1.5px solid var(--gray-300)",
                  borderRadius: "var(--radius)",
                  fontFamily: "inherit",
                  fontSize: "0.9rem",
                  resize: "vertical",
                }}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              {L("إلغاء", "Cancel")}
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={15} /> {saving ? L("جارٍ الحفظ...", "Saving...") : L("حفظ", "Save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Profile detail view ──────────────────────────────────────────────────────
function ProfileView({ emp, profile, employees, crewHistory, usingLocal, canEdit, onEdit, onBack }) {
  const { isArabic } = useLanguage();
  const L = (ar, en) => (isArabic ? ar : en);
  const p = profile || {};
  const meta = parseTeam(emp.team_name);
  const statusKey = p.employment_status || meta.status || "active";
  const age = calcAge(p.dob);
  const bdays = daysToBirthday(p.dob);
  const service = calcService(p.hire_date);
  const isOperator = emp.access === "operator";

  const stats = useMemo(
    () => (isOperator ? operatorShiftStats(emp.id, crewHistory) : null),
    [emp.id, crewHistory, isOperator],
  );

  const [extra, setExtra] = useState(null);
  useEffect(() => {
    if (isOperator) return;
    let alive = true;
    (async () => {
      const count = async (table, col) => {
        try {
          const { count: c, error } = await supabase
            .from(table)
            .select("id", { count: "exact", head: true })
            .eq(col, emp.name);
          return error ? 0 : c || 0;
        } catch {
          return 0;
        }
      };
      const [production, downtime, defects] = await Promise.all([
        count("production_records", "entered_by"),
        count("stoppages", "supervisor_id"),
        count("defective_meters", "logged_by"),
      ]);
      const teamSize = employees.filter(
        (e) =>
          e.access === "operator" &&
          parseTeam(e.team_name).supervisor.trim().toLowerCase() === emp.name.trim().toLowerCase(),
      ).length;
      const shiftsLed = crewHistory.filter((r) => r.supervisor === emp.name).length;
      if (alive) setExtra({ production, downtime, defects, teamSize, shiftsLed });
    })();
    return () => {
      alive = false;
    };
  }, [emp.id, emp.name, isOperator, employees, crewHistory]);

  const summary = buildSummary(emp, p, meta, stats, extra, isArabic);
  const roleLabel = ROLE_LABELS[emp.access] || ROLE_LABELS.operator;
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  const recentShifts = useMemo(() => {
    if (!isOperator) return [];
    const out = [];
    for (const rec of crewHistory) {
      const a = rec.item_details?.stationAssignments || {};
      for (const [stageId, ids] of Object.entries(a)) {
        const list = Array.isArray(ids) ? ids : ids ? [ids] : [];
        if (list.map(String).includes(String(emp.id))) {
          out.push({ date: rec.date, shift: rec.shift, station: stageId, supervisor: rec.supervisor, key: `${rec.id}-${stageId}` });
        }
      }
      if (out.length >= 8) break;
    }
    return out;
  }, [crewHistory, emp.id, isOperator]);

  const maxStation = stats ? Math.max(1, ...Object.values(stats.stations)) : 1;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
        <button className="btn-secondary" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <BackIcon size={15} /> {L("كل الموظفين", "All Employees")}
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Printer size={15} /> {L("طباعة", "Print")}
          </button>
          {canEdit && (
            <button className="btn-primary" onClick={onEdit}>
              <Edit2 size={15} /> {L("تعديل البروفايل", "Edit Profile")}
            </button>
          )}
        </div>
      </div>

      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 60%, var(--teal-dark) 100%)",
          borderRadius: 18,
          padding: "26px 24px",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
          boxShadow: "var(--shadow-lg)",
          marginBottom: 18,
        }}
      >
        <Avatar name={emp.name} photo={p.photo} size={96} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: "1.55rem", fontWeight: 800, lineHeight: 1.2 }}>{emp.name}</div>
          {p.full_name_ar && p.full_name_ar !== emp.name && (
            <div style={{ fontSize: "1rem", opacity: 0.85, marginTop: 2 }}>{p.full_name_ar}</div>
          )}
          <div style={{ marginTop: 6, opacity: 0.9, fontSize: "0.92rem", fontWeight: 600 }}>
            {p.job_title || (isArabic ? roleLabel.ar : roleLabel.en)}
            {p.department ? ` · ${p.department}` : ""}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span className={`badge badge-${emp.access}`} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}>
              {isArabic ? roleLabel.ar : roleLabel.en}
            </span>
            <StatusPill statusKey={statusKey} isArabic={isArabic} />
            {emp.company_id && (
              <span style={{ fontSize: "0.78rem", fontWeight: 700, background: "rgba(255,255,255,0.12)", padding: "3px 10px", borderRadius: 20 }}>
                # {emp.company_id}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { v: age ?? "—", l: L("العمر", "Age") },
            { v: service ? formatService(service, isArabic) : "—", l: L("مدة الخدمة", "Service") },
            ...(isOperator ? [{ v: stats?.shifts ?? 0, l: L("ورديات", "Shifts") }] : extra ? [{ v: extra.teamSize, l: L("حجم الفريق", "Team") }] : []),
          ].map((x) => (
            <div key={x.l} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "10px 14px", minWidth: 90, textAlign: "center" }}>
              <div style={{ fontSize: "1.15rem", fontWeight: 800 }}>{x.v}</div>
              <div style={{ fontSize: "0.72rem", opacity: 0.8 }}>{x.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <Section title={L("ملخص الموظف", "Employee Summary")} icon={Sparkles} style={{ marginBottom: 16, borderInlineStart: "4px solid var(--teal)" }}>
        <div style={{ fontSize: "0.95rem", lineHeight: 1.9, color: "var(--gray-700)" }}>
          {summary.map((line, i) => (
            <span key={i}>{line} </span>
          ))}
        </div>
        {p.notes && (
          <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--gray-50)", borderRadius: 10, fontSize: "0.85rem", color: "var(--gray-600)", border: "1px solid var(--gray-200)" }}>
            <strong>{L("ملاحظات: ", "Notes: ")}</strong>
            {p.notes}
          </div>
        )}
        {bdays !== null && bdays <= 7 && (
          <div style={{ marginTop: 10, fontSize: "0.85rem", fontWeight: 700, color: "#be185d", display: "flex", alignItems: "center", gap: 6 }}>
            <Cake size={16} />
            {bdays === 0 ? L("🎉 عيد ميلاده اليوم!", "🎉 Birthday today!") : L(`عيد ميلاده بعد ${bdays} أيام`, `Birthday in ${bdays} days`)}
          </div>
        )}
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>
        <Section title={L("البيانات الشخصية", "Personal Information")} icon={User}>
          <InfoRow icon={Cake} label={L("تاريخ الميلاد / العمر", "Date of Birth / Age")} value={p.dob ? `${p.dob}${age !== null ? ` (${age} ${L("سنة", "yrs")})` : ""}` : "—"} />
          <InfoRow icon={User} label={L("الجنس", "Gender")} value={optLabel(GENDER_OPTIONS, p.gender, isArabic)} />
          <InfoRow icon={Flag} label={L("الجنسية", "Nationality")} value={p.nationality} />
          <InfoRow icon={IdCard} label={L("الرقم المدني / الإقامة", "Civil / Resident ID")} value={p.civil_id} />
          <InfoRow icon={Heart} label={L("الحالة الاجتماعية", "Marital Status")} value={optLabel(MARITAL_OPTIONS, p.marital_status, isArabic)} />
          <InfoRow icon={Droplet} label={L("فصيلة الدم", "Blood Type")} value={p.blood_type} />
          <InfoRow icon={MapPin} label={L("العنوان", "Address")} value={p.address} />
        </Section>

        <Section title={L("بيانات العمل", "Employment")} icon={Briefcase}>
          <InfoRow icon={Hash} label={L("الرقم الوظيفي", "Company ID")} value={emp.company_id} />
          <InfoRow icon={Briefcase} label={L("المسمى الوظيفي", "Job Title")} value={p.job_title} />
          <InfoRow icon={Building2} label={L("القسم", "Department")} value={p.department} />
          <InfoRow icon={Calendar} label={L("تاريخ التعيين / مدة الخدمة", "Hire Date / Service")} value={p.hire_date ? `${p.hire_date} (${formatService(service, isArabic)})` : "—"} />
          <InfoRow icon={FileText} label={L("نوع العقد", "Contract")} value={optLabel(CONTRACT_OPTIONS, p.contract_type, isArabic)} />
          <InfoRow icon={Clock} label={L("الوردية المعتادة", "Usual Shift")} value={optLabel(SHIFT_OPTIONS, p.shift, isArabic)} />
          {isOperator && <InfoRow icon={ShieldCheck} label={L("المشرف المسؤول", "Supervisor")} value={meta.supervisor} />}
          {isOperator && (
            <InfoRow icon={Factory} label={L("المحطة الأساسية", "Main Station")} value={meta.station ? (isArabic ? STAGE_MAP[meta.station]?.nameAr || meta.station : meta.station) : "—"} />
          )}
          <InfoRow icon={Award} label={L("المؤهل / اللغات", "Education / Languages")} value={[p.education, p.languages].filter(Boolean).join(" · ") || "—"} />
        </Section>

        <Section title={L("التواصل والطوارئ", "Contact & Emergency")} icon={Phone}>
          <InfoRow icon={Phone} label={L("الهاتف", "Phone")} value={emp.phone ? <a href={`tel:${emp.phone}`} dir="ltr" style={{ color: "var(--teal-dark)" }}>{emp.phone}</a> : "—"} />
          <InfoRow icon={Mail} label={L("البريد الإلكتروني", "Email")} value={emp.email ? <a href={`mailto:${emp.email}`} style={{ color: "var(--teal-dark)" }}>{emp.email}</a> : "—"} />
          <InfoRow icon={AlertCircle} label={L("جهة الطوارئ", "Emergency Contact")} value={[p.emergency_name, p.emergency_relation && `(${p.emergency_relation})`].filter(Boolean).join(" ") || "—"} />
          <InfoRow icon={Phone} label={L("هاتف الطوارئ", "Emergency Phone")} value={p.emergency_phone ? <a href={`tel:${p.emergency_phone}`} dir="ltr" style={{ color: "var(--teal-dark)" }}>{p.emergency_phone}</a> : "—"} />
        </Section>
      </div>

      {/* Activity */}
      <Section title={L("النشاط والأداء", "Activity & Performance")} icon={Activity} style={{ marginBottom: 16 }}>
        {isOperator ? (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "10px 0 16px" }}>
              <StatTile label={L("إجمالي الورديات", "Total Shifts")} value={stats.shifts} />
              <StatTile label={L("ورديات صباحية", "Morning")} value={stats.morning} color="#f59e0b" />
              <StatTile label={L("ورديات ليلية", "Night")} value={stats.night} color="#4f46e5" />
              <StatTile label={L("آخر وردية", "Last Shift")} value={stats.lastDate || "—"} color="#10b981" sub={stats.lastStation ? (isArabic ? STAGE_MAP[stats.lastStation]?.nameAr : stats.lastStation) : ""} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--gray-700)", marginBottom: 8 }}>{L("توزيع العمل على المحطات", "Work by Station")}</div>
                {Object.keys(stats.stations).length === 0 ? (
                  <div style={{ fontSize: "0.85rem", color: "var(--gray-400)" }}>{L("لا توجد بيانات بعد.", "No data yet.")}</div>
                ) : (
                  STAGES.filter((s) => stats.stations[s.id]).map((s) => (
                    <div key={s.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 600, color: "var(--gray-600)" }}>
                        <span>{s.icon} {isArabic ? s.nameAr : s.id}</span>
                        <span>{stats.stations[s.id]}</span>
                      </div>
                      <div style={{ height: 8, background: "var(--gray-100)", borderRadius: 6, overflow: "hidden", marginTop: 3 }}>
                        <div style={{ width: `${(stats.stations[s.id] / maxStation) * 100}%`, height: "100%", background: s.color, borderRadius: 6 }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--gray-700)", marginBottom: 8 }}>{L("آخر الورديات", "Recent Shifts")}</div>
                {recentShifts.length === 0 ? (
                  <div style={{ fontSize: "0.85rem", color: "var(--gray-400)" }}>{L("لا توجد ورديات مسجلة.", "No shifts recorded.")}</div>
                ) : (
                  recentShifts.map((r) => (
                    <div key={r.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px dashed var(--gray-200)", fontSize: "0.82rem" }}>
                      <span style={{ fontWeight: 700, color: "var(--navy)" }}>{r.date}</span>
                      <span>{r.shift === "Night" ? "🌙" : "☀️"} {isArabic ? STAGE_MAP[r.station]?.nameAr || r.station : r.station}</span>
                      <span style={{ color: "var(--gray-500)" }}>{r.supervisor}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            {extra ? (
              <>
                <StatTile label={L("مشغلين تحت إشرافه", "Operators Supervised")} value={extra.teamSize} />
                <StatTile label={L("ورديات قادها", "Shifts Led")} value={extra.shiftsLed} color="#4f46e5" />
                <StatTile label={L("تقارير إنتاج", "Production Reports")} value={extra.production} color="#10b981" />
                <StatTile label={L("توقفات مسجلة", "Stoppages Logged")} value={extra.downtime} color="#f59e0b" />
                <StatTile label={L("عدادات معيبة مسجلة", "Defects Logged")} value={extra.defects} color="#ef4444" />
              </>
            ) : (
              <div style={{ fontSize: "0.85rem", color: "var(--gray-400)" }}>{L("جارٍ التحميل...", "Loading...")}</div>
            )}
          </div>
        )}
      </Section>

      {/* Certified stations */}
      <Section title={L("المحطات المؤهل عليها", "Certified Stations")} icon={Award}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {(p.certified_stations || []).length === 0 ? (
            <span style={{ fontSize: "0.85rem", color: "var(--gray-400)" }}>{L("لم يتم تحديد محطات.", "None specified.")}</span>
          ) : (
            p.certified_stations.map((id) => {
              const s = STAGE_MAP[id] || { color: "#64748b", icon: "•", nameAr: id };
              return (
                <span key={id} style={{ padding: "5px 12px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 700, border: `1.5px solid ${s.color}`, background: `${s.color}14`, color: s.color }}>
                  {s.icon} {isArabic ? s.nameAr : id}
                </span>
              );
            })
          )}
        </div>
      </Section>

      {usingLocal && (
        <div style={{ marginTop: 14, fontSize: "0.75rem", color: "var(--gray-400)" }}>
          {L("* البيانات الإضافية محفوظة محلياً على هذا الجهاز (جدول employee_profiles غير مُنشأ).", "* Extra details are stored locally on this device (employee_profiles table not created).")}
        </div>
      )}
    </div>
  );
}

function LiveBadge({ live, usingLocal, isArabic }) {
  const color = usingLocal ? "#f59e0b" : live ? "#10b981" : "#94a3b8";
  const text = usingLocal
    ? isArabic ? "محلي فقط" : "Local only"
    : live
      ? isArabic ? "متصل مباشر" : "Live"
      : isArabic ? "جارٍ الاتصال..." : "Connecting...";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: "0.72rem",
        fontWeight: 700,
        color,
        background: `${color}14`,
        border: `1px solid ${color}55`,
      }}
    >
      <span
        className={live && !usingLocal ? "pulse-dot" : undefined}
        style={{ width: 7, height: 7, borderRadius: "50%", background: color }}
      />
      {text}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function EmployeeProfiles() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const L = (ar, en) => (isArabic ? ar : en);
  const role = (user?.access || "viewer").toLowerCase();
  const isAdmin = role === "admin";

  const { employees, profiles, setProfiles, crewHistory, usingLocal, live, loading, reload } = useEmployeesData();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [supFilter, setSupFilter] = useState(role === "supervisor" ? user?.name || "ALL" : "ALL");
  const [editing, setEditing] = useState(false);

  const supervisors = useMemo(() => employees.filter((e) => e.access === "supervisor"), [employees]);

  const canEditEmp = useCallback(
    (emp) => {
      if (isAdmin) return true;
      if (role !== "supervisor") return false;
      if (emp.name === user?.name) return true;
      return (
        emp.access === "operator" &&
        parseTeam(emp.team_name).supervisor.trim().toLowerCase() === (user?.name || "").trim().toLowerCase()
      );
    },
    [isAdmin, role, user],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      const meta = parseTeam(e.team_name);
      const p = profiles[e.id] || {};
      if (roleFilter !== "ALL" && e.access !== roleFilter) return false;
      if (supFilter !== "ALL") {
        if (e.access === "operator" && meta.supervisor.trim().toLowerCase() !== supFilter.trim().toLowerCase()) return false;
        if (e.access !== "operator" && e.name !== supFilter) return false;
      }
      if (!q) return true;
      return [e.name, e.company_id, e.phone, p.full_name_ar, p.job_title, p.nationality, meta.station, meta.supervisor]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [employees, profiles, search, roleFilter, supFilter]);

  const counts = useMemo(() => {
    const c = { total: employees.length, operator: 0, supervisor: 0, active: 0, onLeave: 0, incomplete: 0 };
    employees.forEach((e) => {
      if (e.access === "operator") c.operator++;
      if (e.access === "supervisor") c.supervisor++;
      const p = profiles[e.id] || {};
      const st = p.employment_status || parseTeam(e.team_name).status || "active";
      if (st === "active") c.active++;
      if (st === "on_leave") c.onLeave++;
      if (!p.dob || !p.hire_date) c.incomplete++;
    });
    return c;
  }, [employees, profiles]);

  const selected = id ? employees.find((e) => String(e.id) === String(id)) : null;

  function handleSaved(updatedEmp, newProfile) {
    setProfiles((prev) => ({ ...prev, [updatedEmp.id]: newProfile }));
    setEditing(false);
    reload();
  }

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--gray-500)" }}>
        <div
          className="spinner"
          style={{ margin: "0 auto 12px", width: 28, height: 28, borderColor: "var(--gray-200)", borderTopColor: "var(--teal)", display: "block" }}
        />
        {L("جارٍ تحميل بيانات الموظفين...", "Loading employees...")}
      </div>
    );
  }

  // ── Detail view ──
  if (id) {
    if (!selected) {
      return (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>{L("الموظف غير موجود.", "Employee not found.")}</div>
          <button className="btn-secondary" onClick={() => navigate("/employees")}>
            {L("رجوع", "Back")}
          </button>
        </div>
      );
    }
    return (
      <>
        <ProfileView
          emp={selected}
          profile={profiles[selected.id]}
          employees={employees}
          crewHistory={crewHistory}
          usingLocal={usingLocal}
          canEdit={canEditEmp(selected)}
          onEdit={() => setEditing(true)}
          onBack={() => navigate("/employees")}
        />
        {editing && (
          <EditProfileModal
            emp={selected}
            profile={profiles[selected.id]}
            supervisors={supervisors}
            usingLocal={usingLocal}
            onClose={() => setEditing(false)}
            onSaved={handleSaved}
          />
        )}
      </>
    );
  }

  // ── List view ──
  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 className="page-title">{L("بروفايل الموظفين", "Employee Profiles")}</h1>
          <LiveBadge live={live} usingLocal={usingLocal} isArabic={isArabic} />
        </div>
        <p className="page-subtitle">
          {L("ملف شامل لكل موظف: البيانات الشخصية، العمر، مدة الخدمة، المحطات والنشاط.", "A complete file for each employee: personal details, age, service, stations and activity.")}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <StatTile label={L("إجمالي الموظفين", "Total Employees")} value={counts.total} color="var(--navy)" />
        <StatTile label={L("المشغلين", "Operators")} value={counts.operator} color="#4f46e5" />
        <StatTile label={L("المشرفين", "Supervisors")} value={counts.supervisor} color="var(--teal)" />
        <StatTile label={L("على رأس العمل", "Active")} value={counts.active} color="#10b981" />
        <StatTile label={L("في إجازة", "On Leave")} value={counts.onLeave} color="#f59e0b" />
        <StatTile label={L("بروفايلات ناقصة", "Incomplete Profiles")} value={counts.incomplete} color="#ef4444" sub={L("بدون تاريخ ميلاد أو تعيين", "missing DOB or hire date")} />
      </div>

      {/* Filters */}
      <div className="users-toolbar" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
        <div className="search-wrap">
          <Search className="search-icon" size={16} />
          <input
            className="search-input"
            placeholder={L("ابحث بالاسم، الرقم الوظيفي، المحطة...", "Search name, ID, station...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ padding: "8px 12px" }}>
          <option value="ALL">{L("كل الأدوار", "All Roles")}</option>
          <option value="operator">{L("المشغلين", "Operators")}</option>
          <option value="supervisor">{L("المشرفين", "Supervisors")}</option>
          <option value="admin">{L("الإدارة", "Admins")}</option>
        </select>
        <select className="form-select" value={supFilter} onChange={(e) => setSupFilter(e.target.value)} style={{ padding: "8px 12px" }}>
          <option value="ALL">{L("كل الفرق", "All Teams")}</option>
          {supervisors.map((s) => (
            <option key={s.id} value={s.name}>
              {L("فريق ", "Team ")}
              {s.name}
            </option>
          ))}
        </select>
        <span style={{ fontSize: "0.82rem", color: "var(--gray-500)", fontWeight: 600 }}>
          {filtered.length} {L("موظف", "employees")}
        </span>
      </div>

      {usingLocal && isAdmin && (
        <div style={{ background: "var(--warning-bg)", border: "1px solid #fcd34d", color: "#92400e", borderRadius: 10, padding: "10px 14px", fontSize: "0.82rem", fontWeight: 600, marginBottom: 16 }}>
          {L(
            "تنبيه: جدول employee_profiles غير موجود في Supabase. شغّل ملف employee_profiles.sql في محرر SQL حتى تُحفظ البروفايلات وتظهر على كل الأجهزة.",
            "Notice: employee_profiles table is missing in Supabase. Run employee_profiles.sql in the SQL editor so profiles are shared across devices.",
          )}
        </div>
      )}

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div style={{ padding: 50, textAlign: "center", color: "var(--gray-500)" }}>
          <Users size={40} color="var(--gray-300)" style={{ margin: "0 auto 10px" }} />
          <div style={{ fontWeight: 600 }}>{L("لا يوجد موظفين مطابقين.", "No matching employees.")}</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {filtered.map((e) => {
            const p = profiles[e.id] || {};
            const meta = parseTeam(e.team_name);
            const age = calcAge(p.dob);
            const service = calcService(p.hire_date);
            const r = ROLE_LABELS[e.access] || ROLE_LABELS.operator;
            const stage = STAGE_MAP[meta.station];
            const statusKey = p.employment_status || meta.status || "active";
            const filled = ["dob", "nationality", "hire_date", "job_title", "emergency_phone"].filter((k) => p[k]).length + (e.phone ? 1 : 0);
            const completeness = Math.round((filled / 6) * 100);
            return (
              <div
                key={e.id}
                className="card-white"
                onClick={() => navigate(`/employees/${e.id}`)}
                style={{ padding: 16, cursor: "pointer", display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={e.name} photo={p.photo} size={52} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 800, color: "var(--navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.name}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--gray-500)", fontWeight: 600 }}>
                      {p.job_title || (isArabic ? r.ar : r.en)}
                      {e.company_id ? ` · #${e.company_id}` : ""}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span className={`badge badge-${e.access}`}>{isArabic ? r.ar : r.en}</span>
                  <StatusPill statusKey={statusKey} isArabic={isArabic} />
                  {e.access === "operator" && stage && (
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: stage.color, background: `${stage.color}14`, border: `1px solid ${stage.color}40`, padding: "3px 9px", borderRadius: 20 }}>
                      {stage.icon} {isArabic ? stage.nameAr : stage.id}
                    </span>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: "0.78rem" }}>
                  <div style={{ background: "var(--gray-50)", borderRadius: 8, padding: "6px 8px" }}>
                    <div style={{ color: "var(--gray-500)" }}>{L("العمر", "Age")}</div>
                    <div style={{ fontWeight: 800, color: "var(--gray-900)" }}>{age ?? "—"}</div>
                  </div>
                  <div style={{ background: "var(--gray-50)", borderRadius: 8, padding: "6px 8px" }}>
                    <div style={{ color: "var(--gray-500)" }}>{L("مدة الخدمة", "Service")}</div>
                    <div style={{ fontWeight: 800, color: "var(--gray-900)" }}>{service ? formatService(service, isArabic) : "—"}</div>
                  </div>
                </div>

                {e.access === "operator" && meta.supervisor && (
                  <div style={{ fontSize: "0.78rem", color: "var(--gray-600)", display: "flex", alignItems: "center", gap: 5 }}>
                    <ShieldCheck size={13} color="var(--teal)" /> {meta.supervisor}
                  </div>
                )}

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--gray-500)", fontWeight: 600 }}>
                    <span>{L("اكتمال البروفايل", "Profile completeness")}</span>
                    <span>{completeness}%</span>
                  </div>
                  <div style={{ height: 5, background: "var(--gray-100)", borderRadius: 4, overflow: "hidden", marginTop: 3 }}>
                    <div style={{ width: `${completeness}%`, height: "100%", background: completeness >= 80 ? "var(--success)" : completeness >= 40 ? "var(--warning)" : "var(--danger)" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
