const ar = {
  // Navigation
  dashboard: 'لوحة التحكم',
  downtime: 'التوقفات',
  dailyProduction: 'التقرير اليومي',
  future: 'قريباً',
  settings: 'الإعدادات',
  users: 'المستخدمون',

  // Auth
  login: 'تسجيل الدخول',
  logout: 'تسجيل الخروج',
  email: 'البريد الإلكتروني',
  password: 'كلمة المرور',
  loginTitle: 'نظام التحكم الإنتاجي',
  loginSubtitle: 'قم بتسجيل الدخول إلى حسابك',
  loggingIn: 'جارٍ تسجيل الدخول...',
  loginError: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',

  // Common
  save: 'حفظ',
  cancel: 'إلغاء',
  edit: 'تعديل',
  delete: 'حذف',
  add: 'إضافة',
  search: 'بحث',
  filter: 'تصفية',
  export: 'تصدير',
  loading: 'جارٍ التحميل...',
  noData: 'لا توجد بيانات',
  confirm: 'تأكيد',
  close: 'إغلاق',
  yes: 'نعم',
  no: 'لا',
  actions: 'الإجراءات',
  submit: 'إرسال',
  reset: 'إعادة تعيين',
  required: 'مطلوب',
  optional: 'اختياري',
  total: 'الإجمالي',
  all: 'الكل',

  // Date Filters
  today: 'اليوم',
  yesterday: 'أمس',
  last7Days: 'آخر 7 أيام',
  last30Days: 'آخر 30 يومًا',
  customRange: 'نطاق مخصص',
  startDate: 'تاريخ البداية',
  endDate: 'تاريخ النهاية',
  date: 'التاريخ',

  // Production
  target: 'التارجت',
  actual: 'الإنتاج الفعلي',
  defects: 'المعطوبات',
  goodQty: 'الإنتاج السليم',
  achievement: 'نسبة الإنجاز',
  achievementPct: 'نسبة الإنجاز %',
  remarks: 'الملاحظات',
  productionLine: 'خط الإنتاج',
  singlePhase: 'سنجل فيز',
  threePhase: 'ثري فيز',
  totalProduction: 'إجمالي الإنتاج',
  dailyTarget: 'التارجت اليومي',
  actualProduction: 'الإنتاج الفعلي',

  // Groups
  group: 'المجموعة',
  groupA: 'مجموعة أ',
  groupB: 'مجموعة ب',
  groupC: 'مجموعة ج',
  groupD: 'مجموعة د',
  productionByGroup: 'الإنتاج حسب المجموعة',
  productionByLine: 'الإنتاج حسب الخط',

  // Shifts
  shift: 'الشفت',
  morning: 'صباحي',
  evening: 'مسائي',
  shiftInfo: 'معلومات الشفت',
  currentShift: 'الشفت الحالي',
  currentGroup: 'المجموعة الحالية',
  shiftTime: 'وقت الشفت',
  shiftStart: 'بداية الشفت',
  shiftEnd: 'نهاية الشفت',
  nextRotation: 'الدوران القادم',
  rotationDay: 'يوم الدوران',

  // Dashboard
  todayProduction: 'إنتاج اليوم',
  kpiCards: 'مؤشرات الأداء',
  charts: 'الرسوم البيانية',
  dailyTrend: 'اتجاه الإنتاج اليومي',
  targetVsActual: 'التارجت مقابل الفعلي',
  defectsTrend: 'اتجاه المعطوبات',
  downtimeTrend: 'اتجاه التوقفات',
  filterBy: 'تصفية حسب',

  // Downtime
  downtimeLog: 'سجل التوقفات',
  downtimeReason: 'سبب التوقف',
  customReason: 'سبب مخصص',
  description: 'الوصف',
  startTime: 'وقت البداية',
  endTime: 'وقت النهاية',
  duration: 'المدة',
  addDowntime: 'إضافة توقف',
  editDowntime: 'تعديل التوقف',
  deleteDowntime: 'حذف التوقف',
  confirmDeleteDowntime: 'هل أنت متأكد من حذف سجل التوقف هذا؟',
  downtimeReasons: {
    machineBreakdown: 'عطل في الماكينة',
    materialShortage: 'نقص المواد',
    quality: 'جودة',
    maintenance: 'صيانة',
    noOperator: 'لا يوجد مشغل',
    other: 'أخرى',
  },
  totalDowntime: 'إجمالي التوقف',

  // Daily Production
  dailyReport: 'تقرير الإنتاج اليومي',
  addReport: 'إضافة تقرير',
  editReport: 'تعديل التقرير',
  deleteReport: 'حذف التقرير',
  confirmDeleteReport: 'هل أنت متأكد من حذف هذا التقرير؟',
  reportDate: 'تاريخ التقرير',
  createdBy: 'أُنشئ بواسطة',
  createdAt: 'تاريخ الإنشاء',

  // Validation
  fieldRequired: '{{field}} مطلوب',
  mustBePositive: '{{field}} يجب أن يكون رقمًا موجبًا',
  endAfterStart: 'وقت النهاية يجب أن يكون بعد وقت البداية',
  defectsExceedActual: 'لا يمكن أن تتجاوز المعطوبات الإنتاج الفعلي',
  customReasonRequired: 'يرجى إدخال سبب مخصص',

  // Success / Error
  savedSuccess: 'تم حفظ السجل بنجاح',
  deletedSuccess: 'تم حذف السجل بنجاح',
  errorOccurred: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
  networkError: 'خطأ في الشبكة. يرجى التحقق من اتصالك.',

  // Future Page
  futureTitle: 'قريباً',
  futureSubtitle: 'سيتم تهيئة هذا القسم لاحقًا.',
  futureDescription: 'هذه الميزة مخططة وستكون متاحة في تحديث مستقبلي.',

  // Profile
  profile: 'الملف الشخصي',
  role: 'الدور',
  name: 'الاسم',
  active: 'نشط',
  inactive: 'غير نشط',
  admin: 'مدير',
  supervisor: 'مشرف',
  operator: 'مشغل',
  viewer: 'مشاهد',

  // Theme
  darkMode: 'الوضع الداكن',
  lightMode: 'الوضع الفاتح',
  language: 'اللغة',
};

export default ar;
