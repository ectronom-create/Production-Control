import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import { 
  BarChart2, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Cpu, 
  Layers, 
  RefreshCw,
  Activity,
  AlertOctagon,
  Target,
  Calendar,
  Filter,
  CheckCircle2,
  Award
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

Chart.register(...registerables);

const PRODUCTION_STAGES = [
  { stage_id: 'Assembly', stage_name: 'Assembly', color: '#38bdf8', icon: '🔧' },
  { stage_id: 'Insulation', stage_name: 'Insulation', color: '#6366f1', icon: '⚡' },
  { stage_id: 'RF', stage_name: 'RF Calibration', color: '#ec4899', icon: '📡' },
  { stage_id: 'Calibration', stage_name: 'Calibration', color: '#f59e0b', icon: '⚖️' },
  { stage_id: 'Multin test', stage_name: 'Multi-Test', color: '#10b981', icon: '🧪' },
  { stage_id: 'Perso', stage_name: 'Perso', color: '#a855f7', icon: '🌐' },
  { stage_id: 'Packaging', stage_name: 'Packaging', color: '#64748b', icon: '📦' },
];

const DOWNTIME_REASONS = {
  BENCH_BREAKDOWN: 'Bench Breakdown / Maintenance',
  SFC_OFFLINE: 'Network / SFC Offline',
  MATERIAL_SHORTAGE: 'Material Shortage / Components',
  OPERATOR_ABSENCE: 'Operator Absence',
  OTHER: 'Other'
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.access === 'admin';

  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'downtime', 'trend'
  const [reports, setReports] = useState([]);
  const [stoppages, setStoppages] = useState([]);
  const [currentReport, setCurrentReport] = useState(null);
  const [target, setTarget] = useState(320);
  const [loading, setLoading] = useState(true);

  // Chart canvas refs & instances
  const fpyBarChartRef = useRef(null);
  const fpyBarChartInst = useRef(null);

  const downtimeChartRef = useRef(null);
  const downtimeChartInst = useRef(null);

  const trendChartRef = useRef(null);
  const trendChartInst = useRef(null);

  const trendBoardsChartRef = useRef(null);
  const trendBoardsChartInst = useRef(null);

  // Perso Production Filter States
  const [productionFilter, setProductionFilter] = useState('week'); // 'today', 'week', 'month', 'all', 'custom'
  const [prodStartDate, setProdStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [prodEndDate, setProdEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Load production reports & stoppages from Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch production records
      const { data: prodData, error: prodErr } = await supabase
        .from('production_records')
        .select('*')
        .order('date', { ascending: false });

      let loadedReports = prodData || [];
      if (prodErr || loadedReports.length === 0) {
        const fb = await supabase.from('fpy_reports').select('*').order('date', { ascending: false });
        if (fb.data && fb.data.length > 0) loadedReports = fb.data;
      }

      setReports(loadedReports);
      if (loadedReports.length > 0) {
        if (!currentReport || !loadedReports.find(r => r.id === currentReport.id)) {
          setCurrentReport(loadedReports[0]);
          if (loadedReports[0].target) setTarget(loadedReports[0].target);
        }
      }

      // 2. Fetch stoppages
      const { data: stopData } = await supabase
        .from('stoppages')
        .select('*')
        .order('stopped_at', { ascending: false });

      setStoppages(stopData || []);
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update target when currentReport changes
  useEffect(() => {
    if (currentReport && currentReport.target) {
      setTarget(currentReport.target);
    }
  }, [currentReport]);

  // Handle production filter date changes
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (productionFilter === 'today') {
      setProdStartDate(todayStr);
      setProdEndDate(todayStr);
    } else if (productionFilter === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setProdStartDate(d.toISOString().slice(0, 10));
      setProdEndDate(todayStr);
    } else if (productionFilter === 'month') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      setProdStartDate(d.toISOString().slice(0, 10));
      setProdEndDate(todayStr);
    } else if (productionFilter === 'all') {
      if (reports && reports.length > 0) {
        const dates = reports.map(r => r.date).filter(Boolean);
        if (dates.length > 0) {
          const minDate = dates.reduce((min, d) => d < min ? d : min, dates[0]);
          const maxDate = dates.reduce((max, d) => d > max ? d : max, dates[0]);
          setProdStartDate(minDate);
          setProdEndDate(maxDate);
        }
      }
    }
  }, [productionFilter, reports]);

  // Compute production totals across the filter range
  const productionTotals = useMemo(() => {
    let persoOk = 0;
    let assemblyOk = 0;
    let multiTestOk = 0;
    let totalUpdatedFw = 0;
    let reportsCount = 0;

    reports.forEach(r => {
      const matchDate = productionFilter === 'all' || (r.date >= prodStartDate && r.date <= prodEndDate);
      if (matchDate) {
        let hasData = false;
        const persoStation = (r.stations || []).find(s => 
          s.stationName && s.stationName.toLowerCase().includes('perso')
        );
        if (persoStation) {
          persoOk += parseInt(persoStation.nbBoardsOK) || 0;
          hasData = true;
        } else if (r.achieved) {
          persoOk += parseInt(r.achieved) || 0;
          hasData = true;
        }

        const assemblyStation = (r.stations || []).find(s => 
          s.stationName && s.stationName.toLowerCase().includes('assembly')
        );
        if (assemblyStation) {
          assemblyOk += parseInt(assemblyStation.nbBoardsOK) || 0;
          hasData = true;
        }

        const multiTestStation = (r.stations || []).find(s => 
          s.stationName && (s.stationName.toLowerCase().includes('multi-test') || s.stationName.toLowerCase().includes('multitest'))
        );
        if (multiTestStation) {
          multiTestOk += parseInt(multiTestStation.nbBoardsOK) || 0;
          hasData = true;
        } else if (r.achieved) {
          multiTestOk += parseInt(r.achieved) || 0;
          hasData = true;
        }

        if (r.updated_fw_qty) {
          totalUpdatedFw += parseInt(r.updated_fw_qty) || 0;
          hasData = true;
        }

        if (hasData) reportsCount++;
      }
    });

    return { persoOk, assemblyOk, multiTestOk, totalUpdatedFw, reportsCount };
  }, [reports, prodStartDate, prodEndDate, productionFilter]);

  // Re-render FPY per Station Bar Chart
  useEffect(() => {
    if (activeTab === 'overview' && currentReport && fpyBarChartRef.current) {
      const stFpy = (currentReport.stations || []).filter(s => s.fpy !== null && s.fpy !== undefined);

      if (fpyBarChartInst.current) fpyBarChartInst.current.destroy();

      if (stFpy.length > 0) {
        fpyBarChartInst.current = new Chart(fpyBarChartRef.current, {
          type: 'bar',
          data: {
            labels: stFpy.map(s => s.stationName.length > 15 ? s.stationName.slice(0, 15) + '…' : s.stationName),
            datasets: [{
              data: stFpy.map(s => s.fpy),
              backgroundColor: stFpy.map(s => s.fpy >= 90 ? '#10b981' : s.fpy >= 75 ? '#f59e0b' : '#ef4444'),
              borderRadius: 6,
              borderSkipped: false
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: c => `FPY: ${c.parsed.y.toFixed(2)}%` } }
            },
            scales: {
              x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 35 } },
              y: { min: 0, max: 105, ticks: { callback: v => v + '%', color: '#64748b', font: { size: 11 } }, grid: { color: '#f1f5f9' } }
            }
          }
        });
      }
    }
  }, [activeTab, currentReport]);

  // Re-render Trend Charts
  useEffect(() => {
    if (activeTab === 'trend' && reports.length >= 2) {
      const sorted = [...reports].sort((a, b) => a.date.localeCompare(b.date));
      const labels = sorted.map(r => r.date);
      const fpyData = sorted.map(r => r.overall_fpy);
      const boardsData = sorted.map(r => r.total_boards);
      const fwData = sorted.map(r => r.updated_fw_qty || 0);

      if (trendChartInst.current) trendChartInst.current.destroy();
      if (trendChartRef.current) {
        trendChartInst.current = new Chart(trendChartRef.current, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'FPY %',
              data: fpyData,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              tension: 0.35,
              fill: true,
              pointRadius: 5,
              pointHoverRadius: 7,
              pointBackgroundColor: '#10b981'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: c => `FPY: ${c.parsed.y?.toFixed(2)}%` } }
            },
            scales: {
              x: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { color: '#f1f5f9' } },
              y: { ticks: { callback: v => v + '%', color: '#64748b' }, grid: { color: '#f1f5f9' } }
            }
          }
        });
      }

      if (trendBoardsChartInst.current) trendBoardsChartInst.current.destroy();
      if (trendBoardsChartRef.current) {
        trendBoardsChartInst.current = new Chart(trendBoardsChartRef.current, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Total Boards',
                data: boardsData,
                backgroundColor: 'rgba(35, 63, 121, 0.85)',
                borderRadius: 5,
                borderSkipped: false
              },
              {
                label: 'Updated FW QTY',
                data: fwData,
                backgroundColor: 'rgba(139, 92, 246, 0.85)',
                borderRadius: 5,
                borderSkipped: false
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'top' } },
            scales: {
              x: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { display: false } },
              y: { ticks: { color: '#64748b' }, grid: { color: '#f1f5f9' } }
            }
          }
        });
      }
    }
  }, [activeTab, reports]);

  // Re-render Downtime Bar Chart
  useEffect(() => {
    if (activeTab === 'downtime' && downtimeChartRef.current) {
      const stageMins = {};
      PRODUCTION_STAGES.forEach(s => { stageMins[s.stage_id] = 0; });

      stoppages.forEach(stop => {
        const start = new Date(stop.stopped_at).getTime();
        const end = stop.resumed_at ? new Date(stop.resumed_at).getTime() : Date.now();
        const mins = Math.max(0, Math.floor((end - start) / 60000));
        if (stageMins[stop.stage_id] !== undefined) {
          stageMins[stop.stage_id] += mins;
        } else {
          stageMins[stop.stage_id] = (stageMins[stop.stage_id] || 0) + mins;
        }
      });

      const labels = PRODUCTION_STAGES.map(s => s.stage_name);
      const data = PRODUCTION_STAGES.map(s => stageMins[s.stage_id] || 0);

      if (downtimeChartInst.current) downtimeChartInst.current.destroy();

      downtimeChartInst.current = new Chart(downtimeChartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Downtime (Minutes)',
            data,
            backgroundColor: PRODUCTION_STAGES.map(s => s.color),
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: c => `${c.parsed.y} mins` } }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
            y: { ticks: { color: '#64748b', callback: v => `${v}m` }, grid: { color: '#f1f5f9' } }
          }
        }
      });
    }
  }, [activeTab, stoppages]);

  // Identify Bottleneck Station
  const bottleneck = useMemo(() => {
    if (!currentReport?.stations || currentReport.stations.length === 0) return null;
    const withFpy = currentReport.stations.filter(s => s.fpy !== null && s.fpy !== undefined && s.fpy > 0);
    if (withFpy.length === 0) return null;
    return withFpy.reduce((min, s) => s.fpy < min.fpy ? s : min, withFpy[0]);
  }, [currentReport]);

  const totalDefects = useMemo(() => {
    if (!currentReport?.stations) return 0;
    return currentReport.stations.reduce((sum, s) => sum + Math.max(0, (s.nbBoards || 0) - (s.nbBoardsOK || 0)), 0);
  }, [currentReport]);

  const displayTotalBoards = useMemo(() => {
    if (!currentReport) return 0;
    if (currentReport.total_boards) return currentReport.total_boards;
    const assembly = (currentReport.stations || []).find(s => s.stationName && s.stationName.toLowerCase().includes('assembly'));
    return assembly ? assembly.nbBoards : (currentReport.stations?.[0]?.nbBoards || 0);
  }, [currentReport]);

  const displayOverallFPY = useMemo(() => {
    if (!currentReport) return null;
    if (currentReport.overall_fpy != null && currentReport.overall_fpy > 0) {
      return currentReport.overall_fpy;
    }
    if (displayTotalBoards > 0) {
      return ((currentReport.achieved / displayTotalBoards) * 100);
    }
    return 0;
  }, [currentReport, displayTotalBoards]);

  const targetProgress = useMemo(() => {
    if (!currentReport || !target || target <= 0) return 0;
    return Math.min(100, ((currentReport.achieved / target) * 100));
  }, [currentReport, target]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Page Header ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity className="text-teal" size={26} color="var(--teal)" />
            Executive Production & FPY Dashboard
          </h1>
          <p className="page-subtitle">Real-time yields, stage throughput, station bottlenecks, and downtime analytics</p>
        </div>

        {/* Tab Switcher, Management Link & Refresh */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="btn-primary"
            style={{ 
              background: 'linear-gradient(135deg, #192e5b 0%, #00afaa 100%)',
              padding: '8px 16px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.84rem',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(25, 46, 91, 0.25)',
              border: 'none',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/management-dashboard')}
          >
            <Target size={16} color="#38bdf8" />
            <span>Management Dashboard</span>
          </button>

          <div style={{ display: 'flex', background: 'var(--white)', padding: 4, borderRadius: 10, border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)' }}>
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
              style={{ padding: '7px 14px', borderRadius: 8 }}
            >
              <BarChart2 size={16} /> Overview & FPY
            </button>
            <button 
              className={`tab-btn ${activeTab === 'downtime' ? 'active' : ''}`}
              onClick={() => setActiveTab('downtime')}
              style={{ padding: '7px 14px', borderRadius: 8 }}
            >
              <Clock size={16} /> Downtime Analysis
            </button>
            <button 
              className={`tab-btn ${activeTab === 'trend' ? 'active' : ''}`}
              onClick={() => setActiveTab('trend')}
              style={{ padding: '7px 14px', borderRadius: 8 }}
            >
              <TrendingUp size={16} /> Production Trends
            </button>
          </div>

          <button 
            className="btn-outline" 
            title="Refresh Data"
            onClick={fetchData}
            style={{ padding: '9px 12px', background: 'var(--white)' }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── TAB 1: OVERVIEW & FPY ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {reports.length === 0 ? (
            <div className="card-white" style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📊</div>
              <h3 style={{ marginBottom: 6 }}>No Production Records Found</h3>
              <p style={{ color: 'var(--gray-500)', maxWidth: 450, margin: '0 auto' }}>
                Navigate to the <b>Production</b> page to upload SAGEMCOM Excel reports or manually add FW updates to populate dashboard charts.
              </p>
            </div>
          ) : (
            <>
              {/* Executive Stage Throughput Hero Banner */}
              <div style={{ 
                background: 'linear-gradient(135deg, #192e5b 0%, #233f79 60%, #0f172a 100%)', 
                color: '#f8fafc', 
                borderRadius: 16,
                padding: '24px 28px',
                boxShadow: '0 10px 25px -5px rgba(25, 46, 91, 0.3)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0, 175, 170, 0.2)', border: '1px solid rgba(0, 175, 170, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Award size={24} color="#00afaa" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em' }}>
                        Cumulative Stage Throughput
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                        Total tested and validated smart meters across filtered period
                      </p>
                    </div>
                  </div>

                  {/* Filter range buttons */}
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', padding: 3, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)' }}>
                    {[
                      { id: 'today', label: 'Today' },
                      { id: 'week', label: 'Past 7 Days' },
                      { id: 'month', label: 'Past 30 Days' },
                      { id: 'all', label: 'All Records' },
                      { id: 'custom', label: 'Custom' }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        style={{
                          background: productionFilter === f.id ? 'var(--teal)' : 'transparent',
                          border: 'none',
                          color: '#f8fafc',
                          padding: '6px 14px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          transition: 'all 0.2s'
                        }}
                        onClick={() => setProductionFilter(f.id)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Pickers */}
                {productionFilter === 'custom' && (
                  <div style={{ display: 'flex', gap: 16, marginBottom: 18, background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 8, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>From:</span>
                      <input 
                        type="date" 
                        value={prodStartDate} 
                        onChange={e => setProdStartDate(e.target.value)} 
                        style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '5px 10px', borderRadius: 6, fontSize: '0.82rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>To:</span>
                      <input 
                        type="date" 
                        value={prodEndDate} 
                        onChange={e => setProdEndDate(e.target.value)} 
                        style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '5px 10px', borderRadius: 6, fontSize: '0.82rem' }}
                      />
                    </div>
                  </div>
                )}

                {/* Counter Stats in Hero Banner */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: 16,
                  background: 'rgba(255,255,255,0.04)', 
                  padding: '18px 22px', 
                  borderRadius: 12, 
                  border: '1px solid rgba(255,255,255,0.06)' 
                }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 6 }}>Assembly OK</div>
                    <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#38bdf8', lineHeight: 1 }}>
                      {productionTotals.assemblyOk.toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>units</span>
                    </div>
                  </div>

                  <div style={{ borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 20 }}>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 6 }}>Final Perso OK</div>
                    <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
                      {productionTotals.persoOk.toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>meters</span>
                    </div>
                  </div>

                  <div style={{ borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 20 }}>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 6 }}>Updated FW QTY</div>
                    <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#c084fc', lineHeight: 1 }}>
                      {productionTotals.totalUpdatedFw.toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>units</span>
                    </div>
                  </div>

                  <div style={{ borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: 20 }}>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 6 }}>Multi-Test Achieved</div>
                    <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>
                      {productionTotals.multiTestOk.toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>meters</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Report Selector Header */}
              {currentReport && (
                <div className="card-white" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Calendar size={18} color="var(--teal)" />
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--navy)' }}>
                      Active Report: {currentReport.date} — {currentReport.product}
                    </span>
                    {currentReport.team_name && (
                      <span className="badge badge-supervisor" style={{ fontSize: '0.75rem' }}>
                        Team: {currentReport.team_name}
                      </span>
                    )}
                    {currentReport.entered_by && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                        (By: {currentReport.entered_by})
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--gray-500)', fontWeight: 600 }}>Switch Date:</label>
                    <select 
                      className="search-input" 
                      style={{ width: 'auto', padding: '7px 12px', fontWeight: 600 }}
                      value={currentReport.id} 
                      onChange={e => setCurrentReport(reports.find(r => r.id === parseInt(e.target.value)))}
                    >
                      {reports.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.date} — {r.product} ({r.team_name || 'Standard'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Daily Target Progress Widget */}
              {currentReport && (
                <div className="card-white" style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Target size={22} color="var(--teal-dark)" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--gray-500)', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>
                        Daily Target (Boards)
                      </label>
                      <input 
                        type="number" 
                        className="search-input" 
                        style={{ width: 110, padding: '5px 10px', fontWeight: 800, fontSize: '1rem' }}
                        value={target} 
                        disabled={!isAdmin} 
                        onChange={async e => {
                          const val = parseInt(e.target.value) || 1;
                          setTarget(val);
                          if (currentReport) {
                            setCurrentReport({ ...currentReport, target: val });
                            try {
                              await supabase.from('production_records').update({ target: val }).eq('id', currentReport.id);
                            } catch {}
                          }
                        }} 
                      />
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.875rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--navy)' }}>
                        Target Fulfillment ({currentReport.achieved} / {target} Boards)
                      </span>
                      <span style={{ fontWeight: 800, color: targetProgress >= 90 ? '#16a34a' : targetProgress >= 70 ? '#d97706' : '#dc2626' }}>
                        {((currentReport.achieved / target) * 100).toFixed(1)}% Completed
                      </span>
                    </div>
                    <div style={{ height: 12, background: 'var(--gray-200)', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${targetProgress}%`,
                        background: targetProgress >= 90 ? 'var(--success)' : targetProgress >= 70 ? 'var(--warning)' : 'var(--danger)',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                </div>
              )}

              {/* KPI Cards Grid */}
              {currentReport && (
                <div className="kpi-grid">
                  <div className="kpi-card" style={{ borderLeft: '4px solid #16a34a' }}>
                    <div className="kpi-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                      <Activity size={24} />
                    </div>
                    <div>
                      <div className="kpi-val" style={{ color: '#16a34a' }}>
                        {displayOverallFPY != null ? `${displayOverallFPY.toFixed(2)}%` : 'N/A'}
                      </div>
                      <div className="kpi-lbl">Overall FPY (Yield)</div>
                    </div>
                  </div>

                  <div className="kpi-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div className="kpi-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                      <Layers size={24} />
                    </div>
                    <div>
                      <div className="kpi-val">{displayTotalBoards.toLocaleString()}</div>
                      <div className="kpi-lbl">Total Boards Input</div>
                    </div>
                  </div>

                  <div className="kpi-card" style={{ borderLeft: '4px solid var(--teal)' }}>
                    <div className="kpi-icon" style={{ background: 'var(--teal-light)', color: 'var(--teal-dark)' }}>
                      <CheckCircle size={24} />
                    </div>
                    <div>
                      <div className="kpi-val">{currentReport.achieved?.toLocaleString() || 0}</div>
                      <div className="kpi-lbl">Final OK (Multi-Test)</div>
                    </div>
                  </div>

                  <div className="kpi-card" style={{ borderLeft: `4px solid ${bottleneck && bottleneck.fpy < 75 ? '#dc2626' : '#d97706'}` }}>
                    <div className="kpi-icon" style={{ background: bottleneck && bottleneck.fpy < 75 ? '#fee2e2' : '#fef3c7', color: bottleneck && bottleneck.fpy < 75 ? '#dc2626' : '#d97706' }}>
                      <AlertOctagon size={24} />
                    </div>
                    <div>
                      <div className="kpi-val" style={{ color: bottleneck && bottleneck.fpy < 75 ? '#dc2626' : '#d97706' }}>
                        {bottleneck ? `${bottleneck.fpy.toFixed(1)}%` : 'N/A'}
                      </div>
                      <div className="kpi-lbl">Bottleneck ({bottleneck?.stationName || 'None'})</div>
                    </div>
                  </div>

                  <div className="kpi-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                    <div className="kpi-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
                      <Cpu size={24} />
                    </div>
                    <div>
                      <div className="kpi-val" style={{ color: '#7c3aed' }}>{currentReport.updated_fw_qty || 0}</div>
                      <div className="kpi-lbl">Updated FW QTY Today</div>
                    </div>
                  </div>

                  <div className="kpi-card" style={{ borderLeft: '4px solid #dc2626' }}>
                    <div className="kpi-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <div className="kpi-val" style={{ color: '#dc2626' }}>{totalDefects}</div>
                      <div className="kpi-lbl">Total Failures Detected</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Charts Grid */}
              {currentReport && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
                  {/* FPY per Station Bar Chart */}
                  <div className="card-white" style={{ height: 380, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--navy)' }}>
                        First Pass Yield (FPY) by Workstation — Bottleneck Detection
                      </span>
                      <span className="badge badge-admin">SAGEMCOM Benchmarks</span>
                    </div>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <canvas ref={fpyBarChartRef} />
                    </div>
                  </div>

                  {/* Top Defects Breakdown */}
                  <div className="card-white" style={{ height: 380, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--navy)' }}>
                        Top Failure Codes Breakdown
                      </span>
                      <span className="badge badge-viewer">Pareto Ranking</span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {!currentReport.defects || currentReport.defects.length === 0 ? (
                        <div style={{ color: 'var(--gray-500)', textAlign: 'center', padding: 40 }}>
                          No defect codes logged for this report
                        </div>
                      ) : (
                        currentReport.defects.map((d, i) => {
                          const maxQ = Math.max(...currentReport.defects.map(def => def.qty));
                          const pct = (d.qty / maxQ) * 100;
                          const colors = ['#dc2626', '#d97706', '#2563eb', '#16a34a', '#7c3aed', '#db2777', '#0891b2', '#ea580c'];
                          const color = colors[i % colors.length];

                          return (
                            <div key={d.code} style={{ marginBottom: 4 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.84rem' }}>
                                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--gray-900)' }}>
                                  Defect Code: {d.code}
                                </span>
                                <span style={{ fontWeight: 800, color }}>{d.qty} Occurrences</span>
                              </div>
                              <div style={{ width: '100%', height: 8, background: 'var(--gray-200)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Station Flow and Productivity Table */}
              {currentReport && currentReport.stations && currentReport.stations.length > 0 && (
                <div className="table-card">
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '0.95rem' }}>
                      Station Flow & Yield Performance Matrix
                    </span>
                    <span className="badge badge-admin">{currentReport.stations.length} Active Stations</span>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Workstation (Station Name)</th>
                          <th style={{ textAlign: 'center' }}>Test Runs</th>
                          <th style={{ textAlign: 'center' }}>Input Boards</th>
                          <th style={{ textAlign: 'center' }}>Passed OK</th>
                          <th style={{ textAlign: 'center' }}>Failed Boards</th>
                          <th style={{ textAlign: 'center' }}>FPY % (1st Pass)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentReport.stations.map((s, idx) => {
                          const failed = Math.max(0, (s.nbBoards || 0) - (s.nbBoardsOK || 0));
                          const fpyClass = s.fpy >= 90 ? 'badge-green' : s.fpy >= 75 ? 'badge-amber' : 'badge-red';

                          return (
                            <tr key={idx}>
                              <td>
                                <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{s.stationName}</div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--gray-500)', fontFamily: 'monospace' }}>{s.bench}</div>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 600 }}>{s.nbTestRun || '—'}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.nbBoards}</td>
                              <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>{s.nbBoardsOK}</td>
                              <td style={{ textAlign: 'center', color: failed > 0 ? '#dc2626' : 'inherit', fontWeight: failed > 0 ? 700 : 400 }}>
                                {failed}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`badge ${fpyClass}`} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                                  {s.fpy != null ? `${s.fpy.toFixed(2)}%` : '—'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB 2: DOWNTIME ANALYSIS ── */}
      {activeTab === 'downtime' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Downtime KPI cards */}
          <div className="kpi-grid">
            <div className="kpi-card" style={{ borderLeft: '4px solid #dc2626' }}>
              <div className="kpi-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <div className="kpi-val" style={{ color: '#dc2626' }}>
                  {stoppages.filter(s => !s.resumed_at).length}
                </div>
                <div className="kpi-lbl">Active Stoppages (Ongoing)</div>
              </div>
            </div>

            <div className="kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                <Clock size={24} />
              </div>
              <div>
                <div className="kpi-val">{stoppages.length}</div>
                <div className="kpi-lbl">Total Stoppage Logs</div>
              </div>
            </div>

            <div className="kpi-card" style={{ borderLeft: '4px solid var(--teal)' }}>
              <div className="kpi-icon" style={{ background: 'var(--teal-light)', color: 'var(--teal-dark)' }}>
                <BarChart2 size={24} />
              </div>
              <div>
                <div className="kpi-val">
                  {(() => {
                    const totalMins = stoppages.reduce((sum, s) => {
                      const start = new Date(s.stopped_at).getTime();
                      const end = s.resumed_at ? new Date(s.resumed_at).getTime() : Date.now();
                      return sum + Math.max(0, Math.floor((end - start) / 60000));
                    }, 0);
                    if (totalMins < 60) return `${totalMins} mins`;
                    return `${(totalMins / 60).toFixed(1)} hrs`;
                  })()}
                </div>
                <div className="kpi-lbl">Total Downtime Duration</div>
              </div>
            </div>
          </div>

          {/* Downtime Bar Chart */}
          <div className="card-white">
            <div style={{ fontWeight: 800, marginBottom: 18, fontSize: '0.95rem', color: 'var(--navy)' }}>
              Total Downtime Minutes by Workstation
            </div>
            <div style={{ position: 'relative', height: 280 }}>
              <canvas ref={downtimeChartRef} />
            </div>
          </div>

          {/* Downtime Audit Log Table */}
          <div className="table-card">
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: 'var(--navy)' }}>Downtime Audit Log</span>
              <span className="badge badge-viewer">{stoppages.length} Events</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Workstation</th>
                    <th>Supervisor / User</th>
                    <th>Start Time</th>
                    <th>Resume Time</th>
                    <th>Duration</th>
                    <th>Reason</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {stoppages.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="table-empty">
                        No stoppage events recorded.
                      </td>
                    </tr>
                  ) : (
                    stoppages.map(stop => {
                      const stage = PRODUCTION_STAGES.find(s => s.stage_id === stop.stage_id);
                      const start = new Date(stop.stopped_at);
                      const end = stop.resumed_at ? new Date(stop.resumed_at) : null;

                      let durationStr = 'Ongoing ⏱️';
                      if (end) {
                        const diffMins = Math.floor((end.getTime() - start.getTime()) / 60000);
                        if (diffMins < 60) durationStr = `${diffMins}m`;
                        else {
                          const h = Math.floor(diffMins / 60);
                          const m = diffMins % 60;
                          durationStr = `${h}h ${m}m`;
                        }
                      }

                      return (
                        <tr key={stop.id}>
                          <td>
                            <span className="badge" style={{ background: (stage?.color || '#3b82f6') + '20', color: stage?.color || '#3b82f6' }}>
                              {stage?.icon} {stage?.stage_name || stop.stage_id}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{stop.supervisor_id || '—'}</td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                            {start.toLocaleDateString('en-GB')} {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                            {end ? (
                              `${end.toLocaleDateString('en-GB')} ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            ) : (
                              <span style={{ color: '#dc2626', fontWeight: 700 }}>🔴 Ongoing</span>
                            )}
                          </td>
                          <td style={{ fontWeight: 700 }}>{durationStr}</td>
                          <td>
                            <span className={`badge ${stop.resumed_at ? 'badge-viewer' : 'badge-red'}`}>
                              {DOWNTIME_REASONS[stop.reason_code] || stop.reason_code || '—'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{stop.notes || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: TRENDS ── */}
      {activeTab === 'trend' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {reports.length < 2 ? (
            <div className="card-white" style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📈</div>
              <h3>Insufficient Data for Trend Analysis</h3>
              <p style={{ color: 'var(--gray-500)' }}>
                At least two production records are required to plot historical timeline trends.
              </p>
            </div>
          ) : (
            <>
              <div className="card-white" style={{ height: 380, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 800, marginBottom: 16, fontSize: '0.95rem', color: 'var(--navy)' }}>
                  First Pass Yield (FPY %) Evolution Over Time
                </div>
                <div style={{ position: 'relative', flex: 1 }}>
                  <canvas ref={trendChartRef} />
                </div>
              </div>

              <div className="card-white" style={{ height: 360, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 800, marginBottom: 16, fontSize: '0.95rem', color: 'var(--navy)' }}>
                  Daily Total Boards vs. Updated FW QTY
                </div>
                <div style={{ position: 'relative', flex: 1 }}>
                  <canvas ref={trendBoardsChartRef} />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
