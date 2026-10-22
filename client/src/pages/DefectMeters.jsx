import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Layers, 
  TrendingUp, 
  Filter, 
  Sliders, 
  Edit3, 
  Save, 
  RotateCcw, 
  Search, 
  Eye, 
  X, 
  HelpCircle,
  Hash,
  Activity,
  ArrowRight,
  ArrowLeft,
  QrCode,
  Scan,
  Wrench,
  RotateCw,
  ShieldAlert,
  ArrowUpRight,
  History,
  Check,
  Plus,
  Trash2,
  Tag,
  UserCheck,
  Clock,
  Printer
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const DEFAULT_ACTUAL_DEFECTS = 4250;
const STORAGE_ACTUAL_KEY = 'ectron_defect_actual_count';
const LOCAL_DEFECTIVE_METERS_KEY = 'ectron_defective_meters_cache';

// ── Complete Stages List with Distinct Vibrant Colors & Icons ─────────────────
const STAGES = [
  { id: 'Assembly', name: 'Assembly', arabic: 'التجميع', color: '#0284c7', bg: '#e0f2fe', border: '#38bdf8', icon: '🔧' },
  { id: 'Insulation', name: 'Insulation', arabic: 'العزل (Insulation)', color: '#7c3aed', bg: '#f3e8ff', border: '#c084fc', icon: '⚡' },
  { id: 'RF', name: 'RF', arabic: 'التردد (RF Test)', color: '#0891b2', bg: '#cffafe', border: '#22d3ee', icon: '📡' },
  { id: 'Calibration', name: 'Calibration', arabic: 'المعايرة (Calibration)', color: '#059669', bg: '#d1fae5', border: '#34d399', icon: '⚖️' },
  { id: 'Multi-Test', name: 'Multi-Test', arabic: 'الفحص الشامل (Multi-Test)', color: '#d97706', bg: '#fef3c7', border: '#fbbf24', icon: '🔬' },
  { id: 'Perso', name: 'Perso', arabic: 'التخصيص والبرمجة (Perso)', color: '#e11d48', bg: '#ffe4e6', border: '#fb7185', icon: '💻' },
  { id: 'Packaging', name: 'Packaging', arabic: 'التغليف النهائي', color: '#475569', bg: '#f1f5f9', border: '#94a3b8', icon: '📦' }
];

const STAGE_IDS = STAGES.map(s => s.id);

const COMMON_DEFECT_CODES = [
  '-640',
  'E-101',
  'KO_COMM',
  'RF_NO_SIG',
  'CALIB_OFFSET',
  'DISP_ERR',
  'FLASH_ERR',
  'HIGH_CURRENT'
];

