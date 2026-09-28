import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Dialog } from '../../components/ui/Dialog';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppContext } from '../../contexts/AppContext';
import { useShiftRotation } from '../../hooks/useShiftRotation';
import { createDowntimeRecord, updateDowntimeRecord } from '../../services/downtimeService';
import type { DowntimeRecord, DowntimeReason, ProductionLine, Shift } from '../../types';
import { calcDurationMinutes, formatDuration } from '../../utils/calculations';
import { today } from '../../utils/dateUtils';
import { toast } from 'sonner';
import { supabase } from '../../services/supabase';

const schema = z.object({
  date: z.string().min(1),
  production_line_id: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  downtime_reason_id: z.string().min(1),
  custom_reason: z.string().optional(),
  description: z.string().optional(),
}).refine(data => {
  // Validate end > start (allow overnight)
  const dur = calcDurationMinutes(data.start_time, data.end_time);
  return dur > 0 && dur <= 720; // max 12h
}, { message: 'endAfterStart', path: ['end_time'] })
.refine(data => {
  if (data.downtime_reason_id) return true;
  return true;
}, { path: ['downtime_reason_id'] });

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: DowntimeRecord | null;
  reasons: DowntimeReason[];
  lines: ProductionLine[];
  shifts: Shift[];
  onSaved: () => void;
}

export function DowntimeForm({ open, onOpenChange, editing, reasons, lines, shifts, onSaved }: Props) {
  const { t } = useLanguage();
  const { user, profile } = useAppContext();
  const { info } = useShiftRotation();
  const [duration, setDuration] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: today(),
    }
  });

  const watchStart = watch('start_time');
  const watchEnd = watch('end_time');
  const watchReason = watch('downtime_reason_id');

  const selectedReason = reasons.find(r => r.id === watchReason);
  const isOther = selectedReason?.code === 'OTHER';

  // Auto-compute duration
  useEffect(() => {
    if (watchStart && watchEnd) {
      const mins = calcDurationMinutes(watchStart, watchEnd);
      if (mins > 0) setDuration(formatDuration(mins));
      else setDuration('');
    }
  }, [watchStart, watchEnd]);

  // Auto-fill shift from rotation
  useEffect(() => {
    if (info?.currentShift && !editing) {
      setValue('start_time', info.shiftStartTime.substring(0, 5));
    }
  }, [info, editing]);

  // Load editing data
  useEffect(() => {
    if (editing) {
      reset({
        date: editing.date,
        production_line_id: editing.production_line_id,
        start_time: editing.start_time.substring(0, 5),
        end_time: editing.end_time.substring(0, 5),
        downtime_reason_id: editing.downtime_reason_id,
        custom_reason: editing.custom_reason ?? '',
        description: editing.description ?? '',
      });
    } else {
      reset({ date: today() });
    }
  }, [editing, reset]);

  const getShiftId = (): string => {
    if (info?.currentShift?.id) return info.currentShift.id;
    return shifts[0]?.id ?? '';
  };

  const onSubmit = async (data: FormData) => {
    if (!user || !profile?.group_id) {
      toast.error('Profile not loaded');
      return;
    }
    // Require custom reason if OTHER
    if (isOther && !data.custom_reason) {
      toast.error(t('customReasonRequired'));
      return;
    }
    try {
      if (editing) {
        await updateDowntimeRecord(editing.id, {
          date: data.date,
          production_line_id: data.production_line_id,
          start_time: data.start_time,
          end_time: data.end_time,
          downtime_reason_id: data.downtime_reason_id,
          custom_reason: isOther ? data.custom_reason : undefined,
          description: data.description,
        }, user.id);
      } else {
        await createDowntimeRecord({
          date: data.date,
          production_line_id: data.production_line_id,
          group_id: profile.group_id,
          shift_id: getShiftId(),
          start_time: data.start_time,
          end_time: data.end_time,
          downtime_reason_id: data.downtime_reason_id,
          custom_reason: isOther ? data.custom_reason : undefined,
          description: data.description,
        }, user.id);
      }
      toast.success(t('savedSuccess'));
      onSaved();
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error((e as Error).message || t('errorOccurred'));
    }
  };

  const lineOptions = lines.filter(l => l.is_active).map(l => ({ value: l.id, label: l.name }));
  const reasonOptions = reasons.filter(r => r.is_active).map(r => ({ value: r.id, label: r.name }));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? t('editDowntime') : t('addDowntime')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Date */}
        <Input
          label={t('date')}
          type="date"
          required
          {...register('date')}
          error={errors.date?.message}
        />

        {/* Line */}
        <Select
          label={t('productionLine')}
          required
          options={lineOptions}
          placeholder={`-- ${t('productionLine')} --`}
          {...register('production_line_id')}
          error={errors.production_line_id?.message}
        />

        {/* Group (auto, read-only) */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-industrial-700 dark:text-industrial-300">
            {t('group')}
          </label>
          <div className="w-full rounded-lg border border-industrial-200 dark:border-industrial-600 bg-industrial-50 dark:bg-industrial-800 px-3 py-2 text-sm text-industrial-600 dark:text-industrial-300">
            {profile?.production_groups?.name ?? '--'}
          </div>
          <p className="text-xs text-industrial-400">Auto-assigned from your profile</p>
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('startTime')}
            type="time"
            required
            {...register('start_time')}
            error={errors.start_time?.message}
          />
          <Input
            label={t('endTime')}
            type="time"
            required
            {...register('end_time')}
            error={errors.end_time?.message ? t('endAfterStart') : undefined}
          />
        </div>

        {/* Duration display */}
        {duration && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-2">
            <span className="text-xs text-blue-600 dark:text-blue-400">{t('duration')}: </span>
            <span className="font-semibold text-blue-700 dark:text-blue-300">{duration}</span>
          </div>
        )}

        {/* Reason */}
        <Select
          label={t('downtimeReason')}
          required
          options={reasonOptions}
          placeholder={`-- ${t('downtimeReason')} --`}
          {...register('downtime_reason_id')}
          error={errors.downtime_reason_id?.message}
        />

        {/* Custom reason if Other */}
        {isOther && (
          <Input
            label={t('customReason')}
            required
            placeholder="Enter custom reason..."
            {...register('custom_reason')}
            error={errors.custom_reason?.message}
          />
        )}

        {/* Description */}
        <Textarea
          label={t('description')}
          placeholder="Additional details..."
          {...register('description')}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {t('save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
