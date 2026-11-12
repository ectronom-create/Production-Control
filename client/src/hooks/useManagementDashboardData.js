import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import { getBatchStatus } from "../utils/kitStatus";

export const DEFAULT_TARGETS = {
  overallProd: 300000,
  weeklyProd: 9100,
  dailyProd: 1300,
  shiftProd: 650,
  shiftsPerDay: 2,
  overallFw: 70000,
  weeklyFw: 8400,
  dailyFw: 1200,
  shiftFw: 600,
  baselineDefects: 4250,
  consumptionRateMode: "adaptive", // 'adaptive' or 'fixed'
  fixedConsumptionRate: 1200,
};

const STORAGE_TARGETS_KEY = "ectron_mgmt_targets_config";

/**
 * Helper to determine project health badge based on achievement percentage
 */
export function getStatusBadge(pct) {
  if (pct >= 95)
    return {
      label: "ON TRACK (Exceeding)",
      bg: "#dcfce7",
      color: "#15803d",
      border: "#bbf7d0",
    };
  if (pct >= 75)
    return {
      label: "HEALTHY (Near Target)",
      bg: "#e0f2fe",
      color: "#0369a1",
      border: "#bae6fd",
    };
  if (pct >= 50)
    return {
      label: "ATTENTION (Moderate)",
      bg: "#fef3c7",
      color: "#b45309",
      border: "#fde68a",
    };
  return {
    label: "BEHIND SCHEDULE",
    bg: "#fee2e2",
    color: "#b91c1c",
    border: "#fecaca",
  };
}

/**
 * Custom hook managing all state, multi-table real-time subscriptions,
 * adaptive runway math, custom targets configuration, and derived KPI analytics.
 */
