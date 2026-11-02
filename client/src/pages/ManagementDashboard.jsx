import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  Layers, 
  Cpu, 
  CheckCircle2, 
  TrendingUp, 
  Calendar, 
  Clock, 
  ArrowLeft, 
  RefreshCw,
  Target,
  BarChart3,
  Award,
  Zap,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Package,
  ArrowUpRight,
  Radio
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getBatchStatus } from '../utils/kitStatus';

export default function ManagementDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [kitRecords, setKitRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedRecoveryMonth, setSelectedRecoveryMonth] = useState('2026-10');
  const [recoveryHorizonDays, setRecoveryHorizonDays] = useState('month_end');

  // Defective Meters count logged live from the Defect Meters tracking system
  const [defectiveMetersCount, setDefectiveMetersCount] = useState(() => {
    try {
      const cached = localStorage.getItem('ectron_defective_meters_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed.length;
      }
    } catch (_) {}
    return 0;
  });

  // Available Recovery Months
  const availableRecoveryMonths = useMemo(() => {
    const monthSet = new Set(['2026-10', '2026-11', '2026-12']);
    records.forEach(r => {
      if (r.date && r.date.length >= 7) {
        const ym = r.date.slice(0, 7);
        if (ym >= '2026-10') monthSet.add(ym);
      }
    });
    return Array.from(monthSet).sort();
  }, [records]);

  // Targets requested by Management
  const [targets, setTargets] = useState({
    overallProd: 300000,
    weeklyProd: 9100,
    dailyProd: 1300,
    shiftProd: 650,
    overallFw: 70000,
    weeklyFw: 8400,
    dailyFw: 1200,
    shiftFw: 600,
  });

  // Fetch production records, kit records & defective meters count
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const [prodRes, kitRes, defectMetersRes] = await Promise.allSettled([
        supabase.from('production_records').select('*').order('date', { ascending: false }),
        supabase.from('kit_meters').select('*').order('date', { ascending: false }),
        supabase.from('defective_meters').select('id', { count: 'exact' })
      ]);

      if (prodRes.status === 'fulfilled' && prodRes.value.data) {
        setRecords(prodRes.value.data);
        if (prodRes.value.data.length > 0 && !selectedDate) {
          setSelectedDate(prodRes.value.data[0].date);
        }
      }

      if (kitRes.status === 'fulfilled' && kitRes.value.data && kitRes.value.data.length > 0) {
        setKitRecords(kitRes.value.data);
        try {
          localStorage.setItem('ectron_kit_meters_records', JSON.stringify(kitRes.value.data));
        } catch (_) {}
      } else {
        try {
          const cached = localStorage.getItem('ectron_kit_meters_records');
          if (cached) setKitRecords(JSON.parse(cached));
        } catch (_) {}
      }

      // Update Defect Meters Count from live database
      if (defectMetersRes.status === 'fulfilled') {
        const count = typeof defectMetersRes.value.count === 'number'
          ? defectMetersRes.value.count
          : (defectMetersRes.value.data ? defectMetersRes.value.data.length : 0);
        setDefectiveMetersCount(count);
      } else {
        try {
          const cached = localStorage.getItem('ectron_defective_meters_cache');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) setDefectiveMetersCount(parsed.length);
          }
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Error fetching management dashboard records:', e);
      try {
        const cached = localStorage.getItem('ectron_kit_meters_records');
        if (cached) setKitRecords(JSON.parse(cached));
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // ── Realtime Live Defect Meters Subscription & Polling ──
  useEffect(() => {
    // 1. Supabase Realtime Channel
    const channel = supabase
      .channel('mgmt_live_defect_meters_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'defective_meters' },
        async () => {
          try {
            const { count, data } = await supabase
              .from('defective_meters')
              .select('id', { count: 'exact' });
            const liveCount = typeof count === 'number' ? count : (data ? data.length : 0);
            setDefectiveMetersCount(liveCount);
          } catch (e) {
            console.warn('Live defect meters update failed:', e);
          }
        }
      )
      .subscribe();

    // 2. Storage event listener (cross-tab sync if user adds defect meter in DefectMeters tab)
    const handleStorageChange = (e) => {
      if (e.key === 'ectron_defective_meters_cache' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setDefectiveMetersCount(parsed.length);
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 3. Fallback Polling every 10 seconds for seamless live updates
    const pollInterval = setInterval(async () => {
      try {
        const { count, data } = await supabase
          .from('defective_meters')
          .select('id', { count: 'exact' });
        const liveCount = typeof count === 'number' ? count : (data ? data.length : 0);
        setDefectiveMetersCount(prev => (prev !== liveCount ? liveCount : prev));
      } catch (_) {}
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, []);

  // Dates for Daily and Weekly calculations
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const activeDate = selectedDate || (records.length > 0 ? records[0].date : todayStr);

  // Calculate 7-day range relative to activeDate
  const weekStartDateStr = useMemo(() => {
    const base = activeDate ? new Date(activeDate) : new Date();
    base.setDate(base.getDate() - 6);
    return base.toISOString().slice(0, 10);
  }, [activeDate]);

  // Unique dates for dropdown
  const availableDates = useMemo(() => {
    const set = new Set(records.map(r => r.date));
    return Array.from(set).sort().reverse();
  }, [records]);

  // Compute Production Metrics directly from Supabase tables
  const productionMetrics = useMemo(() => {
    // 1. Total completed purely from database records (achieved / Final OK)
    const overallProductionCompleted = records.reduce((sum, r) => sum + (parseInt(r.achieved, 10) || 0), 0);
    const overallAchievementPct = targets.overallProd > 0 ? ((overallProductionCompleted / targets.overallProd) * 100) : 0;

    // 2. Weekly Production (7-day window ending at activeDate)
    const weeklyRecords = records.filter(r => r.date >= weekStartDateStr && r.date <= activeDate);
    const weeklyActual = weeklyRecords.reduce((sum, r) => sum + (parseInt(r.achieved, 10) || 0), 0);
    const weeklyAchievementPct = targets.weeklyProd > 0 ? ((weeklyActual / targets.weeklyProd) * 100) : 0;

    // 3. Daily Production (for activeDate)
    const dailyRecords = records.filter(r => r.date === activeDate);
    const dailyActual = dailyRecords.reduce((sum, r) => sum + (parseInt(r.achieved, 10) || 0), 0);
    const dailyAchievementPct = targets.dailyProd > 0 ? ((dailyActual / targets.dailyProd) * 100) : 0;

    // 4. Shift Production (assumed 2 shifts per active day)
    const shiftActual = Math.round(dailyActual / 2);
    const shiftAchievementPct = targets.shiftProd > 0 ? ((shiftActual / targets.shiftProd) * 100) : 0;

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
      activeDate
    };
  }, [records, activeDate, weekStartDateStr, targets]);

  // Compute Firmware Metrics directly from Supabase tables
  const fwMetrics = useMemo(() => {
    // 1. Overall FW completed from records
    const totalFwCompleted = records.reduce((sum, r) => sum + (parseInt(r.updated_fw_qty, 10) || 0), 0);
    const overallAchievementPct = targets.overallFw > 0 ? ((totalFwCompleted / targets.overallFw) * 100) : 0;

    // 2. Weekly FW (7-day window ending at activeDate)
    const weeklyRecords = records.filter(r => r.date >= weekStartDateStr && r.date <= activeDate);
    const weeklyActual = weeklyRecords.reduce((sum, r) => sum + (parseInt(r.updated_fw_qty, 10) || 0), 0);
    const weeklyAchievementPct = targets.weeklyFw > 0 ? ((weeklyActual / targets.weeklyFw) * 100) : 0;

    // 3. Daily FW (for activeDate)
    const dailyRecords = records.filter(r => r.date === activeDate);
    const dailyActual = dailyRecords.reduce((sum, r) => sum + (parseInt(r.updated_fw_qty, 10) || 0), 0);
    const dailyAchievementPct = targets.dailyFw > 0 ? ((dailyActual / targets.dailyFw) * 100) : 0;

    // 4. Shift FW (2 shifts)
    const shiftActual = Math.round(dailyActual / 2);
    const shiftAchievementPct = targets.shiftFw > 0 ? ((shiftActual / targets.shiftFw) * 100) : 0;

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

  // ─── 4. Monthly Dynamic Production Recovery Engine ───────────────────────────
  const recoveryAnalysis = useMemo(() => {
    const ym = selectedRecoveryMonth || '2026-10';
    const [yearStr, monthStr] = ym.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[month - 1] || ym;

    // For October 2026, factory sprint began specifically on 2-Oct as per executive directive
    // For other months (e.g., November, December), it starts on day 1
    const startDay = (ym === '2026-10') ? 2 : 1;
    const startDate = `${ym}-${String(startDay).padStart(2, '0')}`;

    // Last day of month
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const endDate = `${ym}-${String(lastDayOfMonth).padStart(2, '0')}`;

    // Total calendar days in this sprint window
    const totalDaysInMonthWindow = (lastDayOfMonth - startDay + 1);
    const monthFullTarget = totalDaysInMonthWindow * targets.dailyProd;

    // Filter records belonging to this month window
    const monthRecords = records.filter(r => r.date >= startDate && r.date <= endDate);
    const uniqueDates = Array.from(new Set(monthRecords.map(r => r.date))).sort();

    // Actual achieved in this month
    const actualInPeriod = monthRecords.reduce((sum, r) => sum + (parseInt(r.achieved, 10) || 0), 0);
    const fwInPeriod = monthRecords.reduce((sum, r) => sum + (parseInt(r.updated_fw_qty, 10) || 0), 0);

    // Latest recorded date
    const latestDate = uniqueDates.length > 0 ? uniqueDates[uniqueDates.length - 1] : startDate;
    const elapsedDays = uniqueDates.length;

    // Expected target up to latest recorded date:
    const targetInPeriod = elapsedDays * targets.dailyProd;
    const missingTarget = Math.max(0, targetInPeriod - actualInPeriod);
    const isTargetAchieved = elapsedDays > 0 ? (actualInPeriod >= targetInPeriod) : true;
    const achievementRate = targetInPeriod > 0 ? (actualInPeriod / targetInPeriod) * 100 : 0;
    const monthOverallPct = monthFullTarget > 0 ? ((actualInPeriod / monthFullTarget) * 100) : 0;

    // Remaining days to end of month:
    // From latest recorded day to the end of month
    const latestDayNum = uniqueDates.length > 0 ? parseInt(latestDate.split('-')[2], 10) : (startDay - 1);
    const remainingDaysInMonth = Math.max(1, lastDayOfMonth - latestDayNum);

    // Remaining total meters to hit full month target:
    const remainingToMonthTarget = Math.max(0, monthFullTarget - actualInPeriod);

    // Determine recoveryDays based on selection:
    let recoveryDays = remainingDaysInMonth;
    if (recoveryHorizonDays !== 'month_end') {
      const parsedDays = parseInt(recoveryHorizonDays, 10);
      if (!isNaN(parsedDays) && parsedDays > 0) {
        recoveryDays = parsedDays;
      }
    }

    // Required daily rate to close the deficit / reach the target:
    const dailyCatchUp = (missingTarget > 0 && recoveryDays > 0) ? Math.ceil(missingTarget / recoveryDays) : 0;
    const shiftCatchUp = Math.ceil(dailyCatchUp / 2);
    const revisedDailyTarget = targets.dailyProd + dailyCatchUp;
    const revisedShiftTarget = Math.ceil(revisedDailyTarget / 2);

    // Format human-readable period label
    const formatD = (dStr) => {
      if (!dStr) return '';
      const parts = dStr.split('-');
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
      recoveryDays
    };
  }, [records, targets, selectedRecoveryMonth, recoveryHorizonDays]);

  // ─── 5. Dispatched to Nama / Field Schedule ──────────────────────────────────
  const namaDispatchPlan = useMemo(() => [
    {
      batch: 'Batch 1',
      date: 'Completed (1-Oct)',
      qty: 8480,
      status: 'Delivered',
      statusClass: 'badge-green',
      icon: '✅',
      notes: 'Dispatched to Nama / Field'
    },
    {
      batch: 'Batch 2',
      date: '15-Oct-2026',
      qty: 12000,
      status: 'Ready / Pending Dispatch',
      statusClass: 'badge-admin',
      icon: '⏳',
      notes: 'Scheduled for Nama Field release'
    },
    {
      batch: 'Batch 3',
      date: '22-Oct-2026',
      qty: 13920,
      status: 'In Production Pipeline',
      statusClass: 'badge-amber',
      icon: '⚡',
      notes: 'Next scheduled delivery'
    },
    {
      batch: 'Batch 4',
      date: '29-Oct-2026',
      qty: 15625,
      status: 'Planned',
      statusClass: 'badge-purple',
      icon: '📦',
      notes: 'Final planned October batch'
    }
  ], []);

  // ─── 6. Kit Meters Delivery & Supply Pipeline ────────────────────────────────
  const kitMetrics = useMemo(() => {
    let receivedKits = 0;
    let plannedKits = 0;
    let receivedBatches = 0;
    let plannedBatches = 0;
    let threePhaseKits = 0;
    let singlePhaseKits = 0;

    const plannedList = [];

    kitRecords.forEach(r => {
      const qty = parseInt(r.kit_quantity ?? r.quantity, 10) || 0;
      const status = getBatchStatus(r.date, r.notes);
      
      const is3Phase = (r.product_name === 'Three Phase' || r.meter_type === '3-Phase' || r.type === '3-Phase');
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
          qty
        });
      } else {
        receivedBatches += 1;
        receivedKits += qty;
      }
    });

    // Sort planned batches ascending by date to always pick the earliest upcoming shipment from database
    plannedList.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
    const nextIncomingBatch = plannedList.length > 0 ? plannedList[0].record : null;
    const nearestIncomingDays = plannedList.length > 0 ? plannedList[0].daysDiff : null;

    const totalBatches = kitRecords.length;
    const totalKits = receivedKits + plannedKits;
    const receivedPct = totalKits > 0 ? ((receivedKits / totalKits) * 100) : 0;
    const plannedPct = totalKits > 0 ? ((plannedKits / totalKits) * 100) : 0;

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
      nextIncomingBatch
    };
  }, [kitRecords]);

  // ─── 7. Defect Calibration Metrics (4,250 Base Previous + Live Defect Meters) ──
  const defectMetrics = useMemo(() => {
    const BASE_PREVIOUS_ACTUAL = 4250;
    // Base previous actual defect count (4,250) + live registered meters in Defect Meters page
    const liveLogged = defectiveMetersCount || 0;
    const actualPhysicalDefects = BASE_PREVIOUS_ACTUAL + liveLogged;

    let totalReportedKO = 0;
    records.forEach(r => {
      if (Array.isArray(r.stations) && r.stations.length > 0) {
        r.stations.forEach(st => {
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

    const calibrationRatio = totalReportedKO > 0 ? (actualPhysicalDefects / totalReportedKO) : 0;
    const totalRepairedMeters = Math.max(0, totalReportedKO - actualPhysicalDefects);
    const repairRatePct = totalReportedKO > 0 ? ((totalRepairedMeters / totalReportedKO) * 100) : 0;

    return {
      baseActualDefects: BASE_PREVIOUS_ACTUAL,
      liveLoggedDefects: liveLogged,
      actualPhysicalDefects,
      totalReportedKO,
      calibrationRatio,
      totalRepairedMeters,
      repairRatePct
    };
  }, [records, defectiveMetersCount]);

  // ─── 8. Top 4 Recurring Defect Codes from Production Reports ────────────────
  const topDefectCodes = useMemo(() => {
    const codeMap = {};
    const codeStationCounts = {};
    let totalOccurrences = 0;

    // Helper to format station info clearly in English
    const getStationDetails = (code, rawStation) => {
      const cleanCode = String(code || '').replace(/^-/, '').trim();
      const st = String(rawStation || '').toLowerCase();

      if (st.includes('rf') || st.includes('rayonne') || ['910', '640', '920'].includes(cleanCode)) {
        return {
          en: 'RF Test Station (Test Rayonné RF)',
          badge: 'RF Test'
        };
      }
      if (st.includes('multi') || ['312', '335', '344', '214', '329', '361'].includes(cleanCode)) {
        return {
          en: 'Multi-Test Workstation',
          badge: 'Multi-Test'
        };
      }
      if (st.includes('assembly') || ['576', '577', '001', '00', '002'].includes(cleanCode)) {
        return {
          en: 'Assembly Line Station',
          badge: 'Assembly'
        };
      }
      if (st.includes('cal') || ['171', '172', '173', '911'].includes(cleanCode)) {
        return {
          en: 'Calibration Workstation (CAL2)',
          badge: 'Calibration'
        };
      }
      if (st.includes('insul') || cleanCode === '656') {
        return {
          en: 'Insulation Test Station',
          badge: 'Insulation'
        };
      }
      if (st.includes('perso') || cleanCode === '613') {
        return {
          en: 'Personalization Station (Perso)',
          badge: 'Perso'
        };
      }
      return {
        en: rawStation || 'Production Line Station',
        badge: rawStation || 'Production'
      };
    };

    records.forEach(r => {
      // 1. Map stations to codes from stations array
      if (Array.isArray(r.stations)) {
        r.stations.forEach(st => {
          const stName = st.stationName || st.bench || '';
          ['top1', 'top2', 'top3'].forEach((k, idx) => {
            const qtyKey = ['qty1', 'qty2', 'qty3'][idx];
            const code = String(st[k] || '').trim();
            const qty = parseInt(st[qtyKey], 10) || 0;
            if (code && qty > 0 && stName) {
              if (!codeStationCounts[code]) codeStationCounts[code] = {};
              codeStationCounts[code][stName] = (codeStationCounts[code][stName] || 0) + qty;
            }
          });
        });
      }

      // 2. Aggregate occurrences from defects array
      if (Array.isArray(r.defects)) {
        r.defects.forEach(d => {
          const code = String(d?.code || '').trim();
          const qty = parseInt(d?.qty, 10) || 0;
          if (code && qty > 0) {
            codeMap[code] = (codeMap[code] || 0) + qty;
            totalOccurrences += qty;
          }
        });
      }

      // 3. Fallback to stations defects if record has no defects array
      if ((!r.defects || r.defects.length === 0) && Array.isArray(r.stations)) {
        r.stations.forEach(st => {
          ['top1', 'top2', 'top3'].forEach((k, idx) => {
            const qtyKey = ['qty1', 'qty2', 'qty3'][idx];
            const code = String(st[k] || '').trim();
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
      const pct = totalOccurrences > 0 ? ((item.qty / totalOccurrences) * 100) : 0;
      
      // Determine primary station
      const stMap = codeStationCounts[item.code] || {};
      const sortedSt = Object.entries(stMap).sort((a, b) => b[1] - a[1]);
      const primaryRawStation = sortedSt[0] ? sortedSt[0][0] : '';
      const stationInfo = getStationDetails(item.code, primaryRawStation);

      return {
        rank: idx + 1,
        code: item.code,
        qty: item.qty,
        pct,
        stationName: stationInfo.en,
        stationBadge: stationInfo.badge
      };
    });

    const top4Sum = top4.reduce((s, it) => s + it.qty, 0);
    const top4SharePct = totalOccurrences > 0 ? ((top4Sum / totalOccurrences) * 100) : 0;

    return {
      top4,
      totalOccurrences,
      top4Sum,
      top4SharePct
    };
  }, [records]);

  // ─── 8. Kit Stock & Operational Runway Metrics ───────────────────────────────
  const kitRunwayMetrics = useMemo(() => {
    const received = kitMetrics.receivedKits || 0;
    const achieved = productionMetrics.overallCompleted || 0;
    const actualDefects = defectMetrics.actualPhysicalDefects || 4250;
    const consumed = achieved + actualDefects;
    const remaining = Math.max(0, received - consumed);

    const dailyRate = 1200; // Fixed consumption rate: 1,200 meters/day
    const runwayDays = dailyRate > 0 ? (remaining / dailyRate) : 0;
    const consumedPct = received > 0 ? ((consumed / received) * 100) : 0;
    const remainingPct = received > 0 ? ((remaining / received) * 100) : 0;

    return {
      received,
      achieved,
      actualDefects,
      consumed,
      remaining,
      dailyRate,
      runwayDays,
      consumedPct,
      remainingPct
    };
  }, [kitMetrics.receivedKits, productionMetrics.overallCompleted, defectMetrics.actualPhysicalDefects]);

  // Status Badge Logic
  const getStatusBadge = (pct) => {
    if (pct >= 95) return { label: 'ON TRACK (Exceeding)', bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
    if (pct >= 75) return { label: 'HEALTHY (Near Target)', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
    if (pct >= 50) return { label: 'ATTENTION (Moderate)', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
    return { label: 'BEHIND SCHEDULE', bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' };
  };

  const projectStatus = getStatusBadge(productionMetrics.weeklyPct);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Top Header Navigation ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ 
              background: 'linear-gradient(135deg, #192e5b, #00afaa)', 
              color: 'white', 
              padding: '6px 10px', 
              borderRadius: 8, 
              fontSize: '0.8rem', 
              fontWeight: 800, 
              letterSpacing: '0.04em' 
            }}>
              EXECUTIVE
            </span>
            <h1 className="page-title" style={{ margin: 0 }}>Management Dashboard</h1>
          </div>
          <p className="page-subtitle">3-Phase Production targets, Firmware milestones, and high-level project yield</p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {availableDates.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)' }}>
              <Calendar size={16} color="var(--teal)" />
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)' }}>Inspect Date:</label>
              <select
                value={activeDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.85rem', color: 'var(--navy)', cursor: 'pointer', outline: 'none' }}
              >
                {availableDates.map(d => (
                  <option key={d} value={d}>
                    {d} {d === todayStr ? '(Today)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button 
            type="button"
            className="btn-outline" 
            onClick={() => navigate('/dashboard')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: 'white' }}
          >
            <ArrowLeft size={16} />
            Back to Operations Dashboard
          </button>

          <button 
            type="button"
            className="btn-outline" 
            onClick={fetchRecords}
            title="Refresh Metrics"
            style={{ padding: '9px 12px', background: 'white' }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── 1. Overall Status & Percentage (Hero Header Banner) ── */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #192e5b 100%)', 
        color: '#f8fafc', 
        borderRadius: 16, 
        padding: '28px 32px',
        boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.4)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderTop: '4px solid #00afaa'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 54, height: 54, borderRadius: 14, background: 'rgba(0, 175, 170, 0.2)', border: '1.5px solid #00afaa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={30} color="#00afaa" />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                Program Executive Overview
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0', color: '#ffffff' }}>
                3-Phase Smart Meters Rollout (300K Contract)
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ 
              background: projectStatus.bg, 
              color: projectStatus.color, 
              border: `1px solid ${projectStatus.border}`,
              padding: '8px 16px',
              borderRadius: 20,
              fontSize: '0.85rem',
              fontWeight: 800,
              letterSpacing: '0.03em'
            }}>
              ● Status: {projectStatus.label}
            </span>
          </div>
        </div>

        {/* Major Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>
              Total Completed: <b style={{ color: '#38bdf8', fontSize: '1.2rem' }}>{productionMetrics.overallCompleted.toLocaleString()}</b> / {productionMetrics.overallTarget.toLocaleString()} Meters
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>
              {productionMetrics.overallPct.toFixed(2)}% Completed
            </span>
          </div>

          <div style={{ height: 16, background: 'rgba(255,255,255,0.12)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              width: `${Math.min(100, productionMetrics.overallPct)}%`, 
              background: 'linear-gradient(90deg, #00afaa 0%, #10b981 100%)',
              borderRadius: 8,
              transition: 'width 0.6s ease'
            }} />
          </div>
        </div>
      </div>

      {/* ── 2. Production – 3-Phase Targets Hierarchy ── */}
      <div style={{
        background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        border: '1.5px solid #bfdbfe',
        borderTop: '4px solid #2563eb',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={22} color="#1d4ed8" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e3a8a' }}>
              Production — 3-Phase Target Hierarchy & Actuals
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Tracking cumulative, weekly, daily, and shift-level assembly line completion
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          {/* Card 1: Overall Target */}
          <div className="card-white" style={{ borderLeft: '4px solid var(--navy)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Overall Production Target</span>
              <Target size={18} color="var(--navy)" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--navy)', lineHeight: 1 }}>
              {productionMetrics.overallTarget.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 8 }}>
              Cumulative Delivered: <b style={{ color: '#16a34a' }}>{productionMetrics.overallCompleted.toLocaleString()}</b>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>Achievement:</span>
              <span style={{ fontWeight: 800, color: '#16a34a' }}>{productionMetrics.overallPct.toFixed(1)}%</span>
            </div>
          </div>

          {/* Card 2: Weekly Production Target */}
          <div className="card-white" style={{ borderLeft: '4px solid #3b82f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Weekly Target (7 Days)</span>
              <Calendar size={18} color="#3b82f6" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#1d4ed8', lineHeight: 1 }}>
              {productionMetrics.weeklyTarget.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 8 }}>
              Actual Produced ({weekStartDateStr} to {productionMetrics.activeDate}): <b style={{ color: '#1d4ed8' }}>{productionMetrics.weeklyActual.toLocaleString()}</b>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>Achievement:</span>
              <span style={{ fontWeight: 800, color: productionMetrics.weeklyPct >= 90 ? '#16a34a' : '#d97706' }}>
                {productionMetrics.weeklyPct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Card 3: Daily Production Target */}
          <div className="card-white" style={{ borderLeft: '4px solid var(--teal)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Daily Target</span>
              <Clock size={18} color="var(--teal)" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--teal-dark)', lineHeight: 1 }}>
              {productionMetrics.dailyTarget.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 8 }}>
              Actual Achieved ({productionMetrics.activeDate}): <b style={{ color: 'var(--teal-dark)' }}>{productionMetrics.dailyActual.toLocaleString()}</b>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>Achievement:</span>
              <span style={{ fontWeight: 800, color: productionMetrics.dailyPct >= 90 ? '#16a34a' : '#d97706' }}>
                {productionMetrics.dailyPct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Card 4: Shift Target */}
          <div className="card-white" style={{ borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Target per Shift (2 Shifts/Day)</span>
              <Zap size={18} color="#8b5cf6" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#7c3aed', lineHeight: 1 }}>
              {productionMetrics.shiftTarget.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 8 }}>
              Actual per Shift: <b style={{ color: '#7c3aed' }}>{productionMetrics.shiftActual.toLocaleString()}</b>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>Achievement:</span>
              <span style={{ fontWeight: 800, color: productionMetrics.shiftPct >= 90 ? '#16a34a' : '#d97706' }}>
                {productionMetrics.shiftPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Firmware (FW) Management ── */}
      <div style={{
        background: 'linear-gradient(180deg, #faf5ff 0%, #ffffff 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        border: '1.5px solid #e9d5ff',
        borderTop: '4px solid #9333ea',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={22} color="#7c3aed" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#581c87' }}>
              Firmware (FW) — Flashing Targets & Completion
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Monitoring flashing station throughput and meter software updates
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          {/* Card 1: Overall FW Target */}
          <div className="card-white" style={{ borderLeft: '4px solid #7c3aed' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Overall FW Target</span>
              <Target size={18} color="#7c3aed" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#7c3aed', lineHeight: 1 }}>
              {fwMetrics.overallTarget.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 8 }}>
              Total FW Completed: <b style={{ color: '#7c3aed' }}>{fwMetrics.overallCompleted.toLocaleString()}</b>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>Achievement:</span>
              <span style={{ fontWeight: 800, color: fwMetrics.overallPct >= 90 ? '#16a34a' : '#7c3aed' }}>
                {fwMetrics.overallPct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Card 2: Weekly FW Target */}
          <div className="card-white" style={{ borderLeft: '4px solid #a855f7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Weekly FW Target</span>
              <Calendar size={18} color="#a855f7" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#9333ea', lineHeight: 1 }}>
              {fwMetrics.weeklyTarget.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 8 }}>
              Actual FW Flashed ({weekStartDateStr} to {activeDate}): <b style={{ color: '#9333ea' }}>{fwMetrics.weeklyActual.toLocaleString()}</b>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>Achievement:</span>
              <span style={{ fontWeight: 800, color: fwMetrics.weeklyPct >= 90 ? '#16a34a' : '#d97706' }}>
                {fwMetrics.weeklyPct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Card 3: Daily FW Target */}
          <div className="card-white" style={{ borderLeft: '4px solid #ec4899' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Daily FW Target</span>
              <Clock size={18} color="#ec4899" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#db2777', lineHeight: 1 }}>
              {fwMetrics.dailyTarget.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 8 }}>
              Actual FW Flashed ({activeDate}): <b style={{ color: '#db2777' }}>{fwMetrics.dailyActual.toLocaleString()}</b>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>Achievement:</span>
              <span style={{ fontWeight: 800, color: fwMetrics.dailyPct >= 90 ? '#16a34a' : '#d97706' }}>
                {fwMetrics.dailyPct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Card 4: Shift FW Target */}
          <div className="card-white" style={{ borderLeft: '4px solid #f43f5e' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>FW Target per Shift</span>
              <Zap size={18} color="#f43f5e" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#e11d48', lineHeight: 1 }}>
              {fwMetrics.shiftTarget.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 8 }}>
              Actual per Shift: <b style={{ color: '#e11d48' }}>{fwMetrics.shiftActual.toLocaleString()}</b>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>Achievement:</span>
              <span style={{ fontWeight: 800, color: fwMetrics.shiftPct >= 90 ? '#16a34a' : '#d97706' }}>
                {fwMetrics.shiftPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Monthly Dynamic Production Recovery Engine ── */}
      <div style={{
        background: 'linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        border: '1.5px solid #fde68a',
        borderTop: '4px solid #d97706',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={22} color="#b45309" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#78350f' }}>
                Monthly Target Performance & Recovery Engine
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#92400e' }}>
                Sprint window: {recoveryAnalysis.fullMonthLabel} • {recoveryAnalysis.totalDaysInMonthWindow} Days Total ({recoveryAnalysis.elapsedDays} Days Recorded)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Month Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '5px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Sprint Month:</span>
              <select
                value={selectedRecoveryMonth}
                onChange={(e) => setSelectedRecoveryMonth(e.target.value)}
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: 'var(--navy)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {availableRecoveryMonths.map(ym => {
                  const [y, m] = ym.split('-');
                  const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                  const label = (ym === '2026-10') 
                    ? 'October 2026 (2-Oct — 31-Oct)' 
                    : `${mNames[parseInt(m,10)-1]} ${y} (1-${mNames[parseInt(m,10)-1]} — End)`;
                  return (
                    <option key={ym} value={ym}>{label}</option>
                  );
                })}
              </select>
            </div>

            {/* Recovery Horizon / Pace Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '5px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Pace Horizon:</span>
              <select
                value={recoveryHorizonDays}
                onChange={(e) => setRecoveryHorizonDays(e.target.value)}
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--navy)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="month_end">To Month-End ({recoveryAnalysis.remainingDaysInMonth} Days Left)</option>
                <option value="3">3 Days (Urgent Sprint)</option>
                <option value="5">5 Days (Accelerated)</option>
                <option value="7">7 Days (Standard)</option>
                <option value="10">10 Days (Extended)</option>
                <option value="14">14 Days (2 Weeks)</option>
              </select>
            </div>

            <span className={`badge ${recoveryAnalysis.isTargetAchieved ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
              {recoveryAnalysis.isTargetAchieved ? '✅ On Track / Target Met' : `⚠️ Active Deficit: -${recoveryAnalysis.missingTarget.toLocaleString()} Meters`}
            </span>
          </div>
        </div>

        {/* Dynamic Monthly Progress Bar */}
        <div style={{ margin: '10px 0 20px', background: '#f8fafc', borderRadius: 10, padding: '12px 16px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: '0.82rem', flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontWeight: 700, color: 'var(--navy)' }}>
              {recoveryAnalysis.monthName} Target Progress: <strong style={{ color: '#16a34a' }}>{recoveryAnalysis.actualInPeriod.toLocaleString()}</strong> / {recoveryAnalysis.monthFullTarget.toLocaleString()} Meters ({recoveryAnalysis.monthOverallPct.toFixed(1)}% Completed) • <span style={{ color: '#64748b' }}>{recoveryAnalysis.remainingDaysInMonth} days left to month end</span>
            </span>
            <span style={{ fontWeight: 800, color: recoveryAnalysis.achievementRate >= 85 ? '#16a34a' : (recoveryAnalysis.achievementRate >= 70 ? '#b45309' : '#dc2626') }}>
              {recoveryAnalysis.achievementRate.toFixed(1)}% to Date Pace ({recoveryAnalysis.elapsedDays} Days Recorded)
            </span>
          </div>
          <div style={{ width: '100%', height: 10, background: '#e2e8f0', borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, recoveryAnalysis.monthOverallPct)}%`,
              height: '100%',
              background: recoveryAnalysis.monthOverallPct >= 75 ? '#16a34a' : (recoveryAnalysis.monthOverallPct >= 40 ? '#f59e0b' : '#3b82f6'),
              borderRadius: 9999,
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>

        {/* 4 Cards: Status, Missing, Daily Catchup, Shift Catchup */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Month Actual ({recoveryAnalysis.periodLabel})
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: 'var(--navy)', marginTop: 4 }}>
              {recoveryAnalysis.actualInPeriod.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
              Expected to Date: <b>{recoveryAnalysis.targetInPeriod.toLocaleString()}</b> ({recoveryAnalysis.elapsedDays} Days @ 1,300/day)
            </div>
          </div>

          <div style={{ background: '#fef2f2', padding: 16, borderRadius: 12, border: '1px solid #fee2e2' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>
              Target Deficit (Variance Gap)
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#b91c1c', marginTop: 4 }}>
              {recoveryAnalysis.missingTarget > 0 ? `-${recoveryAnalysis.missingTarget.toLocaleString()}` : '0'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#991b1b', marginTop: 4 }}>
              Remaining to Month Target: <b>{recoveryAnalysis.remainingToMonthTarget.toLocaleString()}</b> meters
            </div>
          </div>

          <div style={{ background: '#fffbeb', padding: 16, borderRadius: 12, border: '1px solid #fef3c7' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
              Required Daily Pace ({recoveryHorizonDays === 'month_end' ? 'To Month-End' : `${recoveryAnalysis.recoveryDays} Days`})
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#b45309', marginTop: 4 }}>
              {recoveryAnalysis.revisedDailyTarget.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: 4 }}>
              Base 1,300 + <b>{recoveryAnalysis.dailyCatchUp}</b> catch-up/day ({recoveryAnalysis.recoveryDays} days left)
            </div>
          </div>

          <div style={{ background: '#ede9fe', padding: 16, borderRadius: 12, border: '1px solid #ddd6fe' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
              Required Shift Pace (2 Shifts)
            </div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#6d28d9', marginTop: 4 }}>
              {recoveryAnalysis.revisedShiftTarget.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#5b21b6', marginTop: 4 }}>
              Base 650 + <b>{recoveryAnalysis.shiftCatchUp}</b> meters/shift (2 shifts/day)
            </div>
          </div>
        </div>

        {/* Narrative Box */}
        <div style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: '1.5rem' }}>🎯</div>
          <div style={{ fontSize: '0.86rem', color: '#115e59', lineHeight: 1.5 }}>
            <strong>Monthly Strategic Directive:</strong> {recoveryAnalysis.missingTarget > 0 ? (
              <>To achieve the full monthly target of <strong>{recoveryAnalysis.monthFullTarget.toLocaleString()} meters</strong> for {recoveryAnalysis.monthName} by <strong>{recoveryAnalysis.endDate}</strong>, the remaining <strong>{recoveryAnalysis.remainingToMonthTarget.toLocaleString()} meters</strong> must be produced at a pace of <strong>{recoveryAnalysis.revisedDailyTarget.toLocaleString()} meters/day</strong> (or <strong>{recoveryAnalysis.revisedShiftTarget.toLocaleString()} meters/shift</strong>) across the <strong>{recoveryAnalysis.recoveryDays} operating days</strong> remaining in the month.</>
            ) : (
              <>The production target for {recoveryAnalysis.monthName} is currently on track with no deficit. Continue at the standard rate of <strong>{targets.dailyProd.toLocaleString()} meters/day</strong>.</>
            )}
          </div>
        </div>
      </div>

      {/* ── 5. Dispatched to Nama / Field Schedule (Plan of Dispatch) ── */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '24px 28px',
        border: '1.5px solid #e2e8f0',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={22} color="#1d4ed8" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy)' }}>
                Dispatched to Nama / Field — Plan of Dispatch
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--gray-500)' }}>
                Field dispatch roadmap, release schedule dates, and contract batch quantities
              </p>
            </div>
          </div>

          <span className="badge badge-viewer" style={{ fontSize: '0.85rem' }}>
            Total Planned: 50,025 Meters
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {namaDispatchPlan.map((p, idx) => (
            <div key={p.batch} style={{
              background: '#f8fafc',
              border: idx === 0 ? '1.5px solid #86efac' : (idx === 1 ? '1.5px solid #93c5fd' : '1px solid #e2e8f0'),
              borderRadius: 12,
              padding: '16px 18px',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--navy)' }}>
                  {p.icon} {p.batch}
                </span>
                <span className={`badge ${p.statusClass}`} style={{ fontSize: '0.72rem' }}>
                  {p.status}
                </span>
              </div>

              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: idx === 0 ? '#16a34a' : 'var(--navy)', lineHeight: 1 }}>
                {p.qty.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Meters</span>
              </div>

              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#64748b' }}>
                📅 Scheduled Date: <strong style={{ color: 'var(--navy)' }}>{p.date}</strong>
              </div>

              <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: 4 }}>
                {p.notes}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. Kit Meters Supply & Delivery Pipeline ── */}
      <div style={{
        background: 'linear-gradient(180deg, #eef2ff 0%, #ffffff 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        border: '1.5px solid #c7d2fe',
        borderTop: '4px solid #4f46e5',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={22} color="#4f46e5" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#312e81' }}>
                Kit Meters Supply & Delivery Plan
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#4338ca' }}>
                Real-time tracking of received shipments vs. scheduled future deliveries in the pipeline
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/kit-meters')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#4f46e5',
              color: 'white',
              padding: '7px 14px',
              borderRadius: 8,
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Open Kit Meters Page</span>
            <ArrowUpRight size={15} />
          </button>
        </div>

        {/* 4 Executive KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          
          {/* Card 1: Received Shipments */}
          <div style={{
            background: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: 12,
            padding: '16px 18px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🟢 Received Shipments
              </span>
              <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
                {kitMetrics.receivedBatches} Batches
              </span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#15803d', lineHeight: 1.1 }}>
              {kitMetrics.receivedKits.toLocaleString()}
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#166534', marginLeft: 6 }}>Kits</span>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #bbf7d0', fontSize: '0.8rem', color: '#166534' }}>
              <strong>{kitMetrics.receivedPct.toFixed(1)}%</strong> of total pipeline received
            </div>
          </div>

          {/* Card 2: Delivery Plan (Incoming) */}
          <div style={{
            background: '#eef2ff',
            border: '1.5px solid #c7d2fe',
            borderRadius: 12,
            padding: '16px 18px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3730a3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🔵 Delivery Plan (Scheduled Batches)
              </span>
              <span style={{
                background: '#e0e7ff',
                color: '#4338ca',
                fontWeight: 700,
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: 9999
              }}>
                {kitMetrics.plannedBatches} Batches
              </span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#4338ca', lineHeight: 1.1 }}>
              {kitMetrics.plannedKits.toLocaleString()}
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#3730a3', marginLeft: 6 }}>Kits</span>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #c7d2fe', fontSize: '0.8rem', color: '#3730a3' }}>
              <strong>{kitMetrics.plannedPct.toFixed(1)}%</strong> scheduled for future delivery
            </div>
          </div>

          {/* Card 3: Next Incoming Shipment */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 18px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ⏳ Next Incoming Shipment
              </span>
              {kitMetrics.nearestIncomingDays !== null && (
                <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
                  {kitMetrics.nearestIncomingDays === 0 ? 'Today (Expected)' : (kitMetrics.nearestIncomingDays === 1 ? 'Tomorrow' : `In ${kitMetrics.nearestIncomingDays} days`)}
                </span>
              )}
            </div>
            {kitMetrics.nextIncomingBatch ? (
              <>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--navy)', lineHeight: 1.2 }}>
                  {kitMetrics.nextIncomingBatch.batch_number}
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginLeft: 8 }}>
                    ({(parseInt(kitMetrics.nextIncomingBatch.kit_quantity ?? kitMetrics.nextIncomingBatch.quantity, 10) || 0).toLocaleString()} kits)
                  </span>
                </div>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b' }}>
                  📅 Scheduled Date: <strong style={{ color: 'var(--navy)' }}>{kitMetrics.nextIncomingBatch.date}</strong>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
                  All Shipments Received
                </div>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  No pending future delivery batches
                </div>
              </>
            )}
          </div>

          {/* Card 4: Total Supply Breakdown */}
          <div style={{
            background: '#faf5ff',
            border: '1.5px solid #e9d5ff',
            borderRadius: 12,
            padding: '16px 18px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📦 Total Supply Pipeline
              </span>
              <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
                {kitMetrics.totalBatches} Total Batches
              </span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#6b21a8', lineHeight: 1.1 }}>
              {kitMetrics.totalKits.toLocaleString()}
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#7e22ce', marginLeft: 6 }}>Kits</span>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e9d5ff', fontSize: '0.8rem', color: '#6b21a8', display: 'flex', justifyContent: 'space-between' }}>
              <span>3-Phase: <strong>{kitMetrics.threePhaseKits.toLocaleString()}</strong></span>
              <span>1-Phase: <strong>{kitMetrics.singlePhaseKits.toLocaleString()}</strong></span>
            </div>
          </div>

        </div>

        {/* ── Kit Inventory Balance & Factory Operational Runway ── */}
        <div style={{
          marginTop: 20,
          background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
          borderRadius: 14,
          padding: '22px 24px',
          border: '1.5px solid #a7f3d0',
          borderRight: '4px solid #10b981',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} color="#059669" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#064e3b' }}>
                  Kit Inventory & Factory Operational Runway
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#047857' }}>
                  Formula: (Received − Good Production Achieved − Actual Defects) ÷ {kitRunwayMetrics.dailyRate.toLocaleString()} meters/day
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-admin" style={{ fontSize: '0.8rem', padding: '6px 12px', fontWeight: 800 }}>
                ⚡ Fixed Consumption Rate: 1,200 meters / day
              </span>
            </div>
          </div>

          {/* 5 Cards Horizontal Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 16
          }}>
            {/* 1. Received Kits */}
            <div style={{ background: 'white', borderRadius: 10, padding: '14px 16px', border: '1px solid #86efac' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                1. Received Kits
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#15803d', marginTop: 4 }}>
                {kitRunwayMetrics.received.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: 2 }}>
                Total Shipments Received
              </div>
            </div>

            {/* 2. Finished Production Achieved */}
            <div style={{ background: 'white', borderRadius: 10, padding: '14px 16px', border: '1px solid #93c5fd' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
                2. Good Production
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1d4ed8', marginTop: 4 }}>
                {kitRunwayMetrics.achieved.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#1e40af', marginTop: 2 }}>
                Total Finished Achieved
              </div>
            </div>

            {/* 3. Actual Physical Defects */}
            <div style={{ background: 'white', borderRadius: 10, padding: '14px 16px', border: '1px solid #fca5a5' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
                3. Actual Defects
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#dc2626', marginTop: 4 }}>
                {kitRunwayMetrics.actualDefects.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#991b1b', marginTop: 2 }}>
                Net Physical (No Duplicates)
              </div>
            </div>

            {/* 4. Remaining Kit Stock */}
            <div style={{ background: 'white', borderRadius: 10, padding: '14px 16px', border: '1.5px solid #fdba74' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase' }}>
                4. Remaining Kit Stock
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ea580c', marginTop: 4 }}>
                {kitRunwayMetrics.remaining.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#9a3412', marginTop: 2 }}>
                Available in Warehouse ({kitRunwayMetrics.remainingPct.toFixed(1)}%)
              </div>
            </div>

            {/* 5. Highlighted Runway Days Card */}
            <div style={{
              background: kitRunwayMetrics.runwayDays >= 6 ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              borderRadius: 10,
              padding: '14px 16px',
              border: kitRunwayMetrics.runwayDays >= 6 ? '1.5px solid #10b981' : '1.5px solid #f59e0b',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: kitRunwayMetrics.runwayDays >= 6 ? '#065f46' : '#92400e', textTransform: 'uppercase' }}>
                ⏳ Factory Operational Runway
              </div>
              <div style={{ fontSize: '1.7rem', fontWeight: 900, color: kitRunwayMetrics.runwayDays >= 6 ? '#047857' : '#b45309', marginTop: 4 }}>
                {kitRunwayMetrics.runwayDays.toFixed(1)} <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Operating Days</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: kitRunwayMetrics.runwayDays >= 6 ? '#065f46' : '#92400e', marginTop: 2 }}>
                Approx. {Math.floor(kitRunwayMetrics.runwayDays)} full days & {Math.round((kitRunwayMetrics.runwayDays % 1) * 2)} shift
              </div>
            </div>
          </div>

          {/* Progress Bar & Strategic Supply Security Notice */}
          <div style={{ background: 'white', borderRadius: 10, padding: '12px 16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: '0.78rem' }}>
              <span style={{ fontWeight: 700, color: '#334155' }}>
                Received Kit Consumed: <strong>{kitRunwayMetrics.consumed.toLocaleString()}</strong> kits ({kitRunwayMetrics.consumedPct.toFixed(1)}%)
              </span>
              <span style={{ fontWeight: 800, color: '#ea580c' }}>
                Current Remaining Stock: <strong>{kitRunwayMetrics.remaining.toLocaleString()}</strong> kits ({kitRunwayMetrics.remainingPct.toFixed(1)}%)
              </span>
            </div>
            
            <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 9999, overflow: 'hidden', display: 'flex', marginBottom: 10 }}>
              <div style={{ width: `${kitRunwayMetrics.consumedPct}%`, background: '#3b82f6', height: '100%' }} title="Consumed" />
              <div style={{ width: `${kitRunwayMetrics.remainingPct}%`, background: '#f97316', height: '100%' }} title="Remaining" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#475569' }}>
              <span style={{ fontSize: '1rem' }}>🛡️</span>
              <span>
                <strong>Supply Chain Continuity:</strong>{' '}
                {kitMetrics.nextIncomingBatch ? (
                  (() => {
                    const nextBatch = kitMetrics.nextIncomingBatch;
                    const nextQty = (parseInt(nextBatch.kit_quantity ?? nextBatch.quantity, 10) || 0).toLocaleString();
                    const weekMatch = nextBatch.notes?.match(/W\d+/);
                    const weekLabel = weekMatch ? ` (${weekMatch[0]})` : '';
                    const daysLabel = kitMetrics.nearestIncomingDays !== null 
                      ? (kitMetrics.nearestIncomingDays === 0 ? 'arriving today' : `in ${kitMetrics.nearestIncomingDays} day${kitMetrics.nearestIncomingDays > 1 ? 's' : ''}`)
                      : '';
                    return (
                      <>
                        Current stock of <strong>{kitRunwayMetrics.runwayDays.toFixed(1)} operating days</strong>{' '}
                        {kitRunwayMetrics.runwayDays >= (kitMetrics.nearestIncomingDays ?? 0)
                          ? 'comfortably covers plant production until the arrival of the next shipment batch '
                          : 'covers plant production towards the next scheduled shipment batch '}
                        <strong>{nextBatch.batch_number}{weekLabel}</strong> scheduled on{' '}
                        <strong>{nextBatch.date}</strong> ({nextQty} kits{daysLabel ? ` • ${daysLabel}` : ''}),{' '}
                        ensuring zero line stoppage.
                      </>
                    );
                  })()
                ) : (
                  <>
                    Current stock of <strong>{kitRunwayMetrics.runwayDays.toFixed(1)} operating days</strong> provides adequate manufacturing buffer across all active production lines.
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. Defect Meters Analysis & Calibration Cards ── */}
      <div style={{
        background: 'linear-gradient(180deg, #fff1f2 0%, #ffffff 100%)',
        borderRadius: 16,
        padding: '24px 28px',
        border: '1.5px solid #fecdd3',
        borderTop: '4px solid #e11d48',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={22} color="#dc2626" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#881337' }}>
                Defect Meters Analysis & Calibration
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#9f1239' }}>
                Reconciling actual physical defects with shift reports and eliminating rework loops
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/defect-meters')}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#b91c1c', border: '1.5px solid #fca5a5' }}
          >
            View Defect Shifts & Details
            <ArrowUpRight size={14} />
          </button>
        </div>

        {/* 4 KPI Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16
        }}>
          {/* Card 1: Actual Physical Defective Meters */}
          <div style={{
            background: '#fef2f2',
            border: '1.5px solid #fca5a5',
            borderRadius: 12,
            padding: '16px 18px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🔴 Actual Net Defective Meters
              </span>
              <span className="badge badge-red" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                Live Dynamic
              </span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#b91c1c', lineHeight: 1.1 }}>
              {defectMetrics.actualPhysicalDefects.toLocaleString()}
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#991b1b', marginLeft: 6 }}>Net Meters</span>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #fecaca', fontSize: '0.78rem', color: '#7f1d1d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
              <span>Previous Base: <strong>{defectMetrics.baseActualDefects.toLocaleString()}</strong></span>
              <span style={{ background: '#fee2e2', padding: '2px 7px', borderRadius: 4, fontWeight: 700, color: '#991b1b', border: '1px solid #fca5a5' }}>
                + {defectMetrics.liveLoggedDefects.toLocaleString()} Live Logged
              </span>
            </div>
          </div>

          {/* Card 2: Reported Boards KO */}
          <div style={{
            background: '#fffbeb',
            border: '1.5px solid #fcd34d',
            borderRadius: 12,
            padding: '16px 18px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🟡 Reported Failures (Boards KO)
              </span>
              <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>
                {records.length} Reports
              </span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#b45309', lineHeight: 1.1 }}>
              {defectMetrics.totalReportedKO.toLocaleString()}
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#92400e', marginLeft: 6 }}>Failed Cases</span>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #fde68a', fontSize: '0.8rem', color: '#78350f' }}>
              Total reported failure records (Nb Boards - Boards OK)
            </div>
          </div>

          {/* Card 3: Calibration Ratio */}
          <div style={{
            background: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: 12,
            padding: '16px 18px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🟢 Calibration Ratio (Accuracy Factor)
              </span>
              <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
                Ratio
              </span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#15803d', lineHeight: 1.1 }}>
              {(defectMetrics.calibrationRatio * 100).toFixed(2)}%
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#166534', marginLeft: 6 }}>Accuracy Ratio</span>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #bbf7d0', fontSize: '0.8rem', color: '#14532d' }}>
              Every 100 reported KO cases correspond to <strong>{Math.round(defectMetrics.calibrationRatio * 100)}</strong> actual physical defects
            </div>
          </div>

          {/* Card 4: Repaired and Recycled Meters */}
          <div style={{
            background: '#eef2ff',
            border: '1.5px solid #c7d2fe',
            borderRadius: 12,
            padding: '16px 18px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3730a3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🔵 Repaired & Recycled Meters (Rework)
              </span>
              <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                {defectMetrics.repairRatePct.toFixed(1)}% Rework
              </span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#4338ca', lineHeight: 1.1 }}>
              {defectMetrics.totalRepairedMeters.toLocaleString()}
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#3730a3', marginLeft: 6 }}>Meters Repaired</span>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #c7d2fe', fontSize: '0.8rem', color: '#312e81' }}>
              Failed in stations, repaired successfully and returned to line
            </div>
          </div>
        </div>

        {/* ── Top 4 Recurring Defect Codes from Production Reports ── */}
        <div style={{
          marginTop: 24,
          paddingTop: 20,
          borderTop: '1.5px dashed #fecdd3'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={18} color="#dc2626" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#881337' }}>
                  Top 4 Recurring Failure Codes (Production Shift Reports)
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#9f1239' }}>
                  Pareto failure distribution calculated directly from all shift production reports
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-red" style={{ fontSize: '0.75rem', padding: '4px 10px', fontWeight: 700 }}>
                Top 4 = {topDefectCodes.top4SharePct.toFixed(1)}% of All Reported Defects
              </span>
            </div>
          </div>

          {/* 4 Defect Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 14
          }}>
            {topDefectCodes.top4.map((item, idx) => {
              const rankStyles = [
                { border: '#fca5a5', bg: '#fff1f2', badgeBg: '#fee2e2', badgeColor: '#991b1b', barColor: '#dc2626', label: '#1 Highest Failure', sub: 'Critical Bottleneck' },
                { border: '#fdba74', bg: '#fff7ed', badgeBg: '#ffedd5', badgeColor: '#c2410c', barColor: '#ea580c', label: '#2 High Frequency', sub: 'Significant Defect' },
                { border: '#fcd34d', bg: '#fffbeb', badgeBg: '#fef3c7', badgeColor: '#92400e', barColor: '#d97706', label: '#3 Moderate Rate', sub: 'Quality Action Needed' },
                { border: '#93c5fd', bg: '#eff6ff', badgeBg: '#dbeafe', badgeColor: '#1e40af', barColor: '#2563eb', label: '#4 Notable Rate', sub: 'Recurring Pattern' }
              ];
              const style = rankStyles[idx] || rankStyles[3];

              return (
                <div
                  key={item.code}
                  style={{
                    background: style.bg,
                    border: `1.5px solid ${style.border}`,
                    borderRadius: 12,
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: style.badgeBg,
                      color: style.badgeColor,
                      padding: '3px 8px',
                      borderRadius: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>
                      {style.label}
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: style.badgeColor }}>
                      {item.pct.toFixed(1)}% Share
                    </span>
                  </div>

                  <div style={{ margin: '8px 0 10px' }}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      color: style.badgeColor,
                      letterSpacing: '0.5px'
                    }}>
                      Code {item.code}
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#334155', marginTop: 3 }}>
                      {item.qty.toLocaleString()}{' '}
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                        Failure Cases
                      </span>
                    </div>

                    {/* Originating Workstation Information */}
                    <div style={{
                      marginTop: 10,
                      padding: '6px 9px',
                      background: '#ffffff',
                      borderRadius: 8,
                      border: `1.5px solid ${style.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7
                    }}>
                      <span style={{ fontSize: '0.85rem' }}>🏭</span>
                      <div style={{ fontSize: '0.74rem', lineHeight: 1.25 }}>
                        <div style={{ fontWeight: 800, color: style.badgeColor }}>
                          {item.stationName}
                        </div>
                        <div style={{ fontSize: '0.67rem', fontWeight: 600, color: '#64748b' }}>
                          Originating Workstation
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div style={{ width: '100%', height: 7, background: 'rgba(0,0,0,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, Math.max(8, item.pct))}%`,
                        height: '100%',
                        background: style.barColor,
                        borderRadius: 4
                      }} />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 5, textAlign: 'right' }}>
                      {style.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pareto Insight Footer */}
          <div style={{
            marginTop: 14,
            background: '#ffffff',
            border: '1.5px solid #fecdd3',
            borderRadius: 10,
            padding: '10px 16px',
            fontSize: '0.82rem',
            color: '#881337',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10
          }}>
            <span>
              💡 <strong>Pareto Distribution & Workstation Concentration:</strong> The top 4 failure codes account for <strong>{topDefectCodes.top4Sum.toLocaleString()}</strong> cases ({topDefectCodes.top4SharePct.toFixed(1)}% of all reported defects). Line failures are heavily concentrated in the <strong>RF Test Station</strong> (Codes -910, -640, -920) and <strong>Multi-Test Workstation</strong> (Code -312).
            </span>
            <span style={{ fontSize: '0.75rem', color: '#9f1239', fontWeight: 700, background: '#fee2e2', padding: '3px 8px', borderRadius: 6 }}>
              Direct Live Shift Reports
            </span>
          </div>
        </div>
      </div>

      {/* ── 7. Summary Comparison Table ── */}
      <div className="table-card" style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
        borderRadius: 16,
        border: '1.5px solid #cbd5e1',
        borderTop: '4px solid #334155',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9' }}>
          <span style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            📊 Target vs. Actual Matrix Summary
          </span>
          <span className="badge badge-admin">Active Project Baselines</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Scope Metric</th>
                <th style={{ textAlign: 'center' }}>Target Objective</th>
                <th style={{ textAlign: 'center' }}>Actual Achieved</th>
                <th style={{ textAlign: 'center' }}>Variance / Gap</th>
                <th style={{ textAlign: 'center' }}>Achievement Rate %</th>
                <th style={{ textAlign: 'center' }}>Performance Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, color: 'var(--navy)' }}>
                  Overall 3-Phase Production
                </td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{productionMetrics.overallTarget.toLocaleString()}</td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>{productionMetrics.overallCompleted.toLocaleString()}</td>
                <td style={{ textAlign: 'center', color: '#64748b' }}>-{(productionMetrics.overallTarget - productionMetrics.overallCompleted).toLocaleString()}</td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>{productionMetrics.overallPct.toFixed(1)}%</td>
                <td style={{ textAlign: 'center' }}>
                  <span className="badge badge-green">In Progress</span>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: 'var(--navy)' }}>
                  Weekly 3-Phase Production
                </td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{productionMetrics.weeklyTarget.toLocaleString()}</td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>{productionMetrics.weeklyActual.toLocaleString()}</td>
                <td style={{ textAlign: 'center', color: productionMetrics.weeklyActual >= productionMetrics.weeklyTarget ? '#16a34a' : '#dc2626' }}>
                  {productionMetrics.weeklyActual >= productionMetrics.weeklyTarget ? '+' : ''}{(productionMetrics.weeklyActual - productionMetrics.weeklyTarget).toLocaleString()}
                </td>
                <td style={{ textAlign: 'center', fontWeight: 800 }}>{productionMetrics.weeklyPct.toFixed(1)}%</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`badge ${productionMetrics.weeklyPct >= 90 ? 'badge-green' : 'badge-amber'}`}>
                    {productionMetrics.weeklyPct >= 90 ? 'Met' : 'Pending'}
                  </span>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: 'var(--navy)' }}>
                  Daily 3-Phase Production
                </td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{productionMetrics.dailyTarget.toLocaleString()}</td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--teal-dark)' }}>{productionMetrics.dailyActual.toLocaleString()}</td>
                <td style={{ textAlign: 'center', color: productionMetrics.dailyActual >= productionMetrics.dailyTarget ? '#16a34a' : '#dc2626' }}>
                  {productionMetrics.dailyActual >= productionMetrics.dailyTarget ? '+' : ''}{(productionMetrics.dailyActual - productionMetrics.dailyTarget).toLocaleString()}
                </td>
                <td style={{ textAlign: 'center', fontWeight: 800 }}>{productionMetrics.dailyPct.toFixed(1)}%</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`badge ${productionMetrics.dailyPct >= 90 ? 'badge-green' : 'badge-amber'}`}>
                    {productionMetrics.dailyPct >= 90 ? 'Met' : 'Pending'}
                  </span>
                </td>
              </tr>
              <tr style={{ background: '#faf5ff' }}>
                <td style={{ fontWeight: 700, color: '#7c3aed' }}>
                  Overall Firmware (FW)
                </td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{fwMetrics.overallTarget.toLocaleString()}</td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: '#7c3aed' }}>{fwMetrics.overallCompleted.toLocaleString()}</td>
                <td style={{ textAlign: 'center', color: '#64748b' }}>-{(fwMetrics.overallTarget - fwMetrics.overallCompleted).toLocaleString()}</td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: '#7c3aed' }}>{fwMetrics.overallPct.toFixed(1)}%</td>
                <td style={{ textAlign: 'center' }}>
                  <span className="badge badge-purple">On Track</span>
                </td>
              </tr>
              <tr style={{ background: '#faf5ff' }}>
                <td style={{ fontWeight: 700, color: '#7c3aed' }}>
                  Daily Firmware (FW) Flashing
                </td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{fwMetrics.dailyTarget.toLocaleString()}</td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: '#7c3aed' }}>{fwMetrics.dailyActual.toLocaleString()}</td>
                <td style={{ textAlign: 'center', color: fwMetrics.dailyActual >= fwMetrics.dailyTarget ? '#16a34a' : '#dc2626' }}>
                  {fwMetrics.dailyActual >= fwMetrics.dailyTarget ? '+' : ''}{(fwMetrics.dailyActual - fwMetrics.dailyTarget).toLocaleString()}
                </td>
                <td style={{ textAlign: 'center', fontWeight: 800 }}>{fwMetrics.dailyPct.toFixed(1)}%</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`badge ${fwMetrics.dailyPct >= 90 ? 'badge-green' : 'badge-amber'}`}>
                    {fwMetrics.dailyPct >= 90 ? 'Met' : 'Pending'}
                  </span>
                </td>
              </tr>
              <tr style={{ background: '#f5f3ff', borderTop: '2px solid #e0e7ff' }}>
                <td style={{ fontWeight: 700, color: '#4338ca' }}>
                  Kit Meters Supply (Pipeline Received)
                </td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{kitMetrics.totalKits.toLocaleString()}</td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>{kitMetrics.receivedKits.toLocaleString()}</td>
                <td style={{ textAlign: 'center', color: '#4338ca' }}>
                  {kitMetrics.plannedKits > 0 ? `-${kitMetrics.plannedKits.toLocaleString()} planned` : '0'}
                </td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: '#4338ca' }}>{kitMetrics.receivedPct.toFixed(1)}%</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`badge ${kitMetrics.plannedBatches > 0 ? 'badge-blue' : 'badge-green'}`}>
                    {kitMetrics.plannedBatches > 0 ? `${kitMetrics.plannedBatches} Batches Planned` : 'All Batches Received'}
                  </span>
                </td>
              </tr>
              <tr style={{ background: '#fff1f2', borderTop: '2px solid #fecdd3' }}>
                <td style={{ fontWeight: 700, color: '#be123c' }}>
                  Defective Meters (Ground Truth vs. Reported KO)
                </td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{defectMetrics.totalReportedKO.toLocaleString()}</td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: '#dc2626' }}>{defectMetrics.actualPhysicalDefects.toLocaleString()}</td>
                <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>
                  -{defectMetrics.totalRepairedMeters.toLocaleString()} repaired
                </td>
                <td style={{ textAlign: 'center', fontWeight: 800, color: '#be123c' }}>
                  {(defectMetrics.calibrationRatio * 100).toFixed(1)}%
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className="badge badge-red">
                    {defectMetrics.actualPhysicalDefects.toLocaleString()} Net Actual ({defectMetrics.repairRatePct.toFixed(1)}% Repaired)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
