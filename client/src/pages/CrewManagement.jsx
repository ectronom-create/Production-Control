import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Users,
  UserCheck,
  UserX,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Save,
  RotateCcw,
  Search,
  History,
  Clock,
  Calendar,
  X,
  ShieldCheck,
  Factory,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const STAGES = [
  { id: 'Assembly', nameAr: 'التجميع', nameEn: 'Assembly', num: 1, icon: '🔧', color: '#4f46e5' },
  { id: 'Insulation', nameAr: 'العزل', nameEn: 'Insulation', num: 2, icon: '🛡️', color: '#0284c7' },
  { id: 'RF', nameAr: 'التردد اللاسلكي', nameEn: 'RF', num: 3, icon: '📡', color: '#0d9488' },
  { id: 'Calibration', nameAr: 'المعايرة', nameEn: 'Calibration', num: 4, icon: '⚖️', color: '#eab308' },
  { id: 'Multin test', nameAr: 'الفحص الشامل', nameEn: 'Multin test', num: 5, icon: '🔬', color: '#8b5cf6' },
  { id: 'Perso', nameAr: 'التخصيص', nameEn: 'Perso', num: 6, icon: '🏷️', color: '#ec4899' },
  { id: 'Packaging', nameAr: 'التغليف', nameEn: 'Packaging', num: 7, icon: '📦', color: '#10b981' },
  { id: 'Firmware update', nameAr: 'تحديث الفيرموير', nameEn: 'Firmware update', num: 8, icon: '💾', color: '#06b6d4' }
];

const SHIFT_OPTIONS = ['Morning', 'Night'];

function getTodayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getInitialShift() {
  const h = new Date().getHours();
  return (h >= 6 && h < 18) ? 'Morning' : 'Night';
}

function parseOperatorTeam(teamName) {
  if (!teamName) return { supervisor: '', station: 'Assembly', status: 'active' };
  try {
    if (teamName.startsWith('{')) {
      const p = JSON.parse(teamName);
      return {
        supervisor: p.supervisor || '',
        station: p.station || 'Assembly',
        status: p.status || 'active'
      };
    }
  } catch {}
  return { supervisor: teamName, station: 'Assembly', status: 'active' };
}

