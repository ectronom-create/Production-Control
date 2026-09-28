import { useState } from 'react';
import { Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppContext } from '../../contexts/AppContext';
import { deleteDowntimeRecord } from '../../services/downtimeService';
import { formatDate } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/calculations';
import type { DowntimeRecord, DowntimeReason, ProductionLine } from '../../types';
import { toast } from 'sonner';

interface Props {
  records: DowntimeRecord[];
  reasons: DowntimeReason[];
  lines: ProductionLine[];
  loading: boolean;
  onEdit: (r: DowntimeRecord) => void;
  onRefresh: () => void;
}

export function DowntimeTable({ records, reasons, lines, loading, onEdit, onRefresh }: Props) {
  const { t } = useLanguage();
  const { profile } = useAppContext();
  const [search, setSearch] = useState('');
  const [lineFilter, setLineFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DowntimeRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManage = profile?.role === 'admin' || profile?.role === 'supervisor';

  const filtered = records.filter(r => {
    if (lineFilter && r.production_line_id !== lineFilter) return false;
    if (reasonFilter && r.downtime_reason_id !== reasonFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !r.description?.toLowerCase().includes(s) &&
        !r.custom_reason?.toLowerCase().includes(s) &&
        !r.production_lines?.name.toLowerCase().includes(s) &&
        !r.downtime_reasons?.name.toLowerCase().includes(s) &&
        !r.production_groups?.name.toLowerCase().includes(s)
      ) return false;
    }
    return true;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDowntimeRecord(deleteTarget.id);
      toast.success(t('deletedSuccess'));
      onRefresh();
      setDeleteTarget(null);
    } catch (e: unknown) {
      toast.error((e as Error).message || t('errorOccurred'));
    } finally {
      setDeleting(false);
    }
  };

  const lineOptions = [{ value: '', label: t('all') }, ...lines.map(l => ({ value: l.id, label: l.name }))];
  const reasonOptions = [{ value: '', label: t('all') }, ...reasons.map(r => ({ value: r.id, label: r.name }))];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-industrial-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('search')}
            className="w-full rounded-lg border border-industrial-200 dark:border-industrial-600 bg-white dark:bg-industrial-800 ps-9 pe-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <Select
          options={lineOptions}
          value={lineFilter}
          onChange={e => setLineFilter(e.target.value)}
          className="w-40"
        />
        <Select
          options={reasonOptions}
          value={reasonFilter}
          onChange={e => setReasonFilter(e.target.value)}
          className="w-48"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" className="text-primary-500" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title={t('noData')} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-industrial-200 dark:border-industrial-700">
          <table className="w-full text-sm">
            <thead className="bg-industrial-50 dark:bg-industrial-800 text-xs uppercase text-industrial-500 dark:text-industrial-400">
              <tr>
                <th className="px-4 py-3 text-start">{t('date')}</th>
                <th className="px-4 py-3 text-start">{t('productionLine')}</th>
                <th className="px-4 py-3 text-start">{t('group')}</th>
                <th className="px-4 py-3 text-start">{t('shift')}</th>
                <th className="px-4 py-3 text-start">{t('startTime')}</th>
                <th className="px-4 py-3 text-start">{t('endTime')}</th>
                <th className="px-4 py-3 text-start">{t('duration')}</th>
                <th className="px-4 py-3 text-start">{t('downtimeReason')}</th>
                <th className="px-4 py-3 text-start">{t('createdBy')}</th>
                {canManage && <th className="px-4 py-3 text-start">{t('actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100 dark:divide-industrial-700 bg-white dark:bg-industrial-900">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-industrial-50 dark:hover:bg-industrial-800 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant="info">{r.production_lines?.name ?? '--'}</Badge>
                  </td>
                  <td className="px-4 py-3">{r.production_groups?.name ?? '--'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.shifts?.code === 'MORNING' ? 'warning' : 'default'}>
                      {r.shifts?.code === 'MORNING' ? t('morning') : t('evening')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono">{r.start_time?.substring(0, 5)}</td>
                  <td className="px-4 py-3 font-mono">{r.end_time?.substring(0, 5)}</td>
                  <td className="px-4 py-3 font-semibold font-mono">{formatDuration(r.duration_minutes ?? 0)}</td>
                  <td className="px-4 py-3">
                    <div>
                      <span>{r.downtime_reasons?.name ?? '--'}</span>
                      {r.custom_reason && <p className="text-xs text-industrial-400">{r.custom_reason}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-industrial-400">{r.profiles?.full_name ?? '--'}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(r)} className="h-8 w-8 p-0">
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(r)} className="h-8 w-8 p-0 text-red-500 hover:text-red-600">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={v => !v && setDeleteTarget(null)}
        title={t('deleteDowntime')}
        description={t('confirmDeleteDowntime')}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
