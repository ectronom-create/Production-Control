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
  return s ? (isArabic ? s.arabic : s.name) : String(id || "");
}

// Exports the meters currently shown (after filters) to an .xlsx file
export function exportDefectsToExcel(meters = [], isArabic = false) {
  const L = (ar, en) => (isArabic ? ar : en);
  const safeMeters = Array.isArray(meters) ? meters.filter(Boolean) : [];

  const rows = safeMeters.map((m) => ({
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
  safeMeters.forEach((m) => {
    let hist = m.history;
    if (typeof hist === "string") {
      try {
        hist = JSON.parse(hist);
      } catch (_) {
        hist = [];
      }
    }
    if (Array.isArray(hist)) {
      hist.forEach((h) => {
        if (!h || typeof h !== "object") return;
        historyRows.push({
          [L("الرقم التسلسلي", "Serial Number")]: m.serial_number || "",
          [L("الدورة", "Cycle")]: h.cycle ?? "",
          [L("الحدث", "Event")]: EVENT_LABELS[h.type]
            ? (isArabic ? EVENT_LABELS[h.type].ar : EVENT_LABELS[h.type].en)
            : h.type || "",
          [L("الوقت", "Time")]: fmtDateTime(h.logged_at || h.returned_at || h.scrapped_at || h.at),
          [L("المحطة", "Station")]: h.stage ? stageName(h.stage, isArabic) : "",
          [L("كود العطل", "Defect Code")]: h.defect_code || "",
          [L("بواسطة", "By")]: h.logged_by || h.technician || h.by || "",
          [L("الإجراء", "Action")]: h.action_taken || "",
          [L("محطة العودة", "Returned To")]: h.destination ? stageName(h.destination, isArabic) : "",
          [L("ملاحظات", "Notes")]: h.notes || h.reason || "",
        });
      });
    }
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ [L("لا توجد بيانات", "No data")]: "" }]);
  ws["!cols"] = Object.keys(rows[0] || { a: 1 }).map((k) => {
    const maxLen = rows.reduce((max, r) => Math.max(max, String(r[k] ?? "").length + 2), k.length + 4);
    return { wch: Math.max(12, Math.min(40, maxLen)) };
  });
  XLSX.utils.book_append_sheet(wb, ws, L("العدادات المعطلة", "Defective Meters"));

  if (historyRows.length) {
    const wsH = XLSX.utils.json_to_sheet(historyRows);
    wsH["!cols"] = Object.keys(historyRows[0] || {}).map(() => ({ wch: 20 }));
    // "History" is a reserved sheet name in Excel — SheetJS 0.20+ rejects it.
    XLSX.utils.book_append_sheet(wb, wsH, L("سجل الحركات", "Movement Log"));
  }

  const filename = `Defective_Meters_${getTodayString()}.xlsx`;

  // Universal browser download:
  try {
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    // 1. IE / legacy Edge
    if (typeof window !== "undefined" && window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(blob, filename);
      return;
    }

    // 2. Standard Blob URL download
    if (typeof window !== "undefined" && window.URL && window.URL.createObjectURL) {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } catch (_) {}
      }, 2000);
      return;
    }

    // 3. SheetJS native fallback
    XLSX.writeFile(wb, filename);
  } catch (err) {
    console.warn("Blob export failed, trying XLSX.writeFile:", err);
    XLSX.writeFile(wb, filename);
  }
}
