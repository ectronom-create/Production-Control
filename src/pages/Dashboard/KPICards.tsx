import { TrendingUp, TrendingDown, Target, CheckCircle, XCircle, Timer } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { useLanguage } from '../../hooks/useLanguage';
import { formatDuration } from '../../utils/calculations';
import { cn } from '../../components/ui/cn';

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}

function KPICard({ label, value, sub, icon, color, trend }: KPICardProps) {
  return (
    <Card className="flex items-start gap-4">
      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', color)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-industrial-500 dark:text-industrial-400 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-bold text-industrial-900 dark:text-industrial-50 mt-0.5 leading-none">
          {value}
        </p>
        {sub && (
          <p className="text-xs text-industrial-400 dark:text-industrial-500 mt-1">{sub}</p>
        )}
      </div>
      {trend && (
        <div className="shrink-0">
          {trend === 'up' ? (
            <TrendingUp size={18} className="text-green-500" />
          ) : trend === 'down' ? (
            <TrendingDown size={18} className="text-red-500" />
          ) : null}
        </div>
      )}
    </Card>
  );
}

interface KPICardsProps {
  totalTarget: number;
  totalActual: number;
  totalDefects: number;
  totalGood: number;
  achievementPct: number;
  totalDowntimeMinutes: number;
}

export function KPICards({ totalTarget, totalActual, totalDefects, totalGood, achievementPct, totalDowntimeMinutes }: KPICardsProps) {
  const { t } = useLanguage();
  const achColor = achievementPct >= 90 ? 'up' : achievementPct >= 70 ? 'neutral' : 'down';

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <KPICard
        label={t('target')}
        value={totalTarget.toLocaleString()}
        icon={<Target size={22} className="text-blue-600" />}
        color="bg-blue-50 dark:bg-blue-900/20"
      />
      <KPICard
        label={t('actual')}
        value={totalActual.toLocaleString()}
        icon={<TrendingUp size={22} className="text-emerald-600" />}
        color="bg-emerald-50 dark:bg-emerald-900/20"
      />
      <KPICard
        label={t('achievementPct')}
        value={`${achievementPct.toFixed(1)}%`}
        icon={<CheckCircle size={22} className={achievementPct >= 90 ? 'text-green-600' : achievementPct >= 70 ? 'text-amber-600' : 'text-red-600'} />}
        color={achievementPct >= 90 ? 'bg-green-50 dark:bg-green-900/20' : achievementPct >= 70 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-red-50 dark:bg-red-900/20'}
        trend={achColor}
      />
      <KPICard
        label={t('defects')}
        value={totalDefects.toLocaleString()}
        icon={<XCircle size={22} className="text-red-600" />}
        color="bg-red-50 dark:bg-red-900/20"
        trend={totalDefects > 0 ? 'down' : 'neutral'}
      />
      <KPICard
        label={t('goodQty')}
        value={totalGood.toLocaleString()}
        icon={<CheckCircle size={22} className="text-teal-600" />}
        color="bg-teal-50 dark:bg-teal-900/20"
      />
      <KPICard
        label={t('totalDowntime')}
        value={formatDuration(totalDowntimeMinutes)}
        sub="HH:MM"
        icon={<Timer size={22} className="text-orange-600" />}
        color="bg-orange-50 dark:bg-orange-900/20"
        trend={totalDowntimeMinutes > 60 ? 'down' : 'neutral'}
      />
    </div>
  );
}