// ─── Shift History Modal ──────────────────────────────────────────────────────
function ShiftHistoryModal({ isOpen, onClose, historyRecords, operatorsMap, isArabic }) {
  const [filterDate, setFilterDate] = useState('');
  const [filterShift, setFilterShift] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);

  if (!isOpen) return null;

  const filteredHistory = historyRecords.filter(rec => {
    if (filterDate && rec.date !== filterDate) return false;
    if (filterShift !== 'ALL') {
      const isMorning = rec.shift === 'Morning' || rec.shift === 'Day';
      if (filterShift === 'Morning' && !isMorning) return false;
      if (filterShift === 'Night' && rec.shift !== 'Night') return false;
    }
    return true;
  });

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 860, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={20} color="var(--teal)" />
            <span className="modal-title">
              {isArabic ? 'سجل الورديات وتوزيع المشغلين على المحطات' : 'Shift & Station Assignment History'}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ gap: '16px' }}>
          {/* Filters Bar */}
          <div style={{
            background: 'var(--gray-50)',
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid var(--gray-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} color="var(--gray-500)" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--gray-300)', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} color="var(--gray-500)" />
                <select
                  value={filterShift}
                  onChange={e => setFilterShift(e.target.value)}
                  className="form-select"
                  style={{ padding: '5px 10px', fontSize: '0.84rem' }}
                >
                  <option value="ALL">{isArabic ? 'جميع الورديات' : 'All Shifts'}</option>
                  <option value="Morning">{isArabic ? 'وردية صباحية' : 'Morning Shift'}</option>
                  <option value="Night">{isArabic ? 'وردية ليلية' : 'Night Shift'}</option>
                </select>
              </div>

              {filterDate && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setFilterDate('')}
                  style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                >
                  {isArabic ? 'إلغاء التصفية' : 'Clear Date'}
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', fontWeight: 600 }}>
              {isArabic ? `إجمالي السجلات: ${filteredHistory.length}` : `Total Records: ${filteredHistory.length}`}
            </div>
          </div>

          {/* History List */}
          {filteredHistory.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--gray-500)' }}>
              <History size={36} color="var(--gray-300)" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 600 }}>
                {isArabic ? 'لا توجد سجلات ورديات سابقة تطابق البحث.' : 'No shift assignment records found.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredHistory.map(rec => {
                const isExpanded = expandedId === rec.id;
                const assignments = rec.item_details?.stationAssignments || {};
                const totalAssigned = Object.values(assignments).reduce((acc, curr) => acc + (Array.isArray(curr) ? curr.length : (curr ? 1 : 0)), 0);

                return (
                  <div
                    key={rec.id}
                    style={{
                      background: 'var(--white)',
                      border: '1.5px solid var(--gray-200)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                      style={{
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: isExpanded ? 'rgba(0, 175, 170, 0.05)' : 'transparent',
                        borderBottom: isExpanded ? '1px solid var(--gray-200)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          color: 'var(--navy)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Calendar size={15} color="var(--teal)" />
                          <span>{rec.date}</span>
                        </span>

                        <span className="badge badge-supervisor" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                          {rec.shift === 'Night'
                            ? (isArabic ? '🌙 وردية ليلية' : '🌙 Night Shift')
                            : (isArabic ? '☀️ وردية صباحية' : '☀️ Morning Shift')}
                        </span>

                        <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                          {isArabic ? 'المشرف: ' : 'Supervisor: '}
                          <strong style={{ color: 'var(--navy)' }}>{rec.supervisor}</strong>
                        </span>

                        <span style={{ fontSize: '0.8rem', color: 'var(--teal-dark)', fontWeight: 600 }}>
                          👥 {totalAssigned} {isArabic ? 'مشغلين على الخط' : 'assigned operators'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                          {new Date(rec.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isExpanded ? <ChevronUp size={18} color="var(--gray-500)" /> : <ChevronDown size={18} color="var(--gray-500)" />}
                      </div>
                    </div>

                    {/* Expanded Station Breakdown */}
                    {isExpanded && (
                      <div style={{ padding: '16px 18px', background: 'var(--gray-50)' }}>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: '12px'
                        }}>
                          {STAGES.map(st => {
                            const raw = assignments[st.id];
                            const opIds = Array.isArray(raw) ? raw : (raw ? [raw] : []);
                            const assignedOps = opIds.map(id => operatorsMap[id]).filter(Boolean);

                            return (
                              <div
                                key={st.id}
                                style={{
                                  background: 'var(--white)',
                                  borderRadius: '8px',
                                  padding: '10px 12px',
                                  border: assignedOps.length > 0 ? '1px solid rgba(0, 175, 170, 0.3)' : '1px dashed var(--gray-300)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--navy)' }}>
                                    {st.icon} {isArabic ? st.nameAr : st.nameEn}
                                  </span>
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: assignedOps.length > 0 ? 'var(--teal-light)' : 'var(--gray-100)',
                                    color: assignedOps.length > 0 ? 'var(--teal-dark)' : 'var(--gray-500)'
                                  }}>
                                    {assignedOps.length} {isArabic ? 'مشغل' : 'ops'}
                                  </span>
                                </div>

                                {assignedOps.length === 0 ? (
                                  <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                                    {isArabic ? 'شاغرة' : 'Vacant'}
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {assignedOps.map(op => (
                                      <div
                                        key={op.id}
                                        style={{
                                          fontSize: '0.8rem',
                                          fontWeight: 600,
                                          color: 'var(--gray-800)',
                                          background: 'var(--gray-100)',
                                          padding: '4px 8px',
                                          borderRadius: '4px',
                                          display: 'flex',
                                          justifyContent: 'space-between'
                                        }}
                                      >
                                        <span>{op.name}</span>
                                        <span style={{ color: 'var(--teal-dark)', fontFamily: 'monospace' }}>#{op.company_id}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {isArabic ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Simplified Operator Add / Edit Modal ─────────────────────────────────────
function OperatorModal({ mode, initial, supervisors, currentSupervisor, onClose, onSaved }) {
  const { isArabic } = useLanguage();
  const isEdit = mode === 'edit';

  const initialMeta = initial ? parseOperatorTeam(initial.team_name) : null;
  const [name, setName] = useState(initial?.name || '');
  const [companyId, setCompanyId] = useState(initial?.company_id || '');
  const [supervisor, setSupervisor] = useState(initialMeta?.supervisor || currentSupervisor || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(isArabic ? 'يرجى إدخال اسم المشغل.' : 'Operator name is required.');
      return;
    }
    if (!companyId.trim()) {
      setError(isArabic ? 'يرجى إدخال الرقم الوظيفي.' : 'Company ID / Badge is required.');
      return;
    }

    setLoading(true);
    try {
      const teamData = JSON.stringify({
        supervisor: supervisor || currentSupervisor || 'Supervisor',
        station: initialMeta?.station || 'Assembly',
        status: 'active'
      });

      const payload = {
        name: name.trim(),
        company_id: companyId.trim(),
        password: companyId.trim() || '1234',
        access: 'operator',
        team_name: teamData
      };

      let result;
      if (isEdit) {
        const { data, error: err } = await supabase
          .from('users')
          .update(payload)
          .eq('id', initial.id)
          .select();
        if (err) throw err;
        result = data?.[0] || { ...initial, ...payload };
      } else {
        const { data, error: err } = await supabase
          .from('users')
          .insert([payload])
          .select();
        if (err) throw err;
        result = data?.[0] || { ...payload, id: Date.now() };
      }

      onSaved(result, isEdit);
    } catch (err) {
      setError(err?.message || (isArabic ? 'فشل حفظ بيانات المشغل.' : 'Failed to save operator.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span className="modal-title">
            {isEdit
              ? (isArabic ? 'تعديل بيانات المشغل' : 'Edit Operator')
              : (isArabic ? 'إضافة مشغل جديد إلى الطاقم' : 'Add New Operator to Crew')}
          </span>
          <button className="modal-close" onClick={onClose} disabled={loading}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ gap: '14px' }}>
            {error && <div className="modal-error">{error}</div>}

            <div className="form-group">
              <label>{isArabic ? 'اسم المشغل / الموظف *' : 'Operator Name *'}</label>
              <input
                type="text"
                placeholder={isArabic ? 'مثال: أحمد سالم الحارثي' : 'e.g. Ahmed Salim'}
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>{isArabic ? 'الرقم الوظيفي (ID) *' : 'Badge / Company ID *'}</label>
              <input
                type="text"
                placeholder="e.g. 2470"
                value={companyId}
                onChange={e => setCompanyId(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>{isArabic ? 'المشرف المسؤول' : 'Responsible Supervisor'}</label>
              <select
                className="form-select"
                value={supervisor}
                onChange={e => setSupervisor(e.target.value)}
                disabled={loading}
              >
                {supervisors.map(s => (
                  <option key={s.id || s.name} value={s.name}>
                    {s.name} {s.team_name ? `(${s.team_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : isEdit ? (isArabic ? 'حفظ التعديلات' : 'Save Changes') : (isArabic ? 'إضافة إلى الطاقم' : 'Add to Crew')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteOperatorModal({ operator, onClose, onDeleted }) {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (user?.access !== 'admin') {
      alert('Only administrators have permission to delete operators.');
      return;
    }
    setLoading(true);
    try {
      await supabase.from('users').delete().eq('id', operator.id);
      onDeleted(operator.id);
    } catch (e) {
      alert(e?.message || 'Error deleting operator');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <div className="modal-header">
          <span className="modal-title">{isArabic ? 'حذف مشغل من الطاقم' : 'Remove Operator'}</span>
          <button className="modal-close" onClick={onClose} disabled={loading}>×</button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center', gap: '12px', alignItems: 'center' }}>
          <div className="confirm-icon">
            <UserX size={28} />
          </div>
          <p className="confirm-msg">
            {isArabic ? (
              <>هل أنت متأكد من إزالة المشغل <strong className="confirm-name">{operator.name}</strong> (#{operator.company_id}) من طاقم العمل؟</>
            ) : (
              <>Are you sure you want to remove <strong className="confirm-name">{operator.name}</strong> (#{operator.company_id}) from the crew?</>
            )}
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>{isArabic ? 'إلغاء' : 'Cancel'}</button>
          <button className="btn-danger" onClick={handleDelete} disabled={loading}>
            {loading ? <span className="spinner" style={{ borderTopColor: 'white' }} /> : (isArabic ? 'حذف المشغل' : 'Delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Crew Management Page ────────────────────────────────────────────────
export default function CrewManagement() {
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const isAdmin = user?.access === 'admin';

  const [supervisors, setSupervisors] = useState([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState(user?.access === 'supervisor' ? user.name : '');
  const [selectedShift, setSelectedShift] = useState(getInitialShift());
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(null); // null | { type: 'add' | 'edit' | 'delete', operator? }

  // Multi-operator station assignments: { [stageId]: [operatorId, ...] }
  const [stationAssignments, setStationAssignments] = useState({});
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);

  // Shift History
  const [historyRecords, setHistoryRecords] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // 1. Fetch supervisors & operators
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: allUsers, error } = await supabase.from('users').select('*').order('name');
      if (error) throw error;

      const sups = (allUsers || []).filter(u => u.access === 'supervisor');
      setSupervisors(sups);

      if (!selectedSupervisor && sups.length > 0) {
        if (user?.access === 'supervisor') {
          setSelectedSupervisor(user.name);
        } else {
          setSelectedSupervisor(sups[0].name);
        }
      }

      const ops = (allUsers || []).filter(u => u.access === 'operator');
      setOperators(ops);
    } catch (e) {
      console.warn('Fetch crew error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedSupervisor, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load Shift History from Supabase / localStorage
  const loadHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pre_production_checklists')
        .select('*')
        .eq('form_no', 'CREW-ASSIGN-2026')
        .order('id', { ascending: false });

      if (!error && data) {
        setHistoryRecords(data);
      } else {
        const cached = JSON.parse(localStorage.getItem('ectron_crew_shift_history') || '[]');
        setHistoryRecords(cached);
      }
    } catch {
      const cached = JSON.parse(localStorage.getItem('ectron_crew_shift_history') || '[]');
      setHistoryRecords(cached);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Quick lookup map: operatorId -> operator object
  const operatorsMap = useMemo(() => {
    const map = {};
    operators.forEach(op => { map[op.id] = op; });
    return map;
  }, [operators]);

  // Filter operators belonging to the selected supervisor
  const currentSupervisorOperators = useMemo(() => {
    if (!selectedSupervisor) return [];
    return operators.filter(op => {
      const meta = parseOperatorTeam(op.team_name);
      return meta.supervisor?.trim().toLowerCase() === selectedSupervisor?.trim().toLowerCase();
    });
  }, [operators, selectedSupervisor]);

  // Set of all operator IDs currently assigned to ANY station
  const allAssignedOperatorIds = useMemo(() => {
    const set = new Set();
    Object.values(stationAssignments).forEach(arr => {
      if (Array.isArray(arr)) {
        arr.forEach(id => set.add(id));
      }
    });
    return set;
  }, [stationAssignments]);

  // Unassigned operators who are free to be assigned (removes confusion and prevents double assignment)
  const unassignedOps = useMemo(() => {
    return currentSupervisorOperators.filter(op => !allAssignedOperatorIds.has(op.id));
  }, [currentSupervisorOperators, allAssignedOperatorIds]);

  const lastLoadedSupervisorRef = useRef('');

  // Sticky Station Assignment: Load saved assignments from cache or DB when supervisor changes
  // "عند تعيين موظف في محطة لا يتم تغييرها إلا إذا غيرها المشرف المسؤول"
  useEffect(() => {
    if (!selectedSupervisor) return;
    if (lastLoadedSupervisorRef.current === selectedSupervisor) return;
    lastLoadedSupervisorRef.current = selectedSupervisor;

    let isMounted = true;

    async function loadSavedAssignments() {
      const storageKey = `ectron_multi_station_assignments_${selectedSupervisor}`;

      // 1. Check local storage first (instant response for this supervisor)
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            const hasAny = Object.values(parsed).some(arr => Array.isArray(arr) && arr.length > 0);
            if (hasAny) {
              if (isMounted) setStationAssignments(parsed);
              return;
            }
          }
        }
      } catch {}

      // 2. Query the latest saved shift assignment snapshot from Supabase database
      try {
        const { data, error } = await supabase
          .from('pre_production_checklists')
          .select('*')
          .eq('form_no', 'CREW-ASSIGN-2026')
          .eq('supervisor', selectedSupervisor)
          .order('id', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0 && data[0].item_details?.stationAssignments) {
          const dbAssignments = data[0].item_details.stationAssignments;
          if (isMounted && typeof dbAssignments === 'object') {
            setStationAssignments(dbAssignments);
            try {
              localStorage.setItem(storageKey, JSON.stringify(dbAssignments));
            } catch {}
            return;
          }
        }
      } catch (e) {
        console.warn('DB assignment fetch warning:', e);
      }

      // 3. Fallback: build from each operator's persistent station in Supabase team_name
      const initial = {};
      STAGES.forEach(st => { initial[st.id] = []; });

      currentSupervisorOperators.forEach(op => {
        const meta = parseOperatorTeam(op.team_name);
        if (meta.station && STAGES.some(s => s.id === meta.station)) {
          if (!initial[meta.station]) initial[meta.station] = [];
          if (!initial[meta.station].includes(op.id)) {
            initial[meta.station].push(op.id);
          }
        }
      });

      if (isMounted) {
        setStationAssignments(initial);
        try {
          localStorage.setItem(storageKey, JSON.stringify(initial));
        } catch {}
      }
    }

    loadSavedAssignments();

    return () => {
      isMounted = false;
    };
  }, [selectedSupervisor, currentSupervisorOperators]);

  // Toast feedback
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  // Multi-operator assignment: Add an operator to a station
  // Guarantees an operator is only in ONE station at a time across the entire line
  function handleAddOperatorToStation(stageId, operatorIdStr) {
    const operatorId = operatorIdStr ? Number(operatorIdStr) : null;
    if (!operatorId) return;

    // 1. Update station assignments state immediately
    setStationAssignments(prev => {
      // Remove operator from ANY other station first to prevent double-assignment
      const next = {};
      Object.keys(prev).forEach(st => {
        next[st] = (prev[st] || []).filter(id => id !== operatorId);
      });

      // Add to target station
      if (!next[stageId]) next[stageId] = [];
      if (!next[stageId].includes(operatorId)) {
        next[stageId].push(operatorId);
      }

      // Persist to local storage immediately
      try {
        localStorage.setItem(`ectron_multi_station_assignments_${selectedSupervisor}`, JSON.stringify(next));
      } catch {}

      return next;
    });

    // 2. Persist in background to Supabase users table (without triggering re-fetch loop)
    const op = operatorsMap[operatorId];
    if (op) {
      const meta = parseOperatorTeam(op.team_name);
      const updatedMeta = JSON.stringify({ ...meta, station: stageId });
      supabase.from('users').update({ team_name: updatedMeta }).eq('id', operatorId).catch(console.warn);
    }
  }

  // Remove an operator from a station
  function handleRemoveOperatorFromStation(stageId, operatorId) {
    setStationAssignments(prev => {
      const currentList = prev[stageId] ? prev[stageId].filter(id => id !== operatorId) : [];
      const next = {
        ...prev,
        [stageId]: currentList
      };

      try {
        localStorage.setItem(`ectron_multi_station_assignments_${selectedSupervisor}`, JSON.stringify(next));
      } catch {}

      return next;
    });

    // Clear operator station in Supabase database in background
    const op = operatorsMap[operatorId];
    if (op) {
      const meta = parseOperatorTeam(op.team_name);
      const updatedMeta = JSON.stringify({ ...meta, station: '' });
      supabase.from('users').update({ team_name: updatedMeta }).eq('id', operatorId).catch(console.warn);
    }
  }

  // Save current station distribution permanently to Supabase (Sticky & History)
  async function handleSaveAssignments() {
    setIsSavingAssignments(true);
    const today = getTodayString();

    try {
      // 1. Save sticky assignments in localStorage
      const storageKey = `ectron_multi_station_assignments_${selectedSupervisor}`;
      localStorage.setItem(storageKey, JSON.stringify(stationAssignments));

      // 2. Persist to each operator's record in Supabase users table
      const updatePromises = currentSupervisorOperators.map(op => {
        const assignedStage = Object.keys(stationAssignments).find(st => {
          const list = stationAssignments[st] || [];
          return list.includes(op.id);
        });

        const meta = parseOperatorTeam(op.team_name);
        const updatedMeta = JSON.stringify({
          ...meta,
          station: assignedStage || ''
        });

        return supabase.from('users').update({ team_name: updatedMeta }).eq('id', op.id);
      });

      await Promise.all(updatePromises);

      // 3. Save Shift History snapshot to pre_production_checklists in Supabase
      const historyPayload = {
        form_no: 'CREW-ASSIGN-2026',
        rev: '00',
        date: today,
        shift: selectedShift,
        supervisor: selectedSupervisor,
        status: 'ASSIGNED',
        readiness_pct: 100,
        passed_count: Object.keys(stationAssignments).filter(k => (stationAssignments[k] || []).length > 0).length,
        failed_count: 0,
        total_items: STAGES.length,
        item_details: {
          stationAssignments: stationAssignments,
          totalOperators: currentSupervisorOperators.length
        },
        general_notes: `Station assignments for ${selectedSupervisor} (${selectedShift} Shift)`
      };

      try {
        const { data: histData, error: histErr } = await supabase
          .from('pre_production_checklists')
          .insert([historyPayload])
          .select();

        if (!histErr && histData && histData[0]) {
          setHistoryRecords(prev => [histData[0], ...prev]);
        }
      } catch (e) {
        console.warn('History insert to Supabase:', e);
      }

      // Also cache in local history
      try {
        const localHist = JSON.parse(localStorage.getItem('ectron_crew_shift_history') || '[]');
        localHist.unshift({ ...historyPayload, id: Date.now(), created_at: new Date().toISOString() });
        localStorage.setItem('ectron_crew_shift_history', JSON.stringify(localHist.slice(0, 100)));
      } catch {}

      showToast(isArabic ? '✅ تم تثبيت توزيع المحطات وحفظ سجل الوردية بنجاح!' : '✅ Station assignments and shift history saved successfully!');
      fetchData();
    } catch (e) {
      console.error('Error saving assignments:', e);
      showToast(isArabic ? '❌ تعذر حفظ التوزيع.' : '❌ Failed to save assignments.');
    } finally {
      setIsSavingAssignments(false);
    }
  }

  // Clear all station assignments
  async function handleResetStations() {
    if (window.confirm(isArabic ? 'هل أنت متأكد من تفريغ جميع المحطات لهذه الوردية؟' : 'Clear all stations?')) {
      const empty = {};
      STAGES.forEach(st => { empty[st.id] = []; });
      setStationAssignments(empty);
      try {
        localStorage.removeItem(`ectron_multi_station_assignments_${selectedSupervisor}`);
      } catch {}

      // Clear station in Supabase database for all operators of this supervisor
      const updatePromises = currentSupervisorOperators.map(op => {
        const meta = parseOperatorTeam(op.team_name);
        const updatedMeta = JSON.stringify({ ...meta, station: '' });
        return supabase.from('users').update({ team_name: updatedMeta }).eq('id', op.id);
      });
      await Promise.all(updatePromises);
      fetchData();
      showToast(isArabic ? 'تم تفريغ جميع المحطات.' : 'All stations cleared.');
    }
  }

  // Modal handlers
  function handleSaved(operator, isEdit) {
    if (isEdit) {
      setOperators(prev => prev.map(o => o.id === operator.id ? operator : o));
    } else {
      setOperators(prev => [...prev, operator]);
    }
    setModal(null);
    showToast(isArabic ? 'تم حفظ المشغل بنجاح.' : 'Operator saved successfully.');
  }

  function handleDeleted(id) {
    setOperators(prev => prev.filter(o => o.id !== id));
    setStationAssignments(prev => {
      const next = {};
      Object.keys(prev).forEach(st => {
        next[st] = (prev[st] || []).filter(opId => opId !== id);
      });
      return next;
    });
    setModal(null);
    showToast(isArabic ? 'تم حذف المشغل من الطاقم.' : 'Operator removed.');
  }

  // Filtered operators by search
  const filteredOperators = currentSupervisorOperators.filter(op => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const meta = parseOperatorTeam(op.team_name);
    return (
      op.name?.toLowerCase().includes(q) ||
      op.company_id?.toLowerCase().includes(q) ||
      meta.station?.toLowerCase().includes(q)
    );
  });

  // Operators assigned to at least one station
  const assignedOperatorsCount = useMemo(() => {
    const assignedSet = new Set();
    Object.values(stationAssignments).forEach(arr => {
      if (Array.isArray(arr)) {
        arr.forEach(id => assignedSet.add(id));
      }
    });
    return currentSupervisorOperators.filter(op => assignedSet.has(op.id)).length;
  }, [stationAssignments, currentSupervisorOperators]);

  // Stations with at least 1 operator assigned
  const coveredStationsCount = STAGES.filter(st => (stationAssignments[st.id] || []).length > 0).length;

  return (
    <div className="crew-management-page" style={{ paddingBottom: '60px' }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: 'var(--navy)',
          color: 'var(--white)',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease'
        }}>
          {toast}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--teal) 0%, var(--navy) 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0, 175, 170, 0.25)'
              }}>
                <Factory size={22} />
              </div>
              <div>
                <h1 className="page-title" style={{ margin: 0 }}>
                  {isArabic ? 'طاقم العمل وتوزيع المحطات' : 'Line Crew & Workstations'}
                </h1>
                <p className="page-subtitle" style={{ margin: 0 }}>
                  {isArabic
                    ? 'تعيين المشغلين على المحطات بدقة مع حفظ السجل الدائم للورديات'
                    : 'Assign operators to workstations with permanent shift history retention'}
                </p>
              </div>
            </div>
          </div>

          {/* Supervisor Switcher & History Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {isAdmin ? (
              <div style={{
                background: 'var(--white)',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1.5px solid var(--teal)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy)' }}>
                  {isArabic ? '👨‍💼 عرض طاقم المشرف:' : '👨‍💼 Select Supervisor:'}
                </span>
                <select
                  className="form-select"
                  style={{ minWidth: '220px', padding: '6px 10px', fontSize: '0.88rem', fontWeight: 600, borderColor: 'var(--gray-300)' }}
                  value={selectedSupervisor}
                  onChange={e => setSelectedSupervisor(e.target.value)}
                >
                  {supervisors.map(s => (
                    <option key={s.id || s.name} value={s.name}>
                      {s.name} {s.team_name ? `(${s.team_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{
                background: 'var(--white)',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid var(--gray-200)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span className="badge badge-supervisor" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                  {isArabic ? 'مشرف الوردية' : 'Supervisor'}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.95rem' }}>
                  {selectedSupervisor || user?.name}
                </span>
              </div>
            )}

            {/* Shift History Button */}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowHistoryModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontWeight: 700 }}
            >
              <History size={16} color="var(--teal)" />
              <span>{isArabic ? 'سجل الورديات السابقة' : 'Shift History'}</span>
            </button>

            <button
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
              onClick={() => setModal({ type: 'add' })}
            >
              <Plus size={16} />
              <span>{isArabic ? 'إضافة مشغل لطاقمي' : 'Add New Operator'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Summary Metrics Bar ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        {/* Total Crew Card */}
        <div style={{
          background: 'var(--white)',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid var(--gray-200)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: 'rgba(35, 63, 121, 0.1)',
            color: 'var(--navy)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600 }}>
              {isArabic ? 'إجمالي طاقم المشرف' : 'Total Crew Members'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy)' }}>
              {currentSupervisorOperators.length} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--gray-500)' }}>{isArabic ? 'مشغل' : 'operators'}</span>
            </div>
          </div>
        </div>

        {/* Assigned Operators Card */}
        <div style={{
          background: 'var(--white)',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid var(--gray-200)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600 }}>
              {isArabic ? 'المشغلون المعينون على المحطات' : 'Assigned to Workstations'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
              {assignedOperatorsCount} / {currentSupervisorOperators.length}
            </div>
          </div>
        </div>

        {/* Stations Covered Card */}
        <div style={{
          background: 'var(--white)',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid var(--gray-200)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: coveredStationsCount === STAGES.length ? 'rgba(0, 175, 170, 0.15)' : 'rgba(234, 179, 8, 0.15)',
            color: coveredStationsCount === STAGES.length ? 'var(--teal-dark)' : '#ca8a04',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600 }}>
              {isArabic ? 'المحطات المغطاة' : 'Workstations Covered'}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: coveredStationsCount === STAGES.length ? 'var(--teal-dark)' : 'var(--navy)' }}>
              {coveredStationsCount} / {STAGES.length}
              {coveredStationsCount === STAGES.length && (
                <span style={{ fontSize: '0.78rem', color: '#10b981', marginLeft: '8px', marginRight: '8px', fontWeight: 700 }}>
                  ✔ {isArabic ? 'مكتمل' : 'Full'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 1: INTERACTIVE WORKSTATION ASSIGNMENT BOARD ─── */}
      <div style={{
        background: 'var(--white)',
        borderRadius: '14px',
        border: '1px solid var(--gray-200)',
        boxShadow: 'var(--shadow-sm)',
        padding: '22px',
        marginBottom: '28px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--gray-200)',
          marginBottom: '20px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏭</span>
              <span>{isArabic ? 'توزيع خط الإنتاج والمحطات (إمكانية إضافة أكثر من مشغل لكل محطة)' : 'Production Line Workstations (Multi-Operator Assignment)'}</span>
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--gray-500)' }}>
              {isArabic
                ? 'يمكنك تعيين مشغل أو مشغلين أو أكثر لكل محطة حسب حاجة التشغيل. التعيين يظل ثابتاً ولا يتغير إلا عند تعديله من المشرف.'
                : 'Assign 1 or multiple operators per workstation. Assignments remain permanently sticky until modified by supervisor.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Shift Picker: ONLY Morning and Night */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)' }}>
                {isArabic ? 'الوردية:' : 'Shift:'}
              </span>
              <select
                className="form-select"
                style={{ padding: '6px 12px', fontSize: '0.85rem', fontWeight: 700, borderColor: 'var(--teal)' }}
                value={selectedShift}
                onChange={e => setSelectedShift(e.target.value)}
              >
                <option value="Morning">{isArabic ? '☀️ وردية صباحية' : '☀️ Morning Shift'}</option>
                <option value="Night">{isArabic ? '🌙 وردية ليلية' : '🌙 Night Shift'}</option>
              </select>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleResetStations}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '7px 12px' }}
            >
              <RotateCcw size={14} />
              <span>{isArabic ? 'تفريغ المحطات' : 'Clear Stations'}</span>
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveAssignments}
              disabled={isSavingAssignments}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 16px' }}
            >
              <Save size={15} />
              <span>{isSavingAssignments ? (isArabic ? 'جارِ الحفظ...' : 'Saving...') : (isArabic ? 'تثبيت وحفظ توزيع الوردية' : 'Save Shift Assignments')}</span>
            </button>
          </div>
        </div>

        {/* Grid of the 7 Production Stations */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px'
        }}>
          {STAGES.map(stage => {
            const assignedIds = stationAssignments[stage.id] || [];
            const assignedOps = assignedIds.map(id => operatorsMap[id]).filter(Boolean);
            const isCovered = assignedOps.length > 0;

            return (
              <div
                key={stage.id}
                style={{
                  background: isCovered ? 'rgba(0, 175, 170, 0.02)' : 'var(--gray-50)',
                  border: isCovered ? '1.5px solid var(--teal)' : '1px dashed var(--gray-300)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'all 0.2s ease',
                  minHeight: '210px'
                }}
              >
                {/* Station Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: stage.color,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 700
                    }}>
                      {stage.num}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--navy)' }}>
                        {isArabic ? stage.nameAr : stage.nameEn}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                        {isArabic ? stage.nameEn : stage.nameAr}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: assignedOps.length > 0 ? 'var(--teal-light)' : 'rgba(234, 179, 8, 0.15)',
                      color: assignedOps.length > 0 ? 'var(--teal-dark)' : '#ca8a04'
                    }}>
                      {assignedOps.length} {isArabic ? (assignedOps.length === 1 ? 'مشغل' : 'مشغلين') : (assignedOps.length === 1 ? 'operator' : 'operators')}
                    </span>
                    <span style={{ fontSize: '1.2rem' }}>{stage.icon}</span>
                  </div>
                </div>

                {/* Assigned Operators List (Supports 1, 2, or multiple operators per station) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  {assignedOps.length === 0 ? (
                    <div style={{
                      background: 'rgba(234, 179, 8, 0.08)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px dashed #eab308',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#854d0e',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      margin: 'auto 0'
                    }}>
                      <AlertCircle size={16} style={{ color: '#ca8a04' }} />
                      <span>{isArabic ? 'شاغرة - أضف مشغل أو أكثر' : 'Vacant - Assign 1 or more operators'}</span>
                    </div>
                  ) : (
                    assignedOps.map(op => (
                      <div
                        key={op.id}
                        style={{
                          background: 'var(--white)',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(0, 175, 170, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'var(--navy)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.78rem',
                            fontWeight: 700
                          }}>
                            {op.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--navy)' }}>
                              {op.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--teal-dark)', fontWeight: 600 }}>
                              ID: #{op.company_id}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveOperatorFromStation(stage.id, op.id)}
                          title={isArabic ? 'إزالة المشغل من هذه المحطة' : 'Remove operator from station'}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--gray-400)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '4px'
                          }}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Dropdown to add an operator to this station (shows unassigned operators only) */}
                <div style={{ marginTop: 'auto', paddingTop: '6px' }}>
                  <select
                    className="form-select"
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: unassignedOps.length === 0 ? 'var(--gray-100)' : 'var(--white)',
                      borderColor: unassignedOps.length === 0 ? 'var(--gray-300)' : 'var(--teal)',
                      color: unassignedOps.length === 0 ? 'var(--gray-500)' : 'var(--navy)',
                      cursor: unassignedOps.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                    value=""
                    disabled={unassignedOps.length === 0}
                    onChange={e => handleAddOperatorToStation(stage.id, e.target.value)}
                  >
                    <option value="">
                      {unassignedOps.length === 0
                        ? (isArabic ? '🔒 جميع المشغلين تم توزيعهم على المحطات' : '🔒 All operators assigned')
                        : (assignedOps.length === 0
                          ? (isArabic ? `◂ + تعيين مشغل للمحطة (${unassignedOps.length} متاح)...` : `◂ + Assign operator (${unassignedOps.length} available)...`)
                          : (isArabic ? `◂ + إضافة مشغل إضافي (${unassignedOps.length} متاح)...` : `◂ + Add another operator (${unassignedOps.length} available)...`))}
                    </option>
                    {unassignedOps.map(op => (
                      <option key={op.id} value={op.id}>
                        + {op.name} (#{op.company_id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── SECTION 2: SUPERVISOR'S CREW DIRECTORY (SIMPLIFIED) ─── */}
      <div style={{
        background: 'var(--white)',
        borderRadius: '14px',
        border: '1px solid var(--gray-200)',
        boxShadow: 'var(--shadow-sm)',
        padding: '22px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '18px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} style={{ color: 'var(--teal)' }} />
              <span>
                {isArabic
                  ? `أفراد الطاقم التابعين للمشرف (${selectedSupervisor || 'المشرف'})`
                  : `Crew Members under (${selectedSupervisor || 'Supervisor'})`}
              </span>
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--gray-500)' }}>
              {isArabic
                ? 'قائمة المشغلين المعتمدين والمحطة المعينين بها حالياً.'
                : 'List of registered operators and their currently assigned station.'}
            </p>
          </div>

          {/* Quick Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="search-wrap" style={{ maxWidth: '240px' }}>
              <Search className="search-icon" size={16} />
              <input
                type="text"
                className="search-input"
                placeholder={isArabic ? 'بحث بالاسم أو الرقم...' : 'Search crew...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <button
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 14px' }}
              onClick={() => setModal({ type: 'add' })}
            >
              <Plus size={15} />
              <span>{isArabic ? 'إضافة مشغل' : 'Add Operator'}</span>
            </button>
          </div>
        </div>

        {/* Simplified Crew Table: Only Name, Company ID, Current Assigned Station, Actions */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>{isArabic ? 'اسم المشغل' : 'Operator Name'}</th>
                <th>{isArabic ? 'الرقم الوظيفي' : 'Company ID'}</th>
                <th>{isArabic ? 'المحطة المعين بها حالياً' : 'Currently Assigned Station'}</th>
                <th style={{ width: '100px', textAlign: 'center' }}>{isArabic ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="table-empty">
                    <span className="spinner" style={{ borderColor: 'rgba(0,175,170,.2)', borderTopColor: 'var(--teal)' }} />
                  </td>
                </tr>
              ) : filteredOperators.length === 0 ? (
                <tr>
                  <td colSpan="5" className="table-empty">
                    <div style={{ padding: '30px', textAlign: 'center' }}>
                      <Users size={36} style={{ color: 'var(--gray-300)', marginBottom: '10px' }} />
                      <div style={{ fontWeight: 600, color: 'var(--gray-700)' }}>
                        {isArabic ? 'لا يوجد مشغلين مسجلين تحت هذا المشرف حتى الآن.' : 'No operators registered under this supervisor yet.'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOperators.map((op, idx) => {
                  const meta = parseOperatorTeam(op.team_name);
                  // Find all stations this operator is currently assigned to
                  const activeStationKeys = Object.keys(stationAssignments).filter(st => {
                    const list = stationAssignments[st] || [];
                    return list.includes(op.id);
                  });
                  const activeStationObjs = activeStationKeys.map(k => STAGES.find(s => s.id === k)).filter(Boolean);

                  return (
                    <tr key={op.id}>
                      <td style={{ color: 'var(--gray-400)', fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--navy)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 700
                          }}>
                            {op.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{op.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                              {meta.supervisor}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          background: 'var(--gray-100)',
                          padding: '3px 9px',
                          borderRadius: '5px',
                          color: 'var(--navy)',
                          fontSize: '0.88rem'
                        }}>
                          #{op.company_id}
                        </span>
                      </td>
                      <td>
                        {activeStationObjs.length > 0 ? (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {activeStationObjs.map(st => (
                              <span
                                key={st.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  background: 'var(--teal-light)',
                                  color: 'var(--teal-dark)',
                                  border: '1px solid rgba(0, 175, 170, 0.3)'
                                }}
                              >
                                <span>{st.icon}</span>
                                <span>{isArabic ? st.nameAr : st.nameEn}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.82rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                            {isArabic ? 'غير معين في محطة' : 'Not assigned to a station'}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="action-btns" style={{ justifyContent: 'center' }}>
                          <button
                            className="btn-icon btn-edit"
                            title={isArabic ? 'تعديل' : 'Edit'}
                            onClick={() => setModal({ type: 'edit', operator: op })}
                          >
                            <Edit2 size={15} />
                          </button>
                          {isAdmin && (
                            <button
                              className="btn-icon btn-delete"
                              title={isArabic ? 'حذف المشغل (للأدمن فقط)' : 'Delete Operator (Admin Only)'}
                              onClick={() => setModal({ type: 'delete', operator: op })}
                            >
                              <Trash2 size={15} />
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

      {/* ─── MODALS ─── */}
      {modal?.type === 'add' && (
        <OperatorModal
          mode="add"
          supervisors={supervisors}
          currentSupervisor={selectedSupervisor}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {modal?.type === 'edit' && (
        <OperatorModal
          mode="edit"
          initial={modal.operator}
          supervisors={supervisors}
          currentSupervisor={selectedSupervisor}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {isAdmin && modal?.type === 'delete' && (
        <DeleteOperatorModal
          operator={modal.operator}
          onClose={() => setModal(null)}
          onDeleted={handleDeleted}
        />
      )}

      {/* Shift History Modal */}
      <ShiftHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        historyRecords={historyRecords}
        operatorsMap={operatorsMap}
        isArabic={isArabic}
      />
    </div>
  );
}
