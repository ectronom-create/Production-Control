import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

// ─── Access options ───────────────────────────────────────────────────────────
const ACCESS_OPTIONS = ['admin', 'supervisor', 'operator', 'viewer'];

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

function parseTeamMeta(teamName) {
  if (!teamName) return { team: '', supervisor: '', station: '', status: 'active' };
  try {
    if (teamName.startsWith('{')) {
      const p = JSON.parse(teamName);
      return {
        team: p.team || '',
        supervisor: p.supervisor || '',
        station: p.station || '',
        status: p.status || 'active'
      };
    }
  } catch {}
  return { team: teamName, supervisor: '', station: '', status: 'active' };
}

// ─── Badge component ──────────────────────────────────────────────────────────
function AccessBadge({ access }) {
  const norm = access?.toLowerCase() || 'viewer';
  const cls =
    norm === 'admin'      ? 'badge badge-admin'      :
    norm === 'supervisor' ? 'badge badge-supervisor' :
    norm === 'operator'   ? 'badge badge-operator'   :
                            'badge badge-viewer';
  const label =
    norm === 'admin'      ? 'Admin' :
    norm === 'supervisor' ? 'Supervisor' :
    norm === 'operator'   ? 'Operator' :
                            'Viewer';
  return <span className={cls}>{label}</span>;
}

// ─── Empty form state ─────────────────────────────────────────────────────────
function emptyForm() {
  return { name: '', password: '', company_id: '', email: '', phone: '', access: 'supervisor', team_name: '' };
}

