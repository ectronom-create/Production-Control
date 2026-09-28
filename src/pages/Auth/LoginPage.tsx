import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Factory, Eye, EyeOff, Sun, Moon, Globe, AlertCircle, CheckCircle2, UserCheck, Shield, Wrench } from 'lucide-react';
import { signIn, DEMO_ACCOUNTS } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { useLanguage } from '../../hooks/useLanguage';
import { useTheme } from '../../hooks/useTheme';
import { toast } from 'sonner';
import { isSupabaseConfigured } from '../../services/supabase';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { t, toggleLanguage, isArabic } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [selectedRole, setSelectedRole] = useState('supervisor');

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: DEMO_ACCOUNTS[0].email,
      password: DEMO_ACCOUNTS[0].password,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await signIn(data.email, data.password);
      toast.success(isArabic ? 'تم تسجيل الدخول بنجاح' : 'Signed in successfully');
      navigate('/');
    } catch {
      toast.error(t('loginError'));
    }
  };

  const handleSelectAccount = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setSelectedRole(acc.role);
    setValue('email', acc.email, { shouldValidate: true });
    setValue('password', acc.password, { shouldValidate: true });
  };

  const handleQuickLogin = async (acc: typeof DEMO_ACCOUNTS[0]) => {
    handleSelectAccount(acc);
    try {
      await signIn(acc.email, acc.password);
      toast.success(isArabic ? `تم الدخول بحساب ${acc.name}` : `Signed in as ${acc.name}`);
      navigate('/');
    } catch {
      toast.error(t('loginError'));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-industrial-950 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 41px)',
          }}
        />
      </div>

      {/* Top bar */}
      <div className="relative flex justify-end gap-2 p-4">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-industrial-300 hover:text-white hover:bg-industrial-800 transition-colors"
        >
          <Globe size={14} />
          {isArabic ? 'EN' : 'ع'}
        </button>
        <button
          onClick={toggleTheme}
          className="rounded-lg p-1.5 text-industrial-300 hover:text-white hover:bg-industrial-800 transition-colors"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* Center card */}
      <div className="relative flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 mb-3 shadow-lg shadow-primary-600/30">
              <Factory size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{t('loginTitle')}</h1>
            <p className="text-industrial-400 mt-1 text-sm">{t('loginSubtitle')}</p>
          </div>

          {/* Quick Test Accounts Picker */}
          <div className="mb-5 rounded-xl border border-industrial-800 bg-industrial-900/90 p-3.5 backdrop-blur">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-industrial-300 flex items-center gap-1.5">
                <UserCheck size={14} className="text-primary-400" />
                {isArabic ? 'حسابات التجربة السريعة (جاهزة للاختبار)' : 'Test Accounts (Auto-Filled)'}
              </span>
              <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 font-medium">
                {isArabic ? 'جاهز للاختبار' : 'Ready to Test'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const isSelected = selectedRole === acc.role;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleSelectAccount(acc)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500/15 text-white ring-1 ring-primary-500'
                        : 'border-industrial-700 bg-industrial-800/60 text-industrial-300 hover:border-industrial-600 hover:bg-industrial-800'
                    }`}
                  >
                    <div className="mb-1 text-primary-400">
                      {acc.role === 'admin' ? (
                        <Shield size={16} />
                      ) : acc.role === 'supervisor' ? (
                        <UserCheck size={16} />
                      ) : (
                        <Wrench size={16} />
                      )}
                    </div>
                    <span className="text-xs font-semibold leading-tight line-clamp-1">{acc.name}</span>
                    <span className="text-[10px] text-industrial-400 mt-0.5 font-medium">
                      {acc.group} • {t(acc.role)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-industrial-800 bg-industrial-900/60 p-6 backdrop-blur shadow-2xl">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-industrial-300">
                  {t('email')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className="w-full rounded-lg border border-industrial-700 bg-industrial-950/80 px-3.5 py-2.5 text-sm text-white placeholder:text-industrial-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 font-mono"
                  placeholder="you@company.com"
                />
                {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-industrial-300">
                  {t('password')} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    {...register('password')}
                    className="w-full rounded-lg border border-industrial-700 bg-industrial-950/80 px-3.5 py-2.5 pe-10 text-sm text-white placeholder:text-industrial-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 font-mono"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute inset-y-0 end-0 flex items-center pe-3 text-industrial-400 hover:text-industrial-200"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
              </div>

              <div className="pt-2 space-y-2">
                <Button
                  type="submit"
                  className="w-full font-semibold shadow-lg shadow-primary-600/30"
                  size="lg"
                  loading={isSubmitting}
                >
                  {isSubmitting ? t('loggingIn') : t('login')}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-industrial-700 text-industrial-300 hover:bg-industrial-800 hover:text-white text-xs h-9"
                  onClick={() => {
                    const currentAcc = DEMO_ACCOUNTS.find((a) => a.role === selectedRole) || DEMO_ACCOUNTS[0];
                    handleQuickLogin(currentAcc);
                  }}
                >
                  <CheckCircle2 size={14} className="text-green-400 me-1.5" />
                  {isArabic ? 'دخول فوري مباشر (One-Click)' : 'Instant 1-Click Login'}
                </Button>
              </div>
            </form>
          </div>

          {/* Supabase Notice if using placeholder */}
          {!isSupabaseConfigured && (
            <div className="mt-4 rounded-xl border border-industrial-800 bg-industrial-900/40 p-3 text-start text-xs text-industrial-400">
              <div className="flex items-center gap-1.5 font-medium text-industrial-300 mb-1">
                <AlertCircle size={14} className="text-amber-400" />
                <span>{isArabic ? 'وضع المعاينة التجريبي مفعّل' : 'Demo / Test Mode Active'}</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {isArabic
                  ? 'يمكنك تجربة كامل النظام مباشرة عبر الأزرار أعلاه. ولربط قاعدة بيانات Supabase الحقيقية، أدخل المفاتيح في ملف .env وقم بتشغيل schema.sql.'
                  : 'You can test all dashboard features, shifts, groups, and forms immediately. To connect live Supabase DB, fill in .env and run schema.sql.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
