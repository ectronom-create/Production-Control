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
  AlertCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function ManagementDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');

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

  // Fetch production records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('production_records')
        .select('*')
        .order('date', { ascending: false });

      if (data) {
        setRecords(data);
        if (data.length > 0 && !selectedDate) {
          setSelectedDate(data[0].date);
        }
      }
    } catch (e) {
      console.warn('Error fetching production records:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
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

  // ─── 4. Hand-written Note Calculations (2-Oct to 12-Oct Recovery Plan) ───────
  const recoveryAnalysis = useMemo(() => {
    // Filter records from 2026-10-02 to 2026-10-12
    const periodRecords = records.filter(r => r.date >= '2026-10-02' && r.date <= '2026-10-12');
    const actualInPeriod = periodRecords.reduce((sum, r) => sum + (parseInt(r.achieved, 10) || 0), 0);
    const fwInPeriod = periodRecords.reduce((sum, r) => sum + (parseInt(r.updated_fw_qty, 10) || 0), 0);
    
    // 11 working days (2-Oct to 12-Oct) * 1,300 daily target
    const totalDays = 11;
    const targetInPeriod = totalDays * targets.dailyProd; // 11 * 1300 = 14,300
    const missingTarget = Math.max(0, targetInPeriod - actualInPeriod); // Gap
    const isTargetAchieved = actualInPeriod >= targetInPeriod;
    const achievementRate = targetInPeriod > 0 ? (actualInPeriod / targetInPeriod) * 100 : 0;

    // Remaining days until next Nama dispatch (Batch 2 on 15-Oct = 3 days remaining: 13, 14, 15 Oct)
    const recoveryDays = 7; // Plan over next 7 days
    const dailyCatchUp = Math.ceil(missingTarget / recoveryDays);
    const shiftCatchUp = Math.ceil(dailyCatchUp / 2);
    const revisedDailyTarget = targets.dailyProd + dailyCatchUp;
    const revisedShiftTarget = targets.shiftProd + shiftCatchUp;

    return {
      actualInPeriod,
      fwInPeriod,
      targetInPeriod,
      missingTarget,
      isTargetAchieved,
      achievementRate,
      dailyCatchUp,
      shiftCatchUp,
      revisedDailyTarget,
      revisedShiftTarget,
      recoveryDays
    };
  }, [records, targets]);

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
        border: '1px solid rgba(255,255,255,0.08)'
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
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Layers size={22} color="var(--navy)" />
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)' }}>
            Production — 3-Phase Target Hierarchy & Actuals
          </h3>
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
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Cpu size={22} color="#7c3aed" />
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#7c3aed' }}>
            Firmware (FW) — Flashing Targets & Completion
          </h3>
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

      {/* ── 4. Strategic Performance & Recovery Plan (2-Oct to 12-Oct Analysis) ── */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '24px 28px',
        border: '1.5px solid #e2e8f0',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={22} color="#b45309" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy)' }}>
                Target Performance & Recovery Plan (2-Oct to 12-Oct)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--gray-500)' }}>
                Handwritten Executive Directive: Analysis of actual output vs target and recovery plan calculation
              </p>
            </div>
          </div>

          <span className={`badge ${recoveryAnalysis.isTargetAchieved ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
            {recoveryAnalysis.isTargetAchieved ? '✅ Target Achieved' : '⚠️ Recovery Plan Required'}
          </span>
        </div>

        {/* 4 Cards: Status, Missing, Daily Catchup, Shift Catchup */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Period Actual (2-Oct — 12-Oct)</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: 'var(--navy)', marginTop: 4 }}>
              {recoveryAnalysis.actualInPeriod.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
              Expected: <b>{recoveryAnalysis.targetInPeriod.toLocaleString()}</b> (11 Days @ 1,300/day)
            </div>
          </div>

          <div style={{ background: '#fef2f2', padding: 16, borderRadius: 12, border: '1px solid #fee2e2' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>Target Deficit (Variance Gap)</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#b91c1c', marginTop: 4 }}>
              -{recoveryAnalysis.missingTarget.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#991b1b', marginTop: 4 }}>
              Achievement: <b>{recoveryAnalysis.achievementRate.toFixed(1)}%</b> of target
            </div>
          </div>

          <div style={{ background: '#fffbeb', padding: 16, borderRadius: 12, border: '1px solid #fef3c7' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>Recovery Daily Target</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#b45309', marginTop: 4 }}>
              {recoveryAnalysis.revisedDailyTarget.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: 4 }}>
              Base 1,300 + <b>{recoveryAnalysis.dailyCatchUp}</b> catch-up/day ({recoveryAnalysis.recoveryDays} days)
            </div>
          </div>

          <div style={{ background: '#ede9fe', padding: 16, borderRadius: 12, border: '1px solid #ddd6fe' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>Recovery Shift Target</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#6d28d9', marginTop: 4 }}>
              {recoveryAnalysis.revisedShiftTarget.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#5b21b6', marginTop: 4 }}>
              Base 650 + <b>{recoveryAnalysis.shiftCatchUp}</b> meters/shift (2 shifts)
            </div>
          </div>
        </div>

        {/* Narrative Box */}
        <div style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: '1.5rem' }}>🎯</div>
          <div style={{ fontSize: '0.86rem', color: '#115e59', lineHeight: 1.5 }}>
            <strong>Strategic Recovery Directive:</strong> To recover the pending <strong>{recoveryAnalysis.missingTarget.toLocaleString()}</strong> meters deficit from the 2-Oct to 12-Oct period, daily production must be increased to <strong>{recoveryAnalysis.revisedDailyTarget.toLocaleString()} meters/day</strong> (or <strong>{recoveryAnalysis.revisedShiftTarget.toLocaleString()} meters/shift</strong>) over the next {recoveryAnalysis.recoveryDays} operating days prior to upcoming Nama Field shipments.
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

      {/* ── Summary Comparison Table ── */}
      <div className="table-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '0.95rem' }}>
            Target vs. Actual Matrix Summary
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
