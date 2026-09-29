import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Shield, UserCheck, Wrench, Eye, CheckCircle, XCircle, Edit, RefreshCw, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppContext } from '../../contexts/AppContext';
import { getAllProfiles, updateProfile } from '../../services/profileService';
import type { Profile, UserRole } from '../../types';
import { formatDate } from '../../utils/dateUtils';
import { toast } from 'sonner';

export default function UsersPage() {
  const { t, isArabic } = useLanguage();
  const { profile: currentProfile, refreshProfile } = useAppContext();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Editing modal state
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('viewer');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const isAdmin = currentProfile?.role === 'admin';

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllProfiles();
      setProfiles(data);
    } catch {
      toast.error(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleOpenEdit = (user: Profile) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setSelectedGroupId(user.group_id || '');
    setIsActive(user.is_active);
    setModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (editingUser.id === currentProfile?.id && !isActive) {
      toast.error(t('cannotDeactivateSelf'));
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProfile(editingUser.id, {
        role: selectedRole,
        group_id: selectedGroupId || null,
        is_active: isActive,
      });

      toast.success(t('userUpdated'));
      setModalOpen(false);
      setEditingUser(null);
      await loadUsers();

      // If updating currently logged in user, refresh context
      if (editingUser.id === currentProfile?.id || editingUser.email === currentProfile?.email) {
        await refreshProfile();
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || t('errorOccurred'));
    } finally {
      setSaving(false);
    }
  };

  // Filtered users
  const filteredUsers = profiles.filter((user) => {
    if (roleFilter && user.role !== roleFilter) return false;
    if (groupFilter) {
      if (groupFilter === 'none' && user.group_id) return false;
      if (groupFilter !== 'none' && user.group_id !== groupFilter) return false;
    }
    if (statusFilter) {
      const activeMatch = statusFilter === 'active';
      if (user.is_active !== activeMatch) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      const matchName = user.full_name?.toLowerCase().includes(s);
      const matchEmail = user.email?.toLowerCase().includes(s);
      const matchGroup = user.production_groups?.name.toLowerCase().includes(s);
      if (!matchName && !matchEmail && !matchGroup) return false;
    }
    return true;
  });

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield size={14} className="text-purple-400" />;
      case 'supervisor':
        return <UserCheck size={14} className="text-blue-400" />;
      case 'operator':
        return <Wrench size={14} className="text-amber-400" />;
      default:
        return <Eye size={14} className="text-slate-400" />;
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'supervisor':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'operator':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600/15 text-primary-500 border border-primary-500/20">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-industrial-900 dark:text-industrial-50">
              {t('userManagement')}
            </h1>
            <p className="text-sm text-industrial-500 dark:text-industrial-400 mt-0.5">
              {t('usersSubtitle')}
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={loadUsers} loading={loading}>
          <RefreshCw size={14} />
          {loading ? t('loading') : isArabic ? 'تحديث البيانات' : 'Refresh'}
        </Button>
      </div>

      {/* Role Access Clarity Banner (تفصيل الصلاحيات) */}
      <Card padding="md" className="border-industrial-200 dark:border-industrial-700 bg-industrial-50/50 dark:bg-industrial-900/40">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary-500/10 text-primary-500 shrink-0 mt-0.5">
            <Shield size={18} />
          </div>
          <div className="space-y-2 flex-1">
            <h2 className="text-sm font-semibold text-industrial-900 dark:text-industrial-100">
              {t('permissionsNotice')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-white dark:bg-industrial-800/80 border border-industrial-200 dark:border-industrial-700/60">
                <span className="font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 mb-1">
                  <Shield size={13} /> {t('admin')}
                </span>
                <p className="text-industrial-600 dark:text-industrial-300 leading-relaxed">
                  {t('adminFullAccess')}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-industrial-800/80 border border-industrial-200 dark:border-industrial-700/60">
                <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mb-1">
                  <UserCheck size={13} /> {t('supervisor')}
                </span>
                <p className="text-industrial-600 dark:text-industrial-300 leading-relaxed">
                  {t('supervisorGroupAccess')}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-industrial-800/80 border border-industrial-200 dark:border-industrial-700/60">
                <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                  <Wrench size={13} /> {t('operator')}
                </span>
                <p className="text-industrial-600 dark:text-industrial-300 leading-relaxed">
                  {t('operatorAccess')}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-industrial-800/80 border border-industrial-200 dark:border-industrial-700/60">
                <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                  <Eye size={13} /> {t('viewer')}
                </span>
                <p className="text-industrial-600 dark:text-industrial-300 leading-relaxed">
                  {t('viewerAccess')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Non-Admin Warning Banner */}
      {!isAdmin && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-center gap-2.5 text-xs text-amber-300">
          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          <span>
            {isArabic
              ? 'تنبيه: أنت مسجل كـ (' + t(currentProfile?.role || 'supervisor') + '). فقط المسؤول (Admin) يملك صلاحية تعديل الأدوار ونقل المشرفين بين المجموعات.'
              : 'Notice: You are signed in as (' + t(currentProfile?.role || 'supervisor') + '). Only Administrators can modify roles and reassign supervisors to groups.'}
          </span>
        </div>
      )}

      {/* Filters Bar */}
      <Card padding="sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-industrial-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isArabic ? 'بحث بالاسم أو البريد...' : 'Search by name or email...'}
              className="w-full rounded-lg border border-industrial-200 dark:border-industrial-600 bg-white dark:bg-industrial-800 ps-9 pe-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-industrial-200 dark:border-industrial-600 bg-white dark:bg-industrial-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            <option value="">{t('allRoles')}</option>
            <option value="admin">{t('admin')}</option>
            <option value="supervisor">{t('supervisor')}</option>
            <option value="operator">{t('operator')}</option>
            <option value="viewer">{t('viewer')}</option>
          </select>

          {/* Group Filter */}
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="rounded-lg border border-industrial-200 dark:border-industrial-600 bg-white dark:bg-industrial-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            <option value="">{t('allGroups')}</option>
            <option value="group-a">{t('groupA')}</option>
            <option value="group-b">{t('groupB')}</option>
            <option value="group-c">{t('groupC')}</option>
            <option value="group-d">{t('groupD')}</option>
            <option value="none">{t('noGroup')}</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-industrial-200 dark:border-industrial-600 bg-white dark:bg-industrial-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            <option value="">{isArabic ? 'جميع الحالات' : 'All Statuses'}</option>
            <option value="active">{t('active')}</option>
            <option value="inactive">{t('inactive')}</option>
          </select>
        </div>
      </Card>

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-primary-500" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={<Users size={36} />}
          title={t('noData')}
          description={isArabic ? 'لم يتم العثور على مستخدمين يطابقون خيارات البحث' : 'No users match your filter criteria'}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-industrial-200 dark:border-industrial-700 bg-white dark:bg-industrial-900 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-industrial-50 dark:bg-industrial-800 text-xs uppercase text-industrial-500 dark:text-industrial-400 border-b border-industrial-200 dark:border-industrial-700">
              <tr>
                <th className="px-4 py-3.5 text-start">{t('name')}</th>
                <th className="px-4 py-3.5 text-start">{t('email')}</th>
                <th className="px-4 py-3.5 text-start">{t('role')}</th>
                <th className="px-4 py-3.5 text-start">{t('assignedGroup')}</th>
                <th className="px-4 py-3.5 text-start">{t('status')}</th>
                <th className="px-4 py-3.5 text-start">{t('createdAt')}</th>
                {isAdmin && <th className="px-4 py-3.5 text-end">{t('actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100 dark:divide-industrial-700/60">
              {filteredUsers.map((user) => {
                const isCurrent = user.id === currentProfile?.id || user.email === currentProfile?.email;
                return (
                  <tr
                    key={user.id}
                    className="hover:bg-industrial-50/70 dark:hover:bg-industrial-800/50 transition-colors"
                  >
                    {/* Name + Avatar */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600/20 text-primary-600 dark:text-primary-400 font-bold text-sm border border-primary-500/20">
                          {user.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-industrial-900 dark:text-industrial-100 flex items-center gap-1.5">
                            {user.full_name}
                            {isCurrent && (
                              <span className="text-[10px] bg-primary-500/10 text-primary-500 border border-primary-500/20 px-1.5 py-0.2 rounded font-medium">
                                {isArabic ? 'أنت' : 'You'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-industrial-500 dark:text-industrial-400">
                      {user.email}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeVariant(
                          user.role
                        )}`}
                      >
                        {getRoleIcon(user.role)}
                        {t(user.role)}
                      </span>
                    </td>

                    {/* Assigned Group */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {user.production_groups ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-industrial-100 dark:bg-industrial-800 text-industrial-800 dark:text-industrial-200 border border-industrial-300 dark:border-industrial-700 font-medium text-xs">
                          <span className="flex h-4 w-4 items-center justify-center rounded bg-primary-600 text-white text-[10px] font-bold">
                            {user.production_groups.code}
                          </span>
                          <span>{user.production_groups.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-industrial-400 italic">
                          {t('noGroup')}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                          <CheckCircle size={14} />
                          {t('active')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-industrial-400 font-medium">
                          <XCircle size={14} />
                          {t('inactive')}
                        </span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-industrial-400">
                      {formatDate(user.created_at)}
                    </td>

                    {/* Actions */}
                    {isAdmin && (
                      <td className="px-4 py-3 whitespace-nowrap text-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(user)}
                          className="h-8 gap-1.5 text-xs border-industrial-300 dark:border-industrial-600 hover:border-primary-500 hover:text-primary-500"
                        >
                          <Edit size={13} />
                          {isArabic ? 'تعيين الفريق / تعديل' : 'Assign Group / Edit'}
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit User & Assign Group Modal */}
      <Dialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={isArabic ? 'تعديل المستخدم وتعيين الفريق' : 'Edit User & Group Assignment'}
        description={
          isArabic
            ? 'يمكن للادمن تعيين السوبر فايزر في أي فريق (أ، ب، ج، د) أو تغيير دوره وصلاحياته'
            : 'Admin can assign supervisors to any group (A, B, C, D) and configure their roles'
        }
      >
        {editingUser && (
          <form onSubmit={handleSaveUser} className="space-y-4 pt-2">
            {/* User Info Header */}
            <div className="rounded-xl bg-industrial-50 dark:bg-industrial-900 p-3.5 border border-industrial-200 dark:border-industrial-700 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white font-bold">
                {editingUser.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-industrial-900 dark:text-industrial-100 text-sm">
                  {editingUser.full_name}
                </p>
                <p className="text-xs text-industrial-500 font-mono truncate">{editingUser.email}</p>
              </div>
            </div>

            {/* Role Picker */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-industrial-700 dark:text-industrial-300">
                {t('role')} <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full rounded-lg border border-industrial-300 dark:border-industrial-600 bg-white dark:bg-industrial-900 px-3 py-2 text-sm text-industrial-900 dark:text-industrial-100 focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                <option value="admin">🛡️ {t('admin')} (كامل الصلاحيات)</option>
                <option value="supervisor">👤 {t('supervisor')} (مشرف فريق)</option>
                <option value="operator">⚙️ {t('operator')} (مشغل إنتاج)</option>
                <option value="viewer">👁️ {t('viewer')} (مشاهد فقط)</option>
              </select>
            </div>

            {/* Group Assignment Selector (امكانية تعيين السوبر فايزر في اي فريق) */}
            <div className="space-y-1.5 rounded-xl border border-primary-500/20 bg-primary-500/5 p-3.5">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                  <ArrowRightLeft size={14} />
                  {t('assignGroup')}
                </label>
                <span className="text-[10px] text-primary-500 font-medium">
                  {isArabic ? 'تحديد مجموعة العمل' : 'Work Group Assignment'}
                </span>
              </div>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full rounded-lg border border-industrial-300 dark:border-industrial-600 bg-white dark:bg-industrial-900 px-3 py-2 text-sm text-industrial-900 dark:text-industrial-100 focus:outline-none focus:ring-2 focus:ring-primary-400 font-medium"
              >
                <option value="">-- {t('noGroup')} --</option>
                <option value="group-a">Group A (فريق أ)</option>
                <option value="group-b">Group B (فريق ب)</option>
                <option value="group-c">Group C (فريق ج)</option>
                <option value="group-d">Group D (فريق د)</option>
              </select>
              <p className="text-[11px] text-industrial-500 dark:text-industrial-400 mt-1">
                {isArabic
                  ? 'عند تعيين السوبر فايزر في أي فريق، ستظهر بيانات هذا الفريق تلقائياً في حسابه ونماذج الإدخال.'
                  : 'Assigning a supervisor to any group will automatically link all their daily logs and reports to that group.'}
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between py-2 border-t border-industrial-200 dark:border-industrial-700">
              <div>
                <p className="text-sm font-medium text-industrial-800 dark:text-industrial-200">
                  {isArabic ? 'حالة الحساب (نشط / غير نشط)' : 'Account Active Status'}
                </p>
                <p className="text-xs text-industrial-400">
                  {isActive ? t('active') : t('inactive')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? 'bg-primary-600' : 'bg-industrial-300 dark:bg-industrial-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-industrial-200 dark:border-industrial-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" loading={saving}>
                {t('save')}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