export default function DefectMeters() {
  const { user } = useAuth();
  const { t, isArabic } = useLanguage();
  const isAdmin = user?.access === 'admin';
  const isViewer = user?.access === 'viewer';

  // ── Tab Navigation: TRACKER vs ANALYTICS ───────────────────────────────────
  const [activeTab, setActiveTab] = useState('TRACKER');

  // ── Tab 1: Defective Meters Tracker State ─────────────────────────────────
  const [defectiveMeters, setDefectiveMeters] = useState([]);
  const [loadingDefects, setLoadingDefects] = useState(true);
  const [isSubmittingDefect, setIsSubmittingDefect] = useState(false);
  const [trackerSuccessMsg, setTrackerSuccessMsg] = useState('');

  // ── Interactive Guided Intake Stepper (1 = Scan, 2 = Select Stage, 3 = Code)
  const [wizardStep, setWizardStep] = useState(1);
  const [scanSerial, setScanSerial] = useState('');
  const [selectedStage, setSelectedStage] = useState('Assembly');
  const [defectCode, setDefectCode] = useState('-640');
  const [loggedBy, setLoggedBy] = useState(user?.name || 'Supervisor');
  const [defectNotes, setDefectNotes] = useState('');

  const serialInputRef = useRef(null);
  const codeInputRef = useRef(null);

  // Filters for Tracker Table
  const [trackerSearch, setTrackerSearch] = useState('');
  const [trackerStageFilter, setTrackerStageFilter] = useState('ALL');
  const [trackerStatusFilter, setTrackerStatusFilter] = useState('ALL');
  const [onlyRecurringFilter, setOnlyRecurringFilter] = useState(false);

  // Modals for Tracker
  const [repairModalMeter, setRepairModalMeter] = useState(null);
  const [repairTechName, setRepairTechName] = useState(user?.name || '');
  const [repairActionTaken, setRepairActionTaken] = useState('');
  const [repairDestination, setRepairDestination] = useState('Assembly');
  const [isSubmittingRepair, setIsSubmittingRepair] = useState(false);

  const [lifecycleModalMeter, setLifecycleModalMeter] = useState(null);

  // ── Tab 2: Calibration & Statistical Analytics State ──────────────────────
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [actualTarget, setActualTarget] = useState(() => {
    const saved = localStorage.getItem(STORAGE_ACTUAL_KEY);
    return saved ? parseInt(saved, 10) || DEFAULT_ACTUAL_DEFECTS : DEFAULT_ACTUAL_DEFECTS;
  });
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(actualTarget));

  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShiftForModal, setSelectedShiftForModal] = useState(null);

  // Auto-focus inputs according to active wizard step
  useEffect(() => {
    if (wizardStep === 1) {
      setTimeout(() => serialInputRef.current?.focus(), 80);
    } else if (wizardStep === 3) {
      setTimeout(() => {
        codeInputRef.current?.focus();
        codeInputRef.current?.select();
      }, 80);
    }
  }, [wizardStep]);

  // Update logged by default when user is available
  useEffect(() => {
    if (user?.name && loggedBy === 'Supervisor') {
      setLoggedBy(user.name);
    }
  }, [user, loggedBy]);

  // ── Load Defective Meters from Supabase / LocalStorage ───────────────────
  const fetchDefectiveMeters = useCallback(async () => {
    setLoadingDefects(true);
    try {
      const { data, error } = await supabase
        .from('defective_meters')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        const local = JSON.parse(localStorage.getItem(LOCAL_DEFECTIVE_METERS_KEY) || '[]');
        setDefectiveMeters(local);
      } else {
        setDefectiveMeters(data || []);
        localStorage.setItem(LOCAL_DEFECTIVE_METERS_KEY, JSON.stringify(data || []));
      }
    } catch {
      const local = JSON.parse(localStorage.getItem(LOCAL_DEFECTIVE_METERS_KEY) || '[]');
      setDefectiveMeters(local);
    } finally {
      setLoadingDefects(false);
    }
  }, []);

  // ── Load Production Records for Analytics ───────────────────────────────
  const fetchProductionRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const { data, error } = await supabase
        .from('production_records')
        .select('*')
        .order('date', { ascending: false })
        .order('id', { ascending: false });

      if (!error && data) {
        setRecords(data);
      }
    } catch (e) {
      console.warn('Could not fetch production records:', e);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    fetchDefectiveMeters();
    fetchProductionRecords();
  }, [fetchDefectiveMeters, fetchProductionRecords]);

  // ── Real-Time Serial Check (Has this meter entered previously?) ───────────
  const detectedPreviousMeter = useMemo(() => {
    const trimmed = scanSerial.trim();
    if (!trimmed) return null;
    return defectiveMeters.find(m => m.serial_number && m.serial_number.toLowerCase() === trimmed.toLowerCase()) || null;
  }, [scanSerial, defectiveMeters]);

  // ── Handle Registering a Defective Meter ──────────────────────────────────
  const handleRegisterDefective = async (e) => {
    if (e) e.preventDefault();
    if (isViewer) {
      alert('Viewers have read-only access.');
      return;
    }

    const cleanSerial = scanSerial.trim();
    if (!cleanSerial) {
      alert(isArabic ? 'يرجى إدخال أو مسح سيريال العداد أولاً.' : 'Please enter or scan meter serial number.');
      setWizardStep(1);
      return;
    }

    if (!defectCode.trim()) {
      alert(isArabic ? 'يرجى إدخال أو اختيار كود العطل (مثال: -640).' : 'Please enter or select a defect code (e.g. -640).');
      setWizardStep(3);
      return;
    }

    setIsSubmittingDefect(true);
    setTrackerSuccessMsg('');

    const nowIso = new Date().toISOString();
    let updatedMeterRecord = null;
    let isRecurring = false;

    if (detectedPreviousMeter) {
      // Meter has entered before: increment entry count and append new cycle to history
      isRecurring = true;
      const nextEntryCount = (detectedPreviousMeter.entry_count || 1) + 1;
      const historyList = Array.isArray(detectedPreviousMeter.history) ? [...detectedPreviousMeter.history] : [];
      
      historyList.push({
        cycle: nextEntryCount,
        type: 'ENTRY',
        stage: selectedStage,
        defect_code: defectCode.trim(),
        logged_by: loggedBy.trim() || 'Supervisor',
        logged_at: nowIso,
        notes: defectNotes.trim()
      });

      updatedMeterRecord = {
        ...detectedPreviousMeter,
        stage: selectedStage,
        defect_code: defectCode.trim(),
        logged_by: loggedBy.trim() || 'Supervisor',
        logged_at: nowIso,
        status: 'UNDER_INSPECTION',
        entry_count: nextEntryCount,
        notes: defectNotes.trim() || detectedPreviousMeter.notes,
        history: historyList,
        updated_at: nowIso
      };
    } else {
      // New meter entering for the first time
      updatedMeterRecord = {
        serial_number: cleanSerial,
        stage: selectedStage,
        defect_code: defectCode.trim(),
        logged_by: loggedBy.trim() || 'Supervisor',
        logged_at: nowIso,
        status: 'UNDER_INSPECTION',
        entry_count: 1,
        return_count: 0,
        repair_notes: '',
        repaired_by: '',
        repaired_at: null,
        return_destination: '',
        notes: defectNotes.trim(),
        history: [{
          cycle: 1,
          type: 'ENTRY',
          stage: selectedStage,
          defect_code: defectCode.trim(),
          logged_by: loggedBy.trim() || 'Supervisor',
          logged_at: nowIso,
          notes: defectNotes.trim()
        }],
        created_at: nowIso,
        updated_at: nowIso
      };
    }

    try {
      if (detectedPreviousMeter?.id) {
        // Update existing record in Supabase
        const { error } = await supabase
          .from('defective_meters')
          .update(updatedMeterRecord)
          .eq('id', detectedPreviousMeter.id);

        if (error) throw error;
        setDefectiveMeters(prev => prev.map(m => m.id === detectedPreviousMeter.id ? updatedMeterRecord : m));
      } else {
        // Insert new record in Supabase
        const { data, error } = await supabase
          .from('defective_meters')
          .insert([updatedMeterRecord])
          .select();

        if (error) throw error;
        const saved = data && data[0] ? data[0] : { ...updatedMeterRecord, id: Date.now() };
        setDefectiveMeters(prev => [saved, ...prev]);
      }
    } catch {
      // Fallback local storage
      const fallbackId = detectedPreviousMeter?.id || Date.now();
      const finalLocalRecord = { ...updatedMeterRecord, id: fallbackId };
      const nextList = detectedPreviousMeter
        ? defectiveMeters.map(m => m.id === detectedPreviousMeter.id ? finalLocalRecord : m)
        : [finalLocalRecord, ...defectiveMeters];

      setDefectiveMeters(nextList);
      localStorage.setItem(LOCAL_DEFECTIVE_METERS_KEY, JSON.stringify(nextList));
    } finally {
      setIsSubmittingDefect(false);
      setScanSerial('');
      setDefectNotes('');
      setDefectCode('-640');
      setWizardStep(1); // Reset immediately to Step 1 for next scan
      setTrackerSuccessMsg(
        isRecurring
          ? (isArabic ? `⚠️ تم تسجيل دخول مكرر للعداد (${cleanSerial}) للمرة (${updatedMeterRecord.entry_count}) كود (${defectCode}) في محطة (${selectedStage})!` : `⚠️ Recurring defect entry recorded for (${cleanSerial}) - Cycle #${updatedMeterRecord.entry_count} at (${selectedStage})!`)
          : (isArabic ? `✅ تم تسجيل العداد (${cleanSerial}) بنجاح في مرحلة (${selectedStage}) بكود (${defectCode}).` : `✅ Meter (${cleanSerial}) logged successfully at (${selectedStage}) with code (${defectCode}).`)
      );
      setTimeout(() => setTrackerSuccessMsg(''), 6000);
    }
  };

  // ── Open Repair Modal ─────────────────────────────────────────────────────
  const openRepairModal = (meter) => {
    setRepairModalMeter(meter);
    setRepairTechName(user?.name || '');
    setRepairActionTaken('');
    setRepairDestination(meter.stage || 'Assembly');
  };

  // ── Confirm Repair & Return to Production Line ────────────────────────────
  const handleConfirmRepair = async () => {
    if (!repairModalMeter) return;
    if (!repairActionTaken.trim()) {
      alert(isArabic ? 'يرجى توضيح الإجراء التصحيحي أو القطع المستبدلة.' : 'Please enter repair action or replaced components.');
      return;
    }

    setIsSubmittingRepair(true);
    const nowIso = new Date().toISOString();
    const nextReturnCount = (repairModalMeter.return_count || 0) + 1;
    const historyList = Array.isArray(repairModalMeter.history) ? [...repairModalMeter.history] : [];

    historyList.push({
      cycle: repairModalMeter.entry_count || 1,
      type: 'RETURN_TO_LINE',
      technician: repairTechName.trim() || 'Technician',
      action_taken: repairActionTaken.trim(),
      destination: repairDestination,
      returned_at: nowIso
    });

    const updated = {
      ...repairModalMeter,
      status: 'RETURNED_TO_LINE',
      return_count: nextReturnCount,
      repaired_by: repairTechName.trim() || 'Technician',
      repair_notes: repairActionTaken.trim(),
      repaired_at: nowIso,
      return_destination: repairDestination,
      history: historyList,
      updated_at: nowIso
    };

    try {
      const { error } = await supabase
        .from('defective_meters')
        .update(updated)
        .eq('id', repairModalMeter.id);

      if (error) throw error;

      setDefectiveMeters(prev => prev.map(m => m.id === repairModalMeter.id ? updated : m));
    } catch {
      const nextList = defectiveMeters.map(m => m.id === repairModalMeter.id ? updated : m);
      setDefectiveMeters(nextList);
      localStorage.setItem(LOCAL_DEFECTIVE_METERS_KEY, JSON.stringify(nextList));
    } finally {
      setIsSubmittingRepair(false);
      setRepairModalMeter(null);
      setTrackerSuccessMsg(
        isArabic 
          ? `✅ تم توثيق إصلاح العداد (${repairModalMeter.serial_number}) وإعادته لخط الإنتاج بنجاح (خروج رقم ${nextReturnCount}).`
          : `✅ Meter (${repairModalMeter.serial_number}) marked as repaired & returned to line (Return #${nextReturnCount}).`
      );
      setTimeout(() => setTrackerSuccessMsg(''), 6000);
    }
  };

  // ── Scrap / KO Permanent Action ───────────────────────────────────────────
  const handleScrapMeter = async (meter) => {
    const confirmMsg = isArabic
      ? `هل أنت متأكد من استبعاد العداد (${meter.serial_number}) نهائياً كـ (Scrap / تالف دائم غير قابل للإصلاح)؟`
      : `Are you sure you want to mark meter (${meter.serial_number}) as permanently Scrapped / KO?`;

    if (!window.confirm(confirmMsg)) return;

    const nowIso = new Date().toISOString();
    const historyList = Array.isArray(meter.history) ? [...meter.history] : [];
    historyList.push({
      cycle: meter.entry_count || 1,
      type: 'SCRAP_KO',
      reason: 'Permanently unrepairable / scrapped after inspection',
      by: user?.name || 'Supervisor',
      at: nowIso
    });

    const updated = {
      ...meter,
      status: 'SCRAPPED_KO',
      history: historyList,
      updated_at: nowIso
    };

    try {
      await supabase.from('defective_meters').update(updated).eq('id', meter.id);
    } catch (e) {
      console.warn('Scrap update error:', e);
    }

    const nextList = defectiveMeters.map(m => m.id === meter.id ? updated : m);
    setDefectiveMeters(nextList);
    localStorage.setItem(LOCAL_DEFECTIVE_METERS_KEY, JSON.stringify(nextList));
  };

  // ── Delete Defect Record ──────────────────────────────────────────────────
  const handleDeleteMeter = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm('Delete this defective meter record completely?')) return;

    try {
      await supabase.from('defective_meters').delete().eq('id', id);
    } catch (e) {
      console.warn('Delete error:', e);
    }

    const nextList = defectiveMeters.filter(m => m.id !== id);
    setDefectiveMeters(nextList);
    localStorage.setItem(LOCAL_DEFECTIVE_METERS_KEY, JSON.stringify(nextList));
  };

  // ── Filtered Defective Meters List ────────────────────────────────────────
  const filteredDefectiveMeters = useMemo(() => {
    return defectiveMeters.filter(m => {
      const q = trackerSearch.trim().toLowerCase();
      const matchSearch = q === '' ||
        (m.serial_number && m.serial_number.toLowerCase().includes(q)) ||
        (m.defect_code && m.defect_code.toLowerCase().includes(q)) ||
        (m.logged_by && m.logged_by.toLowerCase().includes(q)) ||
        (m.repaired_by && m.repaired_by.toLowerCase().includes(q));

      const matchStage = trackerStageFilter === 'ALL' || m.stage === trackerStageFilter;
      const matchStatus = trackerStatusFilter === 'ALL' || m.status === trackerStatusFilter;
      const matchRecurring = !onlyRecurringFilter || (m.entry_count > 1);

      return matchSearch && matchStage && matchStatus && matchRecurring;
    });
  }, [defectiveMeters, trackerSearch, trackerStageFilter, trackerStatusFilter, onlyRecurringFilter]);

  // ── Tracker KPI Totals ────────────────────────────────────────────────────
  const trackerKPIs = useMemo(() => {
    const total = defectiveMeters.length;
    let underInspection = 0;
    let returnedToLine = 0;
    let scrapped = 0;
    let recurringCount = 0;

    defectiveMeters.forEach(m => {
      if (m.status === 'UNDER_INSPECTION' || m.status === 'IN_REPAIR') underInspection++;
      else if (m.status === 'RETURNED_TO_LINE') returnedToLine++;
      else if (m.status === 'SCRAPPED_KO') scrapped++;

      if (m.entry_count > 1) recurringCount++;
    });

    return { total, underInspection, returnedToLine, scrapped, recurringCount };
  }, [defectiveMeters]);

  // ── Tab 2 Analytics Calculations ──────────────────────────────────────────
  const getRecordReportedKO = (rec) => {
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
  };

  const overallMetrics = useMemo(() => {
    let totalReportedKOAll = 0;
    let totalBoardsAll = 0;
    let totalAchievedAll = 0;

    records.forEach(r => {
      totalReportedKOAll += getRecordReportedKO(r);
      totalBoardsAll += parseInt(r.total_boards, 10) || 0;
      totalAchievedAll += parseInt(r.achieved, 10) || 0;
    });

    const calibrationRatio = totalReportedKOAll > 0 ? (actualTarget / totalReportedKOAll) : 0;
    const totalRepairedFromKOAll = Math.max(0, totalReportedKOAll - actualTarget);
    const repairRateOverallPct = totalReportedKOAll > 0 ? ((totalRepairedFromKOAll / totalReportedKOAll) * 100) : 0;

    return {
      totalReportedKOAll,
      totalBoardsAll,
      totalAchievedAll,
      calibrationRatio,
      totalRepairedFromKOAll,
      repairRateOverallPct
    };
  }, [records, actualTarget]);

  const availableMonths = useMemo(() => {
    const set = new Set();
    records.forEach(r => {
      if (r.date && r.date.length >= 7) set.add(r.date.substring(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [records]);

  const availableTeams = useMemo(() => {
    const set = new Set();
    records.forEach(r => {
      if (r.team_name) set.add(r.team_name);
    });
    return Array.from(set).sort();
  }, [records]);

  const calibratedRecords = useMemo(() => {
    return records.map(r => {
      const tb = parseInt(r.total_boards, 10) || 0;
      const ach = parseInt(r.achieved, 10) || 0;
      const reportedKO = getRecordReportedKO(r);
      const estimatedActual = Math.round(reportedKO * overallMetrics.calibrationRatio);
      const repairedMeters = Math.max(0, reportedKO - estimatedActual);
      const shiftRepairPct = reportedKO > 0 ? ((repairedMeters / reportedKO) * 100) : 0;

      return {
        ...r,
        tb,
        ach,
        reportedKO,
        estimatedActual,
        repairedMeters,
        shiftRepairPct
      };
    });
  }, [records, overallMetrics.calibrationRatio]);

  const filteredRecords = useMemo(() => {
    return calibratedRecords.filter(r => {
      const matchMonth = selectedMonth === 'ALL' || (r.date && r.date.startsWith(selectedMonth));
      const matchTeam = selectedTeam === 'ALL' || r.team_name === selectedTeam;
      const matchSearch = searchQuery.trim() === '' || 
        (r.team_name && r.team_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.date && r.date.includes(searchQuery.trim())) ||
        (r.notes && r.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchMonth && matchTeam && matchSearch;
    });
  }, [calibratedRecords, selectedMonth, selectedTeam, searchQuery]);

  const handleSaveTarget = () => {
    const parsed = parseInt(targetInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setActualTarget(parsed);
      localStorage.setItem(STORAGE_ACTUAL_KEY, String(parsed));
      setIsEditingTarget(false);
    } else {
      alert('Please enter a valid positive number for actual defective meters.');
    }
  };

  const handleResetTarget = () => {
    setActualTarget(DEFAULT_ACTUAL_DEFECTS);
    setTargetInput(String(DEFAULT_ACTUAL_DEFECTS));
    localStorage.removeItem(STORAGE_ACTUAL_KEY);
    setIsEditingTarget(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 60 }}>
      {/* ── Status Message Banner ── */}
      {trackerSuccessMsg && (
        <div style={{
          background: '#dcfce7',
          color: '#15803d',
          border: '1.5px solid #86efac',
          padding: '14px 20px',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontWeight: 800,
          fontSize: '0.94rem',
          boxShadow: '0 4px 12px rgba(21, 128, 61, 0.12)'
        }}>
          <CheckCircle2 size={22} />
          {trackerSuccessMsg}
        </div>
      )}

      {/* ── Primary Navigation Tabs: TRACKER (Hub) vs ANALYTICS ── */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: 2
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('TRACKER')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 22px',
            borderRadius: '10px 10px 0 0',
            fontWeight: 800,
            fontSize: '0.94rem',
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'TRACKER' ? '#ffffff' : 'transparent',
            color: activeTab === 'TRACKER' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'TRACKER' ? '3px solid #0284c7' : '3px solid transparent',
            boxShadow: activeTab === 'TRACKER' ? '0 -2px 8px rgba(0,0,0,0.04)' : 'none'
          }}
        >
          <Scan size={18} />
          {t('defectiveTrackerTab')}
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 900,
            background: activeTab === 'TRACKER' ? '#e0f2fe' : '#f1f5f9',
            color: activeTab === 'TRACKER' ? '#0369a1' : '#64748b',
            padding: '2px 8px',
            borderRadius: 999
          }}>
            {trackerKPIs.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ANALYTICS')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 22px',
            borderRadius: '10px 10px 0 0',
            fontWeight: 800,
            fontSize: '0.94rem',
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'ANALYTICS' ? '#ffffff' : 'transparent',
            color: activeTab === 'ANALYTICS' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'ANALYTICS' ? '3px solid #0284c7' : '3px solid transparent',
            boxShadow: activeTab === 'ANALYTICS' ? '0 -2px 8px rgba(0,0,0,0.04)' : 'none'
          }}
        >
          <Sliders size={18} />
          {t('analyticsCalibrationTab')}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: DEFECTIVE METERS TRACKER & REWORK HUB ───────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'TRACKER' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* ── 🌟 DYNAMIC INTERACTIVE REGISTRATION HUB (Top-Center Hero Card) ── */}
          <div className="card-white" style={{
            padding: '28px 32px',
            border: '2px solid #cbd5e1',
            borderRadius: 16,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Step Progress Pills Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
              marginBottom: 20
            }}>
              {[
                { step: 1, label: isArabic ? '1. مسح السيريال' : '1. Scan Serial', icon: <Scan size={14} /> },
                { step: 2, label: isArabic ? '2. اختيار المرحلة' : '2. Select Stage', icon: <Layers size={14} /> },
                { step: 3, label: isArabic ? '3. كود العطل' : '3. Defect Code', icon: <Tag size={14} /> }
              ].map(s => {
                const isActive = wizardStep === s.step;
                const isPassed = wizardStep > s.step;
                return (
                  <div
                    key={s.step}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 14px',
                      borderRadius: 20,
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      background: isActive ? '#0284c7' : (isPassed ? '#dcfce7' : '#f1f5f9'),
                      color: isActive ? '#ffffff' : (isPassed ? '#15803d' : '#64748b'),
                      border: isActive ? '1.5px solid #0284c7' : (isPassed ? '1px solid #86efac' : '1px solid #cbd5e1'),
                      boxShadow: isActive ? '0 2px 8px rgba(2, 132, 199, 0.25)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isPassed ? <Check size={13} strokeWidth={3} /> : s.icon}
                    <span>{s.label}</span>
                  </div>
                );
              })}
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* ── STEP 1: SCAN OR ENTER SERIAL NUMBER ───────────────────────── */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {wizardStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Scan size={30} />
                </div>

                <div>
                  <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: 'var(--navy)' }}>
                    {isArabic ? 'امسح باركود العداد المعطل أو اكتب السيريال' : 'Scan Defective Meter Barcode or Enter Serial'}
                  </h2>
                  <p style={{ margin: '6px 0 0', fontSize: '0.86rem', color: '#64748b' }}>
                    {isArabic 
                      ? 'وجّه قارئ الباركود (Scanner) أو اكتب السيريال واضغط Enter للمتابعة لاختيار المرحلة' 
                      : 'Point barcode scanner or type serial number and press Enter to select stage'}
                  </p>
                </div>

                {/* Big Centered Input */}
                <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    ref={serialInputRef}
                    type="text"
                    className="search-input"
                    value={scanSerial}
                    onChange={e => setScanSerial(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (scanSerial.trim()) {
                          setWizardStep(2);
                        }
                      }
                    }}
                    placeholder={isArabic ? 'مثال: 2601004523 (Enter)' : 'e.g. 2601004523 (Enter)'}
                    style={{
                      height: 54,
                      fontSize: '1.35rem',
                      fontWeight: 900,
                      textAlign: 'center',
                      letterSpacing: '0.06em',
                      border: detectedPreviousMeter ? '2.5px solid #f59e0b' : '2px solid #0284c7',
                      boxShadow: '0 4px 14px rgba(2, 132, 199, 0.14)',
                      borderRadius: 12
                    }}
                    autoFocus
                  />

                  {/* Recurring Meter Alert Pill */}
                  {detectedPreviousMeter && (
                    <div style={{
                      background: detectedPreviousMeter.entry_count >= 2 ? '#fee2e2' : '#fef3c7',
                      color: detectedPreviousMeter.entry_count >= 2 ? '#991b1b' : '#92400e',
                      border: detectedPreviousMeter.entry_count >= 2 ? '1.5px solid #ef4444' : '1px solid #f59e0b',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}>
                      <ShieldAlert size={16} />
                      {detectedPreviousMeter.entry_count >= 2
                        ? (isArabic ? `🛑 عداد مكرر عالي الخطورة! دخل ${detectedPreviousMeter.entry_count} مرات سابقاً - ستكون هذه الدورة #${detectedPreviousMeter.entry_count + 1}` : `🛑 Critical repeated failure! Entered ${detectedPreviousMeter.entry_count} times previously`)
                        : (isArabic ? `⚠️ تنبيه: مسجل سابقاً في مرحلة ${detectedPreviousMeter.stage} (كود ${detectedPreviousMeter.defect_code}) - ستكون الدورة #2` : `⚠️ Notice: Previously entered at ${detectedPreviousMeter.stage} (Code ${detectedPreviousMeter.defect_code})`)}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!scanSerial.trim()}
                    onClick={() => {
                      if (scanSerial.trim()) setWizardStep(2);
                    }}
                    className="btn-primary"
                    style={{
                      height: 48,
                      fontSize: '0.98rem',
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      borderRadius: 10,
                      opacity: scanSerial.trim() ? 1 : 0.6
                    }}
                  >
                    <span>{isArabic ? 'المتابعة لاختيار المرحلة' : 'Continue to Stage Selection'}</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* ── STEP 2: INTERACTIVE COLORED STAGE BUTTONS ─────────────────── */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {wizardStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
                {/* Active Meter Pill */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#0f172a', color: '#ffffff', padding: '6px 16px', borderRadius: 999 }}>
                  <QrCode size={15} color="#38bdf8" />
                  <span style={{ fontSize: '0.92rem', fontWeight: 900, letterSpacing: '0.04em' }}>
                    {scanSerial}
                  </span>
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.74rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginLeft: 6
                    }}
                  >
                    <RotateCcw size={12} /> {isArabic ? 'تعديل السيريال' : 'Change'}
                  </button>
                </div>

                <div>
                  <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: 'var(--navy)' }}>
                    {isArabic ? 'اختر مرحلة خروج العداد المعطل' : 'Select Failure Stage'}
                  </h2>
                  <p style={{ margin: '6px 0 0', fontSize: '0.86rem', color: '#64748b' }}>
                    {isArabic 
                      ? 'اضغط على المحطة التي تم رصد العطل فيها للمتابعة الفورية لكتابة الكود' 
                      : 'Click the station where this defect was detected'}
                  </p>
                </div>

                {/* Big Interactive Colored Stage Buttons */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 12,
                  width: '100%',
                  maxWidth: 920,
                  marginTop: 6
                }}>
                  {STAGES.map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setSelectedStage(st.id);
                        setWizardStep(3);
                      }}
                      style={{
                        padding: '18px 12px',
                        borderRadius: 14,
                        border: `2px solid ${st.border}`,
                        background: st.bg,
                        color: st.color,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = `0 8px 18px ${st.color}33`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                      }}
                    >
                      <span style={{ fontSize: '1.6rem' }}>{st.icon}</span>
                      <span style={{ fontSize: '1rem', fontWeight: 900 }}>{st.name}</span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, opacity: 0.9 }}>{st.arabic}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#64748b',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 4
                  }}
                >
                  <ArrowLeft size={14} /> {isArabic ? 'رجوع لتعديل السيريال' : 'Back to Serial'}
                </button>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* ── STEP 3: ENTER DEFECT CODE (Buttons disappeared) ───────────── */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {wizardStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
                {/* Meter & Selected Stage Header Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0f172a', color: '#ffffff', padding: '5px 14px', borderRadius: 999, fontSize: '0.86rem', fontWeight: 800 }}>
                    <QrCode size={14} color="#38bdf8" />
                    <span>{scanSerial}</span>
                  </div>

                  {(() => {
                    const stObj = STAGES.find(s => s.id === selectedStage) || STAGES[0];
                    return (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: stObj.bg, color: stObj.color, border: `1.5px solid ${stObj.border}`, padding: '4px 14px', borderRadius: 999, fontSize: '0.84rem', fontWeight: 900 }}>
                        <span>{stObj.icon}</span>
                        <span>{stObj.name} ({stObj.arabic})</span>
                      </div>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      padding: '4px 10px',
                      borderRadius: 999,
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <RotateCcw size={12} /> {isArabic ? 'تغيير المرحلة' : 'Change Stage'}
                  </button>
                </div>

                <div>
                  <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: 'var(--navy)' }}>
                    {isArabic ? 'أدخل كود العطل أو نوع الخلل' : 'Enter Defect Code or Symptom'}
                  </h2>
                  <p style={{ margin: '6px 0 0', fontSize: '0.86rem', color: '#64748b' }}>
                    {isArabic 
                      ? 'اكتب كود العطل (مثل -640) أو اختر من الأكواد الشائعة ثم اضغط Enter للحفظ' 
                      : 'Type defect code (e.g. -640) or pick a quick code chip and press Enter'}
                  </p>
                </div>

                {/* Big Code Input Form */}
                <div style={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input
                    ref={codeInputRef}
                    type="text"
                    className="search-input"
                    value={defectCode}
                    onChange={e => setDefectCode(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleRegisterDefective();
                      }
                    }}
                    placeholder={t('defectCodePlaceholder')}
                    style={{
                      height: 54,
                      fontSize: '1.35rem',
                      fontWeight: 900,
                      textAlign: 'center',
                      border: '2px solid #dc2626',
                      boxShadow: '0 4px 14px rgba(220, 38, 38, 0.14)',
                      borderRadius: 12
                    }}
                    autoFocus
                  />

                  {/* Quick Code Chips */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {COMMON_DEFECT_CODES.map(cd => (
                      <button
                        key={cd}
                        type="button"
                        onClick={() => setDefectCode(cd)}
                        style={{
                          border: defectCode === cd ? '2px solid #dc2626' : '1px solid #cbd5e1',
                          background: defectCode === cd ? '#fee2e2' : '#f8fafc',
                          color: defectCode === cd ? '#b91c1c' : '#475569',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        {cd}
                      </button>
                    ))}
                  </div>

                  {/* Optional Notes */}
                  <input
                    type="text"
                    className="search-input"
                    value={defectNotes}
                    onChange={e => setDefectNotes(e.target.value)}
                    placeholder={isArabic ? 'ملاحظات إضافية حول العطل (اختياري)...' : 'Optional defect symptom notes...'}
                    style={{ fontSize: '0.82rem', textAlign: 'center' }}
                  />

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="btn-secondary"
                      style={{ flex: 1, height: 46, fontWeight: 800 }}
                    >
                      {isArabic ? '← رجوع للمرحلة' : '← Back'}
                    </button>

                    <button
                      type="button"
                      disabled={isSubmittingDefect || isViewer || !defectCode.trim()}
                      onClick={handleRegisterDefective}
                      className="btn-primary"
                      style={{
                        flex: 2,
                        height: 46,
                        fontWeight: 900,
                        fontSize: '0.96rem',
                        background: '#059669',
                        borderColor: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      <Check size={18} />
                      {isSubmittingDefect ? 'Saving...' : (isArabic ? 'تأكيد وتسجيل العداد المعطل (Enter)' : 'Confirm & Log Defect (Enter)')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Top 4 KPI Cards for Defective Meters ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 14
          }}>
            {/* KPI 1: Total Logged */}
            <div className="card-kpi" style={{ borderLeft: isArabic ? 'none' : '5px solid #0284c7', borderRight: isArabic ? '5px solid #0284c7' : 'none' }}>
              <div className="card-kpi-label">{isArabic ? 'إجمالي العدادات المعطلة' : 'Total Defective Meters'}</div>
              <div className="card-kpi-val" style={{ color: '#0369a1' }}>{trackerKPIs.total}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                {isArabic ? 'جميع الحالات المسجلة بالباركود' : 'All barcode-scanned intakes'}
              </div>
            </div>

            {/* KPI 2: Under Inspection / Repair */}
            <div className="card-kpi" style={{ borderLeft: isArabic ? 'none' : '5px solid #d97706', borderRight: isArabic ? '5px solid #d97706' : 'none' }}>
              <div className="card-kpi-label">{isArabic ? 'قيد المعاينة والإصلاح حالياً' : 'Active Under Repair'}</div>
              <div className="card-kpi-val" style={{ color: '#b45309' }}>{trackerKPIs.underInspection}</div>
              <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700, marginTop: 4 }}>
                {isArabic ? 'بانتظار الصيانة أو إعادة الاختبار' : 'Awaiting rework / test'}
              </div>
            </div>

            {/* KPI 3: Repaired & Returned */}
            <div className="card-kpi" style={{ borderLeft: isArabic ? 'none' : '5px solid #10b981', borderRight: isArabic ? '5px solid #10b981' : 'none' }}>
              <div className="card-kpi-label">{isArabic ? 'تم الإصلاح وعاد للإنتاج' : 'Repaired & Returned'}</div>
              <div className="card-kpi-val" style={{ color: '#16a34a' }}>{trackerKPIs.returnedToLine}</div>
              <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700, marginTop: 4 }}>
                {trackerKPIs.total > 0 ? `${Math.round((trackerKPIs.returnedToLine / trackerKPIs.total) * 100)}% ${isArabic ? 'نسبة الاستعادة' : 'Recovery Rate'}` : '0%'}
              </div>
            </div>

            {/* KPI 4: Recurring Failures */}
            <div className="card-kpi" style={{ borderLeft: isArabic ? 'none' : '5px solid #dc2626', borderRight: isArabic ? '5px solid #dc2626' : 'none' }}>
              <div className="card-kpi-label">{isArabic ? 'عدادات متكررة العطل (2+)' : 'Recurring Failures (2+)'}</div>
              <div className="card-kpi-val" style={{ color: trackerKPIs.recurringCount > 0 ? '#dc2626' : '#16a34a' }}>
                {trackerKPIs.recurringCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: trackerKPIs.recurringCount > 0 ? '#b91c1c' : '#15803d', fontWeight: 700, marginTop: 4 }}>
                {trackerKPIs.recurringCount > 0 
                  ? (isArabic ? 'تتطلب تدخلاً هندسياً حاسماً' : 'Requires engineering root cause') 
                  : (isArabic ? 'لا توجد عدادات مكررة' : 'Zero repeated defectives')}
              </div>
            </div>
          </div>

          {/* ── Defective Meters Live Table ── */}
          <div className="card-white" style={{ padding: 20, border: '1px solid #cbd5e1' }}>
            {/* Filter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: 'var(--navy)' }}>
                  {isArabic ? 'سجل تتبع العدادات المعطلة وحلقات الإصلاح' : 'Defective Meters Live Tracking Registry'}
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  {isArabic ? `إجمالي المسجل: ${filteredDefectiveMeters.length} عداد` : `Showing ${filteredDefectiveMeters.length} defective units`}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {/* Search */}
                <div className="search-wrap" style={{ minWidth: 170 }}>
                  <Search className="search-icon" size={13} />
                  <input
                    type="text"
                    className="search-input"
                    placeholder={isArabic ? 'بحث بالسيريال، الكود...' : 'Search serial, code...'}
                    value={trackerSearch}
                    onChange={e => setTrackerSearch(e.target.value)}
                    style={{ padding: '6px 10px 6px 30px', fontSize: '0.78rem' }}
                  />
                </div>

                {/* Stage Filter */}
                <select
                  className="search-input"
                  value={trackerStageFilter}
                  onChange={e => setTrackerStageFilter(e.target.value)}
                  style={{ width: 'auto', padding: '6px 10px', fontSize: '0.78rem', fontWeight: 700 }}
                >
                  <option value="ALL">{isArabic ? 'جميع المراحل' : 'All Stages'}</option>
                  {STAGES.map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  className="search-input"
                  value={trackerStatusFilter}
                  onChange={e => setTrackerStatusFilter(e.target.value)}
                  style={{ width: 'auto', padding: '6px 10px', fontSize: '0.78rem', fontWeight: 700 }}
                >
                  <option value="ALL">{isArabic ? 'جميع الحالات' : 'All Statuses'}</option>
                  <option value="UNDER_INSPECTION">{isArabic ? 'قيد المعاينة والإصلاح' : 'Under Inspection'}</option>
                  <option value="RETURNED_TO_LINE">{isArabic ? 'تم الإصلاح وعاد للخط' : 'Returned to Line'}</option>
                  <option value="SCRAPPED_KO">{isArabic ? 'تالف نهائي (Scrapped)' : 'Scrapped KO'}</option>
                </select>

                {/* Recurring Failures Toggle Pill */}
                <button
                  type="button"
                  onClick={() => setOnlyRecurringFilter(!onlyRecurringFilter)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    border: onlyRecurringFilter ? '2px solid #dc2626' : '1px solid #cbd5e1',
                    background: onlyRecurringFilter ? '#fee2e2' : '#ffffff',
                    color: onlyRecurringFilter ? '#991b1b' : '#64748b'
                  }}
                >
                  <AlertTriangle size={13} />
                  {isArabic ? 'المتكررة فقط (2+)' : 'Recurring Only'}
                </button>
              </div>
            </div>

            {/* Registry Table */}
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{isArabic ? 'سيريال العداد' : 'Serial Number'}</th>
                    <th>{isArabic ? 'المرحلة' : 'Stage'}</th>
                    <th>{isArabic ? 'كود العطل' : 'Defect Code'}</th>
                    <th>{isArabic ? 'المشرف / وقت الرصد' : 'Logged By / Time'}</th>
                    <th style={{ textAlign: 'center' }}>{t('entryCountLabel')}</th>
                    <th style={{ textAlign: 'center' }}>{t('returnCountLabel')}</th>
                    <th>{t('status')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDefects ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                        {t('loading')}
                      </td>
                    </tr>
                  ) : filteredDefectiveMeters.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                        {isArabic ? 'لا توجد عدادات مطابقة للبحث أو الفلاتر.' : 'No defective meters matching current filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredDefectiveMeters.map(meter => {
                      const isUnderRepair = meter.status === 'UNDER_INSPECTION' || meter.status === 'IN_REPAIR';
                      const isReturned = meter.status === 'RETURNED_TO_LINE';
                      const isScrapped = meter.status === 'SCRAPPED_KO';
                      const isRepeated = meter.entry_count > 1;
                      const stageObj = STAGES.find(s => s.id === meter.stage) || { name: meter.stage, color: '#334155', bg: '#f1f5f9', border: '#cbd5e1', icon: '•' };

                      return (
                        <tr key={meter.id} style={{ background: isRepeated ? '#fffbfb' : 'transparent' }}>
                          {/* Serial Number & Recurring Badges */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 900, color: 'var(--navy)', fontSize: '0.88rem' }}>
                                {meter.serial_number}
                              </span>
                              {meter.entry_count === 2 && (
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  border: '1px solid #fcd34d',
                                  padding: '1px 5px',
                                  borderRadius: 4
                                }}>
                                  ⚠️ 2nd Entry
                                </span>
                              )}
                              {meter.entry_count >= 3 && (
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 900,
                                  background: '#fee2e2',
                                  color: '#b91c1c',
                                  border: '1px solid #fca5a5',
                                  padding: '1px 5px',
                                  borderRadius: 4
                                }}>
                                  🛑 {meter.entry_count}x Cycles (Critical)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Stage (Vibrantly color-coded matching stage buttons) */}
                          <td>
                            <span style={{
                              fontWeight: 800,
                              fontSize: '0.76rem',
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: stageObj.bg,
                              color: stageObj.color,
                              border: `1px solid ${stageObj.border}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <span>{stageObj.icon}</span>
                              <span>{stageObj.name}</span>
                            </span>
                          </td>

                          {/* Defect Code */}
                          <td>
                            <span style={{
                              fontWeight: 900,
                              fontSize: '0.78rem',
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca'
                            }}>
                              {meter.defect_code}
                            </span>
                          </td>

                          {/* Logged by & Time */}
                          <td>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                              {meter.logged_by || 'Supervisor'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              {meter.logged_at ? new Date(meter.logged_at).toLocaleDateString() : '—'}
                            </div>
                          </td>

                          {/* Entry Count */}
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              fontSize: '0.82rem',
                              fontWeight: 900,
                              color: isRepeated ? '#dc2626' : '#0369a1',
                              background: isRepeated ? '#fee2e2' : '#e0f2fe',
                              padding: '2px 8px',
                              borderRadius: 6
                            }}>
                              {meter.entry_count || 1}
                            </span>
                          </td>

                          {/* Return Count */}
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              fontSize: '0.82rem',
                              fontWeight: 900,
                              color: meter.return_count > 0 ? '#16a34a' : '#64748b',
                              background: meter.return_count > 0 ? '#dcfce7' : '#f1f5f9',
                              padding: '2px 8px',
                              borderRadius: 6
                            }}>
                              {meter.return_count || 0}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td>
                            <span style={{
                              padding: '3px 9px',
                              borderRadius: 6,
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              background: isReturned ? '#dcfce7' : (isScrapped ? '#fee2e2' : '#fef3c7'),
                              color: isReturned ? '#166534' : (isScrapped ? '#991b1b' : '#92400e'),
                              border: isReturned ? '1px solid #86efac' : (isScrapped ? '1px solid #fca5a5' : '1px solid #fde68a')
                            }}>
                              {isReturned 
                                ? (isArabic ? '✅ تم الإصلاح وعاد للخط' : 'Repaired & Returned') 
                                : (isScrapped 
                                    ? (isArabic ? '🛑 تالف نهائي (Scrapped)' : 'Scrapped KO') 
                                    : (isArabic ? '⏳ قيد المعاينة والإصلاح' : 'Under Inspection'))}
                            </span>
                          </td>

                          {/* Actions */}
                          <td>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              {/* Mark Repaired & Return Button */}
                              {isUnderRepair && !isViewer && (
                                <button
                                  type="button"
                                  className="btn-outline"
                                  onClick={() => openRepairModal(meter)}
                                  title={isArabic ? 'توثيق الإصلاح وإعادة للإنتاج' : 'Mark Repaired & Return'}
                                  style={{
                                    borderColor: '#10b981',
                                    color: '#047857',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    padding: '4px 8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <Wrench size={13} /> {isArabic ? 'إصلاح وعودة' : 'Repair'}
                                </button>
                              )}

                              {/* View Lifecycle History Button */}
                              <button
                                type="button"
                                className="btn-outline"
                                onClick={() => setLifecycleModalMeter(meter)}
                                title={isArabic ? 'عرض دورة حياة وتاريخ العداد' : 'View Lifecycle History'}
                                style={{ padding: '4px 8px', color: '#0369a1', borderColor: '#bae6fd' }}
                              >
                                <History size={14} />
                              </button>

                              {/* Scrap Button */}
                              {isUnderRepair && !isViewer && (
                                <button
                                  type="button"
                                  className="btn-outline"
                                  onClick={() => handleScrapMeter(meter)}
                                  title={isArabic ? 'استبعاد كتالف نهائي' : 'Mark Scrapped'}
                                  style={{ padding: '4px 8px', color: '#dc2626', borderColor: '#fecdd3' }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}

                              {/* Admin Delete */}
                              {isAdmin && (
                                <button
                                  type="button"
                                  className="btn-outline"
                                  onClick={() => handleDeleteMeter(meter.id)}
                                  title="Delete record"
                                  style={{ padding: '4px 6px', color: '#94a3b8', border: 'none' }}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Modal: Complete Rework & Return to Production Line ── */}
          {repairModalMeter && (
            <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setRepairModalMeter(null)}>
              <div className="modal" style={{ maxWidth: 540 }}>
                <div className="modal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Wrench size={20} color="#10b981" />
                    <span className="modal-title">
                      {t('repairModalTitle')}
                    </span>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setRepairModalMeter(null)}>×</button>
                </div>

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Meter Quick Summary Box */}
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{isArabic ? 'سيريال العداد' : 'Serial Number'}</span>
                      <div style={{ fontWeight: 900, color: 'var(--navy)', fontSize: '0.94rem' }}>{repairModalMeter.serial_number}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{isArabic ? 'كود العطل' : 'Defect Code'}</span>
                      <div style={{ fontWeight: 900, color: '#dc2626' }}>{repairModalMeter.defect_code}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{isArabic ? 'مرحلة الخروج' : 'Failure Stage'}</span>
                      <div style={{ fontWeight: 800 }}>{repairModalMeter.stage}</div>
                    </div>
                  </div>

                  {/* Technician Name */}
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--navy)', display: 'block', marginBottom: 4 }}>
                      {t('technicianName')}: <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="search-input"
                      value={repairTechName}
                      onChange={e => setRepairTechName(e.target.value)}
                      placeholder="Technician Name"
                      style={{ fontWeight: 700, fontSize: '0.86rem' }}
                    />
                  </div>

                  {/* Return Destination Stage */}
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--navy)', display: 'block', marginBottom: 4 }}>
                      {t('returnDestination')}:
                    </label>
                    <select
                      className="search-input"
                      value={repairDestination}
                      onChange={e => setRepairDestination(e.target.value)}
                      style={{ fontWeight: 800, fontSize: '0.86rem' }}
                    >
                      {STAGES.map(st => (
                        <option key={st.id} value={st.id}>{st.name} ({st.arabic})</option>
                      ))}
                    </select>
                  </div>

                  {/* Action Taken & Replaced Components */}
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--navy)', display: 'block', marginBottom: 4 }}>
                      {t('repairActionTaken')}: <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <textarea
                      rows={3}
                      className="search-input"
                      value={repairActionTaken}
                      onChange={e => setRepairActionTaken(e.target.value)}
                      placeholder={t('repairNotesPlaceholder')}
                      style={{ width: '100%', padding: 10, fontSize: '0.82rem', resize: 'vertical' }}
                    />
                  </div>
                </div>

                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button type="button" className="btn-secondary" onClick={() => setRepairModalMeter(null)}>
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={isSubmittingRepair}
                    onClick={handleConfirmRepair}
                    style={{ background: '#10b981', borderColor: 'transparent', fontWeight: 800 }}
                  >
                    {isSubmittingRepair ? 'Saving...' : t('confirmReturnBtn')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Modal: Meter Lifecycle & Historical Timeline ── */}
          {lifecycleModalMeter && (
            <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setLifecycleModalMeter(null)}>
              <div className="modal" style={{ maxWidth: 650, maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="modal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <History size={20} color="#0284c7" />
                    <span className="modal-title">
                      {isArabic ? `سجل دورة حياة العداد (${lifecycleModalMeter.serial_number})` : `Lifecycle Timeline: ${lifecycleModalMeter.serial_number}`}
                    </span>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setLifecycleModalMeter(null)}>×</button>
                </div>

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Status & Cycles Summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{isArabic ? 'مرات الدخول معطلاً' : 'Total In-Cycles'}</span>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: lifecycleModalMeter.entry_count > 1 ? '#dc2626' : '#0369a1' }}>
                        {lifecycleModalMeter.entry_count || 1} {isArabic ? 'مرات' : 'times'}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{isArabic ? 'مرات الخروج للإنتاج' : 'Total Returns'}</span>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: '#16a34a' }}>
                        {lifecycleModalMeter.return_count || 0} {isArabic ? 'مرات' : 'times'}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{isArabic ? 'الحالة الحالية' : 'Current Status'}</span>
                      <div style={{ fontSize: '0.86rem', fontWeight: 800 }}>
                        {lifecycleModalMeter.status}
                      </div>
                    </div>
                  </div>

                  {/* History Timeline */}
                  <div>
                    <h4 style={{ margin: '0 0 10px', fontSize: '0.88rem', fontWeight: 800, color: 'var(--navy)' }}>
                      {isArabic ? 'المحطات والأحداث المسجلة بالتسلسل الزمني:' : 'Chronological Events & Rework Stages:'}
                    </h4>

                    {(!lifecycleModalMeter.history || lifecycleModalMeter.history.length === 0) ? (
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: 16 }}>
                        {isArabic ? 'لا توجد تفاصيل إضافية مسجلة.' : 'No detailed events logged for this unit.'}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderLeft: '2px solid #cbd5e1', paddingLeft: 14, marginLeft: 6 }}>
                        {lifecycleModalMeter.history.map((ev, idx) => {
                          const isEntry = ev.type === 'ENTRY';
                          const isReturn = ev.type === 'RETURN_TO_LINE';
                          const isScrap = ev.type === 'SCRAP_KO';

                          return (
                            <div key={idx} style={{ position: 'relative' }}>
                              {/* Dot on timeline */}
                              <div style={{
                                position: 'absolute',
                                left: -21,
                                top: 4,
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                background: isEntry ? '#dc2626' : (isReturn ? '#10b981' : '#64748b'),
                                border: '2px solid #ffffff',
                                boxShadow: '0 0 0 1.5px #cbd5e1'
                              }} />

                              <div style={{
                                background: isEntry ? '#fff8f8' : (isReturn ? '#f0fdf4' : '#f8fafc'),
                                border: isEntry ? '1px solid #fecaca' : (isReturn ? '1px solid #bbf7d0' : '1px solid #e2e8f0'),
                                borderRadius: 8,
                                padding: '10px 14px'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                  <span style={{
                                    fontSize: '0.74rem',
                                    fontWeight: 900,
                                    color: isEntry ? '#991b1b' : (isReturn ? '#166534' : '#334155')
                                  }}>
                                    {isEntry && (isArabic ? `🔻 دخول معطل (الدورة #${ev.cycle}) - محطة ${ev.stage}` : `🔻 Defect Intake (Cycle #${ev.cycle}) - ${ev.stage}`)}
                                    {isReturn && (isArabic ? `🟢 إصلاح وعودة لخط الإنتاج (الدورة #${ev.cycle})` : `🟢 Repaired & Returned to Line (Cycle #${ev.cycle})`)}
                                    {isScrap && (isArabic ? `🛑 تم استبعاد العداد كتالف نهائي` : `🛑 Meter Scrapped / KO Permanent`)}
                                  </span>
                                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                    {ev.logged_at ? new Date(ev.logged_at).toLocaleString() : (ev.returned_at ? new Date(ev.returned_at).toLocaleString() : '—')}
                                  </span>
                                </div>

                                {isEntry && (
                                  <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                                    <div><strong>{isArabic ? 'كود العطل:' : 'Defect Code:'}</strong> <span style={{ color: '#b91c1c', fontWeight: 800 }}>{ev.defect_code}</span></div>
                                    <div><strong>{isArabic ? 'المشرف المدخل:' : 'Logged By:'}</strong> {ev.logged_by}</div>
                                    {ev.notes && <div style={{ marginTop: 2, fontStyle: 'italic' }}>"{ev.notes}"</div>}
                                  </div>
                                )}

                                {isReturn && (
                                  <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                                    <div><strong>{isArabic ? 'الفني:' : 'Technician:'}</strong> {ev.technician}</div>
                                    <div><strong>{isArabic ? 'الإجراء التصحيحي:' : 'Action Taken:'}</strong> {ev.action_taken}</div>
                                    {ev.destination && <div><strong>{isArabic ? 'المحطة المستهدفة:' : 'Returned To:'}</strong> {ev.destination}</div>}
                                  </div>
                                )}

                                {isScrap && (
                                  <div style={{ fontSize: '0.76rem', color: '#991b1b' }}>
                                    <div>{ev.reason || 'Scrapped permanently'}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-secondary" onClick={() => setLifecycleModalMeter(null)}>
                    {t('close')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: STATISTICAL CALIBRATION & REWORK ENGINE ─────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ANALYTICS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header & Target Control Bar */}
          <div className="card-white" style={{ padding: '20px 24px', border: '1.5px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={22} color="#dc2626" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--navy)' }}>
                    {isArabic ? 'تحليل ومعايرة عدادات العيوب' : 'Defect Meters Analysis & Calibration'}
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                    {isArabic 
                      ? 'مطابقة العيوب الفعلية المعتمدة واستبعاد دورات إعادة الفحص وحلقات التعديل (Rework Loop Calibration)' 
                      : 'Reconciling ground-truth physical defects by eliminating test re-runs & rework loops (Rework Loop Calibration)'}
                  </p>
                </div>
              </div>

              <button 
                onClick={fetchProductionRecords} 
                disabled={loadingRecords}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}
              >
                <RefreshCw size={13} className={loadingRecords ? 'spin' : ''} />
                {loadingRecords ? (isArabic ? 'جارِ التحديث...' : 'Refreshing...') : (isArabic ? 'تحديث البيانات' : 'Refresh Data')}
              </button>
            </div>

            {/* Calibration Control Bar */}
            <div style={{
              marginTop: 16,
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: 10,
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155' }}>
                  {isArabic ? 'المعيار الأساسي للعدادات المعيبة الفعلية (Ground Truth)' : 'Baseline Physical Defective Meters (Ground Truth)'}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  {isArabic ? (
                    <>نسبة المعايرة الحالية: <strong>{(overallMetrics.calibrationRatio * 100).toFixed(2)}%</strong> من إجمالي حالات الفشل المسجلة ({overallMetrics.totalReportedKOAll.toLocaleString()} لوحة KO)</>
                  ) : (
                    <>Current Calibration Ratio: <strong>{(overallMetrics.calibrationRatio * 100).toFixed(2)}%</strong> of total reported failure instances ({overallMetrics.totalReportedKOAll.toLocaleString()} Boards KO)</>
                  )}
                </div>
              </div>

              <div>
                {isEditingTarget ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      value={targetInput}
                      onChange={e => setTargetInput(e.target.value)}
                      style={{ width: 100, padding: '5px 8px', borderRadius: 6, border: '1.5px solid #0284c7', fontWeight: 800, fontSize: '0.9rem' }}
                      autoFocus
                    />
                    <button onClick={handleSaveTarget} className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '0.75rem' }}>
                      <Save size={13} /> {t('save')}
                    </button>
                    <button onClick={() => { setIsEditingTarget(false); setTargetInput(String(actualTarget)); }} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.75rem' }}>
                      {t('cancel')}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0369a1', background: '#e0f2fe', padding: '3px 12px', borderRadius: 8 }}>
                      {actualTarget.toLocaleString()} <span style={{ fontSize: '0.72rem' }}>{isArabic ? 'عداد فعلي' : 'Units'}</span>
                    </span>
                    {isAdmin && (
                      <button onClick={() => { setTargetInput(String(actualTarget)); setIsEditingTarget(true); }} className="btn btn-secondary" style={{ padding: '5px 8px', fontSize: '0.74rem' }}>
                        <Edit3 size={12} /> {t('edit')}
                      </button>
                    )}
                    {actualTarget !== DEFAULT_ACTUAL_DEFECTS && (
                      <button onClick={handleResetTarget} className="btn btn-secondary" style={{ padding: '5px 8px', fontSize: '0.74rem', color: '#b91c1c' }}>
                        <RotateCcw size={12} /> {isArabic ? 'الافتراضي' : 'Default'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KPI Analytics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {/* Net Defective Meters */}
            <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>
                {isArabic ? 'صافي العدادات المعيبة الفعلي' : 'Actual Net Defective Meters'}
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#b91c1c', margin: '4px 0' }}>
                {actualTarget.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#7f1d1d' }}>
                {isArabic ? 'العدد الفعلي مستبعداً منه دورات إعادة الفحص المكررة' : 'Physical shop floor count excluding re-test loops'}
              </div>
            </div>

            {/* Reported KO */}
            <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase' }}>
                {isArabic ? 'حالات الفشل المسجلة (Boards KO)' : 'Reported Failures (Boards KO)'}
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#b45309', margin: '4px 0' }}>
                {overallMetrics.totalReportedKOAll.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#78350f' }}>
                {isArabic ? 'إجمالي اللوحات الراسبة المسجلة عبر التقارير' : 'Total reported failed boards across all shifts'}
              </div>
            </div>

            {/* Calibration Ratio */}
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                {isArabic ? 'معامل المعايرة' : 'Calibration Ratio'}
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#15803d', margin: '4px 0' }}>
                {(overallMetrics.calibrationRatio * 100).toFixed(2)}%
              </div>
              <div style={{ fontSize: '0.72rem', color: '#14532d' }}>
                {isArabic ? 'معامل الدقة المحسوب' : 'Computed accuracy factor'}
              </div>
            </div>

            {/* Repaired / Recycled */}
            <div style={{ background: '#eef2ff', border: '1.5px solid #c7d2fe', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#3730a3', textTransform: 'uppercase' }}>
                {isArabic ? 'العدادات المُصلحة والمعاد تدويرها' : 'Repaired & Recycled (Rework)'}
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#4338ca', margin: '4px 0' }}>
                {overallMetrics.totalRepairedFromKOAll.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#312e81' }}>
                {overallMetrics.repairRateOverallPct.toFixed(1)}% {isArabic ? 'نسبة الاستعادة والإصلاح' : 'Recovery rate'}
              </div>
            </div>
          </div>

          {/* Shift Table for Calibration */}
          <div className="table-card">
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '0.94rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={16} color="var(--teal)" />
                {isArabic ? 'سجل العيوب المعايرة حسب كل وردية' : 'Shift-by-Shift Calibrated Defects Log'}
              </span>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder={isArabic ? 'بحث بالتاريخ أو الفريق...' : 'Search date or team...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ padding: '5px 10px', fontSize: '0.78rem', width: 150, borderRadius: 6, border: '1px solid #cbd5e1' }}
                />

                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  style={{ padding: '5px 10px', fontSize: '0.78rem', borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 700 }}
                >
                  <option value="ALL">{isArabic ? 'جميع الشهور' : 'All Months'}</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('date')}</th>
                    <th>{isArabic ? 'الوردية والفريق' : 'Shift & Team'}</th>
                    <th style={{ textAlign: 'center' }}>{isArabic ? 'المفحوص' : 'Tested'}</th>
                    <th style={{ textAlign: 'center' }}>{isArabic ? 'المطابق (OK)' : 'OK'}</th>
                    <th style={{ textAlign: 'center' }}>{isArabic ? 'الفشل (KO)' : 'Reported KO'}</th>
                    <th style={{ textAlign: 'center', background: '#fef2f2' }}>{isArabic ? 'الصافي المعاير' : 'Calibrated Net'}</th>
                    <th style={{ textAlign: 'center', background: '#f0fdf4' }}>{isArabic ? 'المُصلح' : 'Reworked'}</th>
                    <th style={{ textAlign: 'center' }}>{isArabic ? 'تفاصيل' : 'Details'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>
                        {isArabic ? 'لا توجد سجلات مطابقة للفلاتر.' : 'No records matching filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.slice(0, 15).map(r => (
                      <tr key={r.id}>
                        <td><span style={{ fontWeight: 800, color: 'var(--navy)' }}>{r.date}</span></td>
                        <td><span style={{ fontWeight: 700 }}>{r.team_name || 'Standard Shift'}</span></td>
                        <td style={{ textAlign: 'center' }}>{r.tb.toLocaleString()}</td>
                        <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>{r.ach.toLocaleString()}</td>
                        <td style={{ textAlign: 'center', color: '#b45309', fontWeight: 800 }}>{r.reportedKO.toLocaleString()}</td>
                        <td style={{ textAlign: 'center', background: '#fef2f2', color: '#b91c1c', fontWeight: 900 }}>{r.estimatedActual.toLocaleString()}</td>
                        <td style={{ textAlign: 'center', background: '#f0fdf4', color: '#15803d', fontWeight: 800 }}>{r.repairedMeters.toLocaleString()}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedShiftForModal(r)}
                            className="btn-icon"
                            style={{ background: '#e0f2fe', color: '#0369a1' }}
                          >
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
