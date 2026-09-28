import { Sparkles, Wrench } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export default function FuturePage() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="relative mb-8">
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg mx-auto">
          <Sparkles size={48} className="text-white" />
        </div>
        <div className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 shadow">
          <Wrench size={18} className="text-amber-900" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-industrial-900 dark:text-industrial-50 mb-3">
        {t('futureTitle')}
      </h1>
      <p className="text-lg text-industrial-500 dark:text-industrial-400 mb-2">
        {t('futureSubtitle')}
      </p>
      <p className="text-sm text-industrial-400 dark:text-industrial-500 max-w-md">
        {t('futureDescription')}
      </p>

      <div className="mt-10 grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-20 rounded-xl bg-industrial-100 dark:bg-industrial-800 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
