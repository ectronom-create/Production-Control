import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import {
  DEFAULT_ACTUAL_DEFECTS,
  STORAGE_ACTUAL_KEY,
  LOCAL_DEFECTIVE_METERS_KEY,
} from "../constants/defectStages";
import {
  getTodayDateStr,
  getDaysAgoDateStr,
  getMeterDateStr,
} from "../utils/defectDateUtils";

export function useDefectMetersData(user, isArabic) {
  const isAdmin = user?.access === "admin";
  const isViewer = user?.access === "viewer";

  // ── Tab Navigation ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("TRACKER");

  // ── Tab 1: Defective Meters Tracker State ─────────────────────────────────
  const [defectiveMeters, setDefectiveMeters] = useState([]);
  const [loadingDefects, setLoadingDefects] = useState(true);
  const [isSubmittingDefect, setIsSubmittingDefect] = useState(false);
  const [trackerSuccessMsg, setTrackerSuccessMsg] = useState("");

  // ── Guided Intake Stepper ─────────────────────────────────────────────────
  const [wizardStep, setWizardStep] = useState(1);
  const [scanSerial, setScanSerial] = useState("");
  const [selectedStage, setSelectedStage] = useState("Assembly");
  const [defectCode, setDefectCode] = useState("");
  const [loggedBy, setLoggedBy] = useState(user?.name || "Supervisor");
  const [defectNotes, setDefectNotes] = useState("");

  // ── Filters for Tracker Table ─────────────────────────────────────────────
  const [trackerSearch, setTrackerSearch] = useState("");
  const [trackerStageFilter, setTrackerStageFilter] = useState("ALL");
  const [trackerStatusFilter, setTrackerStatusFilter] = useState("ALL");
  const [onlyRecurringFilter, setOnlyRecurringFilter] = useState(false);
  const [trackerDateMode, setTrackerDateMode] = useState("ALL");
  const [trackerCustomDate, setTrackerCustomDate] = useState(() =>
    getTodayDateStr(),
  );
  const [trackerStartDate, setTrackerStartDate] = useState(() =>
    getDaysAgoDateStr(6),
  );
  const [trackerEndDate, setTrackerEndDate] = useState(() => getTodayDateStr());

  // ── Modals for Tracker ────────────────────────────────────────────────────
  const [repairModalMeter, setRepairModalMeter] = useState(null);
  const [repairTechName, setRepairTechName] = useState(user?.name || "");
  const [repairActionTaken, setRepairActionTaken] = useState("");
  const [repairDestination, setRepairDestination] = useState("Assembly");
  const [isSubmittingRepair, setIsSubmittingRepair] = useState(false);

  const [lifecycleModalMeter, setLifecycleModalMeter] = useState(null);

  // ── Admin Edit Defect Meter State ──────────────────────────────────────────
  const [adminEditModalMeter, setAdminEditModalMeter] = useState(null);
  const [editFormData, setEditFormData] = useState({
    serial_number: "",
    stage: "Assembly",
    defect_code: "",
    status: "UNDER_INSPECTION",
    entry_count: 1,
    return_count: 0,
    logged_by: "",
    notes: "",
    repaired_by: "",
    repair_notes: "",
    return_destination: "",
  });
  const [isSavingAdminEdit, setIsSavingAdminEdit] = useState(false);

  // ── Tab 2: Calibration & Statistical Analytics State ──────────────────────
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [actualTarget, setActualTarget] = useState(() => {
    const saved = localStorage.getItem(STORAGE_ACTUAL_KEY);
    return saved
      ? parseInt(saved, 10) || DEFAULT_ACTUAL_DEFECTS
      : DEFAULT_ACTUAL_DEFECTS;
  });
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(actualTarget));

  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [selectedTeam, setSelectedTeam] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [analyticsDateMode, setAnalyticsDateMode] = useState("ALL");
  const [analyticsCustomDate, setAnalyticsCustomDate] = useState(() =>
    getTodayDateStr(),
  );
  const [analyticsStartDate, setAnalyticsStartDate] = useState(() =>
    getDaysAgoDateStr(6),
  );
  const [analyticsEndDate, setAnalyticsEndDate] = useState(() =>
    getTodayDateStr(),
  );
  const [selectedShiftForModal, setSelectedShiftForModal] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Update logged by default when user is available
  useEffect(() => {
    if (user?.name && loggedBy === "Supervisor") {
      setLoggedBy(user.name);
    }
  }, [user, loggedBy]);

  // ── Load Defective Meters ─────────────────────────────────────────────────
  const fetchDefectiveMeters = useCallback(async () => {
    setLoadingDefects(true);
    try {
      const { data, error } = await supabase
        .from("defective_meters")
        .select("*")
        .order("id", { ascending: false });

      if (error) {
        const local = JSON.parse(
          localStorage.getItem(LOCAL_DEFECTIVE_METERS_KEY) || "[]",
        );
        setDefectiveMeters(local);
      } else {
        setDefectiveMeters(data || []);
        localStorage.setItem(
          LOCAL_DEFECTIVE_METERS_KEY,
          JSON.stringify(data || []),
        );
      }
    } catch {
      const local = JSON.parse(
        localStorage.getItem(LOCAL_DEFECTIVE_METERS_KEY) || "[]",
      );
      setDefectiveMeters(local);
    } finally {
      setLoadingDefects(false);
    }
  }, []);

  // ── Load Production Records for Analytics ─────────────────────────────────
  const fetchProductionRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const { data, error } = await supabase
        .from("production_records")
        .select("*")
        .order("date", { ascending: false })
        .order("id", { ascending: false });

      if (!error && data) {
        setRecords(data);
      }
    } catch (e) {
      console.warn("Could not fetch production records:", e);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    fetchDefectiveMeters();
    fetchProductionRecords();
  }, [fetchDefectiveMeters, fetchProductionRecords]);

  // ── Real-Time Serial Check ────────────────────────────────────────────────
  const detectedPreviousMeter = useMemo(() => {
    const trimmed = scanSerial.trim();
    if (!trimmed) return null;
    return (
      defectiveMeters.find(
        (m) =>
          m.serial_number &&
          m.serial_number.toLowerCase() === trimmed.toLowerCase(),
      ) || null
    );
  }, [scanSerial, defectiveMeters]);

  // ── Strict Cycle Validation ───────────────────────────────────────────────
  const meterBlockReason = useMemo(() => {
    if (!detectedPreviousMeter) return null;

    if (detectedPreviousMeter.status === "SCRAPPED_KO") {
      return {
        type: "SCRAPPED",
        title: isArabic
          ? "🛑 عداد مستبعد نهائياً (Scrap / KO)"
          : "🛑 Permanently Scrapped Meter",
        message: isArabic
          ? `هذا العداد مستبعد نهائياً وتالف دائم ولا يمكن إعادة تسجيله أو إدخاله للإنتاج مجدداً.`
          : `This meter was marked as permanently SCRAPPED/KO and cannot be re-registered in production.`,
        rule: isArabic
          ? "حالة العداد: تالف دائم (Scrapped)"
          : "Status: Permanently Scrapped",
      };
    }

    const isRepairedAndReturned =
      detectedPreviousMeter.status === "RETURNED_TO_LINE" ||
      (detectedPreviousMeter.return_count || 0) >=
        (detectedPreviousMeter.entry_count || 1);

    if (!isRepairedAndReturned) {
      return {
        type: "PENDING_REPAIR",
        title: isArabic
          ? "🛑 غير مسموح بالتسجيل: العداد بانتظار الصيانة والإصلاح!"
          : "🛑 Registration Blocked: Meter Pending Repair!",
        message: isArabic
          ? `العداد مسجل مسبقاً في محطة (${detectedPreviousMeter.stage}) بكود (${detectedPreviousMeter.defect_code}) ولم تتم صيانته بعد.`
          : `Meter is already logged at (${detectedPreviousMeter.stage}) with code (${detectedPreviousMeter.defect_code}) and has not been repaired yet.`,
        rule: isArabic
          ? "التسلسل الإلزامي هو: (تسجيل عطل ← صيانة وإصلاح ← تسجيل عطل). يجب إتمام الصيانة والإعادة لخط الإنتاج أولاً قبل تسجيل أي عطل جديد."
          : "Strict sequence rule: (Defect Entry -> Repair & Return -> Next Defect Entry). You must complete repair and return before logging another defect.",
      };
    }

    return null;
  }, [detectedPreviousMeter, isArabic]);

  // ── Register Defective Meter ──────────────────────────────────────────────
  const handleRegisterDefective = async (e) => {
    if (e) e.preventDefault();
    if (isViewer) {
      alert("Viewers have read-only access.");
      return;
    }

    const cleanSerial = scanSerial.trim();
    if (!cleanSerial) {
      alert(
        isArabic
          ? "يرجى إدخال أو مسح سيريال العداد أولاً."
          : "Please enter or scan meter serial number.",
      );
      setWizardStep(1);
      return;
    }

    if (meterBlockReason) {
      alert(
        `${meterBlockReason.title}\n\n${meterBlockReason.message}\n\n${meterBlockReason.rule || ""}`,
      );
      setWizardStep(1);
      return;
    }

    if (!defectCode.trim()) {
      alert(
        isArabic
          ? "يرجى إدخال أو اختيار كود العطل (أو 0 للأسمبلي خارج نظام التتبع)."
          : "Please enter or select a defect code (or 0 for Assembly without Traceability).",
      );
      setWizardStep(3);
      return;
    }

    setIsSubmittingDefect(true);
    setTrackerSuccessMsg("");

    const nowIso = new Date().toISOString();
    let updatedMeterRecord = null;
    let isRecurring = false;

    if (detectedPreviousMeter) {
      isRecurring = true;
      const nextEntryCount = (detectedPreviousMeter.entry_count || 1) + 1;
      const historyList = Array.isArray(detectedPreviousMeter.history)
        ? [...detectedPreviousMeter.history]
        : [];

      historyList.push({
        cycle: nextEntryCount,
        type: "ENTRY",
        stage: selectedStage,
        defect_code: defectCode.trim(),
        logged_by: loggedBy.trim() || "Supervisor",
        logged_at: nowIso,
        notes: defectNotes.trim(),
      });

      updatedMeterRecord = {
        ...detectedPreviousMeter,
        stage: selectedStage,
        defect_code: defectCode.trim(),
        logged_by: loggedBy.trim() || "Supervisor",
        logged_at: nowIso,
        status: "UNDER_INSPECTION",
        entry_count: nextEntryCount,
        notes: defectNotes.trim() || detectedPreviousMeter.notes,
        history: historyList,
        updated_at: nowIso,
      };
    } else {
      updatedMeterRecord = {
        serial_number: cleanSerial,
        stage: selectedStage,
        defect_code: defectCode.trim(),
        logged_by: loggedBy.trim() || "Supervisor",
        logged_at: nowIso,
        status: "UNDER_INSPECTION",
        entry_count: 1,
        return_count: 0,
        repair_notes: "",
        repaired_by: "",
        repaired_at: null,
        return_destination: "",
        notes: defectNotes.trim(),
        history: [
          {
            cycle: 1,
            type: "ENTRY",
            stage: selectedStage,
            defect_code: defectCode.trim(),
            logged_by: loggedBy.trim() || "Supervisor",
            logged_at: nowIso,
            notes: defectNotes.trim(),
          },
        ],
        created_at: nowIso,
        updated_at: nowIso,
      };
    }

    try {
      if (detectedPreviousMeter?.id) {
        const { error } = await supabase
          .from("defective_meters")
          .update(updatedMeterRecord)
          .eq("id", detectedPreviousMeter.id);

        if (error) throw error;
        setDefectiveMeters((prev) =>
          prev.map((m) =>
            m.id === detectedPreviousMeter.id ? updatedMeterRecord : m,
          ),
        );
      } else {
        const { data, error } = await supabase
          .from("defective_meters")
          .insert([updatedMeterRecord])
          .select();

        if (error) throw error;
        const saved =
          data && data[0] ? data[0] : { ...updatedMeterRecord, id: Date.now() };
        setDefectiveMeters((prev) => [saved, ...prev]);
      }
    } catch {
      const fallbackId = detectedPreviousMeter?.id || Date.now();
      const finalLocalRecord = { ...updatedMeterRecord, id: fallbackId };
      const nextList = detectedPreviousMeter
        ? defectiveMeters.map((m) =>
            m.id === detectedPreviousMeter.id ? finalLocalRecord : m,
          )
        : [finalLocalRecord, ...defectiveMeters];

      setDefectiveMeters(nextList);
      localStorage.setItem(
        LOCAL_DEFECTIVE_METERS_KEY,
        JSON.stringify(nextList),
      );
    } finally {
      setIsSubmittingDefect(false);
      setScanSerial("");
      setDefectNotes("");
      setDefectCode("");
      setWizardStep(1);
      setTrackerSuccessMsg(
        isRecurring
          ? isArabic
            ? `⚠️ تم تسجيل دخول مكرر للعداد (${cleanSerial}) للمرة (${updatedMeterRecord.entry_count}) كود (${defectCode}) في محطة (${selectedStage})!`
            : `⚠️ Recurring defect entry recorded for (${cleanSerial}) - Cycle #${updatedMeterRecord.entry_count} at (${selectedStage})!`
          : isArabic
            ? `✅ تم تسجيل العداد (${cleanSerial}) بنجاح في مرحلة (${selectedStage}) بكود (${defectCode}).`
            : `✅ Meter (${cleanSerial}) logged successfully at (${selectedStage}) with code (${defectCode}).`,
      );
      setTimeout(() => setTrackerSuccessMsg(""), 6000);
    }
  };

  // ── Open Repair Modal ─────────────────────────────────────────────────────
  const openRepairModal = (meter) => {
    setRepairModalMeter(meter);
    setRepairTechName(user?.name || "");
    setRepairActionTaken("");
    setRepairDestination(meter.stage || "Assembly");
  };

  // ── Confirm Repair & Return ───────────────────────────────────────────────
  const handleConfirmRepair = async () => {
    if (!repairModalMeter) return;
    if (!repairActionTaken.trim()) {
      alert(
        isArabic
          ? "يرجى توضيح الإجراء التصحيحي أو القطع المستبدلة."
          : "Please enter repair action or replaced components.",
      );
      return;
    }

    setIsSubmittingRepair(true);
    const nowIso = new Date().toISOString();
    const nextReturnCount = (repairModalMeter.return_count || 0) + 1;
    const historyList = Array.isArray(repairModalMeter.history)
      ? [...repairModalMeter.history]
      : [];

    historyList.push({
      cycle: repairModalMeter.entry_count || 1,
      type: "RETURN_TO_LINE",
      technician: repairTechName.trim() || "Technician",
      action_taken: repairActionTaken.trim(),
      destination: repairDestination,
      returned_at: nowIso,
    });

    const updated = {
      ...repairModalMeter,
      status: "RETURNED_TO_LINE",
      return_count: nextReturnCount,
      repaired_by: repairTechName.trim() || "Technician",
      repair_notes: repairActionTaken.trim(),
      repaired_at: nowIso,
      return_destination: repairDestination,
      history: historyList,
      updated_at: nowIso,
    };

    try {
      const { error } = await supabase
        .from("defective_meters")
        .update(updated)
        .eq("id", repairModalMeter.id);

      if (error) throw error;

      setDefectiveMeters((prev) =>
        prev.map((m) => (m.id === repairModalMeter.id ? updated : m)),
      );
    } catch {
      const nextList = defectiveMeters.map((m) =>
        m.id === repairModalMeter.id ? updated : m,
      );
      setDefectiveMeters(nextList);
      localStorage.setItem(
        LOCAL_DEFECTIVE_METERS_KEY,
        JSON.stringify(nextList),
      );
    } finally {
      setIsSubmittingRepair(false);
      setRepairModalMeter(null);
      setTrackerSuccessMsg(
        isArabic
          ? `✅ تم توثيق إصلاح العداد (${repairModalMeter.serial_number}) وإعادته لخط الإنتاج بنجاح (خروج رقم ${nextReturnCount}).`
          : `✅ Meter (${repairModalMeter.serial_number}) marked as repaired & returned to line (Return #${nextReturnCount}).`,
      );
      setTimeout(() => setTrackerSuccessMsg(""), 6000);
    }
  };

  // ── Scrap / KO Action ─────────────────────────────────────────────────────
  const handleScrapMeter = async (meter) => {
    const confirmMsg = isArabic
      ? `هل أنت متأكد من استبعاد العداد (${meter.serial_number}) نهائياً كـ (Scrap / تالف دائم غير قابل للإصلاح)؟`
      : `Are you sure you want to mark meter (${meter.serial_number}) as permanently Scrapped / KO?`;

    if (!window.confirm(confirmMsg)) return;

    const nowIso = new Date().toISOString();
    const historyList = Array.isArray(meter.history) ? [...meter.history] : [];
    historyList.push({
      cycle: meter.entry_count || 1,
      type: "SCRAP_KO",
      reason: "Permanently unrepairable / scrapped after inspection",
      by: user?.name || "Supervisor",
      at: nowIso,
    });

    const updated = {
      ...meter,
      status: "SCRAPPED_KO",
      history: historyList,
      updated_at: nowIso,
    };

    try {
      await supabase
        .from("defective_meters")
        .update(updated)
        .eq("id", meter.id);
    } catch (e) {
      console.warn("Scrap update error:", e);
    }

    const nextList = defectiveMeters.map((m) =>
      m.id === meter.id ? updated : m,
    );
    setDefectiveMeters(nextList);
    localStorage.setItem(LOCAL_DEFECTIVE_METERS_KEY, JSON.stringify(nextList));
  };

  // ── Delete Defect Record ──────────────────────────────────────────────────
  const handleDeleteMeter = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm("Delete this defective meter record completely?"))
      return;

    try {
      await supabase.from("defective_meters").delete().eq("id", id);
    } catch (e) {
      console.warn("Delete error:", e);
    }

    const nextList = defectiveMeters.filter((m) => m.id !== id);
    setDefectiveMeters(nextList);
    localStorage.setItem(LOCAL_DEFECTIVE_METERS_KEY, JSON.stringify(nextList));
  };

  // ── Admin Edit Modal Functions ────────────────────────────────────────────
  const openAdminEditModal = (meter) => {
    if (!isAdmin) return;
    setAdminEditModalMeter(meter);
    setEditFormData({
      serial_number: meter.serial_number || "",
      stage: meter.stage || "Assembly",
      defect_code: meter.defect_code || "",
      status: meter.status || "UNDER_INSPECTION",
      entry_count: meter.entry_count || 1,
      return_count: meter.return_count || 0,
      logged_by: meter.logged_by || "",
      notes: meter.notes || "",
      repaired_by: meter.repaired_by || "",
      repair_notes: meter.repair_notes || "",
      return_destination: meter.return_destination || "",
    });
  };

  const handleSaveAdminEdit = async () => {
    if (!adminEditModalMeter || !isAdmin) return;
    const cleanSerial = editFormData.serial_number.trim();
    if (!cleanSerial) {
      alert(
        isArabic
          ? "يرجى إدخال سيريال العداد."
          : "Please enter meter serial number.",
      );
      return;
    }
    if (!editFormData.defect_code.trim()) {
      alert(isArabic ? "يرجى إدخال كود العطل." : "Please enter defect code.");
      return;
    }

    setIsSavingAdminEdit(true);
    const nowIso = new Date().toISOString();

    const updatedRecord = {
      ...adminEditModalMeter,
      serial_number: cleanSerial,
      stage: editFormData.stage,
      defect_code: editFormData.defect_code.trim(),
      status: editFormData.status,
      entry_count: parseInt(editFormData.entry_count, 10) || 1,
      return_count: parseInt(editFormData.return_count, 10) || 0,
      logged_by: editFormData.logged_by.trim() || "Supervisor",
      notes: editFormData.notes.trim(),
      repaired_by: editFormData.repaired_by.trim(),
      repair_notes: editFormData.repair_notes.trim(),
      return_destination: editFormData.return_destination,
      updated_at: nowIso,
    };

    try {
      const { error } = await supabase
        .from("defective_meters")
        .update(updatedRecord)
        .eq("id", adminEditModalMeter.id);

      if (error) throw error;

      setDefectiveMeters((prev) =>
        prev.map((m) => (m.id === adminEditModalMeter.id ? updatedRecord : m)),
      );
    } catch {
      const nextList = defectiveMeters.map((m) =>
        m.id === adminEditModalMeter.id ? updatedRecord : m,
      );
      setDefectiveMeters(nextList);
      localStorage.setItem(
        LOCAL_DEFECTIVE_METERS_KEY,
        JSON.stringify(nextList),
      );
    } finally {
      setIsSavingAdminEdit(false);
      setAdminEditModalMeter(null);
      setTrackerSuccessMsg(
        isArabic
          ? `✅ تم تعديل بيانات العداد (${cleanSerial}) بنجاح بواسطة الأدمن.`
          : `✅ Defective meter (${cleanSerial}) updated successfully by Admin.`,
      );
      setTimeout(() => setTrackerSuccessMsg(""), 5000);
    }
  };

  // ── Filtered Defective Meters List ────────────────────────────────────────
  const filteredDefectiveMeters = useMemo(() => {
    const todayStr = getTodayDateStr();
    const weekStartStr = getDaysAgoDateStr(6);

    return defectiveMeters.filter((m) => {
      const q = trackerSearch.trim().toLowerCase();
      const matchSearch =
        q === "" ||
        (m.serial_number && m.serial_number.toLowerCase().includes(q)) ||
        (m.defect_code && m.defect_code.toLowerCase().includes(q)) ||
        (m.logged_by && m.logged_by.toLowerCase().includes(q)) ||
        (m.repaired_by && m.repaired_by.toLowerCase().includes(q));

      const matchStage =
        trackerStageFilter === "ALL" || m.stage === trackerStageFilter;
      const matchStatus =
        trackerStatusFilter === "ALL" || m.status === trackerStatusFilter;
      const matchRecurring = !onlyRecurringFilter || m.entry_count > 1;

      const meterDateStr = getMeterDateStr(m);
      let matchDate = true;
      if (trackerDateMode === "TODAY") {
        matchDate = meterDateStr === todayStr;
      } else if (trackerDateMode === "WEEK") {
        matchDate = meterDateStr >= weekStartStr && meterDateStr <= todayStr;
      } else if (trackerDateMode === "CUSTOM_DATE") {
        matchDate = !trackerCustomDate || meterDateStr === trackerCustomDate;
      } else if (trackerDateMode === "RANGE") {
        if (trackerStartDate && trackerEndDate) {
          matchDate =
            meterDateStr >= trackerStartDate && meterDateStr <= trackerEndDate;
        } else if (trackerStartDate) {
          matchDate = meterDateStr >= trackerStartDate;
        } else if (trackerEndDate) {
          matchDate = meterDateStr <= trackerEndDate;
        }
      }

      return (
        matchSearch && matchStage && matchStatus && matchRecurring && matchDate
      );
    });
  }, [
    defectiveMeters,
    trackerSearch,
    trackerStageFilter,
    trackerStatusFilter,
    onlyRecurringFilter,
    trackerDateMode,
    trackerCustomDate,
    trackerStartDate,
    trackerEndDate,
  ]);

  // ── Tracker KPI Totals ────────────────────────────────────────────────────
  const trackerKPIs = useMemo(() => {
    const isFiltered =
      trackerDateMode !== "ALL" ||
      trackerStageFilter !== "ALL" ||
      trackerStatusFilter !== "ALL" ||
      onlyRecurringFilter ||
      trackerSearch.trim() !== "";
    const targetList = filteredDefectiveMeters;

    const total = targetList.length;
    let underInspection = 0;
    let returnedToLine = 0;
    let scrapped = 0;
    let recurringCount = 0;

    targetList.forEach((m) => {
      if (m.status === "UNDER_INSPECTION" || m.status === "IN_REPAIR")
        underInspection++;
      else if (m.status === "RETURNED_TO_LINE") returnedToLine++;
      else if (m.status === "SCRAPPED_KO") scrapped++;

      if (m.entry_count > 1) recurringCount++;
    });

    const repairRate =
      total > 0 ? Math.round((returnedToLine / total) * 100) : 0;

    return {
      total,
      allLifetimeTotal: defectiveMeters.length,
      isFiltered,
      underInspection,
      returnedToLine,
      scrapped,
      recurringCount,
      repairRate,
    };
  }, [
    filteredDefectiveMeters,
    defectiveMeters.length,
    trackerDateMode,
    trackerStageFilter,
    trackerStatusFilter,
    onlyRecurringFilter,
    trackerSearch,
  ]);

  // ── Tab 2 Analytics Calculations ──────────────────────────────────────────
  const getRecordReportedKO = useCallback((rec) => {
    if (!Array.isArray(rec.stations) || rec.stations.length === 0) {
      const tb = parseInt(rec.total_boards, 10) || 0;
      const ach = parseInt(rec.achieved, 10) || 0;
      return Math.max(0, tb - ach);
    }
    return rec.stations.reduce((sum, st) => {
      const nbB = parseInt(st.nbBoards, 10) || 0;
      const nbOk = parseInt(st.nbBoardsOK, 10) || 0;
      return sum + Math.max(0, nbB - nbOk);
    }, 0);
  }, []);

  const overallMetrics = useMemo(() => {
    let totalReportedKOAll = 0;
    let totalBoardsAll = 0;
    let totalAchievedAll = 0;

    records.forEach((r) => {
      totalReportedKOAll += getRecordReportedKO(r);
      totalBoardsAll += parseInt(r.total_boards, 10) || 0;
      totalAchievedAll += parseInt(r.achieved, 10) || 0;
    });

    const liveDefectsLogged = defectiveMeters.length;
    const totalActualDefects = actualTarget + liveDefectsLogged;

    const calibrationRatio =
      totalReportedKOAll > 0 ? totalActualDefects / totalReportedKOAll : 0;
    const totalRepairedFromKOAll = Math.max(
      0,
      totalReportedKOAll - totalActualDefects,
    );
    const repairRateOverallPct =
      totalReportedKOAll > 0
        ? (totalRepairedFromKOAll / totalReportedKOAll) * 100
        : 0;

    return {
      totalReportedKOAll,
      totalBoardsAll,
      totalAchievedAll,
      baseActualDefects: actualTarget,
      liveDefectsLogged,
      totalActualDefects,
      calibrationRatio,
      totalRepairedFromKOAll,
      repairRateOverallPct,
    };
  }, [records, actualTarget, defectiveMeters, getRecordReportedKO]);

  const availableMonths = useMemo(() => {
    const set = new Set();
    records.forEach((r) => {
      if (r.date && r.date.length >= 7) set.add(r.date.substring(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [records]);

  const calibratedRecords = useMemo(() => {
    return records.map((r) => {
      const tb = parseInt(r.total_boards, 10) || 0;
      const ach = parseInt(r.achieved, 10) || 0;
      const reportedKO = getRecordReportedKO(r);
      const estimatedActual = Math.round(
        reportedKO * overallMetrics.calibrationRatio,
      );
      const repairedMeters = Math.max(0, reportedKO - estimatedActual);
      const shiftRepairPct =
        reportedKO > 0 ? (repairedMeters / reportedKO) * 100 : 0;

      return {
        ...r,
        tb,
        ach,
        reportedKO,
        estimatedActual,
        repairedMeters,
        shiftRepairPct,
      };
    });
  }, [records, overallMetrics.calibrationRatio, getRecordReportedKO]);

  const filteredRecords = useMemo(() => {
    const todayStr = getTodayDateStr();
    const weekStartStr = getDaysAgoDateStr(6);

    return calibratedRecords.filter((r) => {
      const matchMonth =
        selectedMonth === "ALL" || (r.date && r.date.startsWith(selectedMonth));
      const matchTeam = selectedTeam === "ALL" || r.team_name === selectedTeam;
      const matchSearch =
        searchQuery.trim() === "" ||
        (r.team_name &&
          r.team_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.date && r.date.includes(searchQuery.trim())) ||
        (r.notes && r.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchDate = true;
      if (analyticsDateMode === "TODAY") {
        matchDate = r.date === todayStr;
      } else if (analyticsDateMode === "WEEK") {
        matchDate = r.date >= weekStartStr && r.date <= todayStr;
      } else if (analyticsDateMode === "CUSTOM_DATE") {
        matchDate = !analyticsCustomDate || r.date === analyticsCustomDate;
      } else if (analyticsDateMode === "RANGE") {
        if (analyticsStartDate && analyticsEndDate) {
          matchDate =
            r.date >= analyticsStartDate && r.date <= analyticsEndDate;
        } else if (analyticsStartDate) {
          matchDate = r.date >= analyticsStartDate;
        } else if (analyticsEndDate) {
          matchDate = r.date <= analyticsEndDate;
        }
      }

      return matchMonth && matchTeam && matchSearch && matchDate;
    });
  }, [
    calibratedRecords,
    selectedMonth,
    selectedTeam,
    searchQuery,
    analyticsDateMode,
    analyticsCustomDate,
    analyticsStartDate,
    analyticsEndDate,
  ]);

  const handleSaveTarget = () => {
    const parsed = parseInt(targetInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setActualTarget(parsed);
      localStorage.setItem(STORAGE_ACTUAL_KEY, String(parsed));
      setIsEditingTarget(false);
    } else {
      alert(
        "Please enter a valid positive number for actual defective meters.",
      );
    }
  };

  const handleResetTarget = () => {
    setActualTarget(DEFAULT_ACTUAL_DEFECTS);
    setTargetInput(String(DEFAULT_ACTUAL_DEFECTS));
    localStorage.removeItem(STORAGE_ACTUAL_KEY);
    setIsEditingTarget(false);
  };

  return {
    isAdmin,
    isViewer,
    activeTab,
    setActiveTab,
    // Intake
    wizardStep,
    setWizardStep,
    scanSerial,
    setScanSerial,
    selectedStage,
    setSelectedStage,
    defectCode,
    setDefectCode,
    isSubmittingDefect,
    trackerSuccessMsg,
    detectedPreviousMeter,
    meterBlockReason,
    handleRegisterDefective,
    // Tracker Table & Filters
    defectiveMeters,
    loadingDefects,
    filteredDefectiveMeters,
    trackerKPIs,
    trackerSearch,
    setTrackerSearch,
    trackerStageFilter,
    setTrackerStageFilter,
    trackerStatusFilter,
    setTrackerStatusFilter,
    onlyRecurringFilter,
    setOnlyRecurringFilter,
    trackerDateMode,
    setTrackerDateMode,
    trackerCustomDate,
    setTrackerCustomDate,
    trackerStartDate,
    setTrackerStartDate,
    trackerEndDate,
    setTrackerEndDate,
    handleScrapMeter,
    handleDeleteMeter,
    // Repair Modal
    repairModalMeter,
    setRepairModalMeter,
    repairTechName,
    setRepairTechName,
    repairActionTaken,
    setRepairActionTaken,
    repairDestination,
    setRepairDestination,
    isSubmittingRepair,
    openRepairModal,
    handleConfirmRepair,
    // Lifecycle Modal
    lifecycleModalMeter,
    setLifecycleModalMeter,
    // Admin Edit Modal
    adminEditModalMeter,
    setAdminEditModalMeter,
    editFormData,
    setEditFormData,
    isSavingAdminEdit,
    openAdminEditModal,
    handleSaveAdminEdit,
    // Analytics
    records,
    loadingRecords,
    fetchProductionRecords,
    overallMetrics,
    actualTarget,
    isEditingTarget,
    setIsEditingTarget,
    targetInput,
    setTargetInput,
    handleSaveTarget,
    handleResetTarget,
    searchQuery,
    setSearchQuery,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    analyticsDateMode,
    setAnalyticsDateMode,
    analyticsCustomDate,
    setAnalyticsCustomDate,
    analyticsStartDate,
    setAnalyticsStartDate,
    analyticsEndDate,
    setAnalyticsEndDate,
    filteredRecords,
    selectedShiftForModal,
    setSelectedShiftForModal,
    // Report Modal
    showReportModal,
    setShowReportModal,
  };
}
