import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppContext } from '../../contexts/AppContext';
import { getDashboardData } from '../../services/productionService';
import { getDowntimeSummary } from '../../services/downtimeService';
import { getDateRange } from '../../utils/dateUtils';
import { calcAchievement } from '../../utils/calculations';
import type { DailyProductionReport, DowntimeRecord, DateFilter, DashboardFilters, ByLineStats, ByGroupStats } from '../../types';
import { KPICards } from './KPICards';
import { ProductionByLine } from './ProductionByLine';
import { ProductionByGroup } from './ProductionByGroup';
import { ShiftInfo } from './ShiftInfo';
import { DailyTrendChart } from './Charts/DailyTrendChart';
import { TargetVsActualChart } from './Charts/TargetVsActualChart';
import { DefectsTrendChart } from './Charts/DefectsTrendChart';
import { DowntimeTrendChart } from './Charts/DowntimeTrendChart';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Input } from '../../components/ui/Input';
import { today, yesterday } from '../../utils/dateUtils';
import { RefreshCw, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

const DATE_FILTERS: { value: DateFilter; labelKey: string }[] = [
  { value: 'today', labelKey: 'today' },
  { value: 'yesterday', labelKey: 'yesterday' },
  { value: 'last7', labelKey: 'last7Days' },
  { value: 'last30', labelKey: 'last30Days' },
  { value: 'custom', labelKey: 'customRange' },
];

export default function DashboardPage() {
  const { t } = useLanguage();
  const { profile } = useAppContext();

  const [filters, setFilters] = useState<DashboardFilters>({ dateFilter: 'today' });
  const [reports, setReports] = useState<DailyProductionReport[]>([]);
  const [downtimeRecords, setDowntimeRecords] = useState<DowntimeRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const { startDate, endDate } = getDateRange(
    filters.dateFilter,
    filters.startDate,
    filters.endDate
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reps, dt] = await Promise.all([
        getDashboardData(startDate, endDate, filters.lineId, filters.groupId, filters.shiftId),
        getDowntimeSummary(startDate, endDate, filters.lineId, filters.groupId),
      ]);
      setReports(reps);
      setDowntimeRecords(dt.records);
    } catch (e: unknown) {
      toast.error(t('errorOccurred'));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filters.lineId, filters.groupId, filters.shiftId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Aggregate KPIs
  const totalTarget = reports.reduce((s, r) => s + r.target_quantity, 0);
  const totalActual = reports.reduce((s, r) => s + r.actual_quantity, 0);
  const totalDefects = reports.reduce((s, r) => s + r.defect_quantity, 0);
  const totalGood = reports.reduce((s, r) => s + (r.good_quantity ?? 0), 0);
  const achievementPct = calcAchievement(totalActual, totalTarget);
  const totalDowntimeMinutes = downtimeRecords.reduce((s, r) => s + (r.duration_minutes ?? 0), 0);

  // By Line stats
  const byLineMap = reports.reduce<Record<string, ByLineStats>>((acc, r) => {
    const id = r.production_line_id;
    if (!acc[id]) acc[id] = { line: r.production_lines!, target: 0, actual: 0, defects: 0, good: 0, achievementPct: 0 };
    if (r.production_lines) acc[id].line = r.production_lines;
    acc[id].target += r.target_quantity;
    acc[id].actual += r.actual_quantity;
    acc[id].defects += r.defect_quantity;
    acc[id].good += r.good_quantity ?? 0;
    return acc;
  }, {});
  const byLine: ByLineStats[] = Object.values(byLineMap).map(s => ({
    ...s, achievementPct: calcAchievement(s.actual, s.target)
  }));

  // By Group stats
  const byGroupMap = reports.reduce<Record<string, ByGroupStats>>((acc, r) => {
    const id = r.group_id;
    if (!acc[id]) acc[id] = { group: r.production_groups!, target: 0, actual: 0, defects: 0, good: 0, achievementPct: 0 };
    if (r.production_groups) acc[id].group = r.production_groups;
    acc[id].target += r.target_quantity;
    acc[id].actual += r.actual_quantity;
    acc[id].defects += r.defect_quantity;
    acc[id].good += r.good_quantity ?? 0;
    return acc;
  }, {});
  const byGroup: ByGroupStats[] = Object.values(byGroupMap).map(s => ({
    ...s, achievementPct: calcAchievement(s.actual, s.target)
  }));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-industrial-900 dark:text-industrial-50">
            {t('dashboard')}
          </h1>
          <p className="text-sm text-industrial-500 dark:text-industrial-400 mt-0.5">
            {t('todayProduction')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} loading={loading}>
          <RefreshCw size={14} />
          {loading ? t('loading') : 'Refresh'}
        </Button>
      </div>

      {/* Date filter tabs */}
      <div className="flex flex-wrap gap-2 items-center">
        {DATE_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilters(prev => ({ ...prev, dateFilter: f.value }))}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filters.dateFilter === f.value
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-industrial-800 text-industrial-600 dark:text-industrial-300 border border-industrial-200 dark:border-industrial-700 hover:border-primary-300'
            }`}
          >
            {t(f.labelKey as 'today')}
          </button>
        ))}
        {filters.dateFilter === 'custom' && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={filters.startDate ?? ''}
              onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="h-9 text-sm w-36"
            />
            <span className="text-industrial-400">–</span>
            <Input
              type="date"
              value={filters.endDate ?? ''}
              onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="h-9 text-sm w-36"
            />
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" className="text-primary-600" />
        </div>
      )}

      {!loading && (
        <>
          {/* KPI Cards */}
          <KPICards
            totalTarget={totalTarget}
            totalActual={totalActual}
            totalDefects={totalDefects}
            totalGood={totalGood}
            achievementPct={achievementPct}
            totalDowntimeMinutes={totalDowntimeMinutes}
          />

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: charts and line breakdown */}
            <div className="lg:col-span-2 space-y-6">
              <ProductionByLine data={byLine} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DailyTrendChart reports={reports} />
                <TargetVsActualChart reports={reports} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DefectsTrendChart reports={reports} />
                <DowntimeTrendChart records={downtimeRecords} />
              </div>
            </div>

            {/* Right: shift info + group breakdown */}
            <div className="space-y-6">
              <ShiftInfo />
              <ProductionByGroup data={byGroup} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
