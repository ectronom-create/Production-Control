import { useState, useEffect, useMemo } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const DEFAULT_ACTUAL_DEFECTS = 4250;
const STORAGE_ACTUAL_KEY = 'ectron_defect_actual_count';

export default function DefectMeters() {
  const { user } = useAuth();
  const isAdmin = user?.access === 'admin';

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Calibration Target State (Default 4250)
  const [actualTarget, setActualTarget] = useState(() => {
    const saved = localStorage.getItem(STORAGE_ACTUAL_KEY);
    return saved ? parseInt(saved, 10) || DEFAULT_ACTUAL_DEFECTS : DEFAULT_ACTUAL_DEFECTS;
  });
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(actualTarget));

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Station Detail Modal
  const [selectedShiftForModal, setSelectedShiftForModal] = useState(null);

  // Fetch production records from Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('production_records')
        .select('*')
        .order('date', { ascending: false })
        .order('id', { ascending: false });

      if (error) {
        console.warn('Error fetching production records:', error);
      } else {
        setRecords(data || []);
      }
    } catch (err) {
      console.warn('Failed to load records:', err);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save customized actual count
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

  // Helper: compute reported KO for a record from its stations array (Option 1: nbBoards - nbBoardsOK)
  const getRecordReportedKO = (rec) => {
    if (!Array.isArray(rec.stations) || rec.stations.length === 0) {
      // Fallback if stations array is empty
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

  // Overall Calibration Metrics across ALL records in the database
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

  // Months available in data for filter
  const availableMonths = useMemo(() => {
    const set = new Set();
    records.forEach(r => {
      if (r.date && r.date.length >= 7) {
        set.add(r.date.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [records]);

  // Teams available in data for filter
  const availableTeams = useMemo(() => {
    const set = new Set();
    records.forEach(r => {
      if (r.team_name) set.add(r.team_name);
    });
    return Array.from(set).sort();
  }, [records]);

  // Process and Calibrate each shift record
  const calibratedRecords = useMemo(() => {
    return records.map(r => {
      const tb = parseInt(r.total_boards, 10) || 0;
      const ach = parseInt(r.achieved, 10) || 0;
      const reportedKO = getRecordReportedKO(r);

      // Estimated actual physical defects for this shift using ratio
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

  // Filtered Records based on user selection
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

  // Filtered Summary Totals
  const filteredTotals = useMemo(() => {
    let repKO = 0;
    let estAct = 0;
    let repMeters = 0;
    let boards = 0;
    let achieved = 0;

    filteredRecords.forEach(r => {
      repKO += r.reportedKO;
      estAct += r.estimatedActual;
      repMeters += r.repairedMeters;
      boards += r.tb;
      achieved += r.achieved;
    });

    return {
      repKO,
      estAct,
      repMeters,
      boards,
      achieved,
      count: filteredRecords.length
    };
  }, [filteredRecords]);

  // Station Level Breakdown (Aggregated across filtered or all records)
  const stationAnalytics = useMemo(() => {
    const map = {};

    filteredRecords.forEach(rec => {
      if (Array.isArray(rec.stations)) {
        rec.stations.forEach(st => {
          const name = st.stationName || st.bench || 'Unknown';
          const nbB = parseInt(st.nbBoards, 10) || 0;
          const nbOk = parseInt(st.nbBoardsOK, 10) || 0;
          const ko = Math.max(0, nbB - nbOk);
          const runs = parseInt(st.nbTestRun, 10) || nbB;

          if (!map[name]) {
            map[name] = { name, totalBoards: 0, totalOK: 0, totalKO: 0, totalRuns: 0 };
          }
          map[name].totalBoards += nbB;
          map[name].totalOK += nbOk;
          map[name].totalKO += ko;
          map[name].totalRuns += runs;
        });
      }
    });

    return Object.values(map)
      .map(st => {
        const estPhysical = Math.round(st.totalKO * overallMetrics.calibrationRatio);
        const repaired = Math.max(0, st.totalKO - estPhysical);
        return {
          ...st,
          estPhysical,
          repaired,
          koRate: st.totalBoards > 0 ? ((st.totalKO / st.totalBoards) * 100) : 0
        };
      })
      .sort((a, b) => b.totalKO - a.totalKO);
  }, [filteredRecords, overallMetrics.calibrationRatio]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* ── Page Header & Calibration Bar ── */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '24px 28px',
        border: '1.5px solid #e2e8f0',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={24} color="#dc2626" />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: 'var(--navy)' }}>
                  Defect Meters Analysis & Calibration
                </h1>
                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                  Reconciling ground-truth physical defects by eliminating test re-runs & rework loops (Rework Loop Calibration)
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button 
              onClick={fetchData} 
              disabled={loading}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* ── Calibration Control Bar ── */}
        <div style={{
          marginTop: 20,
          background: '#f8fafc',
          border: '1.5px solid #cbd5e1',
          borderRadius: 12,
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sliders size={18} color="#0284c7" />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                Baseline Physical Defective Meters (Ground Truth)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Current Calibration Ratio: <strong>{(overallMetrics.calibrationRatio * 100).toFixed(2)}%</strong> of total reported failure instances ({overallMetrics.totalReportedKOAll.toLocaleString()} Boards KO)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isEditingTarget ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  value={targetInput}
                  onChange={e => setTargetInput(e.target.value)}
                  style={{
                    width: 110,
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1.5px solid #0284c7',
                    fontWeight: 800,
                    fontSize: '0.95rem'
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSaveTarget}
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Save size={14} /> Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingTarget(false);
                    setTargetInput(String(actualTarget));
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0369a1', background: '#e0f2fe', padding: '4px 14px', borderRadius: 8, border: '1px solid #bae6fd' }}>
                  {actualTarget.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Actual Units</span>
                </span>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setTargetInput(String(actualTarget));
                      setIsEditingTarget(true);
                    }}
                    className="btn btn-secondary"
                    title="Edit Baseline Actuals"
                    style={{ padding: '6px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                )}
                {actualTarget !== DEFAULT_ACTUAL_DEFECTS && (
                  <button
                    onClick={handleResetTarget}
                    className="btn btn-secondary"
                    title="Restore Default 4,250"
                    style={{ padding: '6px 10px', fontSize: '0.78rem', color: '#b91c1c' }}
                  >
                    <RotateCcw size={13} /> Default
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 Top KPI Summary Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16
      }}>
        {/* Card 1: Actual Physical Defective Meters */}
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: '1.5px solid #fca5a5',
          borderRadius: 14,
          padding: '20px 22px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Actual Net Defective Meters
            </span>
            <span className="badge badge-red" style={{ fontSize: '0.72rem' }}>
              Ground Truth
            </span>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#b91c1c', lineHeight: 1.1 }}>
            {actualTarget.toLocaleString()}
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#991b1b', marginLeft: 6 }}>Net Meters</span>
          </div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #fecaca', fontSize: '0.78rem', color: '#7f1d1d' }}>
            Physical shop floor count excluding duplicate re-test cycles
          </div>
        </div>

        {/* Card 2: Reported Boards KO */}
        <div style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '1.5px solid #fcd34d',
          borderRadius: 14,
          padding: '20px 22px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Reported Failures (Boards KO)
            </span>
            <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>
              {records.length} Reports
            </span>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#b45309', lineHeight: 1.1 }}>
            {overallMetrics.totalReportedKOAll.toLocaleString()}
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#92400e', marginLeft: 6 }}>Failed Cases</span>
          </div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #fde68a', fontSize: '0.78rem', color: '#78350f' }}>
            Total reported failed boards across all reports (Nb Boards - Boards OK)
          </div>
        </div>

        {/* Card 3: Calibration Ratio */}
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '1.5px solid #86efac',
          borderRadius: 14,
          padding: '20px 22px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Calibration Ratio (Accuracy Factor)
            </span>
            <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
              Ratio
            </span>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#15803d', lineHeight: 1.1 }}>
            {(overallMetrics.calibrationRatio * 100).toFixed(2)}%
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534', marginLeft: 6 }}>Accuracy Ratio</span>
          </div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #bbf7d0', fontSize: '0.78rem', color: '#14532d' }}>
            Every 100 reported KO cases correspond to <strong>{Math.round(overallMetrics.calibrationRatio * 100)}</strong> actual physical defects
          </div>
        </div>

        {/* Card 4: Repaired and Recycled Meters */}
        <div style={{
          background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
          border: '1.5px solid #c7d2fe',
          borderRadius: 14,
          padding: '20px 22px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3730a3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Repaired & Recycled Meters (Rework)
            </span>
            <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
              {overallMetrics.repairRateOverallPct.toFixed(1)}% Rework
            </span>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#4338ca', lineHeight: 1.1 }}>
            {overallMetrics.totalRepairedFromKOAll.toLocaleString()}
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#3730a3', marginLeft: 6 }}>Meters Repaired</span>
          </div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #c7d2fe', fontSize: '0.78rem', color: '#312e81' }}>
            Failed in stations, repaired successfully and returned to line
          </div>
        </div>
      </div>

      {/* ── Station Level Defect Distribution ── */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '22px 26px',
        border: '1.5px solid #e2e8f0',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={20} color="var(--teal)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy)' }}>
              Defect Distribution Across Test Stations (Station Breakdown)
            </h3>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)', fontWeight: 600 }}>
            Weighted by calibration ratio ({ (overallMetrics.calibrationRatio * 100).toFixed(1) }%)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {stationAnalytics.map(st => (
            <div key={st.name} style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--navy)', marginBottom: 4 }}>
                  {st.name}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                  Tested: <strong>{st.totalBoards.toLocaleString()}</strong> | Failed KO: <strong style={{ color: '#b91c1c' }}>{st.totalKO.toLocaleString()}</strong>
                </div>
              </div>
              
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Est. Actual:</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#dc2626' }}>
                  {st.estPhysical.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Per-Shift Calibrated Defect Table ── */}
      <div className="table-card">
        {/* Table Filters Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--gray-200)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <span style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} color="var(--teal)" />
              Shift-by-Shift Calibrated Defects Log
            </span>
            <span style={{ fontSize: '0.76rem', color: 'var(--gray-500)' }}>
              Reported Boards KO per shift is multiplied by calibration ratio ({(overallMetrics.calibrationRatio * 100).toFixed(2)}%) to calculate net actual defects
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input
                type="text"
                placeholder="Search date or team..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: '6px 12px 6px 30px', fontSize: '0.82rem', width: 170, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </div>

            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 700 }}
            >
              <option value="ALL">All Months ({calibratedRecords.length} shifts)</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Team Filter */}
            <select
              value={selectedTeam}
              onChange={e => setSelectedTeam(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 700 }}
            >
              <option value="ALL">All Teams</option>
              {availableTeams.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary Pill */}
        {(selectedMonth !== 'ALL' || selectedTeam !== 'ALL' || searchQuery.trim() !== '') && (
          <div style={{ background: '#f8fafc', padding: '10px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
            <span>
              Showing <strong>{filteredTotals.count}</strong> shifts matching filters • Total Reported KO: <strong>{filteredTotals.repKO.toLocaleString()}</strong>
            </span>
            <span>
              Total Calibrated Net Defects for these shifts: <strong style={{ color: '#b91c1c', fontSize: '0.9rem' }}>{filteredTotals.estAct.toLocaleString()} units</strong>
            </span>
          </div>
        )}

        {/* Table Body */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Shift & Team</th>
                <th style={{ textAlign: 'center' }}>Tested Boards</th>
                <th style={{ textAlign: 'center' }}>Achieved (OK)</th>
                <th style={{ textAlign: 'center' }}>Reported Failures (KO)</th>
                <th style={{ textAlign: 'center', background: '#fef2f2' }}>
                  Estimated Net Actual
                  <br />
                  <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#991b1b' }}>
                    (Weighted {(overallMetrics.calibrationRatio * 100).toFixed(1)}%)
                  </span>
                </th>
                <th style={{ textAlign: 'center', background: '#f0fdf4' }}>
                  Rework / Repaired
                  <br />
                  <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#166534' }}>
                    (KO - Actual)
                  </span>
                </th>
                <th style={{ textAlign: 'center' }}>Rework Rate %</th>
                <th style={{ textAlign: 'center' }}>Station Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                    No production shift records matching current filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(r => (
                  <tr key={r.id}>
                    <td>
                      <span style={{ fontWeight: 800, color: 'var(--navy)' }}>{r.date}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#334155' }}>
                        {r.team_name || 'Standard Shift'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>
                      {r.tb.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>
                      {r.ach.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#b45309' }}>
                      {r.reportedKO.toLocaleString()}
                    </td>
                    
                    {/* Calibrated Actual Defect */}
                    <td style={{ textAlign: 'center', background: '#fef2f2' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 44,
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontWeight: 900,
                        fontSize: '0.88rem',
                        background: r.estimatedActual > 0 ? '#fee2e2' : '#f1f5f9',
                        color: r.estimatedActual > 0 ? '#b91c1c' : '#64748b',
                        border: r.estimatedActual > 0 ? '1px solid #fca5a5' : '1px solid #cbd5e1'
                      }}>
                        {r.estimatedActual.toLocaleString()}
                      </span>
                    </td>

                    {/* Repaired / Recycled Meters */}
                    <td style={{ textAlign: 'center', background: '#f0fdf4' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 44,
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        background: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #86efac'
                      }}>
                        {r.repairedMeters.toLocaleString()}
                      </span>
                    </td>

                    <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.82rem', color: '#15803d' }}>
                      {r.shiftRepairPct.toFixed(1)}%
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedShiftForModal(r)}
                        className="btn-icon"
                        title="View Station KO Breakdown"
                        style={{ background: '#e0f2fe', color: '#0369a1' }}
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Station Detail Modal ── */}
      {selectedShiftForModal && (
        <div className="modal-backdrop" onClick={() => setSelectedShiftForModal(null)}>
          <div className="modal-card" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)' }}>
                  Station Test & KO Breakdown
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                  {selectedShiftForModal.date} • {selectedShiftForModal.team_name}
                </p>
              </div>
              <button 
                type="button" 
                className="btn-icon" 
                onClick={() => setSelectedShiftForModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Total Tested</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy)' }}>{selectedShiftForModal.tb.toLocaleString()}</div>
                </div>
                <div style={{ background: '#fffbeb', padding: 10, borderRadius: 8, textAlign: 'center', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '0.72rem', color: '#92400e' }}>Reported Failures (KO)</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#b45309' }}>{selectedShiftForModal.reportedKO.toLocaleString()}</div>
                </div>
                <div style={{ background: '#fef2f2', padding: 10, borderRadius: 8, textAlign: 'center', border: '1px solid #fca5a5' }}>
                  <div style={{ fontSize: '0.72rem', color: '#991b1b' }}>Estimated Net Actual</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#dc2626' }}>{selectedShiftForModal.estimatedActual.toLocaleString()}</div>
                </div>
              </div>

              {Array.isArray(selectedShiftForModal.stations) && selectedShiftForModal.stations.length > 0 ? (
                <div className="table-wrap">
                  <table style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>Station</th>
                        <th style={{ textAlign: 'center' }}>Boards</th>
                        <th style={{ textAlign: 'center' }}>Passed (OK)</th>
                        <th style={{ textAlign: 'center', color: '#b91c1c' }}>Failed (KO)</th>
                        <th style={{ textAlign: 'center', background: '#fef2f2' }}>Estimated Actual</th>
                        <th style={{ textAlign: 'center' }}>Test Runs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedShiftForModal.stations.map((st, sIdx) => {
                        const nbB = parseInt(st.nbBoards, 10) || 0;
                        const nbOk = parseInt(st.nbBoardsOK, 10) || 0;
                        const ko = Math.max(0, nbB - nbOk);
                        const estStActual = Math.round(ko * overallMetrics.calibrationRatio);
                        return (
                          <tr key={sIdx}>
                            <td style={{ fontWeight: 700, color: 'var(--navy)' }}>
                              {st.stationName || st.bench}
                            </td>
                            <td style={{ textAlign: 'center' }}>{nbB}</td>
                            <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>{nbOk}</td>
                            <td style={{ textAlign: 'center', color: '#b91c1c', fontWeight: 800 }}>{ko}</td>
                            <td style={{ textAlign: 'center', background: '#fef2f2', fontWeight: 900, color: '#dc2626' }}>
                              {estStActual}
                            </td>
                            <td style={{ textAlign: 'center', color: '#64748b' }}>
                              {st.nbTestRun || nbB}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>
                  No station breakdown details recorded for this shift.
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setSelectedShiftForModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
