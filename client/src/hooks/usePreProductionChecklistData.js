import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import {
  CHECKLIST_ITEMS,
  LOCAL_STORAGE_KEY,
  getTodayString,
  getInitialShift,
} from "../constants/checklistData";

export function usePreProductionChecklistData(user, isArabic) {
  const isViewer = user?.access === "viewer";
  const isAdmin = user?.access === "admin";

  // Official Form Header Fields
  const [activeDate, setActiveDate] = useState(getTodayString());
  const [activeShift, setActiveShift] = useState(getInitialShift());
  const [supervisorName, setSupervisorName] = useState(
    user?.name || "Supervisor",
  );
  const [generalNotes, setGeneralNotes] = useState("");

  // Station filter
  const [stationFilter, setStationFilter] = useState("ALL");

  // Expanded details cards state
  const [expandedDetails, setExpandedDetails] = useState(() => {
    const exp = {};
    CHECKLIST_ITEMS.forEach((it) => {
      exp[it.id] = false;
    });
    return exp;
  });

  // Status mapping
  const [itemStatuses, setItemStatuses] = useState(() => {
    const initial = {};
    CHECKLIST_ITEMS.forEach((it) => {
      initial[it.id] = { status: "PENDING", note: "" };
    });
    return initial;
  });

  // History records
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printModalRecord, setPrintModalRecord] = useState(null);

  const openPrintModal = (rec = null) => {
    setPrintModalRecord(rec);
    setShowPrintModal(true);
  };

  // Morning Standup Meeting Attendance for chk-0
  const [standupAttendance, setStandupAttendance] = useState([]);

  // Fetch operators belonging to the active supervisor
  useEffect(() => {
    supabase
      .from("users")
      .select("*")
      .eq("access", "operator")
      .then((res) => {
        const allOps = res.data || [];
        const myOps = allOps.filter((op) => {
          try {
            const meta = JSON.parse(op.team_name);
            return (
              meta.supervisor?.trim().toLowerCase() ===
              supervisorName?.trim().toLowerCase()
            );
          } catch {
            return false;
          }
        });

        const targetOps =
          myOps.length > 0 ? myOps : user?.access === "admin" ? allOps : [];

        setStandupAttendance((prev) => {
          const map = {};
          prev.forEach((p) => {
            map[p.id] = p;
          });

          return targetOps.map((op) => ({
            id: op.id,
            name: op.name,
            company_id: op.company_id,
            status: map[op.id]?.status || "PRESENT",
            reason: map[op.id]?.reason || "",
          }));
        });
      });
  }, [supervisorName, user]);

  const handleSetOperatorAttendance = (opId, status) => {
    setStandupAttendance((prev) =>
      prev.map((op) => {
        if (op.id === opId) {
          return {
            ...op,
            status,
            reason: status === "PRESENT" ? "" : op.reason,
          };
        }
        return op;
      }),
    );
  };

  const handleSetOperatorReason = (opId, reason) => {
    setStandupAttendance((prev) =>
      prev.map((op) => {
        if (op.id === opId) {
          return { ...op, reason };
        }
        return op;
      }),
    );
  };

  const handleMarkAllAttendancePresent = () => {
    setStandupAttendance((prev) =>
      prev.map((op) => ({
        ...op,
        status: "PRESENT",
        reason: "",
      })),
    );
  };

  // History search & filter
  const [historySearch, setHistorySearch] = useState("");
  const [historyShiftFilter, setHistoryShiftFilter] = useState("ALL");

  // Auto-fill supervisor name when user logs in
  useEffect(() => {
    if (user?.name && supervisorName === "Supervisor") {
      setSupervisorName(user.name);
    }
  }, [user, supervisorName]);

  // Load history from Supabase / localStorage
  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pre_production_checklists")
        .select("*")
        .order("date", { ascending: false })
        .order("id", { ascending: false });

      if (error) {
        const local = JSON.parse(
          localStorage.getItem(LOCAL_STORAGE_KEY) || "[]",
        );
        setHistoryRecords(local);
      } else {
        setHistoryRecords(data || []);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data || []));
      }
    } catch {
      const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
      setHistoryRecords(local);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const setItemStatus = (itemId, status) => {
    setItemStatuses((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status,
      },
    }));
  };

  const setItemNote = (itemId, note) => {
    setItemStatuses((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        note,
      },
    }));
  };

  const toggleDetails = (itemId) => {
    setExpandedDetails((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const markAllPass = () => {
    setItemStatuses((prev) => {
      const next = { ...prev };
      CHECKLIST_ITEMS.forEach((it) => {
        next[it.id] = { ...next[it.id], status: "PASS" };
      });
      return next;
    });
  };

  const resetCurrentChecklist = () => {
    if (window.confirm("Reset all checklist verification selections?")) {
      const reset = {};
      CHECKLIST_ITEMS.forEach((it) => {
        reset[it.id] = { status: "PENDING", note: "" };
      });
      setItemStatuses(reset);
      setGeneralNotes("");
    }
  };

  // KPI & Readiness Statistics
  const stats = useMemo(() => {
    let total = CHECKLIST_ITEMS.length;
    let passedCount = 0;
    let failedCount = 0;
    let pendingCount = 0;
    let criticalFailedCount = 0;

    CHECKLIST_ITEMS.forEach((it) => {
      const st = itemStatuses[it.id]?.status || "PENDING";
      if (st === "PASS") passedCount++;
      else if (st === "FAIL") {
        failedCount++;
        if (it.critical) criticalFailedCount++;
      } else {
        pendingCount++;
      }
    });

    const readinessPct =
      total > 0 ? Math.round((passedCount / total) * 100) : 0;

    let overallStatus = "PENDING";
    if (failedCount > 0) {
      overallStatus =
        criticalFailedCount > 0 ? "CRITICAL_BLOCKER" : "FAILED_ISSUES";
    } else if (pendingCount === 0 && passedCount === total) {
      overallStatus = "LINE_CLEARED_PASS";
    } else if (passedCount > 0) {
      overallStatus = "IN_PROGRESS";
    }

    return {
      total,
      passedCount,
      failedCount,
      pendingCount,
      criticalFailedCount,
      readinessPct,
      overallStatus,
    };
  }, [itemStatuses]);

  const displayedItems = useMemo(() => {
    if (stationFilter === "ALL") return CHECKLIST_ITEMS;
    return CHECKLIST_ITEMS.filter((it) => it.stations.includes(stationFilter));
  }, [stationFilter]);

  const handleSaveChecklist = async () => {
    if (isViewer) {
      alert("Viewers have read-only permissions.");
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg("");

    const payload = {
      form_no: "PSM-CHK-06-2026",
      rev: "00",
      date: activeDate,
      shift: activeShift,
      supervisor: supervisorName.trim() || "Supervisor",
      status: stats.overallStatus,
      readiness_pct: stats.readinessPct,
      passed_count: stats.passedCount,
      failed_count: stats.failedCount,
      total_items: stats.total,
      item_details: {
        ...itemStatuses,
        "chk-0": {
          ...itemStatuses["chk-0"],
          attendance: standupAttendance,
        },
      },
      general_notes: generalNotes.trim(),
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from("pre_production_checklists")
        .insert([payload])
        .select();

      if (error) {
        const newRecord = { ...payload, id: Date.now() };
        const updated = [newRecord, ...historyRecords];
        setHistoryRecords(updated);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } else if (data && data[0]) {
        setHistoryRecords((prev) => [data[0], ...prev]);
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify([data[0], ...historyRecords]),
        );
      }

      setSaveSuccessMsg(
        `Checklist signed off & saved successfully for ${activeShift} Shift! Readiness: ${stats.readinessPct}%`,
      );
      setTimeout(() => setSaveSuccessMsg(""), 5000);
    } catch {
      const newRecord = { ...payload, id: Date.now() };
      const updated = [newRecord, ...historyRecords];
      setHistoryRecords(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      setSaveSuccessMsg(`Saved locally for ${activeShift} Shift!`);
      setTimeout(() => setSaveSuccessMsg(""), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHistory = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm("Delete this checklist inspection record?")) return;
    try {
      await supabase.from("pre_production_checklists").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase delete error:", e);
    }
    const filtered = historyRecords.filter((r) => r.id !== id);
    setHistoryRecords(filtered);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  };

  const filteredHistory = useMemo(() => {
    return historyRecords.filter((r) => {
      const matchSearch =
        historySearch === "" ||
        (r.supervisor &&
          r.supervisor.toLowerCase().includes(historySearch.toLowerCase())) ||
        (r.date && r.date.includes(historySearch));
      const matchShift =
        historyShiftFilter === "ALL" || r.shift === historyShiftFilter;
      return matchSearch && matchShift;
    });
  }, [historyRecords, historySearch, historyShiftFilter]);

  return {
    isViewer,
    isAdmin,
    activeDate,
    setActiveDate,
    activeShift,
    setActiveShift,
    supervisorName,
    setSupervisorName,
    generalNotes,
    setGeneralNotes,
    stationFilter,
    setStationFilter,
    expandedDetails,
    toggleDetails,
    itemStatuses,
    setItemStatus,
    setItemNote,
    markAllPass,
    resetCurrentChecklist,
    standupAttendance,
    handleSetOperatorAttendance,
    handleSetOperatorReason,
    handleMarkAllAttendancePresent,
    historyRecords,
    loading,
    loadHistory,
    isSaving,
    saveSuccessMsg,
    showPrintModal,
    setShowPrintModal,
    printModalRecord,
    openPrintModal,
    stats,
    displayedItems,
    handleSaveChecklist,
    handleDeleteHistory,
    historySearch,
    setHistorySearch,
    historyShiftFilter,
    setHistoryShiftFilter,
    filteredHistory,
  };
}
