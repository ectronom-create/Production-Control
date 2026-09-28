import { Clock, Users, RotateCcw, CalendarClock } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { useShiftRotation } from '../../hooks/useShiftRotation';
import { useAppContext } from '../../contexts/AppContext';
import { useLanguage } from '../../hooks/useLanguage';
import { format } from 'date-fns';

export function ShiftInfo() {
  const { info, loading } = useShiftRotation();
  const { profile } = useAppContext();
  const { t } = useLanguage();

  const isUserWorking =
    info?.currentGroup && profile?.group_id
      ? info.currentGroup.id === profile.group_id
      : false;

  const formatTime = (t: string) => {
    // Convert HH:MM:SS or HH:MM to HH:MM
    return t?.substring(0, 5) ?? '--:--';
  };

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-industrial-900 dark:text-industrial-50 flex items-center gap-2">
          <Clock size={18} className="text-primary-500" />
          {t('shiftInfo')}
        </h3>
        {loading && <Spinner size="sm" className="text-industrial-400" />}
      </div>

      {info ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-industrial-50 dark:bg-industrial-900 p-3">
              <p className="text-xs text-industrial-400 dark:text-industrial-500 mb-1">{t('currentShift')}</p>
              <p className="text-sm font-semibold text-industrial-900 dark:text-industrial-100">
                {info.currentShift ? t(info.currentShift.code === 'MORNING' ? 'morning' : 'evening') : '--'}
              </p>
            </div>
            <div className="rounded-lg bg-industrial-50 dark:bg-industrial-900 p-3">
              <p className="text-xs text-industrial-400 dark:text-industrial-500 mb-1">{t('shiftTime')}</p>
              <p className="text-sm font-semibold text-industrial-900 dark:text-industrial-100">
                {formatTime(info.shiftStartTime)} – {formatTime(info.shiftEndTime)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-primary-50 dark:bg-primary-900/20 p-3">
              <p className="text-xs text-primary-600 dark:text-primary-400 mb-1">{t('morning')}</p>
              <p className="text-lg font-bold text-primary-700 dark:text-primary-300">
                {info.morningGroup?.code ?? '--'}
              </p>
              <p className="text-xs text-primary-500">{info.morningGroup?.name ?? ''}</p>
            </div>
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-3">
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">{t('evening')}</p>
              <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                {info.eveningGroup?.code ?? '--'}
              </p>
              <p className="text-xs text-indigo-500">{info.eveningGroup?.name ?? ''}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-industrial-50 dark:bg-industrial-900 p-3">
            <div className="flex items-center gap-2">
              <RotateCcw size={15} className="text-industrial-400" />
              <span className="text-xs text-industrial-500">{t('rotationDay')}</span>
            </div>
            <span className="text-sm font-semibold text-industrial-900 dark:text-industrial-100">
              Day {info.rotationDay}
            </span>
          </div>

          {profile?.production_groups && (
            <div className={`rounded-lg p-3 ${
              isUserWorking
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-industrial-50 dark:bg-industrial-900'
            }`}>
              <p className="text-xs text-industrial-400 mb-1">{t('currentGroup')}</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-industrial-900 dark:text-industrial-100">
                  {profile.production_groups.name}
                </p>
                {isUserWorking ? (
                  <Badge variant="success">On Shift</Badge>
                ) : (
                  <Badge variant="default">Off Shift</Badge>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        !loading && (
          <p className="text-sm text-industrial-400 text-center py-6">
            Shift data unavailable. Check DB configuration.
          </p>
        )
      )}
    </Card>
  );
}
