import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { printReportDocument } from "../utils/printReport";
import { getTodayString, toLocalDateStr } from "../utils/date";
import { STANDARD_8_STATIONS } from "../constants/checklistData";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudOff,
  FileText,
  ListChecks,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Square,
  Timer,
  Trash2,
} from "lucide-react";

// Stage ids stay in English (that is what is stored in `stoppages.stage_id`);
// only the label shown to the user is translated.
const STAGES = STANDARD_8_STATIONS.map((s) => s.id);
const STAGE_INFO = Object.fromEntries(STANDARD_8_STATIONS.map((s) => [s.id, s]));

function stageLabel(id, isArabic) {
  const info = STAGE_INFO[id];
  if (!info) return id || "—";
  return isArabic ? info.nameAr : info.nameEn;
}

const getStorageKey = (userName) =>
  `ectron_live_downtime_${userName || "default"}`;
const LOCAL_STOPPAGES_KEY = "ectron_downtime_local_records";
const LIVE_NOTE = "LIVE_ACTIVE";

// ─── Offline cache ────────────────────────────────────────────────────────────
// Only records that could NOT be saved to the database are kept here
// (`pending: true`). They are shown in the list with a "not synced" badge and
// uploaded automatically the next time the page loads online.
// Older versions of the page copied every saved record here, which made deleted
// records come back. Legacy entries count as pending only when their id is a
// Date.now() value (i.e. the database never gave them an id).
const recordKey = (r) => `${r.stage}_${r.date}_${r.start_time}`;

function isPendingLocal(r) {
  if (r.pending === true) return true;
  if (r.pending === undefined) return Number(r.id) > 1e12;
  return false;
}

