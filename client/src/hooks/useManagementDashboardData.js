import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import { getBatchStatus } from "../utils/kitStatus";
import { getBatchStage, getBatchStageDate, getBatchDefinedDate } from "../utils/batchStatus";
import { toLocalDateStr, getTodayString } from "../utils/date";
import { useLine } from "../context/LineContext";
import { lineKey } from "../constants/lines";

export const DEFAULT_TARGETS = {
  overallProd: 300000,
  weeklyProd: 8400,
  dailyProd: 1200,
  shiftProd: 600,
  shiftsPerDay: 2,
  overallFw: 70000,
  weeklyFw: 8400,
  dailyFw: 1200,
  shiftFw: 600,
  baselineDefects: 4250,
  consumptionRateMode: "adaptive", // 'adaptive' or 'fixed'
  fixedConsumptionRate: 1200,
  projectStartDate: "", // empty = PROJECT_START_DEFAULT
};

// v2: daily target moved to 1200 — older locally-saved 1300 configs are ignored
const STORAGE_TARGETS_KEY_BASE = "ectron_mgmt_targets_v2";
const SETTINGS_TABLE = "app_settings";

// Production started 44 days before 30-Sep-2026. Output from 17-Aug to 30-Sep was
// uploaded as one total dated 30-Sep; shift-by-shift reports start in October.
export const PROJECT_START_DEFAULT = "2026-08-17";
export const DAILY_TRACKING_START = "2026-10-01";

// Single-phase line (M11): 200,000 meters, 1,600 a day. Its start date is set by
// the admin in the dashboard settings; until then the first report date is used.
export const DEFAULT_TARGETS_1P = {
  ...DEFAULT_TARGETS,
  overallProd: 200000,
  dailyProd: 1600,
  weeklyProd: 11200,
  shiftProd: 800,
  overallFw: 200000,
  dailyFw: 1600,
  weeklyFw: 11200,
  shiftFw: 800,
  baselineDefects: 0,
  fixedConsumptionRate: 1600,
};

// Per-line settings: three-phase keeps the original keys and dates.
export const LINE_TARGET_CONFIG = {
  "3P": { defaults: DEFAULT_TARGETS, settingsKey: "mgmt_targets", startDefault: PROJECT_START_DEFAULT, trackingStart: DAILY_TRACKING_START },
  "1P": { defaults: DEFAULT_TARGETS_1P, settingsKey: "mgmt_targets_1P", startDefault: "", trackingStart: "" },
};
export const defaultTargetsFor = (line) => (LINE_TARGET_CONFIG[line] || LINE_TARGET_CONFIG["3P"]).defaults;

const DAY_MS = 86400000;
function dateToUtc(dStr) {
  const [y, m, d] = dStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}
