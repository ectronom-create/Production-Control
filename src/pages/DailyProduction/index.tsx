import { useState, useEffect, useCallback } from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ReportForm } from './ReportForm';
import { ReportTable } from './ReportTable';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppContext } from '../../contexts/AppContext';
import { getProductionReports } from '../../services/productionService';
import { supabase } from '../../services/supabase';
import type { DailyProductionReport, ProductionLine, Shift } from '../../types';
import { today, daysAgo } from '../../utils/dateUtils';
import { calcAchievement } from '../../utils/calculations';
import { toast } from 'sonner';

export default function DailyProductionPage() {
  const { t } = useLanguage();
  const { profile } = useAppContext();
  const canAdd = profile?.role !== 'viewer';

  const [reports, setReports] = useState<DailyProductionReport[]>([]);
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyProductionReport | null>(null);
  const [startDate, setStartDate] = useState(daysAgo(29));
  const [endDate, setEndDate] = useState(today());

  const loadLookups = async () => {
    const [l, s] = await Promise.all([
      supabase.from('production_lines').select('*').eq('is_active', true),
      supabase.from('shifts').select('*').eq('is_active', true),
    ]);
    if (l.data) setLines(l.data as ProductionLine[]);
    if (s.data) setShifts(s.data as Shift[]);
  };

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProductionReports({ startDate, endDate });
      setReports(data);
    } catch {
      toast.error(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { loadLookups(); }, []);
  useEffect(() => { loadReports(); }, [loadReports]);

  // Summary stats
  const totalTarget = reports.reduce((s, r) => s + r.target_quantity, 0);
  const totalActual = reports.reduce((s, r) => s + r.actual_quantity, 0);
  const totalDefects = reports.reduce((s, r) => s + r.defect_quantity, 0);
  const totalGood = reports.reduce((s, r) => s + (r.good_quantity ?? 0), 0);
  const overallAch = calcAchievement(totalActual, totalTarget);

  const handleEdit = (r: DailyProductionReport) => {
    setEditingReport(r);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList size={22} className="text-primary-500" />
          <div>
            <h1 className="text-xl font-bold text-industrial-900 dark:text-industrial-50">{t('dailyReport')}</h1>
            <p className="text-sm text-industrial-500 mt-0.5">
              {reports.length} {t('total')} — {t('achievementPct')}: <strong className={overallAch >= 90 ? 'text-green-600' : overallAch >= 70 ? 'text-amber-600' : 'text-red-600'}>{overallAch.toFixed(1)}%</strong>
            </p>
          </div>
        </div>
        {canAdd && (
          <Button onClick={() => { setEditingReport(null); setFormOpen(true); }}>
            <Plus size={16} />
            {t('addReport')}
          </Button>
        )}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('target'), value: totalTarget.toLocaleString(), color: 'text-blue-600' },
          { label: t('actual'), value: totalActual.toLocaleString(), color: 'text-emerald-600' },
          { label: t('defects'), value: totalDefects.toLocaleString(), color: 'text-red-600' },
          { label: t('goodQty'), value: totalGood.toLocaleString(), color: 'text-teal-600' },
        ].map(item => (
          <Card key={item.label} padding="sm" className="text-center">
            <p className="text-xs text-industrial-400 mb-1">{item.label}</p>
            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
          </Card>
        ))}
      </div>

      {/* Date filter */}
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
      <ReportTable
        reports={reports}
        lines={lines}
        loading={loading}
        onEdit={handleEdit}
        onRefresh={loadReports}
      />

      {/* Form dialog */}
      <ReportForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editingReport}
        lines={lines}
        shifts={shifts}
        onSaved={loadReports}
      />
    </div>
  );
}
