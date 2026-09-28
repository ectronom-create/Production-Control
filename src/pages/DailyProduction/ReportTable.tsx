import { useState } from 'react';
import { Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppContext } from '../../contexts/AppContext';
import { deleteProductionReport } from '../../services/productionService';
import { formatDate } from '../../utils/dateUtils';
import type { DailyProductionReport, ProductionLine } from '../../types';
import { toast } from 'sonner';
import { cn } from '../../components/ui/cn';

interface Props {
  reports: DailyProductionReport[];
  lines: ProductionLine[];
  loading: boolean;
  onEdit: (r: DailyProductionReport) => void;
  onRefresh: () => void;
}

export function ReportTable({ reports, lines, loading, onEdit, onRefresh }: Props) {
  const { t } = useLanguage();
  const { profile } = useAppContext();
  const [lineFilter, setLineFilter] = useState('');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DailyProductionReport | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManage = profile?.role === 'admin' || profile?.role === 'supervisor';

  const filtered = reports.filter(r => {
    if (lineFilter && r.production_line_id !== lineFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !r.production_lines?.name.toLowerCase().includes(s) &&
        !r.production_groups?.name.toLowerCase().includes(s) &&
        !r.remarks?.toLowerCase().includes(s)
      ) return false;
    }
    return true;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProductionReport(deleteTarget.id);
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
          className="w-44"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary-500" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState title={t('noData')} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-industrial-200 dark:border-industrial-700">
          <table className="w-full text-sm">
            <thead className="bg-industrial-50 dark:bg-industrial-800 text-xs uppercase text-industrial-500">
              <tr>
                <th className="px-4 py-3 text-start">{t('date')}</th>
                <th className="px-4 py-3 text-start">{t('productionLine')}</th>
                <th className="px-4 py-3 text-start">{t('group')}</th>
                <th className="px-4 py-3 text-start">{t('shift')}</th>
                <th className="px-4 py-3 text-end">{t('target')}</th>
                <th className="px-4 py-3 text-end">{t('actual')}</th>
                <th className="px-4 py-3 text-end">{t('defects')}</th>
                <th className="px-4 py-3 text-end">{t('goodQty')}</th>
                <th className="px-4 py-3 text-end">{t('achievementPct')}</th>
                <th className="px-4 py-3 text-start">{t('remarks')}</th>
                <th className="px-4 py-3 text-start">{t('createdBy')}</th>
                {canManage && <th className="px-4 py-3 text-start">{t('actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100 dark:divide-industrial-700 bg-white dark:bg-industrial-900">
              {filtered.map(r => {
                const ach = r.achievement_percentage ?? 0;
                return (
                  <tr key={r.id} className="hover:bg-industrial-50 dark:hover:bg-industrial-800 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(r.report_date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="info">{r.production_lines?.name ?? '--'}</Badge>
                    </td>
                    <td className="px-4 py-3">{r.production_groups?.name ?? '--'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={r.shifts?.code === 'MORNING' ? 'warning' : 'default'}>
                        {r.shifts?.code === 'MORNING' ? t('morning') : t('evening')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-end font-mono">{r.target_quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-end font-mono">{r.actual_quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-end font-mono text-red-600">{r.defect_quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-end font-mono text-green-600">{(r.good_quantity ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-end">
                      <span className={cn(
                        'font-semibold',
                        ach >= 90 ? 'text-green-600' : ach >= 70 ? 'text-amber-600' : 'text-red-600'
                      )}>
                        {Number(ach).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-industrial-400 max-w-xs truncate">{r.remarks ?? '--'}</td>
                    <td className="px-4 py-3 text-industrial-400">{r.profiles?.full_name ?? '--'}</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => onEdit(r)} className="h-8 w-8 p-0">
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(r)} className="h-8 w-8 p-0 text-red-500">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={v => !v && setDeleteTarget(null)}
        title={t('deleteReport')}
        description={t('confirmDeleteReport')}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