function diffDays(fromStr, toStr) {
  return Math.round((dateToUtc(toStr) - dateToUtc(fromStr)) / DAY_MS);
}
function addDays(dStr, n) {
  const t = new Date(dateToUtc(dStr) + n * DAY_MS);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

// Shift is stored as a suffix on team_name ("Team A - Morning") or a note tag
function getRecordShift(r) {
  const str = `${r?.team_name || ""} ${r?.notes || ""}`.toLowerCase();
  if (str.includes("evening") || str.includes("\u0645\u0633\u0627")) return "Evening";
  if (str.includes("morning") || str.includes("\u0635\u0628\u0627\u062d")) return "Morning";
  return null;
}

function normalizeTargets(t, defaults = DEFAULT_TARGETS) {
  const out = { ...defaults, ...t };
  const shifts = Number(out.shiftsPerDay) > 0 ? Number(out.shiftsPerDay) : 2;
  out.dailyProd = Number(out.dailyProd) || defaults.dailyProd;
  out.weeklyProd = out.dailyProd * 7;
  out.shiftProd = Math.round(out.dailyProd / shifts);
  out.dailyFw = Number(out.dailyFw) || defaults.dailyFw;
  out.weeklyFw = out.dailyFw * 7;
  out.shiftFw = Math.round(out.dailyFw / shifts);
  return out;
}

/**
 * Custom hook managing all state, multi-table real-time subscriptions,
 * adaptive runway math, custom targets configuration, and derived KPI analytics.
 */
export function useManagementDashboardData() {
  // The page is remounted when the line changes, so these are fixed per mount.
  const { line } = useLine();
  const lineCfg = LINE_TARGET_CONFIG[line] || LINE_TARGET_CONFIG["3P"];
  const SETTINGS_KEY = lineCfg.settingsKey;
  const STORAGE_TARGETS_KEY = lineKey(STORAGE_TARGETS_KEY_BASE, line);
  const DEFECTS_CACHE_KEY = lineKey("ectron_defective_meters_cache", line);
  const KITS_CACHE_KEY = lineKey("ectron_kit_meters_records", line);
  const [records, setRecords] = useState([]);
  const [kitRecords, setKitRecords] = useState([]);
  const [shipmentBatches, setShipmentBatches] = useState([]);
  const [stoppages, setStoppages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date());
  const [syncError, setSyncError] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedRecoveryMonth, setSelectedRecoveryMonth] = useState(() =>
    getTodayString().slice(0, 7),
  );
  const [recoveryHorizonDays, setRecoveryHorizonDays] = useState("month_end");

  // Defective Meters count logged live from the Defect Meters tracking system
  const [defectiveMetersCount, setDefectiveMetersCount] = useState(() => {
    try {
      const cached = localStorage.getItem(DEFECTS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed.length;
      }
    } catch (_) {}
    return 0;
  });

  // Targets: shared for everyone via Supabase (app_settings), cached locally
  const [targets, setTargets] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TARGETS_KEY);
      if (saved) return normalizeTargets(JSON.parse(saved), lineCfg.defaults);
    } catch (_) {}
    return normalizeTargets(lineCfg.defaults, lineCfg.defaults);
  });
  const [targetsShared, setTargetsShared] = useState(true);

  const applyTargets = useCallback((value) => {
    const t = normalizeTargets(value || {}, lineCfg.defaults);
    setTargets(t);
    try {
      localStorage.setItem(STORAGE_TARGETS_KEY, JSON.stringify(t));
    } catch (_) {}
    return t;
  }, []);

  // Admin only (enforced in the UI). Returns true when saved for everyone.
  const updateTargets = useCallback(
    async (newPartial) => {
      const t = applyTargets({ ...targets, ...newPartial });
      const { error } = await supabase
        .from(SETTINGS_TABLE)
        .upsert(
          [{ key: SETTINGS_KEY, value: t, updated_at: new Date().toISOString() }],
          { onConflict: "key" },
        );
      setTargetsShared(!error);
      return !error;
    },
    [targets, applyTargets],
  );

  // First day of production (setting, or 17-Aug-2026)
  // Single-phase without a set start date: the first report date (or today).
  const firstRecordDate = useMemo(
    () => records.reduce((min, r) => (r.date && (!min || r.date < min) ? r.date : min), ""),
    [records],
  );
  const projectStart = targets.projectStartDate || lineCfg.startDefault || firstRecordDate || getTodayString();
  // Before this date output was uploaded as one lump total (three-phase only).
  const trackingStart = lineCfg.trackingStart || projectStart;

  // Recovery months: from the first month with daily reports to this month
  // (Aug/Sep only have one lump-sum total, so a monthly breakdown is meaningless there)
  const availableRecoveryMonths = useMemo(() => {
    const months = [];
    const end = getTodayString().slice(0, 7);
    const from = projectStart > trackingStart ? projectStart : trackingStart;
    let [y, m] = from.slice(0, 7).split("-").map(Number);
    for (let guard = 0; guard < 60; guard++) {
      const ym = `${y}-${String(m).padStart(2, "0")}`;
      months.push(ym);
      if (ym >= end) break;
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    return months;
  }, [projectStart]);

  // Fetch production records, kit records, defective meters count & shipment batches
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setSyncError(null);
    try {
      const since = new Date(Date.now() - 35 * DAY_MS).toISOString();
      const [prodRes, kitRes, defectMetersRes, batchesRes, settingsRes, stopRes] = await Promise.allSettled([
        supabase
          .from("production_records")
          .select("*")
          .eq("line", line)
          .order("date", { ascending: false }),
        supabase
          .from("kit_meters")
          .select("*")
          .eq("line", line)
          .order("date", { ascending: false }),
        // Only meters still out of the line count as lost (not ones returned after repair)
        supabase
          .from("defective_meters")
          .select("id", { count: "exact", head: true })
          .eq("line", line)
          .neq("status", "RETURNED_TO_LINE"),
        supabase.from("shipment_batches").select("*").eq("line", line).order("shipment_date", { ascending: false }),
        supabase.from(SETTINGS_TABLE).select("value").eq("key", SETTINGS_KEY).maybeSingle(),
        supabase
          .from("stoppages")
          .select("stage_id, stopped_at, resumed_at, reason_code")
          .eq("line", line)
          .gte("stopped_at", since),
      ]);

      if (stopRes.status === "fulfilled" && !stopRes.value.error) {
        setStoppages(stopRes.value.data || []);
      }

      if (settingsRes.status === "fulfilled") {
        const { data, error } = settingsRes.value;
        setTargetsShared(!error);
        if (!error && data?.value) applyTargets(data.value);
      } else {
        setTargetsShared(false);
      }

      if (prodRes.status === "fulfilled" && prodRes.value.data) {
        setRecords(prodRes.value.data);
      }

      if (
        kitRes.status === "fulfilled" &&
        kitRes.value.data &&
        kitRes.value.data.length > 0
      ) {
        setKitRecords(kitRes.value.data);
        try {
          localStorage.setItem(
            KITS_CACHE_KEY,
            JSON.stringify(kitRes.value.data),
          );
        } catch (_) {}
      } else {
        try {
          const cached = localStorage.getItem(KITS_CACHE_KEY);
          if (cached) setKitRecords(JSON.parse(cached));
        } catch (_) {}
      }

      // Shipment batches from database
      if (batchesRes.status === "fulfilled" && batchesRes.value.data) {
        setShipmentBatches(batchesRes.value.data);
      }

      // Update Defect Meters Count from live database
      if (defectMetersRes.status === "fulfilled") {
        if (typeof defectMetersRes.value.count === "number") {
          setDefectiveMetersCount(defectMetersRes.value.count);
        }
      } else {
        try {
          const cached = localStorage.getItem(DEFECTS_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) setDefectiveMetersCount(parsed.length);
          }
        } catch (_) {}
      }

      setLastSyncedAt(new Date());
    } catch (e) {
      console.warn("Error fetching management dashboard records:", e);
      setSyncError("Failed to fetch live records. Operating with cached data.");
      try {
        const cached = localStorage.getItem(KITS_CACHE_KEY);
        if (cached) setKitRecords(JSON.parse(cached));
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  }, [applyTargets]);

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: SETTINGS_TABLE },
        triggerDebouncedFetch,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stoppages" },
        triggerDebouncedFetch,
      )
      .subscribe();

    // 2. Storage event listener (cross-tab sync)
    const handleStorageChange = (e) => {
      if (
        e.key === DEFECTS_CACHE_KEY ||
        e.key === KITS_CACHE_KEY ||
        e.key === STORAGE_TARGETS_KEY
      ) {
        triggerDebouncedFetch();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // 3. Light safety refresh every 5 minutes (realtime covers live changes)
    const pollInterval = setInterval(() => {
      fetchRecords();
    }, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(pollInterval);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [fetchRecords]);

  // Dates for Daily and Weekly calculations
  const todayStr = getTodayString();

  // A day counts toward the target once it is over — or today, once both shifts reported.
  const lastCompleteDate = useMemo(() => {
    const todayShifts = new Set(
      records.filter((r) => r.date === todayStr).map((r) => getRecordShift(r)),
    );
    return todayShifts.has("Morning") && todayShifts.has("Evening")
      ? todayStr
      : addDays(todayStr, -1);
  }, [records, todayStr]);
  const activeDate =
    selectedDate || (records.length > 0 ? records[0].date : todayStr);

  const weekStartDateStr = useMemo(() => {
    const base = activeDate ? new Date(activeDate) : new Date();
    base.setDate(base.getDate() - 6);
    return toLocalDateStr(base);
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

    const shiftSum = (shift) =>
      dailyRecords
        .filter((r) => getRecordShift(r) === shift)
        .reduce((sum, r) => sum + (parseInt(r.achieved, 10) || 0), 0);
    const morningActual = shiftSum("Morning");
    const eveningActual = shiftSum("Evening");
    const shiftsReported = [morningActual, eveningActual].filter((v) => v > 0).length || 1;
    const shiftActual = Math.round(dailyActual / shiftsReported);
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
      morningActual,
      eveningActual,
      morningPct: targets.shiftProd > 0 ? (morningActual / targets.shiftProd) * 100 : 0,
      eveningPct: targets.shiftProd > 0 ? (eveningActual / targets.shiftProd) * 100 : 0,
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

    const fwShiftSum = (shift) =>
      dailyRecords
        .filter((r) => getRecordShift(r) === shift)
        .reduce((sum, r) => sum + (parseInt(r.updated_fw_qty, 10) || 0), 0);
    const morningActual = fwShiftSum("Morning");
    const eveningActual = fwShiftSum("Evening");
    const shiftsReported = [morningActual, eveningActual].filter((v) => v > 0).length || 1;
    const shiftActual = Math.round(dailyActual / shiftsReported);
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
      morningActual,
      eveningActual,
    };
  }, [records, activeDate, weekStartDateStr, targets]);

  // Monthly Dynamic Production Recovery Engine
  const recoveryAnalysis = useMemo(() => {
    const ym = selectedRecoveryMonth || getTodayString().slice(0, 7);
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

    // Month window starts on the 1st, or on the project start day in its first month
    const firstDay = projectStart > trackingStart ? projectStart : trackingStart;
    const startDay = firstDay.slice(0, 7) === ym ? parseInt(firstDay.slice(8, 10), 10) : 1;
    const startDate = `${ym}-${String(startDay).padStart(2, "0")}`;

    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const endDate = `${ym}-${String(lastDayOfMonth).padStart(2, "0")}`;

    const totalDaysInMonthWindow = lastDayOfMonth - startDay + 1;
    const monthFullTarget = totalDaysInMonthWindow * targets.dailyProd;

    const monthRecords = records.filter(
      (r) => r.date >= startDate && r.date <= endDate,
    );
    const windowEnd = lastCompleteDate < endDate ? lastCompleteDate : endDate;

    const actualInPeriod = monthRecords
      .filter((r) => r.date <= windowEnd)
      .reduce((sum, r) => sum + (parseInt(r.achieved, 10) || 0), 0);
    const fwInPeriod = monthRecords.reduce(
      (sum, r) => sum + (parseInt(r.updated_fw_qty, 10) || 0),
      0,
    );

    // Every calendar day counts (the line works 7 days a week): a day with no
    // report is lost production, not a skipped day.
    const latestDate = lastCompleteDate < endDate ? lastCompleteDate : endDate;
    const elapsedDays = latestDate < startDate ? 0 : diffDays(startDate, latestDate) + 1;
    const targetInPeriod = elapsedDays * targets.dailyProd;
    const missingTarget = Math.max(0, targetInPeriod - actualInPeriod);
    const isTargetAchieved =
      elapsedDays > 0 ? actualInPeriod >= targetInPeriod : true;
    const achievementRate =
      targetInPeriod > 0 ? (actualInPeriod / targetInPeriod) * 100 : 0;
    const monthOverallPct =
      monthFullTarget > 0 ? (actualInPeriod / monthFullTarget) * 100 : 0;

    const remainingDaysInMonth = Math.max(
      1,
      diffDays(latestDate < startDate ? addDays(startDate, -1) : latestDate, endDate),
    );
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

    const periodLabel =
      elapsedDays > 0 ? `${formatD(startDate)} — ${formatD(latestDate)}` : formatD(startDate);
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
  }, [records, targets, selectedRecoveryMonth, recoveryHorizonDays, projectStart, lastCompleteDate]);

  // Nama dispatch plan — real batches with their stage (defined / FAT / delivered)
  const namaDispatchPlan = useMemo(() => {
    return (shipmentBatches || []).map((sb, idx) => {
      const stage = getBatchStage(sb);
      return {
        id: sb.id ?? idx,
        batch: sb.batch_name || `Batch ${idx + 1}`,
        qty: parseInt(sb.total_meters, 10) || 0,
        stage: stage.key,
        stageInfo: stage,
        date: getBatchStageDate(sb, stage.key),
        definedDate: getBatchDefinedDate(sb),
        notes: sb.notes || "",
      };
    });
  }, [shipmentBatches]);

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
    const actualDefects = defectMetrics.actualPhysicalDefects ?? 0;
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

  // Daily totals by date
  const dailyTotals = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      if (!r.date) return;
      if (!map[r.date]) map[r.date] = { achieved: 0, fw: 0 };
      map[r.date].achieved += parseInt(r.achieved, 10) || 0;
      map[r.date].fw += parseInt(r.updated_fw_qty, 10) || 0;
    });
    return map;
  }, [records]);

  const lastDataDate = lastCompleteDate < projectStart ? projectStart : lastCompleteDate;

  // Executive Burn-up: every calendar day from project start (days with no report = 0)
  const burnupData = useMemo(() => {
    const out = [];
    const end = lastDataDate > projectStart ? lastDataDate : projectStart;
    const total = Math.min(diffDays(projectStart, end), 1000);
    let cumActual = 0;
    let cumFw = 0;
    for (let i = 0; i <= total; i++) {
      const d = addDays(projectStart, i);
      const day = dailyTotals[d] || { achieved: 0, fw: 0 };
      cumActual += day.achieved;
      cumFw += day.fw;
      out.push({
        date: d,
        actual: cumActual,
        fw: cumFw,
        target: Math.min(targets.overallProd, (i + 1) * targets.dailyProd),
        dayActual: day.achieved,
        dayFw: day.fw,
      });
    }
    return out;
  }, [dailyTotals, projectStart, lastDataDate, targets.dailyProd, targets.overallProd]);


  // Completion forecast (daily target, 7 days a week, no holidays)
  const forecast = useMemo(() => {
    const daily = targets.dailyProd || 1;
    const total = targets.overallProd || 0;
    const completed = productionMetrics.overallCompleted;
    const remaining = Math.max(0, total - completed);
    const plannedDays = Math.ceil(total / daily);
    const plannedFinish = addDays(projectStart, plannedDays - 1);

    const elapsed = Math.max(1, diffDays(projectStart, lastDataDate) + 1);
    const targetToDate = Math.min(total, elapsed * daily);
    const completedToDate = Object.entries(dailyTotals)
      .filter(([d]) => d <= lastDataDate)
      .reduce((sum, [, v]) => sum + v.achieved, 0);
    const variance = completedToDate - targetToDate; // + ahead / − behind
    const varianceDays = variance / daily;

    // Last 7 calendar days ending at the last reported day (missing days count as 0)
    let last7 = 0;
    for (let i = 0; i < 7; i++) last7 += dailyTotals[addDays(lastDataDate, -i)]?.achieved || 0;
    const windowDays = Math.min(7, elapsed);
    const recentRate = windowDays > 0 ? last7 / windowDays : 0;
    const overallRate = completedToDate / elapsed;

    const projectedDays = recentRate > 0 ? Math.ceil(remaining / recentRate) : null;
    const projectedFinish =
      remaining === 0 ? lastDataDate : projectedDays != null ? addDays(lastDataDate, projectedDays) : null;
    const finishAtTargetRate = addDays(lastDataDate, Math.ceil(remaining / daily));
    const daysLeftToPlan = diffDays(lastDataDate, plannedFinish);
    const requiredRate =
      remaining === 0 ? 0 : daysLeftToPlan > 0 ? Math.ceil(remaining / daysLeftToPlan) : remaining;
    const slipDays = projectedFinish ? diffDays(plannedFinish, projectedFinish) : null;

    return {
      projectStart,
      lastDataDate,
      dailyTarget: daily,
      total,
      completed,
      remaining,
      plannedDays,
      plannedFinish,
      elapsedDays: elapsed,
      targetToDate,
      variance,
      varianceDays,
      recentRate: Math.round(recentRate),
      overallRate: Math.round(overallRate),
      projectedFinish,
      finishAtTargetRate,
      daysLeftToPlan,
      requiredRate,
      slipDays,
      onTrack: slipDays != null && slipDays <= 0,
      completedToDate,
      openingLumpDate: projectStart < trackingStart ? addDays(trackingStart, -1) : null,
      scheduleAdherencePct: targetToDate > 0 ? (completedToDate / targetToDate) * 100 : 100,
    };
  }, [targets.dailyProd, targets.overallProd, productionMetrics.overallCompleted, projectStart, lastDataDate, dailyTotals]);

  // Per-date, per-shift production (for the daily chart and shift alerts)
  const shiftTotals = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      if (!r.date) return;
      if (!map[r.date]) map[r.date] = { Morning: 0, Evening: 0, Unknown: 0, fw: 0 };
      const sh = getRecordShift(r) || "Unknown";
      map[r.date][sh] += parseInt(r.achieved, 10) || 0;
      map[r.date].fw += parseInt(r.updated_fw_qty, 10) || 0;
    });
    return map;
  }, [records]);

  // Last 30 calendar days up to today (today may be partial)
  const dailySeries = useMemo(() => {
    const out = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(todayStr, -i);
      if (d < projectStart) continue;
      const t = shiftTotals[d] || { Morning: 0, Evening: 0, Unknown: 0, fw: 0 };
      out.push({
        date: d,
        morning: t.Morning,
        evening: t.Evening,
        other: t.Unknown,
        total: t.Morning + t.Evening + t.Unknown,
        fw: t.fw,
        isToday: d === todayStr,
        isLump: d === addDays(trackingStart, -1) && projectStart < trackingStart,
      });
    }
    return out;
  }, [shiftTotals, todayStr, projectStart]);

  // Downtime minutes per day (last 30 days) and by station for yesterday / last 7 days
  const downtimeSummary = useMemo(() => {
    const byDate = {};
    const byStage7 = {};
    const weekStart = addDays(lastCompleteDate, -6);
    stoppages.forEach((st) => {
      if (!st.stopped_at) return;
      const start = new Date(st.stopped_at);
      const end = st.resumed_at ? new Date(st.resumed_at) : new Date();
      const mins = Math.max(0, Math.round((end - start) / 60000));
      const d = toLocalDateStr(start);
      byDate[d] = (byDate[d] || 0) + mins;
      if (d >= weekStart && d <= lastCompleteDate) {
        const k = st.stage_id || "Unknown";
        byStage7[k] = (byStage7[k] || 0) + mins;
      }
    });
    const topStage7 = Object.entries(byStage7).sort((a, b) => b[1] - a[1])[0] || null;
    const week = Object.entries(byDate)
      .filter(([d]) => d >= weekStart && d <= lastCompleteDate)
      .reduce((s2, [, m]) => s2 + m, 0);
    const ongoing = stoppages.filter((st) => st.stopped_at && !st.resumed_at);
    return {
      byDate,
      lastDayMinutes: byDate[lastCompleteDate] || 0,
      weekMinutes: week,
      topStage7: topStage7 ? { stage: topStage7[0], minutes: topStage7[1] } : null,
      ongoing: ongoing.map((o) => o.stage_id),
    };
  }, [stoppages, lastCompleteDate]);

  return {
    records,
    kitRecords,
    shipmentBatches,
    loading,
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
    dailySeries,
    shiftTotals,
    downtimeSummary,
    lastCompleteDate,
    forecast,
    projectStart,
    targetsShared,
    fetchRecords,
  };
}
