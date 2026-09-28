import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Cell
} from 'recharts';
import { Card, CardHeader } from '../../../components/ui/Card';
import { useLanguage } from '../../../hooks/useLanguage';
import type { DailyProductionReport } from '../../../types';

interface Props {
  reports: DailyProductionReport[];
}

export function TargetVsActualChart({ reports }: Props) {
  const { t } = useLanguage();

  // Group by production line
  const byLine = reports.reduce<Record<string, { name: string; target: number; actual: number }>>((acc, r) => {
    const id = r.production_line_id;
    const name = r.production_lines?.name ?? id;
    if (!acc[id]) acc[id] = { name, target: 0, actual: 0 };
    acc[id].target += r.target_quantity;
    acc[id].actual += r.actual_quantity;
    return acc;
  }, {});

  const data = Object.values(byLine);

  return (
    <Card padding="none">
      <div className="p-5">
        <CardHeader title={t('targetVsActual')} />
      </div>
      <div className="h-60 px-2 pb-4">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-industrial-400">{t('noData')}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => (v as number).toLocaleString()} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="target" name={t('target')} fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" name={t('actual')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
