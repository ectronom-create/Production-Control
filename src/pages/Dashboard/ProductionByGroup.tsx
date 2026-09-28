import { Card, CardHeader } from '../../components/ui/Card';
import { useLanguage } from '../../hooks/useLanguage';
import type { ByGroupStats } from '../../types';
import { cn } from '../../components/ui/cn';
import { Users } from 'lucide-react';

interface ProductionByGroupProps {
  data: ByGroupStats[];
}

const GROUP_COLORS = [
  { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
];

export function ProductionByGroup({ data }: ProductionByGroupProps) {
  const { t } = useLanguage();

  return (
    <Card padding="none">
      <div className="p-5 border-b border-industrial-100 dark:border-industrial-700 flex items-center gap-2">
        <Users size={18} className="text-primary-500" />
        <h3 className="text-base font-semibold text-industrial-900 dark:text-industrial-50">{t('productionByGroup')}</h3>
      </div>
      <div className="divide-y divide-industrial-100 dark:divide-industrial-700">
        {data.length === 0 ? (
          <p className="text-center text-sm text-industrial-400 py-10">{t('noData')}</p>
        ) : (
          data.map((item, i) => {
            const color = GROUP_COLORS[i % GROUP_COLORS.length];
            return (
              <div key={item.group.id} className="flex items-center gap-4 px-5 py-3">
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold border', color.bg, color.text, color.border)}>
                  {item.group.code}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs text-industrial-500 mb-1">
                    <span>{item.group.name}</span>
                    <span className={cn('font-semibold', item.achievementPct >= 90 ? 'text-green-600' : item.achievementPct >= 70 ? 'text-amber-600' : 'text-red-500')}>
                      {item.achievementPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-industrial-100 dark:bg-industrial-700">
                    <div
                      className={cn('h-2 rounded-full', item.achievementPct >= 90 ? 'bg-green-500' : item.achievementPct >= 70 ? 'bg-amber-500' : 'bg-red-500')}
                      style={{ width: `${Math.min(item.achievementPct, 100)}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs text-industrial-400 mt-1">
                    <span>{t('actual')}: <strong className="text-industrial-700 dark:text-industrial-200">{item.actual.toLocaleString()}</strong></span>
                    <span>{t('target')}: <strong className="text-industrial-700 dark:text-industrial-200">{item.target.toLocaleString()}</strong></span>
                    <span>{t('defects')}: <strong className="text-red-600">{item.defects.toLocaleString()}</strong></span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
