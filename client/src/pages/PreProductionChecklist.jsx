import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Circle,
  Save,
  Printer,
  Trash2,
  ChevronDown,
  ChevronUp,
  Users,
  UserX,
  Clock,
  AlertTriangle,
  ClipboardCheck,
  FolderOpen,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { CHECKLIST_ITEMS, getChecklistStatusInfo } from "../constants/checklistData";
import ChecklistReportModal from "../components/checklist/ChecklistReportModal";
import { usePreProductionChecklistData } from "../hooks/usePreProductionChecklistData";

const SHIFTS = [
  { key: "Day", ar: "☀️ صباحية", en: "☀️ Day" },
  { key: "Night", ar: "🌙 مسائية", en: "🌙 Night" },
];

const ATTENDANCE = {
  PRESENT: { ar: "حاضر", en: "Present", color: "#10b981" },
  LATE: { ar: "متأخر", en: "Late", color: "#f59e0b" },
  ABSENT: { ar: "غائب", en: "Absent", color: "#ef4444" },
};

const card = {
  background: "var(--white)",
  border: "1px solid var(--gray-200)",
  borderRadius: 14,
  boxShadow: "var(--shadow-sm)",
  padding: 18,
};

const sectionTitle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 800,
  color: "var(--navy)",
  fontSize: "1rem",
  margin: 0,
};

function shiftLabel(key, isArabic) {
  const s = SHIFTS.find((x) => x.key === key);
  return s ? (isArabic ? s.ar : s.en) : key;
}

// ─── Big status banner ────────────────────────────────────────────────────────
function StatusBanner({ stats, attendanceStats, isArabic }) {
  const info = getChecklistStatusInfo(stats.overallStatus, isArabic);
  const Icon = info.key === "READY" ? CheckCircle2 : info.key === "NOT_READY" ? XCircle : Clock;
  return (
    <div
      style={{
        ...card,
        borderInlineStart: `6px solid ${info.color}`,
        background: info.bg,
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <Icon size={40} color={info.color} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: "1.3rem", fontWeight: 900, color: info.color }}>{info.label}</div>
        <div style={{ fontSize: "0.88rem", color: "var(--gray-600)", fontWeight: 600, marginTop: 2 }}>
          {info.hint}
        </div>
        <div style={{ height: 8, background: "rgba(0,0,0,0.06)", borderRadius: 6, overflow: "hidden", marginTop: 10, maxWidth: 420 }}>
          <div
            style={{
              width: `${(stats.checked / stats.total) * 100}%`,
              height: "100%",
              background: info.color,
              transition: "width .3s",
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <MiniStat label={isArabic ? "تم فحصه" : "Checked"} value={`${stats.checked}/${stats.total}`} />
        <MiniStat label={isArabic ? "مشاكل" : "Problems"} value={stats.failed} color={stats.failed ? "#ef4444" : undefined} />
        <MiniStat
          label={isArabic ? "غائبين" : "Absent"}
          value={attendanceStats.absent}
          color={attendanceStats.absent ? "#ef4444" : undefined}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ background: "var(--white)", border: "1px solid var(--gray-200)", borderRadius: 10, padding: "8px 14px", textAlign: "center", minWidth: 76 }}>
      <div style={{ fontSize: "1.2rem", fontWeight: 900, color: color || "var(--gray-900)" }}>{value}</div>
      <div style={{ fontSize: "0.72rem", color: "var(--gray-500)", fontWeight: 700 }}>{label}</div>
    </div>
  );
}

