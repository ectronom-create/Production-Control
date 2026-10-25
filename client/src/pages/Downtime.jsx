import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { printReportDocument } from '../utils/printReport';

const STAGES = [
  'Assembly',
  'Insulation',
  'RF',
  'Calibration',
  'Multin test',
  'Perso',
  'Packaging',
  'Firmware update'
];

const getStorageKey = (userName) => `ectron_live_downtime_${userName || 'default'}`;
const LOCAL_STOPPAGES_KEY = 'ectron_downtime_local_records';

function formatMinutes(minutes) {
  if (minutes == null || isNaN(minutes)) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLocalDate(d) {
  if (!d) return getTodayString();
  const now = new Date(d);
  if (isNaN(now.getTime())) return getTodayString();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentTimeString(dateObj = new Date()) {
  const now = new Date(dateObj);
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function computeDurationMinutes(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  let s = sh * 60 + sm;
  let e = eh * 60 + em;
  if (e < s) e += 24 * 60;
  return e - s;
}

// ─── Downtime Report Modal (Prominently shows Name of User) ───────────────────
function DowntimeReportModal({ records, selectedDate, selectedStage, selectedUser, currentUser, onClose }) {
  const { t, isArabic } = useLanguage();
  const totalMinutes = records.reduce((acc, curr) => acc + (curr.total_minutes || 0), 0);

  // Breakdown by stage
  const stageBreakdown = STAGES.map(stageName => {
    const stageRecords = records.filter(r => r.stage === stageName);
    const mins = stageRecords.reduce((acc, curr) => acc + (curr.total_minutes || 0), 0);
    const count = stageRecords.length;
    return { stage: stageName, mins, count };
  }).filter(s => s.count > 0);

  function handlePrint() {
    printReportDocument('report-printable-area');
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal report-modal">
        <div className="modal-header">
          <span className="modal-title">{t('reportPreview')}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Printable Document Area */}
        <div id="report-printable-area" className="report-document">
          {/* Header */}
          <div className="report-doc-header">
            <div className="report-logo-box">
              <img src="/ectron-logo.png" alt="ECTRON" className="report-logo-img" />
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600 }}>
                {isArabic ? 'نظام إلكترون لمتابعة الإنتاج' : 'ECTRON PRODUCTION CONTROL SYSTEM'}
              </div>
            </div>
            <div className="report-title-box">
              <h1 className="report-main-title">{isArabic ? 'تقرير أوقات التوقف' : 'Downtime Report'}</h1>
              <div className="report-subtitle">{t('reportSubtitle')}</div>
            </div>
          </div>

          {/* Metadata Grid with User Name prominently displayed */}
          <div className="report-meta-grid">
            <div className="report-meta-item">
              <span className="report-meta-label">{t('preparedBy')}</span>
              <span className="report-meta-value user-highlight">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--teal)' }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {currentUser?.name || 'Admin'}
              </span>
            </div>

            <div className="report-meta-item">
              <span className="report-meta-label">{t('companyId')}</span>
              <span className="report-meta-value">{currentUser?.company_id || 'ECTRON-001'}</span>
            </div>

            <div className="report-meta-item">
              <span className="report-meta-label">{isArabic ? 'فترة التقرير' : 'Report Period'}</span>
              <span className="report-meta-value">{selectedDate || (isArabic ? 'جميع التواريخ المسجلة' : 'All Recorded Dates')}</span>
            </div>

            <div className="report-meta-item">
              <span className="report-meta-label">{isArabic ? 'تصفية المرحلة' : 'Stage Filter'}</span>
              <span className="report-meta-value">{selectedStage || t('allStages')}</span>
            </div>

            <div className="report-meta-item">
              <span className="report-meta-label">{isArabic ? 'إجمالي الحوادث' : 'Total Incidents'}</span>
              <span className="report-meta-value">{records.length} {isArabic ? 'حادثة' : (records.length === 1 ? 'event' : 'events')}</span>
            </div>

            <div className="report-meta-item">
              <span className="report-meta-label">{t('totalDowntimeRecorded')}</span>
              <span className="report-meta-value" style={{ color: 'var(--teal-dark)' }}>
                {formatMinutes(totalMinutes)}
              </span>
            </div>
          </div>

          {/* Stage Breakdown Summary */}
          {stageBreakdown.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div className="report-section-title">{isArabic ? 'ملخص حسب مرحلة الإنتاج' : 'Summary by Production Stage'}</div>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t('stage')}</th>
                    <th style={{ textAlign: 'center' }}>{isArabic ? 'الحوادث' : 'Incidents'}</th>
                    <th style={{ textAlign: 'right' }}>{t('totalTime')}</th>
                    <th style={{ textAlign: 'right' }}>{isArabic ? 'النسبة' : 'Percentage'}</th>
                  </tr>
                </thead>
                <tbody>
                  {stageBreakdown.map(s => (
                    <tr key={s.stage}>
                      <td style={{ fontWeight: 600 }}>{s.stage}</td>
                      <td style={{ textAlign: 'center' }}>{s.count}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMinutes(s.mins)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {totalMinutes > 0 ? `${Math.round((s.mins / totalMinutes) * 100)}%` : '0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Detailed Log Table */}
          <div className="report-section-title">{isArabic ? 'سجل تفاصيل حوادث التوقف' : 'Detailed Downtime Events Log'}</div>
          {records.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
              {isArabic ? 'لا توجد سجلات توقف مطابقة للمعايير المحددة.' : 'No downtime records found for the selected criteria.'}
            </div>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ width: 35 }}>#</th>
                  <th>{t('date')}</th>
                  <th>{t('user')}</th>
                  <th>{t('stage')}</th>
                  <th>{t('startTime')}</th>
                  <th>{t('endTime')}</th>
                  <th style={{ textAlign: 'right' }}>{t('duration')}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.id || i}>
                    <td>{i + 1}</td>
                    <td>{r.date}</td>
                    <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{r.user_name}</td>
                    <td>{r.stage}</td>
                    <td>{r.start_time}</td>
                    <td>{r.end_time}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--teal-dark)' }}>
                      {formatMinutes(r.total_minutes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Official Sign-Off Block */}
          <div className="report-sign-block">
            <div className="sign-line">
              <span className="sign-line-title">{t('preparedBy')}</span>
              <div className="sign-line-placeholder">
                {currentUser?.name || 'Admin'}
              </div>
            </div>

            <div className="sign-line">
              <span className="sign-line-title">{t('supervisorSign')}</span>
              <div className="sign-line-placeholder"></div>
            </div>

            <div className="sign-line">
              <span className="sign-line-title">{t('dateAndVerification')}</span>
              <div className="sign-line-placeholder">
                {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('close')}
          </button>
          <button type="button" className="btn-primary" onClick={handlePrint} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>{t('printOrPdf')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Manual / Edit Downtime Modal ─────────────────────────────────────────────
function DowntimeModal({ mode, initial, users, currentUserName, onClose, onSaved }) {
  const { t, isArabic } = useLanguage();
  const isEdit = mode === 'edit';
  const [user_name, setUserName] = useState(initial?.user_name || currentUserName || 'Admin');
  const [stage, setStage] = useState(initial?.stage || STAGES[0]);
  const [date, setDate] = useState(initial?.date || getTodayString());
  const [start_time, setStartTime] = useState(initial?.start_time || getCurrentTimeString());
  const [end_time, setEndTime] = useState(initial?.end_time || getCurrentTimeString());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const durationMins = computeDurationMinutes(start_time, end_time);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!stage || !date || !start_time || !end_time) {
      setError(isArabic ? 'يرجى ملء جميع الحقول المطلوبة.' : 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const durationMins = computeDurationMinutes(start_time, end_time);
      const payload = {
        id: isEdit ? initial.id : Date.now(),
        user_name,
        stage,
        date,
        start_time,
        end_time,
        total_minutes: durationMins
      };

      try {
        if (isEdit) {
          await supabase.from('stoppages').update({
            stage_id: stage,
            supervisor_id: user_name,
            notes: `${date} ${start_time} - ${end_time}`
          }).eq('id', initial.id);
        } else {
          await supabase.from('stoppages').insert([{
            stage_id: stage,
            supervisor_id: user_name,
            stopped_at: new Date(`${date}T${start_time}:00`).toISOString(),
            resumed_at: new Date(`${date}T${end_time}:00`).toISOString(),
            notes: `Downtime: ${durationMins}m`
          }]);
        }
      } catch (e) {
        console.warn('Supabase stoppage sync:', e);
      }

      onSaved(payload, isEdit);
    } catch (err) {
      setError(err?.message || (isArabic ? 'فشل حفظ سجل التوقف.' : 'Failed to save downtime record.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">
            {isEdit ? (isArabic ? 'تعديل سجل التوقف' : 'Edit Downtime Record') : (isArabic ? 'إدخال يدوي للتوقف' : 'Manual Downtime Entry')}
          </span>
          <button className="modal-close" onClick={onClose} disabled={loading}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

            <div className="form-group">
              <label>{t('user')} *</label>
              <select
                className="form-select"
                value={user_name}
                onChange={e => setUserName(e.target.value)}
                disabled={loading}
              >
                {users.length > 0 ? (
                  users.map(u => (
                    <option key={u.id || u.name} value={u.name}>
                      {u.name} {u.company_id ? `(${u.company_id})` : ''}
                    </option>
                  ))
                ) : (
                  <option value={currentUserName || 'Admin'}>{currentUserName || 'Admin'}</option>
                )}
              </select>
            </div>

            <div className="form-group">
              <label>{t('stage')} *</label>
              <select
                className="form-select"
                value={stage}
                onChange={e => setStage(e.target.value)}
                disabled={loading}
              >
                {STAGES.map((s, idx) => (
                  <option key={s} value={s}>{idx + 1}. {s}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{t('date')} *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>{t('startTime')} *</label>
                <input
                  type="time"
                  value={start_time}
                  onChange={e => setStartTime(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('endTime')} *</label>
                <input
                  type="time"
                  value={end_time}
                  onChange={e => setEndTime(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div style={{
              background: 'var(--teal-light)',
              padding: '12px 14px',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: 'var(--navy)'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{isArabic ? 'المدة المحسوبة:' : 'Calculated Duration:'}</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--teal-dark)' }}>
                {formatMinutes(durationMins)}
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : isEdit ? t('saveChanges') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ record, onClose, onDeleted }) {
  const { user } = useAuth();
  const { t, isArabic } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    if (user?.access !== 'admin') {
      setError(isArabic ? 'صلاحية الحذف مقتصرة على الأدمن فقط.' : 'Delete permission is restricted to admin only.');
      return;
    }
    setLoading(true);
    try {
      await supabase.from('stoppages').delete().eq('id', record.id);
      onDeleted(record.id);
    } catch (err) {
      setError(err?.message || (isArabic ? 'تعذر حذف السجل.' : 'Could not delete record.'));
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <div className="modal-header">
          <span className="modal-title">{isArabic ? 'حذف السجل' : 'Delete Record'}</span>
          <button className="modal-close" onClick={onClose} disabled={loading}>×</button>
        </div>

        <div className="modal-body" style={{ alignItems: 'center', textAlign: 'center', gap: 12 }}>
          <div className="confirm-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
          </div>
          <p className="confirm-msg">
            {isArabic ? (
              <>هل أنت متأكد من حذف سجل التوقف لمرحلة <span className="confirm-name">{record.stage}</span> بتاريخ {record.date}؟</>
            ) : (
              <>Delete downtime record for <span className="confirm-name">{record.stage}</span> on {record.date}?</>
            )}
          </p>
          {error && <div className="modal-error" style={{ width: '100%' }}>{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>{t('cancel')}</button>
          <button className="btn-danger" onClick={handleDelete} disabled={loading}>
            {loading ? <span className="spinner" style={{ borderTopColor: 'white' }} /> : t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Downtime Page ───────────────────────────────────────────────────────
export default function Downtime() {
  const { user } = useAuth();
  const { t, isArabic } = useLanguage();
  const isViewer = user?.access === 'viewer';
  const isAdmin = user?.access === 'admin';

  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { type: 'add'|'edit'|'delete'|'report', record? }
  const [toast, setToast] = useState('');

  // ─── Easy Live Recording State ──────────────────────────────────────────────
  const [selectedPillStage, setSelectedPillStage] = useState(STAGES[0]);
  const [activeSession, setActiveSession] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSavingLive, setIsSavingLive] = useState(false);

  // Sync active live stoppage scoped to the current user (across browsers & devices)
  useEffect(() => {
    const currentUserName = user?.name;
    if (!currentUserName) return;

    const userStorageKey = getStorageKey(currentUserName);

    // 1. Immediately hydrate from user-scoped localStorage if available
    try {
      const stored = localStorage.getItem(userStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.startTimestamp) {
          setActiveSession(parsed);
        }
      }
    } catch {}

    // 2. Query Supabase for any active live stoppage (resumed_at IS NULL) for this specific user
    supabase.from('stoppages')
      .select('*')
      .is('resumed_at', null)
      .eq('supervisor_id', currentUserName)
      .order('id', { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const row = data[0];
          const startMs = new Date(row.stopped_at).getTime();
          const restored = {
            id: row.id,
            stage: row.stage_id || STAGES[0],
            user_name: row.supervisor_id || currentUserName,
            startTimestamp: startMs,
            date: row.stopped_at ? row.stopped_at.split('T')[0] : getTodayString(),
            start_time: new Date(row.stopped_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          };
          setActiveSession(restored);
          localStorage.setItem(userStorageKey, JSON.stringify(restored));
        } else if (!error && (!data || data.length === 0)) {
          // If no active stoppage exists on Supabase for this user, clear local session
          setActiveSession(null);
          localStorage.removeItem(userStorageKey);
        }
      })
      .catch((err) => {
        console.warn('Sync live downtime from Supabase error:', err);
      });
  }, [user?.name]);

  // ─── Live Timer Ticker (Display only) ───────────────────────────────────────
  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((Date.now() - activeSession.startTimestamp) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Fetch users
  useEffect(() => {
    supabase.from('users').select('*')
      .then(res => setUsers(res.data || []))
      .catch(() => {});
  }, []);

  // Fetch downtime records
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('stoppages').select('*').order('stopped_at', { ascending: false });
      
      let cloudList = (data || []).map(s => {
        const start = s.stopped_at ? new Date(s.stopped_at) : new Date();
        const end = s.resumed_at ? new Date(s.resumed_at) : new Date();
        const dateStr = formatLocalDate(start);
        const startTimeStr = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
        const endTimeStr = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
        const diffMins = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
        return {
          id: s.id,
          user_name: s.supervisor_id || 'Supervisor',
          stage: s.stage_id,
          date: dateStr,
          start_time: startTimeStr,
          end_time: endTimeStr,
          total_minutes: diffMins,
          notes: s.notes || ''
        };
      });

      // Merge local fallback records (ensures zero data loss)
      let localList = [];
      try {
        localList = JSON.parse(localStorage.getItem(LOCAL_STOPPAGES_KEY) || '[]');
      } catch {}

      const cloudKeys = new Set(cloudList.map(r => `${r.stage}_${r.date}_${r.start_time}`));
      const unsynced = localList.filter(l => !cloudKeys.has(`${l.stage}_${l.date}_${l.start_time}`));

      let list = [...unsynced, ...cloudList];

      if (selectedDate) list = list.filter(r => r.date === selectedDate);
      if (selectedStage) list = list.filter(r => r.stage === selectedStage);
      if (selectedUser) list = list.filter(r => r.user_name === selectedUser);
      setRecords(list);
    } catch (e) {
      console.warn('fetchRecords error:', e);
      let localList = [];
      try {
        localList = JSON.parse(localStorage.getItem(LOCAL_STOPPAGES_KEY) || '[]');
      } catch {}
      if (selectedDate) localList = localList.filter(r => r.date === selectedDate);
      if (selectedStage) localList = localList.filter(r => r.stage === selectedStage);
      if (selectedUser) localList = localList.filter(r => r.user_name === selectedUser);
      setRecords(localList);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedStage, selectedUser]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Total downtime in selected day
  const totalMinutesInDay = records.reduce((acc, curr) => acc + (curr.total_minutes || 0), 0);

  // ─── Start Live Downtime ────────────────────────────────────────────────────
  async function handleStartLiveDowntime() {
    const now = new Date();
    const session = {
      stage: selectedPillStage,
      user_name: user?.name || 'Admin',
      date: getTodayString(),
      start_time: getCurrentTimeString(now),
      startTimestamp: now.getTime()
    };

    try {
      const { data, error } = await supabase.from('stoppages').insert([{
        stage_id: selectedPillStage,
        supervisor_id: user?.name || 'Supervisor',
        stopped_at: now.toISOString(),
        resumed_at: null,
        notes: 'LIVE_ACTIVE'
      }]).select();

      if (!error && data && data[0]?.id) {
        session.id = data[0].id;
      }
    } catch (e) {
      console.warn('Could not register active live stoppage in Supabase:', e);
    }

    localStorage.setItem(getStorageKey(user?.name), JSON.stringify(session));
    setActiveSession(session);
    showToast(`Downtime recording started for "${selectedPillStage}"`);
  }

  // ─── Stop & Save Live Downtime ──────────────────────────────────────────────
  async function handleStopAndSaveLiveDowntime() {
    if (!activeSession) return;
    setIsSavingLive(true);

    try {
      const now = new Date();
      let end_time = getCurrentTimeString(now);

      const computedElapsedSecs = Math.max(elapsedSeconds, Math.floor((now.getTime() - activeSession.startTimestamp) / 1000));

      if (end_time === activeSession.start_time && computedElapsedSecs >= 30) {
        const nextMin = new Date(now.getTime() + 60000);
        end_time = getCurrentTimeString(nextMin);
      }

      const durationMins = Math.max(1, Math.ceil(computedElapsedSecs / 60));
      const payload = {
        id: activeSession.id || Date.now(),
        user_name: activeSession.user_name || user?.name || 'Supervisor',
        stage: activeSession.stage,
        date: activeSession.date || formatLocalDate(now),
        start_time: activeSession.start_time,
        end_time: end_time,
        total_minutes: durationMins,
        notes: `Live session: ${durationMins}m`
      };

      try {
        if (activeSession.id) {
          const { error } = await supabase.from('stoppages').update({
            resumed_at: now.toISOString(),
            notes: `Live session: ${durationMins}m`
          }).eq('id', activeSession.id);

          if (error) {
            console.warn('Supabase update returned error, trying fallback insert:', error);
            await supabase.from('stoppages').insert([{
              stage_id: activeSession.stage,
              supervisor_id: activeSession.user_name,
              stopped_at: new Date(activeSession.startTimestamp).toISOString(),
              resumed_at: now.toISOString(),
              notes: `Live session: ${durationMins}m`
            }]);
          } else {
            payload.id = activeSession.id;
          }
        } else {
          const { data, error } = await supabase.from('stoppages').insert([{
            stage_id: activeSession.stage,
            supervisor_id: activeSession.user_name,
            stopped_at: new Date(activeSession.startTimestamp).toISOString(),
            resumed_at: now.toISOString(),
            notes: `Live session: ${durationMins}m`
          }]).select();

          if (!error && data && data[0]?.id) {
            payload.id = data[0].id;
          }
        }
      } catch (e) {
        console.warn('Supabase live save network error:', e);
      }

      // Always save to persistent local cache so record is never lost
      try {
        const storedList = JSON.parse(localStorage.getItem(LOCAL_STOPPAGES_KEY) || '[]');
        storedList.unshift(payload);
        localStorage.setItem(LOCAL_STOPPAGES_KEY, JSON.stringify(storedList.slice(0, 100)));
      } catch {}

      localStorage.removeItem(getStorageKey(user?.name));
      setActiveSession(null);
      setElapsedSeconds(0);
      showToast(`Saved downtime for "${payload.stage}" (${durationMins}m, ${payload.start_time} - ${payload.end_time})!`);
      await fetchRecords();
    } catch (err) {
      console.error('Error saving downtime:', err);
      alert(err?.message || 'Error saving downtime record.');
    } finally {
      setIsSavingLive(false);
    }
  }

  // ─── Cancel Live Session ────────────────────────────────────────────────────
  async function handleCancelLiveDowntime() {
    if (window.confirm('Cancel this recording without saving?')) {
      if (activeSession?.id) {
        try {
          await supabase.from('stoppages').delete().eq('id', activeSession.id);
        } catch (e) {
          console.warn('Could not delete canceled stoppage from Supabase:', e);
        }
      }
      localStorage.removeItem(getStorageKey(user?.name));
      setActiveSession(null);
      setElapsedSeconds(0);
      showToast('Recording cancelled.');
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  function onSaved() {
    setModal(null);
    fetchRecords();
    showToast('Record saved successfully.');
  }

  function onDeleted(id) {
    setRecords(prev => prev.filter(r => r.id !== id));
    setModal(null);
    fetchRecords();
    showToast('Record deleted.');
  }

  return (
    <div>
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
          <span style={{ color: 'var(--teal)' }}>✔</span>
          {toast}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">{t('downtimeTitle')}</h1>
        <p className="page-subtitle">{t('downtimeSubtitle')}</p>
      </div>

      {/* ─── VIEWER READ-ONLY NOTICE OR LIVE TRACKER ─── */}
      {isViewer ? (
        <div style={{
          background: 'var(--white)',
          border: '1.5px solid var(--gray-200)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <span className="badge badge-viewer" style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
            {isArabic ? 'وضع المشاهد' : 'Viewer Mode'}
          </span>
          <span style={{ fontSize: '0.875rem', color: 'var(--gray-700)' }}>
            {isArabic ? (
              <>مسجل الدخول كـ <strong>{user?.name}</strong> (للقراءة فقط). يمكنك استعراض سجلات التوقف وطباعة التقارير. تسجيل التوقفات متاح للمشرفين والمدراء فقط.</>
            ) : (
              <>Signed in as <strong>{user?.name}</strong> (Read-Only). You can view all downtime records and generate reports. Downtime recording is restricted to Supervisors and Admins.</>
            )}
          </span>
        </div>
      ) : (
        <div className={`tracker-card ${activeSession ? 'active' : ''}`}>
        <div className="tracker-header">
          <div className="tracker-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--teal)' }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{t('easyRecorder')}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
              {isArabic ? 'مسجل الدخول كـ: ' : 'Logged in as: '}<strong style={{ color: 'var(--navy)' }}>{user?.name || 'Admin'}</strong>
            </div>
          </div>
        </div>

        {!activeSession ? (
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '10px' }}>
              {t('selectStageToStart')}
            </div>

            <div className="stage-pills">
              {STAGES.map((s, idx) => (
                <button
                  key={s}
                  type="button"
                  className={`stage-pill ${selectedPillStage === s ? 'selected' : ''}`}
                  onClick={() => setSelectedPillStage(s)}
                >
                  <span className="stage-pill-num">{idx + 1}</span>
                  <span>{s}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-start-downtime"
                onClick={handleStartLiveDowntime}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>{isArabic ? `بدء التوقف (${selectedPillStage})` : `Start Downtime (${selectedPillStage})`}</span>
              </button>

              <span style={{ fontSize: '0.825rem', color: 'var(--gray-500)' }}>
                {isArabic ? 'اضغط للبدء الفوري في تشغيل عداد وقت التوقف.' : 'Click to start recording timer immediately.'}
              </span>
            </div>
          </div>
        ) : (
          <div className="tracker-running-box">
            <div className="tracker-running-info">
              <div className="live-pulse">
                <span className="pulse-dot" />
                <span>{t('recordingInProgress')}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <span style={{
                  background: 'var(--navy)',
                  color: 'var(--white)',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}>
                  {activeSession.stage}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                  {isArabic ? (
                    <>بدأ في الساعة <strong>{activeSession.start_time}</strong> بواسطة <strong style={{ color: 'var(--navy)' }}>{activeSession.user_name}</strong></>
                  ) : (
                    <>Started at <strong>{activeSession.start_time}</strong> by <strong style={{ color: 'var(--navy)' }}>{activeSession.user_name}</strong></>
                  )}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div className="stopwatch-display">
                {formatElapsed(elapsedSeconds)}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-stop-downtime"
                  onClick={handleStopAndSaveLiveDowntime}
                  disabled={isSavingLive}
                >
                  {isSavingLive ? (
                    <span className="spinner" />
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                      </svg>
                      <span>{t('stopAndSave')}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '12px 16px' }}
                  onClick={handleCancelLiveDowntime}
                  disabled={isSavingLive}
                  title={isArabic ? 'إلغاء دون حفظ' : 'Cancel without saving'}
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'var(--white)',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid var(--gray-200)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: 'rgba(0, 175, 170, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--teal)'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('totalDowntimeRecorded')} ({selectedDate || (isArabic ? 'جميع التواريخ' : 'All Dates')})
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy)', marginTop: '2px' }}>
              {formatMinutes(totalMinutesInDay)}
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--white)',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid var(--gray-200)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: 'rgba(35, 63, 121, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--navy)'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('recordsCount')}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy)', marginTop: '2px' }}>
              {records.length} {isArabic ? 'سجل' : (records.length === 1 ? 'event' : 'events')}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar / Filters + Report Button */}
      <div className="users-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <input
              type="date"
              className="search-input"
              style={{ padding: '8px 12px', minWidth: '150px' }}
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <select
              className="form-select"
              style={{ padding: '8px 32px 8px 12px', minWidth: '150px' }}
              value={selectedStage}
              onChange={e => setSelectedStage(e.target.value)}
            >
              <option value="">{t('allStages')}</option>
              {STAGES.map((s, idx) => (
                <option key={s} value={s}>{idx + 1}. {s}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <select
              className="form-select"
              style={{ padding: '8px 32px 8px 12px', minWidth: '140px' }}
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
            >
              <option value="">{t('allUsers')}</option>
              {users.map(u => (
                <option key={u.id || u.name} value={u.name}>{u.name}</option>
              ))}
            </select>
          </div>

          {selectedDate && (
            <button
              className="btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
              onClick={() => setSelectedDate('')}
            >
              {t('showAllDates')}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          {/* Report Button */}
          <button
            type="button"
            className="btn-primary"
            style={{ background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '7px' }}
            onClick={() => setModal({ type: 'report' })}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>{t('viewPrintReport')}</span>
          </button>

          {/* Manual Entry (hidden for Viewers) */}
          {!isViewer && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModal({ type: 'add' })}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>{t('manualEntry')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('date')}</th>
                <th>{t('user')}</th>
                <th>{t('stage')}</th>
                <th>{t('startTime')}</th>
                <th>{t('endTime')}</th>
                <th>{t('totalTime')}</th>
                <th style={{ width: 80, textAlign: 'center' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    <span className="spinner" style={{ borderColor: 'rgba(0,175,170,.2)', borderTopColor: 'var(--teal)' }} />
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    {isArabic ? (
                      selectedDate ? `لا توجد أوقات توقف مسجلة لتاريخ ${selectedDate}.` : 'لا توجد أوقات توقف مسجلة.'
                    ) : (
                      selectedDate ? `No downtime recorded for ${selectedDate}.` : 'No downtime recorded.'
                    )}
                  </td>
                </tr>
              ) : (
                records.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.date}</td>
                    <td style={{ fontWeight: 700, color: 'var(--navy)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        {r.user_name}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-user" style={{ background: 'rgba(35, 63, 121, 0.1)', color: 'var(--navy)' }}>
                        {r.stage}
                      </span>
                    </td>
                    <td>{r.start_time}</td>
                    <td>{r.end_time}</td>
                    <td>
                      <strong style={{ color: 'var(--teal-dark)' }}>
                        {formatMinutes(r.total_minutes)}
                      </strong>
                    </td>
                    <td>
                      {!isViewer ? (
                        <div className="action-btns" style={{ justifyContent: 'center' }}>
                          <button
                            className="btn-icon btn-edit"
                            title={t('edit')}
                            onClick={() => setModal({ type: 'edit', record: r })}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          {isAdmin && (
                            <button
                              className="btn-icon btn-delete"
                              title={isArabic ? 'حذف (للأدمن فقط)' : 'Delete (Admin only)'}
                              onClick={() => setModal({ type: 'delete', record: r })}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                          {isArabic ? 'للقراءة فقط' : 'Read only'}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && records.length > 0 && (
          <div className="table-count" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{records.length} {isArabic ? 'سجل' : (records.length === 1 ? 'record' : 'records')}</span>
            <span>
              {isArabic ? 'إجمالي الوقت في اليوم: ' : 'Total time in day: '}<strong style={{ color: 'var(--navy)', marginLeft: '4px' }}>{formatMinutes(totalMinutesInDay)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'report' && (
        <DowntimeReportModal
          records={records}
          selectedDate={selectedDate}
          selectedStage={selectedStage}
          selectedUser={selectedUser}
          currentUser={user}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'add' && (
        <DowntimeModal
          mode="add"
          users={users}
          currentUserName={user?.name}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}

      {modal?.type === 'edit' && (
        <DowntimeModal
          mode="edit"
          initial={modal.record}
          users={users}
          currentUserName={user?.name}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}

      {isAdmin && modal?.type === 'delete' && (
        <DeleteModal
          record={modal.record}
          onClose={() => setModal(null)}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}
