import { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  Trash2, 
  Eye, 
  Edit3, 
  CheckCircle, 
  RefreshCw, 
  Cpu, 
  Layers, 
  Users as UsersIcon, 
  Calendar,
  Search,
  Database,
  Check,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

// ===================== EXCEL PARSER =====================
function parseFPYExcel(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('product')) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (Array.isArray(rows[i])) {
      const isHeader = rows[i].some(c => {
        if (!c) return false;
        const str = String(c).toLowerCase();
        return str.includes('board') || str.includes('pass') || str.includes('test bench');
      });
      if (isHeader) {
        headerIdx = i;
        break;
      }
    }
  }

  if (headerIdx === -1) {
    throw new Error('لم يتم العثور على عناوين الأعمدة المتوقعة في الملف (Board, Pass, Test Bench).');
  }

  let product = 'Unknown';
  try {
    for (let i = 0; i < headerIdx; i++) {
      if (!Array.isArray(rows[i])) continue;
      const cell = rows[i].find(c => c && String(c).toLowerCase().includes('produit'));
      if (cell) {
        const match = String(cell).match(/Produit\s*:\s*([^>]+)/i);
        if (match && match[1]) product = match[1].trim();
        break;
      }
    }
  } catch (e) {
    console.warn('Product info parsing failed', e);
  }

  const headers = rows[headerIdx] || [];
  const getCol = (name) => {
    if (!Array.isArray(headers)) return -1;
    return headers.findIndex(h => h && String(h).toLowerCase().includes(name.toLowerCase()));
  };

  const col = {
    benchName: getCol('test bench') !== -1 ? getCol('test bench') : getCol('product name'),
    nbBoards: getCol('nb board') !== -1 ? getCol('nb board') : getCol('board'),
    nbFirstPass: getCol('1st pass'),
    nbOkFirstPass: getCol('ok 1st pass'),
    nbBoardsOK: getCol('boards ok') !== -1 ? getCol('boards ok') : getCol('board ok'),
    fpy: getCol('fpy'),
    top1: getCol('top 1'),
    qty1: getCol('qty 1'),
    top2: getCol('top 2'),
    qty2: getCol('qty 2'),
    top3: getCol('top 3'),
    qty3: getCol('qty 3'),
    nbTestRun: getCol('test run') !== -1 ? getCol('test run') : getCol('runs')
  };

  const nameIdx = col.benchName !== -1 ? col.benchName : 0;

  const parsePct = v => {
    if (!v) return null;
    let n = parseFloat(String(v).replace('%', '').trim());
    return isNaN(n) ? null : n;
  };
  const parseNum = v => {
    if (!v) return 0;
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
  };
  const parseDefect = v => v ? String(v).replace(/[>]/g, '').trim() : null;

  const stations = [];
  const defectsMap = {};

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length === 0 || !row[nameIdx]) continue;

    const nameCell = String(row[nameIdx]).trim();
    if (!nameCell || nameCell.toUpperCase().includes('TOTAL')) {
      if (product === 'Unknown' && nameCell.toUpperCase().includes('TOTAL')) {
        product = nameCell.replace(/TOTAL/i, '').trim();
      }
      continue;
    }

    const parts = nameCell.split('|');
    const bench = parts[0] ? parts[0].trim() : 'Unknown';
    const stationName = parts.length > 1 ? parts[1].trim() : bench;

    const nbBoards = col.nbBoards >= 0 ? parseNum(row[col.nbBoards]) : 0;
    const nbFirstPass = col.nbFirstPass >= 0 ? parseNum(row[col.nbFirstPass]) : 0;
    const nbOkFirstPass = col.nbOkFirstPass >= 0 ? parseNum(row[col.nbOkFirstPass]) : 0;
    const nbBoardsOK = col.nbBoardsOK >= 0 ? parseNum(row[col.nbBoardsOK]) : 0;
    const nbTestRun = col.nbTestRun >= 0 ? parseNum(row[col.nbTestRun]) : 0;

    let fpy = col.fpy >= 0 ? parsePct(row[col.fpy]) : null;
    if (fpy === null || fpy > 100 || fpy <= 0) {
      fpy = nbFirstPass > 0 ? (nbOkFirstPass / nbFirstPass) * 100 : (nbBoards > 0 ? (nbBoardsOK / nbBoards) * 100 : 0);
    }

    const top1 = col.top1 >= 0 ? parseDefect(row[col.top1]) : null;
    const qty1 = col.qty1 >= 0 ? parseNum(row[col.qty1]) : 0;
    if (top1 && qty1 > 0) defectsMap[top1] = (defectsMap[top1] || 0) + qty1;

    const top2 = col.top2 >= 0 ? parseDefect(row[col.top2]) : null;
    const qty2 = col.qty2 >= 0 ? parseNum(row[col.qty2]) : 0;
    if (top2 && qty2 > 0) defectsMap[top2] = (defectsMap[top2] || 0) + qty2;

    const top3 = col.top3 >= 0 ? parseDefect(row[col.top3]) : null;
    const qty3 = col.qty3 >= 0 ? parseNum(row[col.qty3]) : 0;
    if (top3 && qty3 > 0) defectsMap[top3] = (defectsMap[top3] || 0) + qty3;

    stations.push({
      bench,
      stationName,
      nbBoards,
      nbFirstPass,
      nbOkFirstPass,
      nbBoardsOK,
      nbTestRun,
      fpy,
      top1,
      qty1
    });
  }

  let totalBoards = 0;
  let achieved = 0;
  let overallFPY = null;

  const assemblyRow = stations.find(s => s.stationName && s.stationName.toLowerCase().includes('assembly'));
  if (assemblyRow) {
    totalBoards = assemblyRow.nbBoards;
  } else if (stations.length > 0) {
    totalBoards = stations[0].nbBoards;
  }

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (Array.isArray(row) && row[nameIdx] && String(row[nameIdx]).toUpperCase().includes('TOTAL')) {
      if (totalBoards === 0) {
        totalBoards = col.nbBoards >= 0 ? parseNum(row[col.nbBoards]) : 0;
      }
      overallFPY = col.fpy >= 0 ? parsePct(row[col.fpy]) : null;
      break;
    }
  }

  if (totalBoards === 0) {
    totalBoards = stations.reduce((max, r) => r.nbBoards > max ? r.nbBoards : max, 0);
  }

  const multiTestRow = stations.find(s => s.stationName && (s.stationName.toLowerCase().includes('multi-test') || s.stationName.toLowerCase().includes('multitest')));
  if (multiTestRow) {
    achieved = multiTestRow.nbBoardsOK;
  } else {
    achieved = assemblyRow ? assemblyRow.nbBoardsOK : 0;
  }

  if (overallFPY === null || overallFPY > 100 || overallFPY <= 0) {
    if (totalBoards > 0) {
      overallFPY = (achieved / totalBoards) * 100;
    }
  }

  const defectsArr = Object.entries(defectsMap)
    .map(([code, qty]) => ({ code, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  return { product, stations, defects: defectsArr, achieved, totalBoards, overallFPY };
}

function getTodayString() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function Production() {
  const { user } = useAuth();
  const isAdmin = user?.access === 'admin';
  const isSupervisor = user?.access === 'supervisor';
  const isViewer = user?.access === 'viewer';

  // State
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableTeams, setAvailableTeams] = useState(['Team Alpha', 'Team Beta', 'Shift A', 'Management']);
  const [supabaseConnected, setSupabaseConnected] = useState(true);

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFwModal, setShowFwModal] = useState(false);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('ALL');
  const [filterShift, setFilterShift] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');

  // Upload modal form states
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [uploadDate, setUploadDate] = useState(getTodayString());
  const [uploadTarget, setUploadTarget] = useState(650);
  const [uploadShift, setUploadShift] = useState('Morning'); // 'Morning' (صباحي) or 'Evening' (مسائي)
  const [uploadFwQty, setUploadFwQty] = useState(0);
  const [uploadTeamName, setUploadTeamName] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Manual FW QTY modal form states
  const [fwRecordId, setFwRecordId] = useState(null);
  const [fwDate, setFwDate] = useState(getTodayString());
  const [fwProduct, setFwProduct] = useState('G3 Smart Meter');
  const [fwQty, setFwQty] = useState('');
  const [fwTeamName, setFwTeamName] = useState('');
  const [fwError, setFwError] = useState('');
  const [fwSaving, setFwSaving] = useState(false);

  // Initialize Team logic based on user
  useEffect(() => {
    const userTeam = user?.team_name?.trim() || 'Team Alpha';
    if (isSupervisor) {
      setUploadTeamName(userTeam);
      setFwTeamName(userTeam);
    } else {
      setUploadTeamName(user?.team_name?.trim() || 'Management');
      setFwTeamName(user?.team_name?.trim() || 'Management');
    }
  }, [user, isSupervisor]);

  // Load team list from Supabase users
  useEffect(() => {
    async function fetchTeams() {
      try {
        const { data, error } = await supabase.from('users').select('team_name');
        if (data && data.length > 0) {
          const teamsSet = new Set(['Management']);
          data.forEach(u => {
            if (u.team_name && u.team_name.trim()) teamsSet.add(u.team_name.trim());
          });
          setAvailableTeams(Array.from(teamsSet));
        }
      } catch (e) {
        console.warn('Teams fetch error:', e);
      }
    }
    fetchTeams();
  }, []);

  // Fetch production records from Supabase
  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('production_records')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        setSupabaseConnected(false);
        // Try fallback view or local cache
        const local = localStorage.getItem('ectron_production_records');
        if (local) {
          setRecords(JSON.parse(local));
        }
      } else {
        setSupabaseConnected(true);
        setRecords(data || []);
        localStorage.setItem('ectron_production_records', JSON.stringify(data || []));
      }
    } catch (err) {
      console.warn('Supabase fetch records error:', err);
      setSupabaseConnected(false);
      const local = localStorage.getItem('ectron_production_records');
      if (local) {
        try { setRecords(JSON.parse(local)); } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Handle File Upload & Parse
  const handleFileUpload = (file) => {
    if (!file) return;
    setIsParsing(true);
    setUploadError('');
    setSaveSuccessMsg('');
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = parseFPYExcel(e.target.result);
        setParsedData(data);
        setUploadTarget(650);
        setUploadShift('Morning');
        setShowUploadModal(true);
      } catch (err) {
        setUploadError(err.message || 'خطأ في قراءة ملف الإكسل.');
      } finally {
        setIsParsing(false);
      }
    };
    reader.onerror = () => {
      setUploadError('فشل قراءة الملف من الجهاز.');
      setIsParsing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  // Save parsed FPY Report to Supabase
  const handleSaveUpload = async () => {
    if (!parsedData) return;
    setIsSaving(true);
    setUploadError('');

    const shiftLabel = uploadShift === 'Evening' ? 'مسائي (Evening)' : 'صباحي (Morning)';
    const assignedTeamBase = isSupervisor 
      ? (user?.team_name?.trim() || 'Team Alpha') 
      : (uploadTeamName || 'Management');
    const assignedTeam = `${assignedTeamBase} - ${shiftLabel}`;

    const payload = {
      date: uploadDate,
      product: parsedData.product || 'Unknown',
      target: parseInt(uploadTarget) || 650,
      overall_fpy: parsedData.overallFPY ? parseFloat(parsedData.overallFPY.toFixed(2)) : null,
      total_boards: parsedData.totalBoards || 0,
      achieved: parsedData.achieved || 0,
      updated_fw_qty: parseInt(uploadFwQty) || 0,
      entered_by: user?.name || 'Admin',
      team_name: assignedTeam,
      notes: uploadNotes.trim(),
      stations: parsedData.stations || [],
      defects: parsedData.defects || []
    };

    try {
      const { data, error } = await supabase
        .from('production_records')
        .insert([payload])
        .select();

      if (error) {
        // Cache locally if table not yet created in Supabase
        const currentList = [...records];
        const newRecord = { ...payload, id: Date.now() };
        currentList.unshift(newRecord);
        setRecords(currentList);
        localStorage.setItem('ectron_production_records', JSON.stringify(currentList));
      } else {
        await loadRecords();
      }

      setShowUploadModal(false);
      setParsedData(null);
      setUploadFwQty(0);
      setUploadNotes('');
      setSaveSuccessMsg('Production report saved successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Save FPY error:', err);
      setUploadError('حدث خطأ أثناء الحفظ: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  // Open manual FW QTY Modal
  const openFwModalForRecord = (record = null) => {
    setFwError('');
    if (record) {
      setFwRecordId(record.id);
      setFwDate(record.date || getTodayString());
      setFwProduct(record.product || 'G3 Smart Meter');
      setFwQty(record.updated_fw_qty || '');
      setFwTeamName(record.team_name || (user?.team_name?.trim() || 'Team Alpha'));
    } else {
      setFwRecordId(null);
      setFwDate(getTodayString());
      setFwProduct('G3 Smart Meter');
      setFwQty('');
      const defaultTeam = isSupervisor ? (user?.team_name?.trim() || 'Team Alpha') : (availableTeams[0] || 'Management');
      setFwTeamName(defaultTeam);
    }
    setShowFwModal(true);
  };

  // Save manual FW QTY to Supabase
  const handleSaveFwQty = async (e) => {
    e.preventDefault();
    const qtyNum = parseInt(fwQty, 10);
    if (isNaN(qtyNum) || qtyNum < 0) {
      setFwError('يرجى إدخال كمية صحيحة أكبر من أو تساوي 0.');
      return;
    }

    setFwSaving(true);
    setFwError('');

    const assignedTeam = isSupervisor ? (user?.team_name?.trim() || 'Team Alpha') : (fwTeamName || 'Management');

    try {
      if (fwRecordId) {
        const { error } = await supabase
          .from('production_records')
          .update({
            updated_fw_qty: qtyNum,
            entered_by: user?.name || 'Admin',
            team_name: assignedTeam
          })
          .eq('id', fwRecordId);

        if (error) {
          // Update local cache
          const updated = records.map(r => r.id === fwRecordId ? { ...r, updated_fw_qty: qtyNum, team_name: assignedTeam } : r);
          setRecords(updated);
          localStorage.setItem('ectron_production_records', JSON.stringify(updated));
        } else {
          await loadRecords();
        }
      } else {
        const existing = records.find(r => r.date === fwDate && (r.team_name === assignedTeam || !r.team_name));
        if (existing) {
          const newQty = (existing.updated_fw_qty || 0) + qtyNum;
          const { error } = await supabase
            .from('production_records')
            .update({
              updated_fw_qty: newQty,
              entered_by: user?.name || 'Admin'
            })
            .eq('id', existing.id);

          if (error) {
            const updated = records.map(r => r.id === existing.id ? { ...r, updated_fw_qty: newQty } : r);
            setRecords(updated);
            localStorage.setItem('ectron_production_records', JSON.stringify(updated));
          } else {
            await loadRecords();
          }
        } else {
          const newRec = {
            date: fwDate,
            product: fwProduct || 'Smart Meter',
            target: 320,
            overall_fpy: 100,
            total_boards: qtyNum,
            achieved: qtyNum,
            updated_fw_qty: qtyNum,
            entered_by: user?.name || 'Admin',
            team_name: assignedTeam,
            stations: [],
            defects: []
          };
          const { error } = await supabase.from('production_records').insert([newRec]);
          if (error) {
            const list = [{ ...newRec, id: Date.now() }, ...records];
            setRecords(list);
            localStorage.setItem('ectron_production_records', JSON.stringify(list));
          } else {
            await loadRecords();
          }
        }
      }

      setShowFwModal(false);
      setFwQty('');
      setSaveSuccessMsg('تم حفظ وتحديث Updated FW QTY بنجاح!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving FW QTY:', err);
      setFwError('فشل الحفظ: ' + (err.message || ''));
    } finally {
      setFwSaving(false);
    }
  };

  // Delete Record from Supabase
  const handleDeleteRecord = async (id, date) => {
    if (!window.confirm(`هل أنت متأكد من حذف سجل الإنتاج لتاريخ ${date} نهائياً؟`)) return;

    try {
      await supabase.from('production_records').delete().eq('id', id);
      const remaining = records.filter(r => r.id !== id);
      setRecords(remaining);
      localStorage.setItem('ectron_production_records', JSON.stringify(remaining));
      await loadRecords();
    } catch (err) {
      console.warn('Delete error:', err);
    }
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchSearch = searchTerm === '' || 
        (r.product && r.product.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.entered_by && r.entered_by.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.team_name && r.team_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchTeam = filterTeam === 'ALL' || r.team_name === filterTeam;
      const matchDate = filterDate === '' || r.date === filterDate;
      const matchShift = filterShift === 'ALL' ||
        (filterShift === 'Morning' && (r.team_name?.includes('صباحي') || r.team_name?.includes('Morning') || r.notes?.includes('Morning'))) ||
        (filterShift === 'Evening' && (r.team_name?.includes('مسائي') || r.team_name?.includes('Evening') || r.notes?.includes('Evening')));

      return matchSearch && matchTeam && matchDate && matchShift;
    });
  }, [records, searchTerm, filterTeam, filterShift, filterDate]);

  // Stats
  const stats = useMemo(() => {
    const totalRecs = filteredRecords.length;
    const totalBoards = filteredRecords.reduce((sum, r) => sum + (r.total_boards || 0), 0);
    const totalAchieved = filteredRecords.reduce((sum, r) => sum + (r.achieved || 0), 0);
    const totalFw = filteredRecords.reduce((sum, r) => sum + (r.updated_fw_qty || 0), 0);
    return { totalRecs, totalBoards, totalAchieved, totalFw };
  }, [filteredRecords]);

  const fpyBadgeClass = (fpy) => {
    if (fpy == null) return 'badge-viewer';
    if (fpy >= 90) return 'badge-green';
    if (fpy >= 75) return 'badge-amber';
    return 'badge-red';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Status Banner ── */}
      {saveSuccessMsg && (
        <div style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '12px 18px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
          <Check size={20} />
          {saveSuccessMsg}
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Production Operations & Records</h1>
          <p className="page-subtitle">Upload SAGEMCOM FPY Excel reports, log Updated FW QTY manually, and track team outputs</p>
        </div>

        {/* Action Buttons at Top */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {!isViewer && (
            <button 
              type="button"
              className="btn-primary" 
              style={{ 
                background: 'var(--teal)', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 8, 
                padding: '10px 20px', 
                fontWeight: 700, 
                fontSize: '0.92rem',
                boxShadow: '0 4px 12px rgba(0, 175, 170, 0.25)' 
              }}
              onClick={() => {
                setParsedData(null);
                setUploadError('');
                setUploadDate(getTodayString());
                setShowUploadModal(true);
              }}
            >
              <Upload size={18} />
              Upload FPY Report (Excel)
            </button>
          )}

          <button 
            type="button" 
            className="btn-outline" 
            title="Refresh Data"
            onClick={loadRecords}
            style={{ padding: '9px 12px' }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── Summary Counters ── */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--teal)' }}>
          <div className="kpi-icon" style={{ background: 'var(--teal-light)', color: 'var(--teal-dark)' }}>
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <div className="kpi-val">{stats.totalRecs}</div>
            <div className="kpi-lbl">Total Records Logged</div>
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="kpi-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
            <Layers size={24} />
          </div>
          <div>
            <div className="kpi-val">{stats.totalBoards.toLocaleString()}</div>
            <div className="kpi-lbl">Total Boards Input</div>
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="kpi-icon" style={{ background: '#d1fae5', color: '#047857' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="kpi-val">{stats.totalAchieved.toLocaleString()}</div>
            <div className="kpi-lbl">Final OK Output</div>
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #7c3aed' }}>
          <div className="kpi-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
            <Cpu size={24} />
          </div>
          <div>
            <div className="kpi-val" style={{ color: '#7c3aed' }}>{stats.totalFw.toLocaleString()}</div>
            <div className="kpi-lbl">Updated FW QTY Total</div>
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="card-white" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrap" style={{ minWidth: 260 }}>
          <Search className="search-icon" size={16} />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search by product, team, or operator..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <UsersIcon size={16} color="var(--gray-500)" />
          <select 
            className="search-input" 
            style={{ width: 'auto', padding: '9px 12px' }}
            value={filterTeam} 
            onChange={e => setFilterTeam(e.target.value)}
          >
            <option value="ALL">All Teams</option>
            {availableTeams.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select 
            className="search-input" 
            style={{ width: 'auto', padding: '9px 12px', fontWeight: 600 }}
            value={filterShift} 
            onChange={e => setFilterShift(e.target.value)}
          >
            <option value="ALL">All Shifts (كل الشفتات)</option>
            <option value="Morning">☀️ Morning (صباحي)</option>
            <option value="Evening">🌙 Evening (مسائي)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={16} color="var(--gray-500)" />
          <input 
            type="date" 
            className="search-input" 
            style={{ width: 'auto', padding: '8px 12px' }}
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          />
          {filterDate && (
            <button type="button" className="btn-outline" style={{ padding: '6px 10px', fontSize: '0.78rem' }} onClick={() => setFilterDate('')}>
              Clear Date
            </button>
          )}
        </div>
      </div>

      {/* ── Production Records Table ── */}
      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Product Name</th>
                <th>Team Name</th>
                <th>Entered By</th>
                <th style={{ textAlign: 'center' }}>Total Boards</th>
                <th style={{ textAlign: 'center' }}>Achieved (OK)</th>
                <th style={{ textAlign: 'center' }}>FPY Yield</th>
                <th style={{ textAlign: 'center', background: 'rgba(124, 58, 237, 0.06)' }}>
                  <span style={{ color: '#7c3aed', fontWeight: 800 }}>⚡ Updated FW QTY</span>
                </th>
                <th style={{ width: 120, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="table-empty">
                    <span className="spinner" style={{ borderColor: 'rgba(18,168,157,.2)', borderTopColor: 'var(--teal)' }} />
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="9" className="table-empty">
                    {records.length === 0 
                      ? 'No records logged yet. Click "Upload FPY Report (Excel)" above to get started!' 
                      : 'No records matching the selected filters.'}
                  </td>
                </tr>
              ) : (
                filteredRecords.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, color: 'var(--gray-900)', whiteSpace: 'nowrap' }}>
                      📅 {r.date}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{r.product}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
                        {r.target && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--gray-600)', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                            🎯 Target: {r.target}
                          </span>
                        )}
                        {r.notes && (
                          <span 
                            title={r.notes}
                            style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: 4, cursor: 'help' }}
                          >
                            📝 Note
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: 5, 
                          padding: '3px 8px', 
                          borderRadius: 6, 
                          fontSize: '0.8rem', 
                          background: 'rgba(35, 63, 121, 0.08)', 
                          color: 'var(--navy)', 
                          fontWeight: 700,
                          width: 'fit-content'
                        }}>
                          👥 {r.team_name ? r.team_name.split(' - ')[0] : '—'}
                        </span>
                        {(r.team_name?.includes('صباحي') || r.team_name?.includes('Morning') || r.notes?.includes('Morning')) && (
                          <span style={{ fontSize: '0.72rem', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: 4, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                            ☀️ صباحي (Morning)
                          </span>
                        )}
                        {(r.team_name?.includes('مسائي') || r.team_name?.includes('Evening') || r.notes?.includes('Evening')) && (
                          <span style={{ fontSize: '0.72rem', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '1px 6px', borderRadius: 4, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                            🌙 مسائي (Evening)
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)' }}>
                        👤 {r.entered_by || '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.95rem' }}>
                      {r.total_boards?.toLocaleString() || 0}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#16a34a', fontSize: '0.95rem' }}>
                      {r.achieved?.toLocaleString() || 0}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${fpyBadgeClass(r.overall_fpy)}`} style={{ padding: '4px 10px', fontSize: '0.82rem' }}>
                        {r.overall_fpy != null ? `${r.overall_fpy}%` : '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', background: 'rgba(124, 58, 237, 0.04)' }}>
                      <span style={{ 
                        fontWeight: 800, 
                        fontSize: '1rem', 
                        color: '#7c3aed',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        {r.updated_fw_qty != null && r.updated_fw_qty > 0 ? (
                          <><span>⚙️</span> {r.updated_fw_qty.toLocaleString()}</>
                        ) : (
                          <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>0</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns" style={{ justifyContent: 'center' }}>
                        <button 
                          type="button"
                          className="btn-icon btn-edit" 
                          title="View Station Details & Defects"
                          onClick={() => setSelectedRecordForDetail(r)}
                        >
                          <Eye size={15} />
                        </button>

                        {!isViewer && (
                          <>
                            <button 
                              type="button"
                              className="btn-icon" 
                              style={{ background: '#ede9fe', color: '#7c3aed' }}
                              title="Edit FW QTY"
                              onClick={() => openFwModalForRecord(r)}
                            >
                              <Edit3 size={15} />
                            </button>

                            <button 
                              type="button"
                              className="btn-icon btn-delete" 
                              title="Delete Record"
                              onClick={() => handleDeleteRecord(r.id, r.date)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL 1: Upload Modal ── */}
      {showUploadModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowUploadModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={20} color="var(--teal)" />
                <span className="modal-title">
                  {parsedData ? 'Review & Confirm FPY Upload' : 'Upload SAGEMCOM FPY Excel File'}
                </span>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowUploadModal(false)}>×</button>
            </div>

            <div className="modal-body">
              {uploadError && <div className="modal-error">{uploadError}</div>}

              {!parsedData ? (
                /* Step 1: File Dropzone inside Modal */
                <div 
                  className="upload-dropzone" 
                  style={{ 
                    border: '2px dashed var(--teal)', 
                    background: '#f0fdfa', 
                    padding: '40px 20px', 
                    borderRadius: 12,
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                  onClick={() => document.getElementById('modal-excel-input').click()}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = '#e6fffa'; }}
                  onDragLeave={e => { e.currentTarget.style.background = '#f0fdfa'; }}
                  onDrop={e => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                  }}
                >
                  <input 
                    type="file" 
                    id="modal-excel-input" 
                    style={{ display: 'none' }} 
                    accept=".xls,.xlsx" 
                    onChange={e => handleFileUpload(e.target.files?.[0])} 
                  />
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--teal-light)', color: 'var(--teal-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <FileSpreadsheet size={30} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--navy)' }}>
                    Click to browse or drag and drop Excel file here
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 4 }}>
                    Supports SAGEMCOM FPY report sheets (.xlsx or .xls)
                  </div>

                  {isParsing && (
                    <div style={{ marginTop: 14 }}>
                      <span className="spinner" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '0.85rem', color: 'var(--teal-dark)', fontWeight: 600 }}>Parsing Excel data...</div>
                    </div>
                  )}
                </div>
              ) : (
                /* Step 2: Confirmation & Metadata */
                <>
                  <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '0.95rem' }}>📦 {parsedData.product}</span>
                      <button 
                        type="button" 
                        className="btn-outline" 
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                        onClick={() => setParsedData(null)}
                      >
                        Change File
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: 'center' }}>
                      <div style={{ background: 'white', padding: 10, borderRadius: 8, border: '1px solid #edf2f7' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>Overall FPY</div>
                        <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#16a34a' }}>
                          {parsedData.overallFPY?.toFixed(2)}%
                        </div>
                      </div>
                      <div style={{ background: 'white', padding: 10, borderRadius: 8, border: '1px solid #edf2f7' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>Total Boards</div>
                        <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>
                          {parsedData.totalBoards}
                        </div>
                      </div>
                      <div style={{ background: 'white', padding: 10, borderRadius: 8, border: '1px solid #edf2f7' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>Final OK Output</div>
                        <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--navy)' }}>
                          {parsedData.achieved}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label>Report Date *</label>
                      <input 
                        type="date" 
                        value={uploadDate} 
                        onChange={e => setUploadDate(e.target.value)} 
                        disabled={isSaving}
                      />
                    </div>
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label>Shift Target (Boards) *</label>
                        <span style={{ fontSize: '0.72rem', color: 'var(--teal-dark)', fontWeight: 700 }}>افتراضي 650</span>
                      </div>
                      <input 
                        type="number" 
                        value={uploadTarget} 
                        onChange={e => setUploadTarget(e.target.value)} 
                        disabled={isSaving}
                        placeholder="650"
                        style={{ fontWeight: 700 }}
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 2, display: 'block' }}>
                        تارجت الشفت الافتراضي 650 عداد، يمكنك تغييره إذا لزم الأمر
                      </span>
                    </div>
                  </div>

                  {/* Shift Selection (صباحي / مسائي) */}
                  <div className="form-group" style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label style={{ fontWeight: 800, color: 'var(--navy)', margin: 0, fontSize: '0.88rem' }}>
                        Shift Selection (تحديد الشفت) *
                      </label>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 800, 
                        color: uploadShift === 'Morning' ? '#b45309' : '#6d28d9',
                        background: uploadShift === 'Morning' ? '#fef3c7' : '#ede9fe',
                        padding: '2px 8px',
                        borderRadius: 12
                      }}>
                        {uploadShift === 'Morning' ? 'الشفت الصباحي المحدد' : 'الشفت المسائي المحدد'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <button
                        type="button"
                        style={{
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: uploadShift === 'Morning' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                          background: uploadShift === 'Morning' ? '#fffbeb' : '#ffffff',
                          color: uploadShift === 'Morning' ? '#b45309' : '#475569',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          boxShadow: uploadShift === 'Morning' ? '0 2px 8px rgba(245, 158, 11, 0.2)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => setUploadShift('Morning')}
                      >
                        <span style={{ fontSize: '1.25rem' }}>☀️</span>
                        <span>صباحي (Morning)</span>
                      </button>

                      <button
                        type="button"
                        style={{
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: uploadShift === 'Evening' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                          background: uploadShift === 'Evening' ? '#f5f3ff' : '#ffffff',
                          color: uploadShift === 'Evening' ? '#6d28d9' : '#475569',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          boxShadow: uploadShift === 'Evening' ? '0 2px 8px rgba(124, 58, 237, 0.2)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => setUploadShift('Evening')}
                      >
                        <span style={{ fontSize: '1.25rem' }}>🌙</span>
                        <span>مسائي (Evening)</span>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label>Entered By</label>
                      <input 
                        type="text" 
                        value={user?.name || 'Admin'} 
                        disabled 
                        style={{ background: 'var(--gray-100)' }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Team Name *</label>
                      {isSupervisor ? (
                        <input 
                          type="text" 
                          value={user?.team_name?.trim() || 'Team Alpha'} 
                          disabled 
                          style={{ background: 'var(--gray-100)', fontWeight: 600 }}
                        />
                      ) : (
                        <select 
                          className="form-select"
                          value={uploadTeamName}
                          onChange={e => setUploadTeamName(e.target.value)}
                          disabled={isSaving}
                        >
                          {availableTeams.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="form-group" style={{ background: '#f5f3ff', padding: 12, borderRadius: 8, border: '1px solid #ddd6fe' }}>
                    <label style={{ color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Cpu size={16} /> Updated FW QTY (Optional)
                    </label>
                    <input 
                      type="number" 
                      placeholder="Enter updated firmware quantity (or leave 0)" 
                      value={uploadFwQty}
                      onChange={e => setUploadFwQty(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Notes / Problem Comments (Optional)
                    </label>
                    <textarea 
                      rows={2}
                      className="search-input"
                      style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', padding: '8px 12px' }}
                      placeholder="e.g. Test bench calibration issue, line stopped for 20 mins due to part shortage, etc..."
                      value={uploadNotes}
                      onChange={e => setUploadNotes(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowUploadModal(false)} disabled={isSaving}>
                Cancel
              </button>
              {parsedData && (
                <button 
                  type="button" 
                  className="btn-primary" 
                  disabled={isSaving}
                  onClick={handleSaveUpload}
                >
                  {isSaving ? <span className="spinner" /> : 'Save Record to Cloud'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Manual Updated FW QTY ── */}
      {showFwModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowFwModal(false)}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cpu size={20} color="#7c3aed" />
                <span className="modal-title">
                  {fwRecordId ? 'Edit Updated FW QTY' : 'Log Updated FW QTY Manually'}
                </span>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowFwModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveFwQty}>
              <div className="modal-body">
                {fwError && <div className="modal-error">{fwError}</div>}

                <div className="form-group">
                  <label>Date *</label>
                  <input 
                    type="date" 
                    value={fwDate} 
                    onChange={e => setFwDate(e.target.value)} 
                    disabled={fwSaving || !!fwRecordId} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Product Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. G3 Smart Meter" 
                    value={fwProduct} 
                    onChange={e => setFwProduct(e.target.value)} 
                    disabled={fwSaving || !!fwRecordId} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Updated FW QTY *</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 150" 
                    value={fwQty} 
                    onChange={e => setFwQty(e.target.value)} 
                    disabled={fwSaving} 
                    autoFocus 
                    min="0"
                    required 
                  />
                  <p className="hint">Enter count of meters updated with latest firmware.</p>
                </div>

                <div className="form-group">
                  <label>Team Name *</label>
                  {isSupervisor ? (
                    <input 
                      type="text" 
                      value={user?.team_name?.trim() || 'Team Alpha'} 
                      disabled 
                      style={{ background: 'var(--gray-100)', fontWeight: 600 }}
                    />
                  ) : (
                    <select 
                      className="form-select"
                      value={fwTeamName} 
                      onChange={e => setFwTeamName(e.target.value)}
                      disabled={fwSaving}
                    >
                      {availableTeams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label>Entered By</label>
                  <input 
                    type="text" 
                    value={user?.name || 'Admin'} 
                    disabled 
                    style={{ background: 'var(--gray-100)' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowFwModal(false)} disabled={fwSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#7c3aed' }} disabled={fwSaving}>
                  {fwSaving ? <span className="spinner" /> : 'Save Quantity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Detail View for Selected Record ── */}
      {selectedRecordForDetail && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setSelectedRecordForDetail(null)}>
          <div className="modal" style={{ maxWidth: 760, maxHeight: '90vh' }}>
            <div className="modal-header">
              <div>
                <span className="modal-title">Record Details: {selectedRecordForDetail.date} — {selectedRecordForDetail.product}</span>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 2 }}>
                  Team: {selectedRecordForDetail.team_name || '—'} | Entered By: {selectedRecordForDetail.entered_by || '—'}
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => setSelectedRecordForDetail(null)}>×</button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
                <div style={{ background: 'var(--gray-100)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>Overall FPY</div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#16a34a' }}>
                    {selectedRecordForDetail.overall_fpy != null ? `${selectedRecordForDetail.overall_fpy}%` : 'N/A'}
                  </div>
                </div>
                <div style={{ background: 'var(--gray-100)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>Total Boards</div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--navy)' }}>
                    {selectedRecordForDetail.total_boards?.toLocaleString() || 0}
                  </div>
                </div>
                <div style={{ background: 'var(--gray-100)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>Final OK</div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#16a34a' }}>
                    {selectedRecordForDetail.achieved?.toLocaleString() || 0}
                  </div>
                </div>
                <div style={{ background: 'var(--gray-100)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>Updated FW</div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#7c3aed' }}>
                    {selectedRecordForDetail.updated_fw_qty?.toLocaleString() || 0}
                  </div>
                </div>
              </div>

              {/* Station Flow Table in Modal */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--navy)', marginBottom: 8 }}>
                  Workstation Flow Matrix
                </div>
                {selectedRecordForDetail.stations && selectedRecordForDetail.stations.length > 0 ? (
                  <div className="table-wrap">
                    <table style={{ fontSize: '0.82rem' }}>
                      <thead>
                        <tr>
                          <th>Station Name</th>
                          <th style={{ textAlign: 'center' }}>Bench</th>
                          <th style={{ textAlign: 'center' }}>Runs</th>
                          <th style={{ textAlign: 'center' }}>Input</th>
                          <th style={{ textAlign: 'center' }}>OK</th>
                          <th style={{ textAlign: 'center' }}>FPY %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRecordForDetail.stations.map((s, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{s.stationName}</td>
                            <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.75rem' }}>{s.bench || '—'}</td>
                            <td style={{ textAlign: 'center' }}>{s.nbTestRun || '—'}</td>
                            <td style={{ textAlign: 'center' }}>{s.nbBoards}</td>
                            <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>{s.nbBoardsOK}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`badge ${fpyBadgeClass(s.fpy)}`}>
                                {s.fpy != null ? `${s.fpy}%` : '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>No individual station details available.</div>
                )}
              </div>

              {/* Top Defects in Modal */}
              {selectedRecordForDetail.defects && selectedRecordForDetail.defects.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--navy)', marginBottom: 8 }}>
                    Top Defect Codes
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                    {selectedRecordForDetail.defects.map(d => (
                      <div key={d.code} style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 6, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#dc2626' }}>{d.code}</span>
                        <span style={{ fontWeight: 800, color: '#991b1b' }}>{d.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes / Issue description in Modal */}
              {selectedRecordForDetail.notes && (
                <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 8, padding: '12px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#854d0e', marginBottom: 4 }}>
                    📝 Supervisor Notes & Incident Log:
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#713f12', whiteSpace: 'pre-wrap' }}>
                    {selectedRecordForDetail.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setSelectedRecordForDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
