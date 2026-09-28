import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts';
import { Card, CardHeader } from '../../../components/ui/Card';
import { useLanguage } from '../../../hooks/useLanguage';
import type { DailyProductionReport } from '../../../types';
import { format, parseISO } from 'date-fns';

interface Props {
  reports: DailyProductionReport[];
}

export function DefectsTrendChart({ reports }: Props) {
  const { t } = useLanguage();

  const byDate = reports.reduce<Record<string, { date: string; defects: number }>>((acc, r) => {
    const d = r.report_date;
    if (!acc[d]) acc[d] = { date: d, defects: 0 };
    acc[d].defects += r.defect_quantity;
    return acc;
  }, {});

  const data = Object.values(byDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      ...d,
      dateLabel: (() => { try { return format(parseISO(d.date), 'dd/MM'); } catch { return d.date; } })()
    }));

  return (
    <Card padding="none">
      <div className="p-5">
        <CardHeader title={t('defectsTrend')} />
      </div>
      <div className="h-60 px-2 pb-4">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-industrial-400">{t('noData')}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="defectsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => (v as number).toLocaleString()} />
              <Area type="monotone" dataKey="defects" name={t('defects')} stroke="#ef4444" fill="url(#defectsGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
