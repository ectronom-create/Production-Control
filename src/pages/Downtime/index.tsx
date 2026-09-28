import { useState, useEffect, useCallback } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DowntimeForm } from './DowntimeForm';
import { DowntimeTable } from './DowntimeTable';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppContext } from '../../contexts/AppContext';
import { getDowntimeRecords, getDowntimeReasons } from '../../services/downtimeService';
import { supabase } from '../../services/supabase';
import type { DowntimeRecord, DowntimeReason, ProductionLine, Shift } from '../../types';
import { today, daysAgo } from '../../utils/dateUtils';
import { formatDuration } from '../../utils/calculations';
import { toast } from 'sonner';

export default function DowntimePage() {
  const { t } = useLanguage();
  const { profile } = useAppContext();
  const canAdd = profile?.role !== 'viewer';

  const [records, setRecords] = useState<DowntimeRecord[]>([]);
  const [reasons, setReasons] = useState<DowntimeReason[]>([]);
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DowntimeRecord | null>(null);
  const [startDate, setStartDate] = useState(daysAgo(6));
  const [endDate, setEndDate] = useState(today());

  const loadLookups = async () => {
    const [r, l, s] = await Promise.all([
      supabase.from('downtime_reasons').select('*').eq('is_active', true).order('name'),
      supabase.from('production_lines').select('*').eq('is_active', true),
      supabase.from('shifts').select('*').eq('is_active', true),
    ]);
    if (r.data) setReasons(r.data as DowntimeReason[]);
    if (l.data) setLines(l.data as ProductionLine[]);
    if (s.data) setShifts(s.data as Shift[]);
  };

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDowntimeRecords({ startDate, endDate });
      setRecords(data);
    } catch {
      toast.error(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const totalDowntime = records.reduce((s, r) => s + (r.duration_minutes ?? 0), 0);

  const handleEdit = (r: DowntimeRecord) => {
    setEditingRecord(r);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle size={22} className="text-orange-500" />
          <div>
            <h1 className="text-xl font-bold text-industrial-900 dark:text-industrial-50">{t('downtimeLog')}</h1>
            <p className="text-sm text-industrial-500 mt-0.5">
              {t('totalDowntime')}: <strong>{formatDuration(totalDowntime)}</strong>
            </p>
          </div>
        </div>
        {canAdd && (
          <Button onClick={handleAdd}>
            <Plus size={16} />
            {t('addDowntime')}
          </Button>
        )}
      </div>

      {/* Date range filter */}
      <Card padding="sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-industrial-500">{t('startDate')}:</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="rounded-lg border border-industrial-200 dark:border-industrial-600 bg-white dark:bg-industrial-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
          <span className="text-industrial-400">–</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="rounded-lg border border-industrial-200 dark:border-industrial-600 bg-white dark:bg-industrial-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
      </Card>

      {/* Table */}
      <DowntimeTable
        records={records}
        reasons={reasons}
        lines={lines}
        loading={loading}
        onEdit={handleEdit}
        onRefresh={loadRecords}
      />

      {/* Form dialog */}
      <DowntimeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editingRecord}
        reasons={reasons}
        lines={lines}
        shifts={shifts}
        onSaved={loadRecords}
      />
    </div>
  );
}
