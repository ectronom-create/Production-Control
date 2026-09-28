import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts';
import { Card, CardHeader } from '../../../components/ui/Card';
import { useLanguage } from '../../../hooks/useLanguage';
import type { DailyProductionReport } from '../../../types';
import { format, parseISO } from 'date-fns';

interface Props {
  reports: DailyProductionReport[];
}

export function DailyTrendChart({ reports }: Props) {
  const { t } = useLanguage();

  // Aggregate by date
  const byDate = reports.reduce<Record<string, { date: string; actual: number; target: number }>>((acc, r) => {
    const d = r.report_date;
    if (!acc[d]) acc[d] = { date: d, actual: 0, target: 0 };
    acc[d].actual += r.actual_quantity;
    acc[d].target += r.target_quantity;
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
        <CardHeader title={t('dailyTrend')} />
      </div>
      <div className="h-60 px-2 pb-4">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-industrial-400">{t('noData')}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => (v as number).toLocaleString()} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="actual" name={t('actual')} stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="target" name={t('target')} stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
