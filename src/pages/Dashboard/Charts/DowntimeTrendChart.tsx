import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts';
import { Card, CardHeader } from '../../../components/ui/Card';
import { useLanguage } from '../../../hooks/useLanguage';
import type { DowntimeRecord } from '../../../types';
import { format, parseISO } from 'date-fns';

interface Props {
  records: DowntimeRecord[];
}

export function DowntimeTrendChart({ records }: Props) {
  const { t } = useLanguage();

  const byDate = records.reduce<Record<string, { date: string; minutes: number }>>((acc, r) => {
    const d = r.date;
    if (!acc[d]) acc[d] = { date: d, minutes: 0 };
    acc[d].minutes += r.duration_minutes ?? 0;
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
        <CardHeader title={t('downtimeTrend')} />
      </div>
      <div className="h-60 px-2 pb-4">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-industrial-400">{t('noData')}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => `${v} min`} />
              <Bar dataKey="minutes" name={`${t('duration')} (min)`} fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
