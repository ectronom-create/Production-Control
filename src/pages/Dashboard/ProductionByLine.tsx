import { Card } from '../../components/ui/Card';
import { useLanguage } from '../../hooks/useLanguage';
import type { ByLineStats } from '../../types';
import { cn } from '../../components/ui/cn';

interface ProductionByLineProps {
  data: ByLineStats[];
}

export function ProductionByLine({ data }: ProductionByLineProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {data.map(item => (
        <Card key={item.line.id}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-industrial-900 dark:text-industrial-50">
                {item.line.code === 'SINGLE' ? t('singlePhase') : t('threePhase')}
              </h3>
              <p className="text-xs text-industrial-400 mt-0.5">{item.line.name}</p>
            </div>
            <span
              className={cn(
                'text-lg font-bold',
                item.achievementPct >= 90 ? 'text-green-600' :
                item.achievementPct >= 70 ? 'text-amber-600' : 'text-red-600'
              )}
            >
              {item.achievementPct.toFixed(1)}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-industrial-500 mb-1">
              <span>{t('actual')}: {item.actual.toLocaleString()}</span>
              <span>{t('target')}: {item.target.toLocaleString()}</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-industrial-100 dark:bg-industrial-700">
              <div
                className={cn(
                  'h-2.5 rounded-full transition-all',
                  item.achievementPct >= 90 ? 'bg-green-500' :
                  item.achievementPct >= 70 ? 'bg-amber-500' : 'bg-red-500'
                )}
                style={{ width: `${Math.min(item.achievementPct, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-industrial-50 dark:bg-industrial-900 p-2">
              <p className="text-lg font-bold text-industrial-900 dark:text-industrial-100">{item.actual.toLocaleString()}</p>
              <p className="text-xs text-industrial-400">{t('actual')}</p>
            </div>
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-2">
              <p className="text-lg font-bold text-red-700 dark:text-red-400">{item.defects.toLocaleString()}</p>
              <p className="text-xs text-industrial-400">{t('defects')}</p>
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-2">
              <p className="text-lg font-bold text-green-700 dark:text-green-400">{item.good.toLocaleString()}</p>
              <p className="text-xs text-industrial-400">{t('goodQty')}</p>
            </div>
          </div>
        </Card>
      ))}
      {data.length === 0 && (
        <div className="col-span-2 rounded-xl border-2 border-dashed border-industrial-200 dark:border-industrial-700 p-8 text-center">
          <p className="text-sm text-industrial-400">{t('noData')}</p>
        </div>
      )}
    </div>
  );
}
