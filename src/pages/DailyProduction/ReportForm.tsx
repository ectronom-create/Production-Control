import { useEffect } from 'react';
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
import { createProductionReport, updateProductionReport } from '../../services/productionService';
import type { DailyProductionReport, ProductionLine, Shift } from '../../types';
import { calcAchievement, calcGoodQty } from '../../utils/calculations';
import { today } from '../../utils/dateUtils';
import { toast } from 'sonner';

const schema = z.object({
  report_date: z.string().min(1),
  production_line_id: z.string().min(1),
  target_quantity: z.coerce.number().int().min(0),
  actual_quantity: z.coerce.number().int().min(0),
  defect_quantity: z.coerce.number().int().min(0),
  remarks: z.string().optional(),
}).refine(d => d.defect_quantity <= d.actual_quantity, {
  message: 'defectsExceedActual',
  path: ['defect_quantity'],
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: DailyProductionReport | null;
  lines: ProductionLine[];
  shifts: Shift[];
  onSaved: () => void;
}

export function ReportForm({ open, onOpenChange, editing, lines, shifts, onSaved }: Props) {
  const { t } = useLanguage();
  const { user, profile } = useAppContext();
  const { info } = useShiftRotation();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { report_date: today(), target_quantity: 0, actual_quantity: 0, defect_quantity: 0 },
  });

  const watchActual = watch('actual_quantity') ?? 0;
  const watchDefects = watch('defect_quantity') ?? 0;
  const watchTarget = watch('target_quantity') ?? 0;
  const computedGood = calcGoodQty(Number(watchActual), Number(watchDefects));
  const computedAchievement = calcAchievement(Number(watchActual), Number(watchTarget));

  useEffect(() => {
    if (editing) {
      reset({
        report_date: editing.report_date,
        production_line_id: editing.production_line_id,
        target_quantity: editing.target_quantity,
        actual_quantity: editing.actual_quantity,
        defect_quantity: editing.defect_quantity,
        remarks: editing.remarks ?? '',
      });
    } else {
      reset({ report_date: today(), target_quantity: 0, actual_quantity: 0, defect_quantity: 0 });
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
    try {
      if (editing) {
        await updateProductionReport(editing.id, {
          target_quantity: data.target_quantity,
          actual_quantity: data.actual_quantity,
          defect_quantity: data.defect_quantity,
          remarks: data.remarks,
        }, user.id);
      } else {
        await createProductionReport({
          report_date: data.report_date,
          production_line_id: data.production_line_id,
          group_id: profile.group_id,
          shift_id: getShiftId(),
          target_quantity: data.target_quantity,
          actual_quantity: data.actual_quantity,
          defect_quantity: data.defect_quantity,
          remarks: data.remarks,
        }, user.id);
      }
      toast.success(t('savedSuccess'));
      onSaved();
      onOpenChange(false);
    } catch (e: unknown) {
      const msg = (e as Error).message;
      if (msg?.includes('unique')) {
        toast.error('A report already exists for this date/line/group/shift combination.');
      } else {
        toast.error(msg || t('errorOccurred'));
      }
    }
  };

  const lineOptions = lines.filter(l => l.is_active).map(l => ({ value: l.id, label: l.name }));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? t('editReport') : t('addReport')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Date */}
        <Input
          label={t('reportDate')}
          type="date"
          required
          {...register('report_date')}
          error={errors.report_date?.message}
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

        {/* Group & Shift (auto, read-only) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-industrial-700 dark:text-industrial-300">{t('group')}</label>
            <div className="w-full rounded-lg border border-industrial-200 dark:border-industrial-600 bg-industrial-50 dark:bg-industrial-800 px-3 py-2 text-sm text-industrial-600 dark:text-industrial-300">
              {profile?.production_groups?.name ?? '--'}
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-industrial-700 dark:text-industrial-300">{t('shift')}</label>
            <div className="w-full rounded-lg border border-industrial-200 dark:border-industrial-600 bg-industrial-50 dark:bg-industrial-800 px-3 py-2 text-sm text-industrial-600 dark:text-industrial-300">
              {info?.currentShift?.code === 'MORNING' ? t('morning') : info?.currentShift?.code === 'EVENING' ? t('evening') : '--'}
            </div>
          </div>
        </div>

        {/* Quantities */}
        <div className="grid grid-cols-3 gap-3">
          <Input
            label={t('target')}
            type="number"
            min={0}
            required
            {...register('target_quantity')}
            error={errors.target_quantity?.message}
          />
          <Input
            label={t('actual')}
            type="number"
            min={0}
            required
            {...register('actual_quantity')}
            error={errors.actual_quantity?.message}
          />
          <Input
            label={t('defects')}
            type="number"
            min={0}
            required
            {...register('defect_quantity')}
            error={errors.defect_quantity?.message ? t('defectsExceedActual') : undefined}
          />
        </div>

        {/* Computed fields */}
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-industrial-50 dark:bg-industrial-900 p-3">
          <div className="text-center">
            <p className="text-xs text-industrial-400 mb-1">{t('goodQty')}</p>
            <p className="text-xl font-bold text-green-600">{computedGood.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-industrial-400 mb-1">{t('achievementPct')}</p>
            <p className={`text-xl font-bold ${
              computedAchievement >= 90 ? 'text-green-600' :
              computedAchievement >= 70 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {computedAchievement.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Remarks */}
        <Textarea
          label={t('remarks')}
          placeholder="Optional remarks..."
          {...register('remarks')}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
          <Button type="submit" loading={isSubmitting}>{t('save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