// ─── Attendance ───────────────────────────────────────────────────────────────
function AttendancePanel({ list, stats, onStatus, onReason, onRestPresent, isArabic }) {
  const L = (ar, en) => (isArabic ? ar : en);
  const notHere = list.filter((a) => a.status === "ABSENT" || a.status === "LATE");

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <h3 style={sectionTitle}>
          <Users size={20} color="var(--teal)" />
          {L("حضور الطاقم", "Crew Attendance")}
        </h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: "0.82rem", fontWeight: 700 }}>
          <span style={{ color: "#10b981" }}>● {stats.present} {L("حاضر", "present")}</span>
          <span style={{ color: "#f59e0b" }}>● {stats.late} {L("متأخر", "late")}</span>
          <span style={{ color: "#ef4444" }}>● {stats.absent} {L("غائب", "absent")}</span>
          {stats.unmarked > 0 && (
            <span style={{ color: "var(--gray-500)" }}>○ {stats.unmarked} {L("لم يُسجل", "not marked")}</span>
          )}
          {stats.unmarked > 0 && (
            <button type="button" className="btn-secondary" onClick={onRestPresent} style={{ padding: "5px 12px", fontSize: "0.78rem" }}>
              {L("الباقي حاضرين", "Mark rest present")}
            </button>
          )}
        </div>
      </div>

      {/* Who is not here */}
      {notHere.length > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, color: "#b91c1c", fontSize: "0.88rem", marginBottom: 6 }}>
            <UserX size={16} /> {L("غير متواجدين الآن", "Not on the line")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {notHere.map((a) => (
              <span
                key={a.id}
                style={{
                  background: "var(--white)",
                  border: `1px solid ${ATTENDANCE[a.status].color}66`,
                  color: ATTENDANCE[a.status].color,
                  borderRadius: 20,
                  padding: "3px 10px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                }}
              >
                {a.name} — {isArabic ? ATTENDANCE[a.status].ar : ATTENDANCE[a.status].en}
                {a.reason ? ` (${a.reason})` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", color: "var(--gray-500)", fontSize: "0.88rem" }}>
          {L("لا يوجد مشغلين مسجلين تحت هذا المشرف. أضفهم من صفحة طاقم العمل.", "No operators under this supervisor. Add them from the Line Crew page.")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {list.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                padding: "9px 0",
                borderBottom: "1px solid var(--gray-100)",
              }}
            >
              <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: "var(--gray-900)", fontSize: "0.9rem" }}>{a.name}</div>
                {a.company_id && <div style={{ fontSize: "0.72rem", color: "var(--gray-500)" }}>#{a.company_id}</div>}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {Object.entries(ATTENDANCE).map(([key, opt]) => {
                  const on = a.status === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onStatus(a.id, key)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        border: `1.5px solid ${on ? opt.color : "var(--gray-300)"}`,
                        background: on ? opt.color : "var(--white)",
                        color: on ? "#fff" : "var(--gray-600)",
                      }}
                    >
                      {isArabic ? opt.ar : opt.en}
                    </button>
                  );
                })}
              </div>
              {(a.status === "ABSENT" || a.status === "LATE") && (
                <input
                  className="search-input"
                  style={{ flex: "1 1 180px", padding: "7px 10px", fontSize: "0.82rem" }}
                  placeholder={a.status === "ABSENT" ? L("سبب الغياب (مطلوب)", "Absence reason (required)") : L("سبب التأخير", "Reason for being late")}
                  value={a.reason}
                  onChange={(e) => onReason(a.id, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── One checklist item ───────────────────────────────────────────────────────
function ChecklistRow({ item, index, value, onStatus, onNote, isArabic }) {
  const [open, setOpen] = useState(false);
  const status = value?.status || "PENDING";
  const L = (ar, en) => (isArabic ? ar : en);
  const color = status === "PASS" ? "#10b981" : status === "FAIL" ? "#ef4444" : "var(--gray-300)";
  const details = isArabic ? item.arabicDetails : item.details;

  return (
    <div style={{ ...card, padding: 14, borderInlineStart: `5px solid ${color}` }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: status === "PENDING" ? "var(--gray-100)" : color,
            color: status === "PENDING" ? "var(--gray-500)" : "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {status === "PASS" ? "✓" : status === "FAIL" ? "✗" : index + 1}
        </div>
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: "0.95rem" }}>
            {isArabic ? item.arabicTitle : item.title}
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--gray-600)", marginTop: 3, lineHeight: 1.6 }}>
            {isArabic ? item.arabicSummary : item.summary}
          </div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            style={{ background: "none", border: "none", color: "var(--teal-dark)", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", padding: "6px 0 0", display: "inline-flex", alignItems: "center", gap: 3 }}
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {open ? L("إخفاء النقاط", "Hide points") : L(`ماذا أفحص؟ (${details.length} نقاط)`, `What to check? (${details.length})`)}
          </button>
          {open && (
            <ul style={{ margin: "6px 0 0", paddingInlineStart: 20, fontSize: "0.82rem", color: "var(--gray-700)", lineHeight: 1.8 }}>
              {details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => onStatus(item.id, status === "PASS" ? "PENDING" : "PASS")}
            style={btnStyle(status === "PASS", "#10b981")}
          >
            <CheckCircle2 size={16} /> {L("تمام", "OK")}
          </button>
          <button
            type="button"
            onClick={() => onStatus(item.id, status === "FAIL" ? "PENDING" : "FAIL")}
            style={btnStyle(status === "FAIL", "#ef4444")}
          >
            <XCircle size={16} /> {L("فيه مشكلة", "Problem")}
          </button>
        </div>
      </div>
      {status === "FAIL" && (
        <input
          className="search-input"
          style={{ marginTop: 10, width: "100%", borderColor: value?.note?.trim() ? undefined : "#fca5a5" }}
          placeholder={L("اكتب وش المشكلة وإيش الإجراء (مطلوب)", "Describe the problem and action taken (required)")}
          value={value?.note || ""}
          onChange={(e) => onNote(item.id, e.target.value)}
        />
      )}
    </div>
  );
}

function btnStyle(active, color) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "8px 14px",
    borderRadius: 9,
    fontWeight: 800,
    fontSize: "0.82rem",
    cursor: "pointer",
    border: `1.5px solid ${active ? color : "var(--gray-300)"}`,
    background: active ? color : "var(--white)",
    color: active ? "#fff" : "var(--gray-600)",
  };
}

// ─── History ──────────────────────────────────────────────────────────────────
function HistoryList({ records, loading, isAdmin, onOpen, onPrint, onDelete, isArabic }) {
  const [shiftFilter, setShiftFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const L = (ar, en) => (isArabic ? ar : en);
  const rows = records.filter(
    (r) =>
      (shiftFilter === "ALL" || r.shift === shiftFilter) &&
      (!search || (r.supervisor || "").toLowerCase().includes(search.toLowerCase()) || (r.date || "").includes(search)),
  );

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <h3 style={sectionTitle}>
          <FolderOpen size={20} color="var(--teal)" />
          {L("الفحوصات السابقة", "Previous Checklists")}
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="search-input" style={{ padding: "7px 10px", width: 170 }} placeholder={L("بحث بالمشرف أو التاريخ", "Supervisor or date")} value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="form-select" value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)} style={{ padding: "7px 10px" }}>
            <option value="ALL">{L("كل الورديات", "All shifts")}</option>
            {SHIFTS.map((s) => (
              <option key={s.key} value={s.key}>{isArabic ? s.ar : s.en}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 20, textAlign: "center", color: "var(--gray-500)" }}>{L("جارٍ التحميل...", "Loading...")}</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", color: "var(--gray-500)" }}>{L("لا توجد سجلات.", "No records.")}</div>
      ) : (
        <div className="table-wrap" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
            <thead>
              <tr style={{ background: "var(--gray-50)", color: "var(--gray-600)", textAlign: "start" }}>
                {[L("التاريخ", "Date"), L("الوردية", "Shift"), L("المشرف", "Supervisor"), L("الحالة", "Status"), L("الغياب", "Absent"), ""].map((h, i) => (
                  <th key={i} style={{ padding: "9px 10px", textAlign: "start", fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const info = getChecklistStatusInfo(r.status, isArabic);
                const att = r.item_details?.attendance || r.item_details?.["chk-0"]?.attendance || [];
                const absent = att.filter((a) => a.status === "ABSENT");
                return (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--gray-100)" }}>
                    <td style={{ padding: "9px 10px", fontWeight: 700 }}>{r.date}</td>
                    <td style={{ padding: "9px 10px" }}>{shiftLabel(r.shift, isArabic)}</td>
                    <td style={{ padding: "9px 10px" }}>{r.supervisor}</td>
                    <td style={{ padding: "9px 10px" }}>
                      <span style={{ color: info.color, background: info.bg, border: `1px solid ${info.color}44`, padding: "3px 10px", borderRadius: 20, fontWeight: 700, fontSize: "0.76rem", whiteSpace: "nowrap" }}>
                        {info.label}
                      </span>
                    </td>
                    <td style={{ padding: "9px 10px", color: absent.length ? "#b91c1c" : "var(--gray-400)", fontWeight: 600 }} title={absent.map((a) => a.name).join("، ")}>
                      {absent.length ? absent.map((a) => a.name).join("، ") : "—"}
                    </td>
                    <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
                      <button type="button" className="btn-icon" title={L("فتح", "Open")} onClick={() => onOpen(r)} style={iconBtn}>
                        <ClipboardCheck size={15} />
                      </button>
                      <button type="button" className="btn-icon" title={L("طباعة", "Print")} onClick={() => onPrint(r)} style={iconBtn}>
                        <Printer size={15} />
                      </button>
                      {isAdmin && (
                        <button type="button" className="btn-icon" title={L("حذف", "Delete")} onClick={() => onDelete(r.id)} style={{ ...iconBtn, color: "#ef4444" }}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const iconBtn = {
  background: "none",
  border: "1px solid var(--gray-200)",
  borderRadius: 7,
  padding: 6,
  marginInlineEnd: 4,
  cursor: "pointer",
  color: "var(--gray-600)",
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PreProductionChecklist() {
  const { user } = useAuth();
  const { isArabic, t } = useLanguage();
  const L = (ar, en) => (isArabic ? ar : en);
  const d = usePreProductionChecklistData(user);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 60 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 className="page-title">{L("فحص ما قبل الوردية", "Pre-Shift Checklist")}</h1>
          <p className="page-subtitle">
            {L("سجّل الحضور، افحص البنود، ثم احفظ.", "Mark attendance, check each item, then save.")}
            {d.existingRecord && (
              <span style={{ color: "var(--teal-dark)", fontWeight: 700 }}>
                {" "}
                {L("— يتم تعديل فحص محفوظ مسبقاً لهذه الوردية.", "— editing the checklist already saved for this shift.")}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input type="date" className="search-input" style={{ width: 150, padding: "8px 10px" }} value={d.activeDate} onChange={(e) => d.setActiveDate(e.target.value)} />
          <div style={{ display: "flex", border: "1.5px solid var(--gray-300)", borderRadius: 10, overflow: "hidden" }}>
            {SHIFTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => d.setActiveShift(s.key)}
                style={{
                  padding: "8px 14px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.84rem",
                  background: d.activeShift === s.key ? "var(--navy)" : "var(--white)",
                  color: d.activeShift === s.key ? "#fff" : "var(--gray-600)",
                }}
              >
                {isArabic ? s.ar : s.en}
              </button>
            ))}
          </div>
          {d.isAdmin ? (
            <select className="form-select" value={d.supervisorName} onChange={(e) => d.setSupervisorName(e.target.value)} style={{ padding: "8px 10px" }}>
              {d.supervisors.length === 0 && <option value="">{L("لا يوجد مشرفين", "No supervisors")}</option>}
              {d.supervisors.map((s) => (
                <option key={s.id} value={s.name}>
                  {L("المشرف: ", "Supervisor: ")}
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontWeight: 700, color: "var(--gray-700)", fontSize: "0.88rem" }}>
              {L("المشرف: ", "Supervisor: ")}
              {d.supervisorName}
            </span>
          )}
        </div>
      </div>

      {/* Toast */}
      {d.toast && (
        <div
          style={{
            background: d.toast.type === "success" ? "#dcfce7" : "#fef2f2",
            color: d.toast.type === "success" ? "#15803d" : "#b91c1c",
            border: `1px solid ${d.toast.type === "success" ? "#bbf7d0" : "#fecaca"}`,
            padding: "11px 16px",
            borderRadius: 10,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {d.toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {d.toast.text}
        </div>
      )}

      <StatusBanner stats={d.stats} attendanceStats={d.attendanceStats} isArabic={isArabic} />

      {/* 1. Attendance */}
      <AttendancePanel
        list={d.attendanceList}
        stats={d.attendanceStats}
        onStatus={d.setOperatorStatus}
        onReason={d.setOperatorReason}
        onRestPresent={d.markRestPresent}
        isArabic={isArabic}
      />

      {/* 2. Checklist items */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h3 style={sectionTitle}>
          <ClipboardCheck size={20} color="var(--teal)" />
          {L("بنود الفحص", "Checklist Items")}
        </h3>
        {d.stats.pending > 0 && (
          <button type="button" className="btn-secondary" onClick={d.markAllDone} style={{ padding: "6px 12px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Circle size={13} /> {L("الباقي كله تمام", "Mark the rest OK")}
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CHECKLIST_ITEMS.map((item, i) => (
          <ChecklistRow
            key={item.id}
            item={item}
            index={i}
            value={d.itemStatuses[item.id]}
            onStatus={d.setItemStatus}
            onNote={d.setItemNote}
            isArabic={isArabic}
          />
        ))}
      </div>

      {/* 3. Notes + save */}
      <div style={card}>
        <h3 style={{ ...sectionTitle, marginBottom: 8 }}>{L("ملاحظات الوردية", "Shift Notes")}</h3>
        <textarea
          rows={2}
          className="search-input"
          value={d.generalNotes}
          onChange={(e) => d.setGeneralNotes(e.target.value)}
          placeholder={L("أي ملاحظة للوردية القادمة أو للإدارة (اختياري)", "Any note for the next shift or management (optional)")}
          style={{ width: "100%", padding: 10, resize: "vertical", fontFamily: "inherit" }}
        />
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn-secondary" onClick={() => d.setPrintRecord(null)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Printer size={15} /> {L("طباعة", "Print")}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={d.isSaving}
            onClick={() => d.handleSave(isArabic)}
            style={{ padding: "10px 26px", fontWeight: 800 }}
          >
            <Save size={16} />
            {d.isSaving ? L("جارٍ الحفظ...", "Saving...") : d.existingRecord ? L("تحديث الفحص", "Update Checklist") : L("حفظ الفحص", "Save Checklist")}
          </button>
        </div>
      </div>

      <HistoryList
        records={d.historyRecords}
        loading={d.loading}
        isAdmin={d.isAdmin}
        onOpen={d.openRecord}
        onPrint={(r) => d.setPrintRecord(r)}
        onDelete={(id) => d.handleDeleteHistory(id, isArabic)}
        isArabic={isArabic}
      />

      <ChecklistReportModal
        isOpen={d.printRecord !== undefined}
        onClose={() => d.setPrintRecord(undefined)}
        record={d.printRecord}
        activeData={{
          date: d.activeDate,
          shift: d.activeShift,
          supervisor: d.supervisorName,
          generalNotes: d.generalNotes,
          itemStatuses: d.itemStatuses,
          stats: d.stats,
          standupAttendance: d.attendanceList,
        }}
        isArabic={isArabic}
        t={t}
      />
    </div>
  );
}
