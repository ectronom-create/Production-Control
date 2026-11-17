import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import {
  CHECKLIST_ITEMS,
  LOCAL_STORAGE_KEY,
  CHECKLIST_FORM_NO,
  CREW_FORM_NO,
  getInitialShift,
} from "../constants/checklistData";
import { getTodayString, toLocalDateStr } from "../utils/date";

// Night shift after midnight still belongs to the previous day's date
function getInitialDate() {
  const now = new Date();
  if (now.getHours() < 6) {
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 1);
    return toLocalDateStr(prev);
  }
  return getTodayString();
}

function emptyItems() {
  const m = {};
  CHECKLIST_ITEMS.forEach((it) => {
    m[it.id] = { status: "PENDING", note: "" };
  });
  return m;
}

function parseSupervisor(teamName) {
  try {
    return JSON.parse(teamName)?.supervisor || "";
  } catch {
    return "";
  }
}

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function usePreProductionChecklistData(user) {
  const isAdmin = user?.access === "admin";
  const isSupervisor = user?.access === "supervisor";

  // ── Form header ──
  const [activeDate, setActiveDate] = useState(getInitialDate);
  const [activeShift, setActiveShift] = useState(getInitialShift);
  const [supervisorName, setSupervisorName] = useState(user?.name || "");
  const [generalNotes, setGeneralNotes] = useState("");

  // ── Checklist items: { [itemId]: { status: PASS|FAIL|PENDING, note } } ──
  const [itemStatuses, setItemStatuses] = useState(emptyItems);

  // ── People ──
  const [allOperators, setAllOperators] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  // attendance: { [operatorId]: { status: PRESENT|LATE|ABSENT, reason } }
  const [attendance, setAttendance] = useState({});

  // ── History ──
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', text }
  const [printRecord, setPrintRecord] = useState(undefined); // undefined = closed, null = current form

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  // Load operators & supervisors once
  useEffect(() => {
    supabase
      .from("users")
      .select("id,name,company_id,access,team_name")
      .in("access", ["operator", "supervisor"])
      .order("name")
      .then(({ data }) => {
        const rows = data || [];
        setAllOperators(rows.filter((u) => u.access === "operator"));
        setSupervisors(rows.filter((u) => u.access === "supervisor"));
      });
  }, []);

  // Supervisors always work on their own team
  useEffect(() => {
    if (isSupervisor && user?.name) setSupervisorName(user.name);
  }, [isSupervisor, user]);

  // Admin with no supervisor chosen → default to first supervisor
  useEffect(() => {
    if (isAdmin && !supervisorName && supervisors.length) {
      setSupervisorName(supervisors[0].name);
    }
  }, [isAdmin, supervisorName, supervisors]);

  // Operators that belong to the selected supervisor
  const teamOperators = useMemo(() => {
    const key = (supervisorName || "").trim().toLowerCase();
    return allOperators.filter(
      (op) => parseSupervisor(op.team_name).trim().toLowerCase() === key,
    );
  }, [allOperators, supervisorName]);

  // Attendance list joined with operator info
  const attendanceList = useMemo(
    () =>
      teamOperators.map((op) => ({
        id: op.id,
        name: op.name,
        company_id: op.company_id,
        status: attendance[op.id]?.status || "UNMARKED",
        reason: attendance[op.id]?.reason || "",
      })),
    [teamOperators, attendance],
  );

  const attendanceStats = useMemo(() => {
    const s = { total: attendanceList.length, present: 0, late: 0, absent: 0, unmarked: 0 };
    attendanceList.forEach((a) => {
      if (a.status === "PRESENT") s.present++;
      else if (a.status === "LATE") s.late++;
      else if (a.status === "ABSENT") s.absent++;
      else s.unmarked++;
    });
    return s;
  }, [attendanceList]);

  const setOperatorStatus = (opId, status) =>
    setAttendance((prev) => ({
      ...prev,
      [opId]: { status, reason: status === "PRESENT" ? "" : prev[opId]?.reason || "" },
    }));

  const setOperatorReason = (opId, reason) =>
    setAttendance((prev) => ({
      ...prev,
      [opId]: { status: prev[opId]?.status || "ABSENT", reason },
    }));

  const markRestPresent = () =>
    setAttendance((prev) => {
      const next = { ...prev };
      teamOperators.forEach((op) => {
        if (!next[op.id]?.status) next[op.id] = { status: "PRESENT", reason: "" };
      });
      return next;
    });

  // ── History ──
  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pre_production_checklists")
        .select("*")
        .neq("form_no", CREW_FORM_NO)
        .order("date", { ascending: false })
        .order("id", { ascending: false });
      if (error) throw error;
      setHistoryRecords(data || []);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data || []));
    } catch {
      setHistoryRecords(readLocal().filter((r) => r.form_no !== CREW_FORM_NO));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // The saved record (if any) for the selected date + shift + supervisor
  const existingRecord = useMemo(
    () =>
      historyRecords.find(
        (r) =>
          r.date === activeDate &&
          r.shift === activeShift &&
          (r.supervisor || "").trim().toLowerCase() ===
            (supervisorName || "").trim().toLowerCase(),
      ) || null,
    [historyRecords, activeDate, activeShift, supervisorName],
  );

  // When switching date / shift / supervisor, show what was already saved (or a blank form)
  const existingId = existingRecord?.id;
  useEffect(() => {
    if (existingRecord) {
      const details = existingRecord.item_details || {};
      const items = emptyItems();
      CHECKLIST_ITEMS.forEach((it) => {
        const v = details[it.id];
        if (v && typeof v === "object") {
          items[it.id] = { status: v.status || "PENDING", note: v.note || "" };
        }
      });
      setItemStatuses(items);
      const att = {};
      (details.attendance || details["chk-0"]?.attendance || []).forEach((a) => {
        if (a?.id != null && a.status && a.status !== "UNMARKED") {
          att[a.id] = { status: a.status, reason: a.reason || "" };
        }
      });
      setAttendance(att);
      setGeneralNotes(existingRecord.general_notes || "");
    } else {
      setItemStatuses(emptyItems());
      setAttendance({});
      setGeneralNotes("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingId, activeDate, activeShift, supervisorName]);

  // ── Items ──
  const setItemStatus = (itemId, status) =>
    setItemStatuses((prev) => ({ ...prev, [itemId]: { ...prev[itemId], status } }));

  const setItemNote = (itemId, note) =>
    setItemStatuses((prev) => ({ ...prev, [itemId]: { ...prev[itemId], note } }));

  const markAllDone = () =>
    setItemStatuses((prev) => {
      const next = { ...prev };
      CHECKLIST_ITEMS.forEach((it) => {
        if (next[it.id].status === "PENDING") next[it.id] = { ...next[it.id], status: "PASS" };
      });
      return next;
    });

  // ── Overall status: READY / NOT_READY / INCOMPLETE ──
  const stats = useMemo(() => {
    const total = CHECKLIST_ITEMS.length;
    let passed = 0;
    let failed = 0;
    CHECKLIST_ITEMS.forEach((it) => {
      const st = itemStatuses[it.id]?.status;
      if (st === "PASS") passed++;
      else if (st === "FAIL") failed++;
    });
    const pending = total - passed - failed;
    // Stored values kept compatible with older records
    const overallStatus =
      failed > 0 ? "CRITICAL_BLOCKER" : pending === 0 ? "LINE_CLEARED_PASS" : "IN_PROGRESS";
    return {
      total,
      passed,
      failed,
      pending,
      checked: passed + failed,
      readinessPct: total ? Math.round((passed / total) * 100) : 0,
      overallStatus,
    };
  }, [itemStatuses]);

  // ── Save (one record per date + shift + supervisor; re-saving updates it) ──
  const validate = (isArabic) => {
    const missingNote = CHECKLIST_ITEMS.find(
      (it) => itemStatuses[it.id]?.status === "FAIL" && !itemStatuses[it.id]?.note?.trim(),
    );
    if (missingNote) {
      return isArabic
        ? `اكتب وصف المشكلة في البند: ${missingNote.arabicTitle}`
        : `Describe the problem for: ${missingNote.title}`;
    }
    const absentNoReason = attendanceList.find((a) => a.status === "ABSENT" && !a.reason.trim());
    if (absentNoReason) {
      return isArabic
        ? `اكتب سبب غياب ${absentNoReason.name}`
        : `Enter an absence reason for ${absentNoReason.name}`;
    }
    return "";
  };

  const handleSave = async (isArabic) => {
    const err = validate(isArabic);
    if (err) {
      showToast("error", err);
      return;
    }
    if (!supervisorName.trim()) {
      showToast("error", isArabic ? "اختر المشرف." : "Select a supervisor.");
      return;
    }

    setIsSaving(true);
    const payload = {
      form_no: CHECKLIST_FORM_NO,
      rev: "01",
      date: activeDate,
      shift: activeShift,
      supervisor: supervisorName.trim(),
      status: stats.overallStatus,
      readiness_pct: stats.readinessPct,
      passed_count: stats.passed,
      failed_count: stats.failed,
      total_items: stats.total,
      item_details: {
        ...itemStatuses,
        attendance: attendanceList.map(({ id, name, company_id, status, reason }) => ({
          id,
          name,
          company_id,
          status,
          reason,
        })),
      },
      general_notes: generalNotes.trim(),
    };

    try {
      let saved;
      if (existingRecord && typeof existingRecord.id === "number" && existingRecord.id < 1e12) {
        const { data, error } = await supabase
          .from("pre_production_checklists")
          .update(payload)
          .eq("id", existingRecord.id)
          .select();
        if (error) throw error;
        saved = data?.[0] || { ...existingRecord, ...payload };
      } else {
        const { data, error } = await supabase
          .from("pre_production_checklists")
          .insert([{ ...payload, created_at: new Date().toISOString() }])
          .select();
        if (error) throw error;
        saved = data?.[0] || { ...payload, id: Date.now() };
      }
      setHistoryRecords((prev) => {
        const next = [saved, ...prev.filter((r) => r.id !== saved.id && r.id !== existingRecord?.id)];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      showToast(
        "success",
        isArabic ? "تم حفظ الفحص بنجاح." : "Checklist saved successfully.",
      );
    } catch (e) {
      console.warn("Checklist save error:", e);
      showToast(
        "error",
        isArabic
          ? "تعذر الحفظ — تحقق من الاتصال وحاول مرة أخرى."
          : "Save failed — check the connection and try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHistory = async (id, isArabic) => {
    if (!isAdmin) return;
    if (!window.confirm(isArabic ? "حذف هذا السجل؟" : "Delete this record?")) return;
    const { error } = await supabase.from("pre_production_checklists").delete().eq("id", id);
    if (error) {
      showToast("error", isArabic ? "تعذر الحذف." : "Delete failed.");
      return;
    }
    setHistoryRecords((prev) => {
      const next = prev.filter((r) => r.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const openRecord = (rec) => {
    setActiveDate(rec.date);
    setActiveShift(rec.shift);
    if (isAdmin) setSupervisorName(rec.supervisor || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return {
    isAdmin,
    isSupervisor,
    activeDate,
    setActiveDate,
    activeShift,
    setActiveShift,
    supervisorName,
    setSupervisorName,
    supervisors,
    generalNotes,
    setGeneralNotes,
    itemStatuses,
    setItemStatus,
    setItemNote,
    markAllDone,
    attendanceList,
    attendanceStats,
    setOperatorStatus,
    setOperatorReason,
    markRestPresent,
    stats,
    existingRecord,
    historyRecords,
    loading,
    isSaving,
    toast,
    handleSave,
    handleDeleteHistory,
    openRecord,
    printRecord,
    setPrintRecord,
  };
}