export function useManagementDashboardData() {
  const [records, setRecords] = useState([]);
  const [kitRecords, setKitRecords] = useState([]);
  const [shipmentBatches, setShipmentBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date());
  const [syncError, setSyncError] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedRecoveryMonth, setSelectedRecoveryMonth] = useState("2026-10");
  const [recoveryHorizonDays, setRecoveryHorizonDays] = useState("month_end");

  // Defective Meters count logged live from the Defect Meters tracking system
  const [defectiveMetersCount, setDefectiveMetersCount] = useState(() => {
    try {
      const cached = localStorage.getItem("ectron_defective_meters_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed.length;
      }
    } catch (_) {}
    return 0;
  });

  // Configurable targets with localStorage persistence
  const [targets, setTargets] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TARGETS_KEY);
      if (saved) {
        return { ...DEFAULT_TARGETS, ...JSON.parse(saved) };
      }
    } catch (_) {}
    return DEFAULT_TARGETS;
  });

  // Function for Admins/Supervisors to update targets dynamically
  const updateTargets = useCallback((newPartial) => {
    setTargets((prev) => {
      const updated = { ...prev, ...newPartial };
      // Recalculate shift targets if daily target or shift count changed
      if (newPartial.dailyProd != null || newPartial.shiftsPerDay != null) {
        const d = newPartial.dailyProd != null ? Number(newPartial.dailyProd) : updated.dailyProd;
        const s = newPartial.shiftsPerDay != null ? Number(newPartial.shiftsPerDay) : (updated.shiftsPerDay || 2);
        updated.shiftProd = Math.round(d / (s > 0 ? s : 2));
      }
      if (newPartial.dailyFw != null || newPartial.shiftsPerDay != null) {
        const df = newPartial.dailyFw != null ? Number(newPartial.dailyFw) : updated.dailyFw;
        const s = newPartial.shiftsPerDay != null ? Number(newPartial.shiftsPerDay) : (updated.shiftsPerDay || 2);
        updated.shiftFw = Math.round(df / (s > 0 ? s : 2));
      }
      try {
        localStorage.setItem(STORAGE_TARGETS_KEY, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  }, []);

  // Available Recovery Months
  const availableRecoveryMonths = useMemo(() => {
    const monthSet = new Set(["2026-10", "2026-11", "2026-12"]);
    records.forEach((r) => {
      if (r.date && r.date.length >= 7) {
        const ym = r.date.slice(0, 7);
        if (ym >= "2026-10") monthSet.add(ym);
      }
    });
    return Array.from(monthSet).sort();
  }, [records]);

  // Fetch production records, kit records, defective meters count & shipment batches
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setSyncError(null);
    try {
      const [prodRes, kitRes, defectMetersRes, batchesRes] = await Promise.allSettled([
        supabase
          .from("production_records")
          .select("*")
          .order("date", { ascending: false }),
        supabase
          .from("kit_meters")
          .select("*")
          .order("date", { ascending: false }),
        supabase.from("defective_meters").select("id", { count: "exact" }),
        supabase.from("shipment_batches").select("*").order("shipment_date", { ascending: false })
      ]);

      if (prodRes.status === "fulfilled" && prodRes.value.data) {
        setRecords(prodRes.value.data);
        if (prodRes.value.data.length > 0 && !selectedDate) {
          setSelectedDate(prodRes.value.data[0].date);
        }
      }

      if (
        kitRes.status === "fulfilled" &&
        kitRes.value.data &&
        kitRes.value.data.length > 0
      ) {
        setKitRecords(kitRes.value.data);
        try {
          localStorage.setItem(
            "ectron_kit_meters_records",
            JSON.stringify(kitRes.value.data),
          );
        } catch (_) {}
      } else {
        try {
          const cached = localStorage.getItem("ectron_kit_meters_records");
          if (cached) setKitRecords(JSON.parse(cached));
        } catch (_) {}
      }

      // Shipment batches from database
      if (batchesRes.status === "fulfilled" && batchesRes.value.data) {
        setShipmentBatches(batchesRes.value.data);
      }

      // Update Defect Meters Count from live database
      if (defectMetersRes.status === "fulfilled") {
        const count =
          typeof defectMetersRes.value.count === "number"
            ? defectMetersRes.value.count
            : defectMetersRes.value.data
              ? defectMetersRes.value.data.length
              : 0;
        setDefectiveMetersCount(count);
      } else {
        try {
          const cached = localStorage.getItem("ectron_defective_meters_cache");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) setDefectiveMetersCount(parsed.length);
          }
        } catch (_) {}
      }

      setLastSyncedAt(new Date());
      setIsLiveSyncing(true);
    } catch (e) {
      console.warn("Error fetching management dashboard records:", e);
      setSyncError("Failed to fetch live records. Operating with cached data.");
      setIsLiveSyncing(false);
      try {
        const cached = localStorage.getItem("ectron_kit_meters_records");
        if (cached) setKitRecords(JSON.parse(cached));
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // ── Multi-table Realtime Subscriptions & Polling ──
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    const triggerDebouncedFetch = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        fetchRecords();
      }, 1200);
    };

    // 1. Supabase Realtime Channel across all critical factory tables
    const channel = supabase
      .channel("mgmt_comprehensive_realtime_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "defective_meters" },
        triggerDebouncedFetch,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "production_records" },
        triggerDebouncedFetch,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kit_meters" },
        triggerDebouncedFetch,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shipment_batches" },
        triggerDebouncedFetch,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsLiveSyncing(true);
        } else if (status === "CHANNEL_ERROR") {
          setIsLiveSyncing(false);
        }
      });

    // 2. Storage event listener (cross-tab sync)
    const handleStorageChange = (e) => {
      if (
        e.key === "ectron_defective_meters_cache" ||
        e.key === "ectron_kit_meters_records" ||
        e.key === STORAGE_TARGETS_KEY
      ) {
        triggerDebouncedFetch();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // 3. Fallback Polling every 20 seconds for seamless continuous background update
    const pollInterval = setInterval(() => {
      fetchRecords();
    }, 20000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(pollInterval);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [fetchRecords]);

  // Dates for Daily and Weekly calculations
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const activeDate =
    selectedDate || (records.length > 0 ? records[0].date : todayStr);

  const weekStartDateStr = useMemo(() => {
    const base = activeDate ? new Date(activeDate) : new Date();
    base.setDate(base.getDate() - 6);
    return base.toISOString().slice(0, 10);
  }, [activeDate]);

  const availableDates = useMemo(() => {
    const set = new Set(records.map((r) => r.date));
    return Array.from(set).sort().reverse();
  }, [records]);

  // Production Metrics
  const productionMetrics = useMemo(() => {
    const overallProductionCompleted = records.reduce(
      (sum, r) => sum + (parseInt(r.achieved, 10) || 0),
      0,
    );
    const overallAchievementPct =
      targets.overallProd > 0
        ? (overallProductionCompleted / targets.overallProd) * 100
        : 0;

    const weeklyRecords = records.filter(
      (r) => r.date >= weekStartDateStr && r.date <= activeDate,
    );
    const weeklyActual = weeklyRecords.reduce(
      (sum, r) => sum + (parseInt(r.achieved, 10) || 0),
      0,
    );
    const weeklyAchievementPct =
      targets.weeklyProd > 0 ? (weeklyActual / targets.weeklyProd) * 100 : 0;

    const dailyRecords = records.filter((r) => r.date === activeDate);
    const dailyActual = dailyRecords.reduce(
      (sum, r) => sum + (parseInt(r.achieved, 10) || 0),
      0,
    );
    const dailyAchievementPct =
      targets.dailyProd > 0 ? (dailyActual / targets.dailyProd) * 100 : 0;

    const shiftsCount = targets.shiftsPerDay || 2;
    const shiftActual = Math.round(dailyActual / (shiftsCount > 0 ? shiftsCount : 2));
    const shiftAchievementPct =
      targets.shiftProd > 0 ? (shiftActual / targets.shiftProd) * 100 : 0;

    return {
      overallCompleted: overallProductionCompleted,
      overallTarget: targets.overallProd,
      overallPct: overallAchievementPct,
      weeklyActual,
      weeklyTarget: targets.weeklyProd,
      weeklyPct: weeklyAchievementPct,
      dailyActual,
      dailyTarget: targets.dailyProd,
      dailyPct: dailyAchievementPct,
      shiftActual,
      shiftTarget: targets.shiftProd,
      shiftPct: shiftAchievementPct,
      activeDate,
    };
  }, [records, activeDate, weekStartDateStr, targets]);

  // Firmware Metrics
  const fwMetrics = useMemo(() => {
    const totalFwCompleted = records.reduce(
      (sum, r) => sum + (parseInt(r.updated_fw_qty, 10) || 0),
      0,
    );
    const overallAchievementPct =
      targets.overallFw > 0 ? (totalFwCompleted / targets.overallFw) * 100 : 0;

    const weeklyRecords = records.filter(
      (r) => r.date >= weekStartDateStr && r.date <= activeDate,
    );
    const weeklyActual = weeklyRecords.reduce(
      (sum, r) => sum + (parseInt(r.updated_fw_qty, 10) || 0),
      0,
    );
    const weeklyAchievementPct =
      targets.weeklyFw > 0 ? (weeklyActual / targets.weeklyFw) * 100 : 0;

    const dailyRecords = records.filter((r) => r.date === activeDate);
    const dailyActual = dailyRecords.reduce(
      (sum, r) => sum + (parseInt(r.updated_fw_qty, 10) || 0),
      0,
    );
    const dailyAchievementPct =
      targets.dailyFw > 0 ? (dailyActual / targets.dailyFw) * 100 : 0;

    const shiftsCount = targets.shiftsPerDay || 2;
    const shiftActual = Math.round(dailyActual / (shiftsCount > 0 ? shiftsCount : 2));
    const shiftAchievementPct =
      targets.shiftFw > 0 ? (shiftActual / targets.shiftFw) * 100 : 0;

    return {
      overallCompleted: totalFwCompleted,
      overallTarget: targets.overallFw,
      overallPct: overallAchievementPct,
      weeklyActual,
      weeklyTarget: targets.weeklyFw,
      weeklyPct: weeklyAchievementPct,
      dailyActual,
      dailyTarget: targets.dailyFw,
      dailyPct: dailyAchievementPct,
      shiftActual,
      shiftTarget: targets.shiftFw,
      shiftPct: shiftAchievementPct,
    };
  }, [records, activeDate, weekStartDateStr, targets]);

  // Monthly Dynamic Production Recovery Engine
  const recoveryAnalysis = useMemo(() => {
    const ym = selectedRecoveryMonth || "2026-10";
    const [yearStr, monthStr] = ym.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthName = monthNames[month - 1] || ym;

    const startDay = ym === "2026-10" ? 2 : 1;
    const startDate = `${ym}-${String(startDay).padStart(2, "0")}`;

    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const endDate = `${ym}-${String(lastDayOfMonth).padStart(2, "0")}`;

    const totalDaysInMonthWindow = lastDayOfMonth - startDay + 1;
    const monthFullTarget = totalDaysInMonthWindow * targets.dailyProd;

    const monthRecords = records.filter(
      (r) => r.date >= startDate && r.date <= endDate,
    );
    const uniqueDates = Array.from(new Set(monthRecords.map((r) => r.date))).sort();

    const actualInPeriod = monthRecords.reduce(
      (sum, r) => sum + (parseInt(r.achieved, 10) || 0),
      0,
    );
    const fwInPeriod = monthRecords.reduce(
      (sum, r) => sum + (parseInt(r.updated_fw_qty, 10) || 0),
      0,
    );

    const latestDate =
      uniqueDates.length > 0
        ? uniqueDates[uniqueDates.length - 1]
        : startDate;
    const elapsedDays = uniqueDates.length;

    const targetInPeriod = elapsedDays * targets.dailyProd;
    const missingTarget = Math.max(0, targetInPeriod - actualInPeriod);
    const isTargetAchieved =
      elapsedDays > 0 ? actualInPeriod >= targetInPeriod : true;
    const achievementRate =
      targetInPeriod > 0 ? (actualInPeriod / targetInPeriod) * 100 : 0;
    const monthOverallPct =
      monthFullTarget > 0 ? (actualInPeriod / monthFullTarget) * 100 : 0;

    const latestDayNum =
      uniqueDates.length > 0
        ? parseInt(latestDate.split("-")[2], 10)
        : startDay - 1;
    const remainingDaysInMonth = Math.max(1, lastDayOfMonth - latestDayNum);
    const remainingToMonthTarget = Math.max(0, monthFullTarget - actualInPeriod);

    let recoveryDays = remainingDaysInMonth;
    if (recoveryHorizonDays !== "month_end") {
      const parsedDays = parseInt(recoveryHorizonDays, 10);
      if (!isNaN(parsedDays) && parsedDays > 0) {
        recoveryDays = parsedDays;
      }
    }

    const dailyCatchUp =
      missingTarget > 0 && recoveryDays > 0
        ? Math.ceil(missingTarget / recoveryDays)
        : 0;
    const shiftsCount = targets.shiftsPerDay || 2;
    const shiftCatchUp = Math.ceil(dailyCatchUp / (shiftsCount > 0 ? shiftsCount : 2));
    const revisedDailyTarget = targets.dailyProd + dailyCatchUp;
    const revisedShiftTarget = Math.ceil(revisedDailyTarget / (shiftsCount > 0 ? shiftsCount : 2));

    const formatD = (dStr) => {
      if (!dStr) return "";
      const parts = dStr.split("-");
      if (parts.length < 3) return dStr;
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parseInt(parts[2], 10)}-${monthNames[mIdx]?.slice(0, 3) || parts[1]}`;
    };

    const periodLabel = `${formatD(startDate)} — ${uniqueDates.length > 0 ? formatD(latestDate) : formatD(startDate)}`;
    const fullMonthLabel = `${monthName} ${year} (${formatD(startDate)} to ${formatD(endDate)})`;

    return {
      selectedRecoveryMonth: ym,
      monthName,
      year,
      startDate,
      endDate,
      latestDate,
      periodLabel,
      fullMonthLabel,
      startDay,
      lastDayOfMonth,
      totalDaysInMonthWindow,
      monthFullTarget,
      monthOverallPct,
      elapsedDays,
      remainingDaysInMonth,
      actualInPeriod,
      fwInPeriod,
      targetInPeriod,
      missingTarget,
      remainingToMonthTarget,
      isTargetAchieved,
      achievementRate,
      dailyCatchUp,
      shiftCatchUp,
      revisedDailyTarget,
      revisedShiftTarget,
      recoveryDays,
    };
  }, [records, targets, selectedRecoveryMonth, recoveryHorizonDays]);

  // Nama Dispatch Plan (Dynamic from shipment_batches table if available, with structured fallback)
  const namaDispatchPlan = useMemo(() => {
    if (shipmentBatches && shipmentBatches.length > 0) {
      return shipmentBatches.map((sb, idx) => {
        const isCompleted = sb.status === "Delivered" || (sb.shipment_date && sb.shipment_date < todayStr);
        return {
          batch: sb.batch_name || `Batch ${idx + 1}`,
          date: sb.shipment_date || "Scheduled",
          qty: sb.total_meters || 0,
          status: isCompleted ? "Delivered" : (sb.status || "Planned"),
          statusClass: isCompleted ? "badge-green" : (idx === 1 ? "badge-admin" : "badge-amber"),
          notes: sb.notes || sb.destination || "Nama / Field",
          isDatabaseRecord: true
        };
      });
    }

    // Standard fallback roadmap
    return [
      {
        batch: "Batch 1",
        date: "Completed (1-Oct)",
        qty: 8480,
        status: "Delivered",
        statusClass: "badge-green",
        notes: "Dispatched to Nama / Field",
      },
      {
        batch: "Batch 2",
        date: "15-Oct-2026",
        qty: 12000,
        status: "Ready / Pending Dispatch",
        statusClass: "badge-admin",
        notes: "Scheduled for Nama Field release",
      },
      {
        batch: "Batch 3",
        date: "22-Oct-2026",
        qty: 13920,
        status: "In Production Pipeline",
        statusClass: "badge-amber",
        notes: "Next scheduled delivery",
      },
      {
        batch: "Batch 4",
        date: "29-Oct-2026",
        qty: 15625,
        status: "Planned",
        statusClass: "badge-purple",
        notes: "Final planned October batch",
      },
    ];
  }, [shipmentBatches, todayStr]);

  // Kit Supply Metrics
  const kitMetrics = useMemo(() => {
    let receivedKits = 0;
    let plannedKits = 0;
    let receivedBatches = 0;
    let plannedBatches = 0;
    let threePhaseKits = 0;
    let singlePhaseKits = 0;

    const plannedList = [];

    kitRecords.forEach((r) => {
      const qty = parseInt(r.kit_quantity ?? r.quantity, 10) || 0;
      const status = getBatchStatus(r.date, r.notes);

      const is3Phase =
        r.product_name === "Three Phase" ||
        r.meter_type === "3-Phase" ||
        r.type === "3-Phase";
      if (is3Phase) {
        threePhaseKits += qty;
      } else {
        singlePhaseKits += qty;
      }

      if (status.isPlanned) {
        plannedBatches += 1;
        plannedKits += qty;
        plannedList.push({
          record: r,
          daysDiff: status.daysDiff,
          date: r.date,
          qty,
        });
      } else {
        receivedBatches += 1;
        receivedKits += qty;
      }
    });

    plannedList.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
    const nextIncomingBatch =
      plannedList.length > 0 ? plannedList[0].record : null;
    const nearestIncomingDays =
      plannedList.length > 0 ? plannedList[0].daysDiff : null;

    const totalBatches = kitRecords.length;
    const totalKits = receivedKits + plannedKits;
    const receivedPct =
      totalKits > 0 ? (receivedKits / totalKits) * 100 : 0;
    const plannedPct = totalKits > 0 ? (plannedKits / totalKits) * 100 : 0;

    return {
      receivedBatches,
      receivedKits,
      plannedBatches,
      plannedKits,
      totalBatches,
      totalKits,
      threePhaseKits,
      singlePhaseKits,
      receivedPct,
      plannedPct,
      nearestIncomingDays,
      nextIncomingBatch,
    };
  }, [kitRecords]);

  // Defect Calibration Metrics (Using configurable baselineDefects)
  const defectMetrics = useMemo(() => {
    const baseDefects = targets.baselineDefects != null ? Number(targets.baselineDefects) : 4250;
    const liveLogged = defectiveMetersCount || 0;
    const actualPhysicalDefects = baseDefects + liveLogged;

    let totalReportedKO = 0;
    records.forEach((r) => {
      if (Array.isArray(r.stations) && r.stations.length > 0) {
        r.stations.forEach((st) => {
          const nbB = parseInt(st.nbBoards, 10) || 0;
          const nbOk = parseInt(st.nbBoardsOK, 10) || 0;
          totalReportedKO += Math.max(0, nbB - nbOk);
        });
      } else {
        const tb = parseInt(r.total_boards, 10) || 0;
        const ach = parseInt(r.achieved, 10) || 0;
        totalReportedKO += Math.max(0, tb - ach);
      }
    });

    const calibrationRatio =
      totalReportedKO > 0 ? actualPhysicalDefects / totalReportedKO : 0;
    const totalRepairedMeters = Math.max(
      0,
      totalReportedKO - actualPhysicalDefects,
    );
    const repairRatePct =
      totalReportedKO > 0
        ? (totalRepairedMeters / totalReportedKO) * 100
        : 0;

    return {
      baseActualDefects: baseDefects,
      liveLoggedDefects: liveLogged,
      actualPhysicalDefects,
      totalReportedKO,
      calibrationRatio,
      totalRepairedMeters,
      repairRatePct,
    };
  }, [records, defectiveMetersCount, targets.baselineDefects]);

  // Top 4 Recurring Defect Codes
  const topDefectCodes = useMemo(() => {
    const codeMap = {};
    const codeStationCounts = {};
    let totalOccurrences = 0;

    const getStationDetails = (code, rawStation) => {
      const cleanCode = String(code || "").replace(/^-/, "").trim();
      const st = String(rawStation || "").toLowerCase();

      if (
        st.includes("rf") ||
        st.includes("rayonne") ||
        ["910", "640", "920"].includes(cleanCode)
      ) {
        return { en: "RF Test Station (Test Rayonné RF)", badge: "RF Test" };
      }
      if (
        st.includes("multi") ||
        ["312", "335", "344", "214", "329", "361"].includes(cleanCode)
      ) {
        return { en: "Multi-Test Workstation", badge: "Multi-Test" };
      }
      if (
        st.includes("assembly") ||
        ["576", "577", "001", "00", "002"].includes(cleanCode)
      ) {
        return { en: "Assembly Line Station", badge: "Assembly" };
      }
      if (
        st.includes("cal") ||
        ["171", "172", "173", "911"].includes(cleanCode)
      ) {
        return { en: "Calibration Workstation (CAL2)", badge: "Calibration" };
      }
      if (st.includes("insul") || cleanCode === "656") {
        return { en: "Insulation Test Station", badge: "Insulation" };
      }
      if (st.includes("perso") || cleanCode === "613") {
        return { en: "Personalization Station (Perso)", badge: "Perso" };
      }
      return {
        en: rawStation || "Production Line Station",
        badge: rawStation || "Production",
      };
    };

    records.forEach((r) => {
      if (Array.isArray(r.stations)) {
        r.stations.forEach((st) => {
          const stName = st.stationName || st.bench || "";
          ["top1", "top2", "top3"].forEach((k, idx) => {
            const qtyKey = ["qty1", "qty2", "qty3"][idx];
            const code = String(st[k] || "").trim();
            const qty = parseInt(st[qtyKey], 10) || 0;
            if (code && qty > 0 && stName) {
              if (!codeStationCounts[code]) codeStationCounts[code] = {};
              codeStationCounts[code][stName] =
                (codeStationCounts[code][stName] || 0) + qty;
            }
          });
        });
      }

      if (Array.isArray(r.defects)) {
        r.defects.forEach((d) => {
          const code = String(d?.code || "").trim();
          const qty = parseInt(d?.qty, 10) || 0;
          if (code && qty > 0) {
            codeMap[code] = (codeMap[code] || 0) + qty;
            totalOccurrences += qty;
          }
        });
      }

      if ((!r.defects || r.defects.length === 0) && Array.isArray(r.stations)) {
        r.stations.forEach((st) => {
          ["top1", "top2", "top3"].forEach((k, idx) => {
            const qtyKey = ["qty1", "qty2", "qty3"][idx];
            const code = String(st[k] || "").trim();
            const qty = parseInt(st[qtyKey], 10) || 0;
            if (code && qty > 0) {
              codeMap[code] = (codeMap[code] || 0) + qty;
              totalOccurrences += qty;
            }
          });
        });
      }
    });

    const sorted = Object.entries(codeMap)
      .map(([code, qty]) => ({ code, qty }))
      .sort((a, b) => b.qty - a.qty);

    const top4 = sorted.slice(0, 4).map((item, idx) => {
      const pct =
        totalOccurrences > 0 ? (item.qty / totalOccurrences) * 100 : 0;
      const stMap = codeStationCounts[item.code] || {};
      const sortedSt = Object.entries(stMap).sort((a, b) => b[1] - a[1]);
      const primaryRawStation = sortedSt[0] ? sortedSt[0][0] : "";
      const stationInfo = getStationDetails(item.code, primaryRawStation);

      return {
        rank: idx + 1,
        code: item.code,
        qty: item.qty,
        pct,
        stationName: stationInfo.en,
        stationBadge: stationInfo.badge,
      };
    });

    const top4Sum = top4.reduce((s, it) => s + it.qty, 0);
    const top4SharePct =
      totalOccurrences > 0 ? (top4Sum / totalOccurrences) * 100 : 0;

    return {
      top4,
      totalOccurrences,
      top4Sum,
      top4SharePct,
    };
  }, [records]);

  // Kit Runway Metrics with Adaptive vs Fixed Consumption Rate
  const kitRunwayMetrics = useMemo(() => {
    const received = kitMetrics.receivedKits || 0;
    const achieved = productionMetrics.overallCompleted || 0;
    const actualDefects = defectMetrics.actualPhysicalDefects || 4250;
    const consumed = achieved + actualDefects;
    const remaining = Math.max(0, received - consumed);

    // Calculate recent 7-day average production to support Adaptive Runway
    const recentUniqueDates = Array.from(new Set(records.map(r => r.date))).slice(0, 7);
    const recentSum = records
      .filter(r => recentUniqueDates.includes(r.date))
      .reduce((sum, r) => sum + (parseInt(r.achieved, 10) || 0), 0);
    const adaptiveDailyRate = recentUniqueDates.length > 0 ? Math.round(recentSum / recentUniqueDates.length) : (targets.dailyProd || 1300);

    const isAdaptive = targets.consumptionRateMode === "adaptive";
    const dailyRate = isAdaptive && adaptiveDailyRate > 300 ? adaptiveDailyRate : (targets.fixedConsumptionRate || 1200);

    const runwayDays = dailyRate > 0 ? remaining / dailyRate : 0;
    const consumedPct = received > 0 ? (consumed / received) * 100 : 0;
    const remainingPct = received > 0 ? (remaining / received) * 100 : 0;

    return {
      received,
      achieved,
      actualDefects,
      consumed,
      remaining,
      dailyRate,
      isAdaptive,
      adaptiveDailyRate,
      fixedRate: targets.fixedConsumptionRate || 1200,
      runwayDays,
      consumedPct,
      remainingPct,
    };
  }, [
    kitMetrics.receivedKits,
    productionMetrics.overallCompleted,
    defectMetrics.actualPhysicalDefects,
    records,
    targets.consumptionRateMode,
    targets.fixedConsumptionRate,
    targets.dailyProd
  ]);

  // Executive Burn-up & Cumulative Trajectory Data
  const burnupData = useMemo(() => {
    const dateMap = {};
    records.forEach(r => {
      if (r.date) {
        if (!dateMap[r.date]) dateMap[r.date] = { date: r.date, achieved: 0, fw: 0 };
        dateMap[r.date].achieved += parseInt(r.achieved, 10) || 0;
        dateMap[r.date].fw += parseInt(r.updated_fw_qty, 10) || 0;
      }
    });

    const sortedDates = Object.keys(dateMap).sort();
    let cumActual = 0;
    let cumFw = 0;
    let cumTarget = 0;

    return sortedDates.map((d, idx) => {
      cumActual += dateMap[d].achieved;
      cumFw += dateMap[d].fw;
      cumTarget += (targets.dailyProd || 1300);
      return {
        date: d,
        actual: cumActual,
        fw: cumFw,
        target: Math.min(targets.overallProd, cumTarget),
        dayActual: dateMap[d].achieved,
        dayFw: dateMap[d].fw
      };
    });
  }, [records, targets.dailyProd, targets.overallProd]);

  const projectStatus = useMemo(() => {
    return getStatusBadge(productionMetrics.weeklyPct);
  }, [productionMetrics.weeklyPct]);

  return {
    records,
    kitRecords,
    shipmentBatches,
    loading,
    isLiveSyncing,
    lastSyncedAt,
    syncError,
    selectedDate,
    setSelectedDate,
    selectedRecoveryMonth,
    setSelectedRecoveryMonth,
    recoveryHorizonDays,
    setRecoveryHorizonDays,
    defectiveMetersCount,
    targets,
    updateTargets,
    availableRecoveryMonths,
    availableDates,
    activeDate,
    weekStartDateStr,
    todayStr,
    productionMetrics,
    fwMetrics,
    recoveryAnalysis,
    namaDispatchPlan,
    kitMetrics,
    defectMetrics,
    topDefectCodes,
    kitRunwayMetrics,
    burnupData,
    projectStatus,
    fetchRecords,
  };
}