// ─── User Form Modal ──────────────────────────────────────────────────────────
function UserModal({ mode, initial, supervisors, onClose, onSaved }) {
  const { t, isArabic } = useLanguage();
  const isEdit = mode === 'edit';
  const [form,    setForm]    = useState(initial || emptyForm());
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // If operator, extract supervisor and station from JSON team_name
  const parsedMeta = parseTeamMeta(initial?.team_name);
  const [operatorSupervisor, setOperatorSupervisor] = useState(parsedMeta.supervisor || supervisors[0]?.name || '');
  const [operatorStation, setOperatorStation] = useState(parsedMeta.station || STAGES[0]);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) { setError(isArabic ? 'الاسم مطلوب.' : 'Name is required.'); return; }
    if (!isEdit && !form.password.trim() && form.access !== 'operator') {
      setError(isArabic ? 'كلمة المرور مطلوبة.' : 'Password is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form };
      if (form.access === 'operator') {
        payload.team_name = JSON.stringify({
          supervisor: operatorSupervisor || supervisors[0]?.name || 'Supervisor',
          station: operatorStation,
          status: 'active'
        });
        if (!payload.password) {
          payload.password = payload.company_id || '1234';
        }
      }

      let savedUser;
      if (isEdit) {
        const { data, error: err } = await supabase
          .from('users')
          .update(payload)
          .eq('id', initial.id)
          .select();
        if (err) throw err;
        savedUser = data?.[0] || { ...initial, ...payload };
      } else {
        const { data, error: err } = await supabase
          .from('users')
          .insert([payload])
          .select();
        if (err) throw err;
        savedUser = data?.[0] || { ...payload, id: Date.now() };
      }
      onSaved(savedUser, isEdit);
    } catch (err) {
      setError(err?.message || (isArabic ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'An error occurred. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">
            {isEdit ? (isArabic ? 'تعديل المستخدم' : 'Edit User') : (isArabic ? 'إضافة مستخدم جديد' : 'Add User')}
          </span>
          <button className="modal-close" onClick={onClose} disabled={loading}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

            <div className="form-group">
              <label>{t('name')} *</label>
              <input
                type="text"
                placeholder={isArabic ? 'الاسم بالكامل' : 'Full name'}
                value={form.name}
                onChange={set('name')}
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>{isEdit ? (isArabic ? 'كلمة مرور جديدة' : 'New Password') : (isArabic ? 'كلمة المرور *' : 'Password *')}</label>
              <input
                type="password"
                placeholder={isEdit ? (isArabic ? 'اتركه فارغاً للحفاظ على كلمة المرور الحالية' : 'Leave blank to keep current password') : (isArabic ? 'تعيين كلمة مرور' : 'Set a password')}
                value={form.password}
                onChange={set('password')}
                disabled={loading}
              />
              {isEdit && <p className="hint">{isArabic ? 'اتركه فارغاً للحفاظ على كلمة المرور الحالية.' : 'Leave blank to keep the existing password.'}</p>}
            </div>

            <div className="form-group">
              <label>{t('companyId')}</label>
              <input
                type="text"
                placeholder="e.g. ECTRON-001"
                value={form.company_id}
                onChange={set('company_id')}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>{t('email')}</label>
              <input
                type="email"
                placeholder="user@ectron.com"
                value={form.email}
                onChange={set('email')}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>{t('phone')}</label>
              <input
                type="tel"
                placeholder="+968 xxxx xxxx"
                value={form.phone}
                onChange={set('phone')}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>{t('accessLevel')}</label>
              <select
                className="form-select"
                value={form.access}
                onChange={set('access')}
                disabled={loading}
              >
                {ACCESS_OPTIONS.map(a => (
                  <option key={a} value={a}>
                    {isArabic 
                      ? (a === 'admin' ? 'مدير (Admin)' : a === 'supervisor' ? 'مشرف (Supervisor)' : a === 'operator' ? 'مشغل خط (Operator)' : 'مشاهد (Viewer)')
                      : (a.charAt(0).toUpperCase() + a.slice(1))}
                  </option>
                ))}
              </select>
            </div>

            {form.access === 'operator' ? (
              <>
                <div className="form-group">
                  <label>{isArabic ? 'المشرف المسؤول *' : 'Responsible Supervisor *'}</label>
                  <select
                    className="form-select"
                    value={operatorSupervisor}
                    onChange={e => setOperatorSupervisor(e.target.value)}
                    disabled={loading}
                  >
                    {supervisors.map(s => (
                      <option key={s.id || s.name} value={s.name}>
                        {s.name} {s.team_name ? `(${s.team_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{isArabic ? 'المحطة الأساسية / المهارة' : 'Primary Station'}</label>
                  <select
                    className="form-select"
                    value={operatorStation}
                    onChange={e => setOperatorStation(e.target.value)}
                    disabled={loading}
                  >
                    {STAGES.map((st, idx) => (
                      <option key={st} value={st}>
                        {idx + 1}. {st}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div className="form-group">
                <label>{t('team')}</label>
                <input
                  type="text"
                  placeholder="e.g. Group w, Team Alpha, Shift A"
                  value={form.team_name || ''}
                  onChange={set('team_name')}
                  disabled={loading}
                />
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : isEdit ? t('saveChanges') : (isArabic ? 'إضافة المستخدم' : 'Add User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ user, onClose, onDeleted }) {
  const { user: currentUser } = useAuth();
  const { t, isArabic } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleDelete() {
    if (currentUser?.access !== 'admin') {
      setError(isArabic ? 'صلاحية الحذف مقتصرة على الأدمن فقط.' : 'Delete permission is restricted to admin only.');
      return;
    }
    setLoading(true);
    try {
      await supabase.from('users').delete().eq('id', user.id);
      onDeleted(user.id);
    } catch (err) {
      setError(err?.message || (isArabic ? 'تعذر حذف المستخدم.' : 'Could not delete user.'));
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <div className="modal-header">
          <span className="modal-title">{isArabic ? 'حذف المستخدم' : 'Delete User'}</span>
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
              <>حذف المستخدم <span className="confirm-name">"{user.name}"</span>؟<br />لا يمكن التراجع عن هذا الإجراء.</>
            ) : (
              <>Delete user <span className="confirm-name">"{user.name}"</span>?<br />This action cannot be undone.</>
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

// ─── Main Users Page ──────────────────────────────────────────────────────────
export default function Users() {
  const { user: currentUser } = useAuth();
  const { t, isArabic } = useLanguage();
  const isViewer = currentUser?.access === 'viewer';
  const isAdmin = currentUser?.access === 'admin';

  const [users,   setUsers]   = useState([]);
  const [search,  setSearch]  = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null); // null | { type: 'add'|'edit'|'delete', user? }

  const supervisorsList = users.filter(u => u.access === 'supervisor');

  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'all' && u.access !== roleFilter) return false;
    return true;
  });

  const fetchUsers = useCallback(async (q = '') => {
    setLoading(true);
    try {
      let query = supabase.from('users').select('*').order('name');
      if (q && q.trim()) {
        query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,team_name.ilike.%${q}%`);
      }
      const { data, error } = await query;
      if (data && data.length > 0) {
        setUsers(data);
      } else {
        setUsers([
          { id: 1, name: 'Admin', access: 'admin', team_name: 'Management', email: 'admin@ectron.com', company_id: 'ECTRON-001' }
        ]);
      }
    } catch {
      setUsers([
        { id: 1, name: 'Admin', access: 'admin', team_name: 'Management', email: 'admin@ectron.com', company_id: 'ECTRON-001' }
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchUsers]);

  function onSaved(saved, isEdit) {
    if (isEdit) {
      setUsers(u => u.map(x => x.id === saved.id ? saved : x));
    } else {
      setUsers(u => [...u, saved]);
    }
    setModal(null);
  }

  function onDeleted(id) {
    setUsers(u => u.filter(x => x.id !== id));
    setModal(null);
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">{t('usersTitle')}</h1>
        <p className="page-subtitle">{t('usersSubtitle')}</p>
      </div>

      {/* Toolbar */}
      <div className="users-toolbar" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div className="search-wrap">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="search-input"
              type="text"
              placeholder={t('searchUsers')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Quick Role Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--gray-100)', padding: '3px', borderRadius: '8px' }}>
            {[
              { id: 'all', label: isArabic ? 'الكل' : 'All' },
              { id: 'supervisor', label: isArabic ? 'المشرفين' : 'Supervisors' },
              { id: 'operator', label: isArabic ? 'مشغلي الخط' : 'Operators' },
              { id: 'admin', label: isArabic ? 'المدراء' : 'Admins' },
              { id: 'viewer', label: isArabic ? 'المشاهدين' : 'Viewers' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id)}
                style={{
                  border: 'none',
                  background: roleFilter === tab.id ? 'var(--white)' : 'transparent',
                  color: roleFilter === tab.id ? 'var(--navy)' : 'var(--gray-600)',
                  fontWeight: roleFilter === tab.id ? 700 : 500,
                  fontSize: '0.78rem',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: roleFilter === tab.id ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {!isViewer && (
          <button className="btn-primary" onClick={() => setModal({ type: 'add' })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('addNewUser')}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('name')}</th>
                <th>{isArabic ? 'الفريق / المشرف المسؤول' : 'Team / Responsible Supervisor'}</th>
                <th>{t('companyId')}</th>
                <th>{t('email')}</th>
                <th>{t('phone')}</th>
                <th>{t('accessLevel')}</th>
                <th style={{ width: 80, textAlign: 'center' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    <span className="spinner" style={{ borderColor: 'rgba(18,168,157,.2)', borderTopColor: 'var(--teal)' }} />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    {search ? (isArabic ? `لا يوجد مستخدمون يطابقون "${search}".` : `No users match "${search}".`) : (isArabic ? 'لم يتم العثور على مستخدمين.' : 'No users found.')}
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{u.name}</td>
                    <td>
                      {u.access === 'operator' ? (
                        (() => {
                          const meta = parseTeamMeta(u.team_name);
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.8rem' }}>
                              <span style={{ color: 'var(--navy)', fontWeight: 700 }}>
                                👨‍💼 {meta.supervisor || '—'}
                              </span>
                              {meta.station && (
                                <span style={{ color: 'var(--teal-dark)', fontWeight: 600, fontSize: '0.75rem' }}>
                                  🏭 {meta.station}
                                </span>
                              )}
                            </div>
                          );
                        })()
                      ) : u.team_name ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, fontSize: '0.78rem', background: 'var(--teal-light)', color: 'var(--teal-dark)', fontWeight: 600 }}>
                          👥 {u.team_name}
                        </span>
                      ) : '—'}
                    </td>
                    <td>{u.company_id || '—'}</td>
                    <td>{u.email || '—'}</td>
                    <td>{u.phone || '—'}</td>
                    <td><AccessBadge access={u.access} /></td>
                    <td>
                      {!isViewer ? (
                        <div className="action-btns" style={{ justifyContent: 'center' }}>
                          <button
                            className="btn-icon btn-edit"
                            title={t('edit')}
                            onClick={() => setModal({ type: 'edit', user: { ...u, password: '' } })}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          {isAdmin && (
                            <button
                              className="btn-icon btn-delete"
                              title={isArabic ? 'حذف المستخدم (للأدمن فقط)' : 'Delete User (Admin only)'}
                              onClick={() => setModal({ type: 'delete', user: u })}
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
        {!loading && filteredUsers.length > 0 && (
          <div className="table-count">
            {isArabic 
              ? `${filteredUsers.length} مستخدم ${search ? `مطابق لـ "${search}"` : 'مسجل'}`
              : `${filteredUsers.length} ${filteredUsers.length === 1 ? 'user' : 'users'}${search ? ` matching "${search}"` : ' total'}`}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'add' && (
        <UserModal
          mode="add"
          supervisors={supervisorsList}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
      {modal?.type === 'edit' && (
        <UserModal
          mode="edit"
          initial={modal.user}
          supervisors={supervisorsList}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
      {isAdmin && modal?.type === 'delete' && (
        <DeleteModal
          user={modal.user}
          onClose={() => setModal(null)}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}