function readLocalRecords() {
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_STOPPAGES_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeLocalRecords(list) {
  try {
    localStorage.setItem(LOCAL_STOPPAGES_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {
    /* storage full or blocked — nothing else we can do */
  }
}

function addPendingLocal(record) {
  writeLocalRecords([{ ...record, pending: true }, ...readLocalRecords()]);
}

function removeLocalRecord(record) {
  const key = recordKey(record);
  writeLocalRecords(
    readLocalRecords().filter((l) => l.id !== record.id && recordKey(l) !== key),
  );
}

// Start / end instants for a stoppage. The end is derived from the duration so
// a stoppage that crosses midnight (e.g. 23:40 → 00:15) ends on the next day.
function toStoppageRange(date, startTime, minutes) {
  const start = new Date(`${date}T${startTime}:00`);
  const end = new Date(start.getTime() + Math.max(0, minutes) * 60000);
  return { stopped_at: start.toISOString(), resumed_at: end.toISOString() };
}

function formatMinutes(minutes, isArabic = false) {
  const h = isArabic ? "س" : "h";
  const m = isArabic ? "د" : "m";
  if (minutes == null || isNaN(minutes)) return `0${m}`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}${h} ${mins}${m}`;
  if (hrs > 0) return `${hrs}${h}`;
  return `${mins}${m}`;
}

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatLocalDate(d) {
  return (d && toLocalDateStr(d)) || getTodayString();
}

function getCurrentTimeString(dateObj = new Date()) {
  const now = new Date(dateObj);
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function computeDurationMinutes(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  let s = sh * 60 + sm;
  let e = eh * 60 + em;
  if (e < s) e += 24 * 60;
  return e - s;
}

// ─── Downtime Report Modal (Prominently shows Name of User) ───────────────────
function DowntimeReportModal({
  records,
  selectedDate,
  selectedStage,
  currentUser,
  onClose,
}) {
  const { t, isArabic } = useLanguage();
  const totalMinutes = records.reduce(
    (acc, curr) => acc + (curr.total_minutes || 0),
    0,
  );

  // Breakdown by stage
  const stageBreakdown = STAGES.map((stageName) => {
    const stageRecords = records.filter((r) => r.stage === stageName);
    const mins = stageRecords.reduce(
      (acc, curr) => acc + (curr.total_minutes || 0),
      0,
    );
    const count = stageRecords.length;
    return { stage: stageName, mins, count };
  }).filter((s) => s.count > 0);

  function handlePrint() {
    printReportDocument("report-printable-area");
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal report-modal">
        <div className="modal-header">
          <span className="modal-title">{t("reportPreview")}</span>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Printable Document Area */}
        <div id="report-printable-area" className="report-document">
          {/* Header */}
          <div className="report-doc-header">
            <div className="report-logo-box">
              <img
                src="/ectron-logo.png"
                alt="ECTRON"
                className="report-logo-img"
              />
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--gray-500)",
                  fontWeight: 600,
                }}
              >
                {isArabic
                  ? "نظام إلكترون لمتابعة الإنتاج"
                  : "ECTRON PRODUCTION CONTROL SYSTEM"}
              </div>
            </div>
            <div className="report-title-box">
              <h1 className="report-main-title">
                {isArabic ? "تقرير أوقات التوقف" : "Downtime Report"}
              </h1>
              <div className="report-subtitle">{t("reportSubtitle")}</div>
            </div>
          </div>

          {/* Metadata Grid with User Name prominently displayed */}
          <div className="report-meta-grid">
            <div className="report-meta-item">
              <span className="report-meta-label">{t("preparedBy")}</span>
              <span className="report-meta-value user-highlight">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: "var(--teal)" }}
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {currentUser?.name || "Admin"}
              </span>
            </div>

            <div className="report-meta-item">
              <span className="report-meta-label">{t("companyId")}</span>
              <span className="report-meta-value">
                {currentUser?.company_id || "ECTRON-001"}
              </span>
            </div>

            <div className="report-meta-item">
              <span className="report-meta-label">
                {isArabic ? "فترة التقرير" : "Report Period"}
              </span>
              <span className="report-meta-value">
                {selectedDate ||
                  (isArabic ? "جميع التواريخ المسجلة" : "All Recorded Dates")}
              </span>
            </div>

            <div className="report-meta-item">
              <span className="report-meta-label">
                {isArabic ? "تصفية المرحلة" : "Stage Filter"}
              </span>
              <span className="report-meta-value">
                {selectedStage || t("allStages")}
              </span>
            </div>

            <div className="report-meta-item">
              <span className="report-meta-label">
                {isArabic ? "إجمالي الحوادث" : "Total Incidents"}
              </span>
              <span className="report-meta-value">
                {records.length}{" "}
                {isArabic ? "حادثة" : records.length === 1 ? "event" : "events"}
              </span>
            </div>

            <div className="report-meta-item">
              <span className="report-meta-label">
                {t("totalDowntimeRecorded")}
              </span>
              <span
                className="report-meta-value"
                style={{ color: "var(--teal-dark)" }}
              >
                {formatMinutes(totalMinutes, isArabic)}
              </span>
            </div>
          </div>

          {/* Stage Breakdown Summary */}
          {stageBreakdown.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div className="report-section-title">
                {isArabic
                  ? "ملخص حسب مرحلة الإنتاج"
                  : "Summary by Production Stage"}
              </div>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t("stage")}</th>
                    <th style={{ textAlign: "center" }}>
                      {isArabic ? "الحوادث" : "Incidents"}
                    </th>
                    <th style={{ textAlign: "right" }}>{t("totalTime")}</th>
                    <th style={{ textAlign: "right" }}>
                      {isArabic ? "النسبة" : "Percentage"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stageBreakdown.map((s) => (
                    <tr key={s.stage}>
                      <td style={{ fontWeight: 600 }}>{stageLabel(s.stage, isArabic)}</td>
                      <td style={{ textAlign: "center" }}>{s.count}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {formatMinutes(s.mins, isArabic)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {totalMinutes > 0
                          ? `${Math.round((s.mins / totalMinutes) * 100)}%`
                          : "0%"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Detailed Log Table */}
          <div className="report-section-title">
            {isArabic
              ? "سجل تفاصيل حوادث التوقف"
              : "Detailed Downtime Events Log"}
          </div>
          {records.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "var(--gray-500)",
                fontSize: "0.85rem",
              }}
            >
              {isArabic
                ? "لا توجد سجلات توقف مطابقة للمعايير المحددة."
                : "No downtime records found for the selected criteria."}
            </div>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ width: 35 }}>#</th>
                  <th>{t("date")}</th>
                  <th>{t("user")}</th>
                  <th>{t("stage")}</th>
                  <th>{t("startTime")}</th>
                  <th>{t("endTime")}</th>
                  <th style={{ textAlign: "right" }}>{t("duration")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.id || i}>
                    <td>{i + 1}</td>
                    <td>{r.date}</td>
                    <td style={{ fontWeight: 700, color: "var(--navy)" }}>
                      {r.user_name}
                    </td>
                    <td>{stageLabel(r.stage, isArabic)}</td>
                    <td>{r.start_time}</td>
                    <td>{r.end_time || (isArabic ? "جارٍ" : "Running")}</td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 700,
                        color: "var(--teal-dark)",
                      }}
                    >
                      {formatMinutes(r.total_minutes, isArabic)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Official Sign-Off Block */}
          <div className="report-sign-block">
            <div className="sign-line">
              <span className="sign-line-title">{t("preparedBy")}</span>
              <div className="sign-line-placeholder">
                {currentUser?.name || "Admin"}
              </div>
            </div>

            <div className="sign-line">
              <span className="sign-line-title">{t("supervisorSign")}</span>
              <div className="sign-line-placeholder"></div>
            </div>

            <div className="sign-line">
              <span className="sign-line-title">
                {t("dateAndVerification")}
              </span>
              <div className="sign-line-placeholder">
                {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t("close")}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handlePrint}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>{t("printOrPdf")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Manual / Edit Downtime Modal ─────────────────────────────────────────────
function DowntimeModal({
  mode,
  initial,
  users,
  currentUserName,
  onClose,
  onSaved,
}) {
  const { t, isArabic } = useLanguage();
  const isEdit = mode === "edit";
  const [user_name, setUserName] = useState(
    initial?.user_name || currentUserName || "Admin",
  );
  const [stage, setStage] = useState(initial?.stage || STAGES[0]);
  const [date, setDate] = useState(initial?.date || getTodayString());
  const [start_time, setStartTime] = useState(
    initial?.start_time || getCurrentTimeString(),
  );
  const [end_time, setEndTime] = useState(
    initial?.end_time || getCurrentTimeString(),
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const durationMins = computeDurationMinutes(start_time, end_time);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!stage || !date || !start_time || !end_time) {
      setError(
        isArabic
          ? "يرجى ملء جميع الحقول المطلوبة."
          : "Please fill in all required fields.",
      );
      return;
    }

    const durationMins = computeDurationMinutes(start_time, end_time);
    if (durationMins <= 0) {
      setError(
        isArabic
          ? "وقت النهاية لازم يكون بعد وقت البداية."
          : "End time must be after the start time.",
      );
      return;
    }
    if (durationMins > 12 * 60) {
      setError(
        isArabic
          ? "المدة أكثر من 12 ساعة — تأكد من الأوقات."
          : "Duration is over 12 hours — please check the times.",
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        id: isEdit ? initial.id : Date.now(),
        user_name,
        stage,
        date,
        start_time,
        end_time,
        total_minutes: durationMins,
      };
      const row = {
        stage_id: stage,
        supervisor_id: user_name,
        ...toStoppageRange(date, start_time, durationMins),
        notes: `Downtime: ${durationMins}m`,
      };

      // A record that only exists in the offline cache is edited there.
      if (isEdit && initial.pending) {
        removeLocalRecord(initial);
        addPendingLocal(payload);
        onSaved(payload, isEdit, { offline: true });
        return;
      }

      let offline = false;
      try {
        const { error: dbError } = isEdit
          ? await supabase.from("stoppages").update(row).eq("id", initial.id)
          : await supabase.from("stoppages").insert([row]);
        if (dbError) throw dbError;
      } catch (e) {
        console.warn("Supabase stoppage save failed:", e);
        if (isEdit) {
          // Editing a database record offline would silently lose the change.
          setError(
            isArabic
              ? "تعذر حفظ التعديل — تأكد من الاتصال وحاول مرة ثانية."
              : "Could not save the change — check the connection and try again.",
          );
          return;
        }
        addPendingLocal(payload);
        offline = true;
      }

      onSaved(payload, isEdit, { offline });
    } catch (err) {
      setError(
        err?.message ||
          (isArabic
            ? "فشل حفظ سجل التوقف."
            : "Failed to save downtime record."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">
            {isEdit
              ? isArabic
                ? "تعديل سجل التوقف"
                : "Edit Downtime Record"
              : isArabic
                ? "إدخال يدوي للتوقف"
                : "Manual Downtime Entry"}
          </span>
          <button className="modal-close" onClick={onClose} disabled={loading}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

            <div className="form-group">
              <label>{t("user")} *</label>
              <select
                className="form-select"
                value={user_name}
                onChange={(e) => setUserName(e.target.value)}
                disabled={loading}
              >
                {users.length > 0 ? (
                  users.map((u) => (
                    <option key={u.id || u.name} value={u.name}>
                      {u.name} {u.company_id ? `(${u.company_id})` : ""}
                    </option>
                  ))
                ) : (
                  <option value={currentUserName || "Admin"}>
                    {currentUserName || "Admin"}
                  </option>
                )}
              </select>
            </div>

            <div className="form-group">
              <label>{t("stage")} *</label>
              <select
                className="form-select"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                disabled={loading}
              >
                {STAGES.map((s, idx) => (
                  <option key={s} value={s}>
                    {idx + 1}. {stageLabel(s, isArabic)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{t("date")} *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div className="form-group">
                <label>{t("startTime")} *</label>
                <input
                  type="time"
                  value={start_time}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t("endTime")} *</label>
                <input
                  type="time"
                  value={end_time}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div
              style={{
                background: "var(--teal-light)",
                padding: "12px 14px",
                borderRadius: "var(--radius)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: "var(--navy)",
              }}
            >
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                {isArabic ? "المدة المحسوبة:" : "Calculated Duration:"}
              </span>
              <span
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--teal-dark)",
                }}
              >
                {formatMinutes(durationMins, isArabic)}
                {end_time && start_time && end_time < start_time && (
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--gray-500)", marginInlineStart: 6 }}>
                    {isArabic ? "(ينتهي اليوم التالي)" : "(ends next day)"}
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              {t("cancel")}
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <span className="spinner" />
              ) : isEdit ? (
                t("saveChanges")
              ) : (
                t("save")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ record, onClose, onDeleted }) {
  const { user } = useAuth();
  const { t, isArabic } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (user?.access !== "admin") {
      setError(
        isArabic
          ? "صلاحية الحذف مقتصرة على الأدمن فقط."
          : "Delete permission is restricted to admin only.",
      );
      return;
    }
    setLoading(true);
    try {
      if (!record.pending) {
        const { error: dbError } = await supabase
          .from("stoppages")
          .delete()
          .eq("id", record.id);
        if (dbError) throw dbError;
      }
      // Also drop any offline copy so the record can't reappear.
      removeLocalRecord(record);
      onDeleted(record.id);
    } catch (err) {
      setError(
        err?.message ||
          (isArabic ? "تعذر حذف السجل." : "Could not delete record."),
      );
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: 360 }}>
        <div className="modal-header">
          <span className="modal-title">
            {isArabic ? "حذف السجل" : "Delete Record"}
          </span>
          <button className="modal-close" onClick={onClose} disabled={loading}>
            ×
          </button>
        </div>

        <div
          className="modal-body"
          style={{ alignItems: "center", textAlign: "center", gap: 12 }}
        >
          <div className="confirm-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </div>
          <p className="confirm-msg">
            {isArabic ? (
              <>
                هل أنت متأكد من حذف سجل التوقف لمرحلة{" "}
                <span className="confirm-name">{stageLabel(record.stage, true)}</span> بتاريخ{" "}
                {record.date}؟
              </>
            ) : (
              <>
                Delete downtime record for{" "}
                <span className="confirm-name">{stageLabel(record.stage, false)}</span> on{" "}
                {record.date}?
              </>
            )}
          </p>
          {error && (
            <div className="modal-error" style={{ width: "100%" }}>
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {t("cancel")}
          </button>
          <button
            className="btn-danger"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={{ borderTopColor: "white" }} />
            ) : (
              t("delete")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Downtime Page ───────────────────────────────────────────────────────
export default function Downtime() {
  const { user } = useAuth();
  const { t, isArabic } = useLanguage();
  const isViewer = user?.access === "viewer";
  const isAdmin = user?.access === "admin";

  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [selectedStage, setSelectedStage] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { type: 'add'|'edit'|'delete'|'report', record? }
  const [toast, setToast] = useState(null); // { msg, tone: "ok" | "warn" }
  const [loadError, setLoadError] = useState(false);
  const syncAttemptedRef = useRef(false);
  const toastTimerRef = useRef(null);

  // ─── Easy Live Recording State ──────────────────────────────────────────────
  const [selectedPillStage, setSelectedPillStage] = useState(STAGES[0]);
  const [activeSession, setActiveSession] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSavingLive, setIsSavingLive] = useState(false);

  // Sync active live stoppage scoped to the current user (across browsers & devices)
  useEffect(() => {
    const currentUserName = user?.name;
    if (!currentUserName) return;

    const userStorageKey = getStorageKey(currentUserName);

    // 1. Immediately hydrate from user-scoped localStorage if available
    try {
      const stored = localStorage.getItem(userStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.startTimestamp) {
          setActiveSession(parsed);
        }
      }
    } catch {}

    // 2. Query Supabase for any active live stoppage (resumed_at IS NULL) for this specific user
    supabase
      .from("stoppages")
      .select("*")
      .is("resumed_at", null)
      .eq("supervisor_id", currentUserName)
      .order("id", { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const row = data[0];
          const startMs = new Date(row.stopped_at).getTime();
          const restored = {
            id: row.id,
            stage: row.stage_id || STAGES[0],
            user_name: row.supervisor_id || currentUserName,
            startTimestamp: startMs,
            date: row.stopped_at
              ? formatLocalDate(new Date(row.stopped_at))
              : getTodayString(),
            start_time: new Date(row.stopped_at).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
          setActiveSession(restored);
          localStorage.setItem(userStorageKey, JSON.stringify(restored));
        } else if (!error && (!data || data.length === 0)) {
          // If no active stoppage exists on Supabase for this user, clear local session
          setActiveSession(null);
          localStorage.removeItem(userStorageKey);
        }
      })
      .catch((err) => {
        console.warn("Sync live downtime from Supabase error:", err);
      });
  }, [user?.name]);

  // ─── Live Timer Ticker (Display only) ───────────────────────────────────────
  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(
        0,
        Math.floor((Date.now() - activeSession.startTimestamp) / 1000),
      );
      setElapsedSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Fetch users
  useEffect(() => {
    supabase
      .from("users")
      .select("id,name,access")
      .in("access", ["admin", "supervisor"])
      .order("name")
      .then((res) => setUsers(res.data || []))
      .catch(() => {});
  }, []);

  // Fetch downtime records (database + any records still waiting to sync)
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const applyFilters = (list) => {
      let out = list;
      if (selectedDate) out = out.filter((r) => r.date === selectedDate);
      if (selectedStage) out = out.filter((r) => r.stage === selectedStage);
      if (selectedUser) out = out.filter((r) => r.user_name === selectedUser);
      return out.sort((a, b) =>
        `${b.date} ${b.start_time}`.localeCompare(`${a.date} ${a.start_time}`),
      );
    };

    try {
      const { data, error } = await supabase
        .from("stoppages")
        .select("*")
        .order("stopped_at", { ascending: false });
      if (error) throw error;

      const cloudList = (data || []).map((s) => {
        const start = s.stopped_at ? new Date(s.stopped_at) : new Date();
        const live = !s.resumed_at;
        const end = live ? new Date() : new Date(s.resumed_at);
        return {
          id: s.id,
          user_name: s.supervisor_id || "Supervisor",
          stage: s.stage_id,
          date: formatLocalDate(start),
          start_time: getCurrentTimeString(start),
          end_time: live ? "" : getCurrentTimeString(end),
          total_minutes: Math.max(
            live ? 0 : 1,
            Math.round((end.getTime() - start.getTime()) / 60000),
          ),
          startTimestamp: start.getTime(),
          live,
          notes: s.notes || "",
        };
      });

      // Keep only genuinely unsynced local records; anything already in the
      // database (or legacy copies of saved records) is dropped from the cache.
      const cloudKeys = new Set(cloudList.map(recordKey));
      const pending = readLocalRecords()
        .filter(isPendingLocal)
        .filter((l) => !cloudKeys.has(recordKey(l)))
        .map((l) => ({ ...l, pending: true }));
      writeLocalRecords(pending);

      // Upload them once per page visit.
      if (pending.length > 0 && !syncAttemptedRef.current) {
        syncAttemptedRef.current = true;
        let uploaded = 0;
        for (const rec of pending) {
          const { error: insErr } = await supabase.from("stoppages").insert([
            {
              stage_id: rec.stage,
              supervisor_id: rec.user_name,
              ...toStoppageRange(rec.date, rec.start_time, rec.total_minutes),
              notes: `Downtime: ${rec.total_minutes}m (synced)`,
            },
          ]);
          if (!insErr) {
            removeLocalRecord(rec);
            uploaded += 1;
          }
        }
        if (uploaded > 0) {
          showToast(
            isArabic
              ? `تمت مزامنة ${uploaded} سجل محفوظ على الجهاز.`
              : `Synced ${uploaded} record(s) saved on this device.`,
          );
          setLoading(false);
          fetchRecords();
          return;
        }
      }

      setLoadError(false);
      setRecords(applyFilters([...pending, ...cloudList]));
    } catch (e) {
      console.warn("fetchRecords error:", e);
      setLoadError(true);
      setRecords(
        applyFilters(
          readLocalRecords()
            .filter(isPendingLocal)
            .map((l) => ({ ...l, pending: true })),
        ),
      );
    } finally {
      setLoading(false);
    }
    // showToast only sets state; isArabic just changes the toast wording.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedStage, selectedUser]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Running stoppages keep growing while the page is open.
  const [nowTick, setNowTick] = useState(() => Date.now());
  const hasLiveRows = records.some((r) => r.live);
  useEffect(() => {
    if (!hasLiveRows) return undefined;
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, [hasLiveRows]);

  const rowMinutes = (r) =>
    r.live
      ? Math.max(0, Math.round((nowTick - r.startTimestamp) / 60000))
      : r.total_minutes || 0;

  // Totals for the current filter
  const totalMinutesInDay = records.reduce((acc, r) => acc + rowMinutes(r), 0);
  const stageTotals = STAGES.map((stage) => ({
    stage,
    mins: records.filter((r) => r.stage === stage).reduce((a, r) => a + rowMinutes(r), 0),
    count: records.filter((r) => r.stage === stage).length,
  }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.mins - a.mins);
  const pendingCount = records.filter((r) => r.pending).length;

  // ─── Start Live Downtime ────────────────────────────────────────────────────
  async function handleStartLiveDowntime() {
    if (activeSession || isSavingLive) return;
    setIsSavingLive(true);
    const now = new Date();
    const session = {
      stage: selectedPillStage,
      user_name: user?.name || "Admin",
      date: getTodayString(),
      start_time: getCurrentTimeString(now),
      startTimestamp: now.getTime(),
    };

    try {
      const { data, error } = await supabase
        .from("stoppages")
        .insert([
          {
            stage_id: selectedPillStage,
            supervisor_id: user?.name || "Supervisor",
            stopped_at: now.toISOString(),
            resumed_at: null,
            notes: LIVE_NOTE,
          },
        ])
        .select();
      if (error) throw error;
      if (data?.[0]?.id) session.id = data[0].id;
    } catch (e) {
      // Offline: the timer still runs on this device and is saved on stop.
      console.warn("Could not register active live stoppage in Supabase:", e);
    }

    localStorage.setItem(getStorageKey(user?.name), JSON.stringify(session));
    setActiveSession(session);
    setIsSavingLive(false);
    showToast(
      isArabic
        ? `بدأ تسجيل التوقف لمحطة "${stageLabel(selectedPillStage, true)}"`
        : `Downtime recording started for "${selectedPillStage}"`,
    );
    fetchRecords();
  }

  // ─── Stop & Save Live Downtime ──────────────────────────────────────────────
  async function handleStopAndSaveLiveDowntime() {
    if (!activeSession || isSavingLive) return;
    setIsSavingLive(true);

    try {
      const now = new Date();
      const elapsedSecs = Math.max(
        0,
        Math.floor((now.getTime() - activeSession.startTimestamp) / 1000),
      );
      const durationMins = Math.max(1, Math.round(elapsedSecs / 60));
      const endDate = new Date(activeSession.startTimestamp + durationMins * 60000);
      const payload = {
        id: activeSession.id || Date.now(),
        user_name: activeSession.user_name || user?.name || "Supervisor",
        stage: activeSession.stage,
        date: activeSession.date || formatLocalDate(now),
        start_time: activeSession.start_time,
        end_time: getCurrentTimeString(endDate),
        total_minutes: durationMins,
      };
      const range = {
        stopped_at: new Date(activeSession.startTimestamp).toISOString(),
        resumed_at: now.toISOString(),
      };
      const notes = `Live session: ${durationMins}m`;

      let saved = false;
      try {
        if (activeSession.id) {
          const { data, error } = await supabase
            .from("stoppages")
            .update({ resumed_at: range.resumed_at, notes })
            .eq("id", activeSession.id)
            .select();
          if (!error && data && data.length > 0) saved = true;
        }
        if (!saved) {
          // No database row yet (started offline) or the row was removed.
          const { error } = await supabase.from("stoppages").insert([
            {
              stage_id: activeSession.stage,
              supervisor_id: payload.user_name,
              ...range,
              notes,
            },
          ]);
          if (!error) saved = true;
        }
      } catch (e) {
        console.warn("Supabase live save network error:", e);
      }

      if (!saved) addPendingLocal(payload);

      localStorage.removeItem(getStorageKey(user?.name));
      setActiveSession(null);
      setElapsedSeconds(0);
      const label = stageLabel(payload.stage, isArabic);
      const span = `${payload.start_time} – ${payload.end_time}`;
      if (saved) {
        showToast(
          isArabic
            ? `تم حفظ توقف "${label}" (${formatMinutes(durationMins, true)}، ${span})`
            : `Saved downtime for "${label}" (${formatMinutes(durationMins)}, ${span})`,
        );
      } else {
        showToast(
          isArabic
            ? "ما في اتصال — انحفظ السجل على الجهاز وبيتزامن تلقائياً."
            : "No connection — saved on this device, it will sync automatically.",
          "warn",
        );
      }
      await fetchRecords();
    } finally {
      setIsSavingLive(false);
    }
  }

  // ─── Cancel Live Session ────────────────────────────────────────────────────
  async function handleCancelLiveDowntime() {
    const ok = window.confirm(
      isArabic
        ? "إلغاء هذا التسجيل بدون حفظ؟"
        : "Cancel this recording without saving?",
    );
    if (!ok) return;
    if (activeSession?.id) {
      try {
        await supabase.from("stoppages").delete().eq("id", activeSession.id);
      } catch (e) {
        console.warn("Could not delete canceled stoppage from Supabase:", e);
      }
    }
    localStorage.removeItem(getStorageKey(user?.name));
    setActiveSession(null);
    setElapsedSeconds(0);
    showToast(isArabic ? "تم إلغاء التسجيل." : "Recording cancelled.");
    fetchRecords();
  }

  function showToast(msg, tone = "ok") {
    setToast({ msg, tone });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4500);
  }

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  function onSaved(_payload, _isEdit, opts = {}) {
    setModal(null);
    fetchRecords();
    if (opts.offline) {
      showToast(
        isArabic
          ? "ما في اتصال — انحفظ السجل على الجهاز وبيتزامن تلقائياً."
          : "No connection — saved on this device, it will sync automatically.",
        "warn",
      );
    } else {
      showToast(isArabic ? "تم حفظ السجل." : "Record saved successfully.");
    }
  }

  function onDeleted(id) {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setModal(null);
    fetchRecords();
    showToast(isArabic ? "تم حذف السجل." : "Record deleted.");
  }

  const L = (ar, en) => (isArabic ? ar : en);
  const maxStageMins = stageTotals.length > 0 ? stageTotals[0].mins : 0;
  const today = getTodayString();

  function shiftDate(days) {
    const base = new Date(`${selectedDate || today}T12:00:00`);
    base.setDate(base.getDate() + days);
    setSelectedDate(formatLocalDate(base));
  }

  const rowActions = (r) => {
    if (isViewer) {
      return <span className="dt-muted">{L("للقراءة فقط", "Read only")}</span>;
    }
    if (r.live) {
      return <span className="dt-muted" style={{ display: "block", textAlign: "center" }}>—</span>;
    }
    return (
      <div className="action-btns" style={{ justifyContent: "center" }}>
        <button
          className="btn-icon btn-edit"
          title={t("edit")}
          aria-label={t("edit")}
          onClick={() => setModal({ type: "edit", record: r })}
        >
          <Pencil size={15} />
        </button>
        {isAdmin && (
          <button
            className="btn-icon btn-delete"
            title={L("حذف (للأدمن فقط)", "Delete (Admin only)")}
            aria-label={L("حذف", "Delete")}
            onClick={() => setModal({ type: "delete", record: r })}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    );
  };

  const statusBadge = (r) => {
    if (r.live) {
      return (
        <span className="dt-badge dt-badge--live">
          <span className="pulse-dot" />
          {L("جارٍ", "Running")}
        </span>
      );
    }
    if (r.pending) {
      return (
        <span className="dt-badge dt-badge--pending" title={L("محفوظ على هذا الجهاز فقط", "Saved on this device only")}>
          <CloudOff size={12} />
          {L("غير متزامن", "Not synced")}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="dt-page">
      {/* Toast */}
      {toast && (
        <div className={`dt-toast${toast.tone === "warn" ? " dt-toast--warn" : ""}`} role="status">
          {toast.tone === "warn" ? <CloudOff size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header dt-header">
        <div>
          <h1 className="page-title">{t("downtimeTitle")}</h1>
          <p className="page-subtitle">{t("downtimeSubtitle")}</p>
        </div>
        <div className="dt-header-actions">
          <button
            type="button"
            className="btn-primary"
            style={{ background: "var(--navy)" }}
            onClick={() => setModal({ type: "report" })}
          >
            <FileText size={16} />
            <span>{t("viewPrintReport")}</span>
          </button>
          {!isViewer && (
            <button type="button" className="btn-secondary dt-btn-icon-text" onClick={() => setModal({ type: "add" })}>
              <Plus size={16} />
              <span>{t("manualEntry")}</span>
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="dt-banner dt-banner--warn">
          <CloudOff size={18} />
          <span>
            {L(
              "تعذر الاتصال بقاعدة البيانات — تظهر فقط السجلات المحفوظة على هذا الجهاز.",
              "Could not reach the database — only records saved on this device are shown.",
            )}
          </span>
          <button type="button" className="btn-secondary" onClick={fetchRecords}>
            <RefreshCw size={14} />
            <span>{L("إعادة المحاولة", "Retry")}</span>
          </button>
        </div>
      )}
      {!loadError && pendingCount > 0 && (
        <div className="dt-banner dt-banner--warn">
          <CloudOff size={18} />
          <span>
            {L(
              `${pendingCount} سجل محفوظ على هذا الجهاز ولم يتزامن بعد.`,
              `${pendingCount} record(s) are saved on this device and not synced yet.`,
            )}
          </span>
        </div>
      )}

      {/* ─── LIVE TRACKER ─── */}
      {isViewer ? (
        <div className="dt-banner">
          <span className="badge badge-viewer">{L("وضع المشاهد", "Viewer Mode")}</span>
          <span>
            {L(
              "للقراءة فقط — تقدر تستعرض السجلات وتطبع التقارير. التسجيل للمشرفين والمدراء.",
              "Read-only — you can view records and print reports. Recording is for supervisors and admins.",
            )}
          </span>
        </div>
      ) : (
        <div className={`tracker-card dt-tracker ${activeSession ? "active" : ""}`}>
          <div className="tracker-header">
            <div className="tracker-title">
              <Timer size={20} color={activeSession ? "var(--danger)" : "var(--teal)"} />
              <span>{t("easyRecorder")}</span>
            </div>
            <div className="dt-muted">
              {L("مسجل الدخول كـ: ", "Logged in as: ")}
              <strong style={{ color: "var(--navy)" }}>{user?.name || "Admin"}</strong>
            </div>
          </div>

          {!activeSession ? (
            <>
              <div className="dt-label">{t("selectStageToStart")}</div>
              <div className="dt-stage-grid" role="radiogroup" aria-label={t("stage")}>
                {STAGES.map((s, idx) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={selectedPillStage === s}
                    className={`stage-pill ${selectedPillStage === s ? "selected" : ""}`}
                    onClick={() => setSelectedPillStage(s)}
                  >
                    <span className="stage-pill-num">{idx + 1}</span>
                    <span className="dt-stage-name">{stageLabel(s, isArabic)}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="btn-start-downtime dt-start-btn"
                onClick={handleStartLiveDowntime}
                disabled={isSavingLive}
              >
                {isSavingLive ? <span className="spinner" /> : <Play size={18} fill="currentColor" />}
                <span>
                  {L("بدء التوقف", "Start Downtime")} — {stageLabel(selectedPillStage, isArabic)}
                </span>
              </button>
            </>
          ) : (
            <div className="dt-running">
              <div className="dt-running-info">
                <div className="live-pulse">
                  <span className="pulse-dot" />
                  <span>{t("recordingInProgress")}</span>
                </div>
                <div className="dt-running-stage">{stageLabel(activeSession.stage, isArabic)}</div>
                <div className="dt-muted">
                  {L("بدأ الساعة ", "Started at ")}
                  <strong>{activeSession.start_time}</strong>
                  {L(" بواسطة ", " by ")}
                  <strong style={{ color: "var(--navy)" }}>{activeSession.user_name}</strong>
                </div>
              </div>

              <div className="stopwatch-display dt-stopwatch" dir="ltr">
                {formatElapsed(elapsedSeconds)}
              </div>

              <div className="dt-running-actions">
                <button
                  type="button"
                  className="btn-stop-downtime"
                  onClick={handleStopAndSaveLiveDowntime}
                  disabled={isSavingLive}
                >
                  {isSavingLive ? <span className="spinner" /> : <Square size={16} fill="currentColor" />}
                  <span>{t("stopAndSave")}</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCancelLiveDowntime}
                  disabled={isSavingLive}
                  title={L("إلغاء دون حفظ", "Cancel without saving")}
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Summary ─── */}
      <div className="dt-summary">
        <div className="dt-stat">
          <div className="dt-stat-icon" style={{ background: "rgba(0,175,170,.12)", color: "var(--teal)" }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="dt-stat-label">
              {L("إجمالي التوقف", "Total downtime")}
              <span className="dt-stat-scope">
                {" "}· {selectedDate ? (selectedDate === today ? L("اليوم", "today") : selectedDate) : L("كل التواريخ", "all dates")}
              </span>
            </div>
            <div className="dt-stat-value">{formatMinutes(totalMinutesInDay, isArabic)}</div>
          </div>
        </div>

        <div className="dt-stat">
          <div className="dt-stat-icon" style={{ background: "rgba(20,37,71,.08)", color: "var(--navy)" }}>
            <ListChecks size={22} />
          </div>
          <div>
            <div className="dt-stat-label">{L("عدد التوقفات", "Stoppages")}</div>
            <div className="dt-stat-value">{records.length}</div>
          </div>
        </div>

        <div className="dt-stat dt-stat--wide">
          <div style={{ width: "100%" }}>
            <div className="dt-stat-label" style={{ marginBottom: 8 }}>
              {L("حسب المحطة", "By station")}
            </div>
            {stageTotals.length === 0 ? (
              <div className="dt-muted">{L("لا توجد توقفات.", "No stoppages.")}</div>
            ) : (
              <div className="dt-bars">
                {stageTotals.slice(0, 4).map((st) => (
                  <div key={st.stage} className="dt-bar-row">
                    <span className="dt-bar-name">{stageLabel(st.stage, isArabic)}</span>
                    <span className="dt-bar-track">
                      <span
                        className="dt-bar-fill"
                        style={{ width: `${maxStageMins > 0 ? Math.max(4, (st.mins / maxStageMins) * 100) : 0}%` }}
                      />
                    </span>
                    <span className="dt-bar-val">{formatMinutes(st.mins, isArabic)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Filters ─── */}
      <div className="dt-filters">
        <div className="dt-date-nav">
          <button
            type="button"
            className="btn-icon"
            onClick={() => shiftDate(-1)}
            title={L("اليوم السابق", "Previous day")}
            aria-label={L("اليوم السابق", "Previous day")}
          >
            {isArabic ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <input
            type="date"
            className="search-input dt-date-input"
            value={selectedDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            aria-label={t("date")}
          />
          <button
            type="button"
            className="btn-icon"
            onClick={() => shiftDate(1)}
            disabled={!selectedDate || selectedDate >= today}
            title={L("اليوم التالي", "Next day")}
            aria-label={L("اليوم التالي", "Next day")}
          >
            {isArabic ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        <select
          className="form-select"
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
          aria-label={t("stage")}
        >
          <option value="">{t("allStages")}</option>
          {STAGES.map((s, idx) => (
            <option key={s} value={s}>
              {idx + 1}. {stageLabel(s, isArabic)}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          aria-label={t("user")}
        >
          <option value="">{t("allUsers")}</option>
          {users.map((u) => (
            <option key={u.id || u.name} value={u.name}>
              {u.name}
            </option>
          ))}
        </select>

        <div className="dt-chip-row">
          {selectedDate !== today && (
            <button type="button" className="btn-secondary dt-chip" onClick={() => setSelectedDate(today)}>
              {L("اليوم", "Today")}
            </button>
          )}
          {selectedDate && (
            <button type="button" className="btn-secondary dt-chip" onClick={() => setSelectedDate("")}>
              {t("showAllDates")}
            </button>
          )}
        </div>
      </div>

      {/* ─── Records ─── */}
      <div className="table-card">
        {loading ? (
          <div className="table-empty">
            <span className="spinner" style={{ borderColor: "rgba(0,175,170,.2)", borderTopColor: "var(--teal)" }} />
          </div>
        ) : records.length === 0 ? (
          <div className="table-empty">
            {selectedDate
              ? L(`لا توجد أوقات توقف مسجلة لتاريخ ${selectedDate}.`, `No downtime recorded for ${selectedDate}.`)
              : L("لا توجد أوقات توقف مسجلة.", "No downtime recorded.")}
          </div>
        ) : (
          <>
            {/* Desktop / tablet: table */}
            <div className="table-wrap dt-table">
              <table>
                <thead>
                  <tr>
                    <th>{t("date")}</th>
                    <th>{t("user")}</th>
                    <th>{t("stage")}</th>
                    <th>{t("startTime")}</th>
                    <th>{t("endTime")}</th>
                    <th>{t("totalTime")}</th>
                    <th style={{ width: 90, textAlign: "center" }}>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={`${r.pending ? "p" : "c"}-${r.id}`} className={r.live ? "dt-row-live" : undefined}>
                      <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{r.date}</td>
                      <td style={{ fontWeight: 700, color: "var(--navy)" }}>{r.user_name}</td>
                      <td>
                        <span className="dt-stage-badge">{stageLabel(r.stage, isArabic)}</span>
                      </td>
                      <td dir="ltr" className="dt-time">{r.start_time}</td>
                      <td dir="ltr" className="dt-time">{r.live ? "—" : r.end_time}</td>
                      <td>
                        <div className="dt-total-cell">
                          <strong style={{ color: r.live ? "var(--danger)" : "var(--teal-dark)" }}>
                            {formatMinutes(rowMinutes(r), isArabic)}
                          </strong>
                          {statusBadge(r)}
                        </div>
                      </td>
                      <td>{rowActions(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phone: cards */}
            <ul className="dt-cards">
              {records.map((r) => (
                <li key={`${r.pending ? "p" : "c"}-${r.id}`} className={`dt-card${r.live ? " dt-card--live" : ""}`}>
                  <div className="dt-card-top">
                    <span className="dt-stage-badge">{stageLabel(r.stage, isArabic)}</span>
                    <strong className="dt-card-mins" style={{ color: r.live ? "var(--danger)" : "var(--teal-dark)" }}>
                      {formatMinutes(rowMinutes(r), isArabic)}
                    </strong>
                  </div>
                  <div className="dt-card-meta">
                    <span dir="ltr" className="dt-time">
                      {r.start_time} → {r.live ? "…" : r.end_time}
                    </span>
                    <span>·</span>
                    <span>{r.date}</span>
                  </div>
                  <div className="dt-card-bottom">
                    <span className="dt-card-user">{r.user_name}</span>
                    {statusBadge(r)}
                    <span className="dt-card-actions">{rowActions(r)}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="table-count dt-count">
              <span>
                {records.length} {L("سجل", records.length === 1 ? "record" : "records")}
              </span>
              <span>
                {L("إجمالي الوقت: ", "Total time: ")}
                <strong style={{ color: "var(--navy)" }}>{formatMinutes(totalMinutesInDay, isArabic)}</strong>
              </span>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {modal?.type === "report" && (
        <DowntimeReportModal
          records={records.map((r) => ({ ...r, total_minutes: rowMinutes(r) }))}
          selectedDate={selectedDate}
          selectedStage={selectedStage}
          currentUser={user}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === "add" && (
        <DowntimeModal
          mode="add"
          users={users}
          currentUserName={user?.name}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}

      {modal?.type === "edit" && (
        <DowntimeModal
          mode="edit"
          initial={modal.record}
          users={users}
          currentUserName={user?.name}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}

      {isAdmin && modal?.type === "delete" && (
        <DeleteModal
          record={modal.record}
          onClose={() => setModal(null)}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}
