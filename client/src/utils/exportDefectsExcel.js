import * as XLSX from "xlsx";
import { findStage } from "../constants/defectStages";
import { getTodayString } from "./date";

const STATUS_LABELS = {
  UNDER_INSPECTION: { ar: "تحت الفحص", en: "Under Inspection" },
  IN_REPAIR: { ar: "قيد الإصلاح", en: "In Repair" },
  RETURNED_TO_LINE: { ar: "عاد للخط", en: "Returned to Line" },
  SCRAPPED_KO: { ar: "هالك (KO)", en: "Scrapped (KO)" },
};

const EVENT_LABELS = {
  ENTRY: { ar: "دخول للإصلاح", en: "Entered Repair" },
  RETURN_TO_LINE: { ar: "عودة للخط", en: "Returned to Line" },
  SCRAP_KO: { ar: "تحويل لهالك", en: "Scrapped" },
};

function fmtDateTime(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function stageName(id, isArabic) {
  const s = findStage(id);
  return s ? (isArabic ? s.arabic : s.name) : id || "";
}

// Exports the meters currently shown (after filters) to an .xlsx file
export function exportDefectsToExcel(meters, isArabic) {
  const L = (ar, en) => (isArabic ? ar : en);

  const rows = meters.map((m) => ({
    [L("الرقم التسلسلي", "Serial Number")]: m.serial_number || "",
    [L("المحطة", "Station")]: stageName(m.stage, isArabic),
    [L("كود العطل", "Defect Code")]: m.defect_code || "",
    [L("الحالة", "Status")]: STATUS_LABELS[m.status]
      ? isArabic
        ? STATUS_LABELS[m.status].ar
        : STATUS_LABELS[m.status].en
      : m.status || "",
    [L("مرات دخول الإصلاح", "Times Entered Repair")]: m.entry_count ?? 1,
    [L("مرات العودة للخط", "Times Returned")]: m.return_count ?? 0,
    [L("سجّله", "Logged By")]: m.logged_by || "",
    [L("وقت التسجيل", "Logged At")]: fmtDateTime(m.logged_at || m.created_at),
    [L("الفني", "Repaired By")]: m.repaired_by || "",
    [L("وقت الإصلاح", "Repaired At")]: fmtDateTime(m.repaired_at),
    [L("الإجراء التصحيحي", "Repair Action")]: m.repair_notes || "",
    [L("محطة العودة", "Returned To")]: m.return_destination ? stageName(m.return_destination, isArabic) : "",
    [L("ملاحظات", "Notes")]: m.notes || "",
  }));

  // Second sheet: every movement in each meter's history
  const historyRows = [];
  meters.forEach((m) => {
    (Array.isArray(m.history) ? m.history : []).forEach((h) => {
      historyRows.push({
        [L("الرقم التسلسلي", "Serial Number")]: m.serial_number || "",
        [L("الدورة", "Cycle")]: h.cycle ?? "",
        [L("الحدث", "Event")]: EVENT_LABELS[h.type] ? (isArabic ? EVENT_LABELS[h.type].ar : EVENT_LABELS[h.type].en) : h.type || "",
        [L("الوقت", "Time")]: fmtDateTime(h.logged_at || h.returned_at || h.scrapped_at || h.at),
        [L("المحطة", "Station")]: h.stage ? stageName(h.stage, isArabic) : "",
        [L("كود العطل", "Defect Code")]: h.defect_code || "",
        [L("بواسطة", "By")]: h.logged_by || h.technician || h.by || "",
        [L("الإجراء", "Action")]: h.action_taken || "",
        [L("محطة العودة", "Returned To")]: h.destination ? stageName(h.destination, isArabic) : "",
        [L("ملاحظات", "Notes")]: h.notes || h.reason || "",
      });
    });
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ [L("لا توجد بيانات", "No data")]: "" }]);
  ws["!cols"] = Object.keys(rows[0] || { a: 1 }).map((k) => ({
    wch: Math.max(12, Math.min(40, k.length + 4, ...rows.map((r) => String(r[k] ?? "").length + 2))),
  }));
  XLSX.utils.book_append_sheet(wb, ws, L("العدادات المعطلة", "Defective Meters"));

  if (historyRows.length) {
    const wsH = XLSX.utils.json_to_sheet(historyRows);
    wsH["!cols"] = Object.keys(historyRows[0]).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, wsH, L("سجل الحركات", "History"));
  }

  if (isArabic) wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.writeFile(wb, `Defective_Meters_${getTodayString()}.xlsx`);
}
