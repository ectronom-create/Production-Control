import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

// ─── Access options ───────────────────────────────────────────────────────────
const ACCESS_OPTIONS = ['admin', 'supervisor', 'viewer'];

// ─── Badge component ──────────────────────────────────────────────────────────
function AccessBadge({ access }) {
  const norm = access?.toLowerCase() || 'viewer';
  const cls =
    norm === 'admin'      ? 'badge badge-admin'      :
    norm === 'supervisor' ? 'badge badge-supervisor' :
                            'badge badge-viewer';
  return <span className={cls}>{norm}</span>;
}

// ─── Empty form state ─────────────────────────────────────────────────────────
function emptyForm() {
  return { name: '', password: '', company_id: '', email: '', phone: '', access: 'supervisor', team_name: '' };
}

// ─── User Form Modal ──────────────────────────────────────────────────────────
function UserModal({ mode, initial, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [form,    setForm]    = useState(initial || emptyForm());
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!isEdit && !form.password.trim()) { setError('Password is required.'); return; }

    setLoading(true);
    try {
      let savedUser;
      if (isEdit) {
        const { data, error: err } = await supabase
          .from('users')
          .update(form)
          .eq('id', initial.id)
          .select();
        savedUser = data?.[0] || { ...initial, ...form };
      } else {
        const { data, error: err } = await supabase
          .from('users')
          .insert([form])
          .select();
        savedUser = data?.[0] || { ...form, id: Date.now() };
      }
      onSaved(savedUser, isEdit);
    } catch (err) {
      setError(err?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit User' : 'Add User'}</span>
          <button className="modal-close" onClick={onClose} disabled={loading}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="modal-error">{error}</div>}

            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                placeholder="Full name"
                value={form.name}
                onChange={set('name')}
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>{isEdit ? 'New Password' : 'Password *'}</label>
              <input
                type="password"
                placeholder={isEdit ? 'Leave blank to keep current password' : 'Set a password'}
                value={form.password}
                onChange={set('password')}
                disabled={loading}
              />
              {isEdit && <p className="hint">Leave blank to keep the existing password.</p>}
            </div>

            <div className="form-group">
              <label>Company ID</label>
              <input
                type="text"
                placeholder="e.g. ECTRON-001"
                value={form.company_id}
                onChange={set('company_id')}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="user@ectron.com"
                value={form.email}
                onChange={set('email')}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                placeholder="+968 xxxx xxxx"
                value={form.phone}
                onChange={set('phone')}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Access Level</label>
              <select
                className="form-select"
                value={form.access}
                onChange={set('access')}
                disabled={loading}
              >
                {ACCESS_OPTIONS.map(a => (
                  <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Team Name</label>
              <input
                type="text"
                placeholder="e.g. Group w, Team Alpha, Shift A"
                value={form.team_name || ''}
                onChange={set('team_name')}
                disabled={loading}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : isEdit ? 'Save Changes' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ user, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleDelete() {
    setLoading(true);
    try {
      await supabase.from('users').delete().eq('id', user.id);
      onDeleted(user.id);
    } catch (err) {
      setError(err?.message || 'Could not delete user.');
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <div className="modal-header">
          <span className="modal-title">Delete User</span>
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
            Delete user <span className="confirm-name">"{user.name}"</span>?<br />
            This action cannot be undone.
          </p>
          {error && <div className="modal-error" style={{ width: '100%' }}>{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-danger" onClick={handleDelete} disabled={loading}>
            {loading ? <span className="spinner" style={{ borderTopColor: 'white' }} /> : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Users Page ──────────────────────────────────────────────────────────
export default function Users() {
  const { user: currentUser } = useAuth();
  const isViewer = currentUser?.access === 'viewer';

  const [users,   setUsers]   = useState([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null); // null | { type: 'add'|'edit'|'delete', user? }

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
        <h1 className="page-title">Users</h1>
        <p className="page-subtitle">Manage system users and access levels</p>
      </div>

      {/* Toolbar */}
      <div className="users-toolbar">
        <div className="search-wrap">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder="Search users…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {!isViewer && (
          <button className="btn-primary" onClick={() => setModal({ type: 'add' })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add User
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Team</th>
                <th>Company ID</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Access</th>
                <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    <span className="spinner" style={{ borderColor: 'rgba(18,168,157,.2)', borderTopColor: 'var(--teal)' }} />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    {search ? `No users match "${search}".` : 'No users found. Add one to get started.'}
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{u.name}</td>
                    <td>
                      {u.team_name ? (
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
                            title="Edit"
                            onClick={() => setModal({ type: 'edit', user: { ...u, password: '' } })}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className="btn-icon btn-delete"
                            title="Delete"
                            onClick={() => setModal({ type: 'delete', user: u })}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                          Read only
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && users.length > 0 && (
          <div className="table-count">
            {users.length} {users.length === 1 ? 'user' : 'users'}{search ? ` matching "${search}"` : ' total'}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'add' && (
        <UserModal
          mode="add"
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
      {modal?.type === 'edit' && (
        <UserModal
          mode="edit"
          initial={modal.user}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
      {modal?.type === 'delete' && (
        <DeleteModal
          user={modal.user}
          onClose={() => setModal(null)}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}
