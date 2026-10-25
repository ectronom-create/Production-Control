import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Save, 
  RotateCcw, 
  Calendar, 
  Users, 
  Search, 
  Trash2, 
  Eye, 
  Printer, 
  ShieldCheck, 
  Wrench, 
  PackageCheck, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';
import { printReportDocument } from '../utils/printReport';

const LOCAL_STORAGE_KEY = 'ectron_pre_production_checklists';

// ─── Standard 8 Production Stations Sequence ──────────────────────────────────
export const STANDARD_8_STATIONS = [
  { id: 'Assembly', nameAr: 'التجميع', nameEn: 'Assembly', num: 1 },
  { id: 'Insulation', nameAr: 'العزل', nameEn: 'Insulation', num: 2 },
  { id: 'RF', nameAr: 'التردد اللاسلكي', nameEn: 'RF', num: 3 },
  { id: 'Calibration', nameAr: 'المعايرة', nameEn: 'Calibration', num: 4 },
  { id: 'Multin test', nameAr: 'الفحص الشامل', nameEn: 'Multin test', num: 5 },
  { id: 'Perso', nameAr: 'التخصيص', nameEn: 'Perso', num: 6 },
  { id: 'Packaging', nameAr: 'التغليف', nameEn: 'Packaging', num: 7 },
  { id: 'Firmware update', nameAr: 'تحديث الفيرموير', nameEn: 'Firmware update', num: 8 }
];

const ALL_STATION_IDS = STANDARD_8_STATIONS.map(s => s.id);
const ALL_STATIONS = ALL_STATION_IDS;

// ─── 5M Manufacturing Category Clarification ──────────────────────────────────
export function getCategoryInfo(cat, isArabic) {
  switch (cat) {
    case 'A':
      return {
        code: 'Cat A',
        name: isArabic ? 'الأفراد والكوادر' : 'Manpower & Safety',
        desc: isArabic ? 'حضور المشغلين، مصفوفة المهارات، واجتماع الوردية' : 'Line Operators, Skill Grid & Standup Meeting'
      };
    case 'B':
      return {
        code: 'Cat B',
        name: isArabic ? 'طرق وتعليمات العمل' : 'Methods & WI',
        desc: isArabic ? 'تعليمات العمل المعتمدة WI ومعايير الجودة FI' : 'Standard Work Instructions & Quality Criteria'
      };
    case 'C':
      return {
        code: 'Cat C',
        name: isArabic ? 'الآلات والتجهيزات' : 'Machines & Tools',
        desc: isArabic ? 'ضغط الكمبريسر، ماكينات الفحص، وعزم المفكات' : 'Air Pressure, Test Benches & Tool Calibration'
      };
    case 'D':
      return {
        code: 'Cat D',
        name: isArabic ? 'القياس والتتبع' : 'Measurement & QA',
        desc: isArabic ? 'العينة المعيارية، نظام التتبع، وسجلات الفحص' : 'Golden Sample, Traceability & Quality Logs'
      };
    case 'E':
      return {
        code: 'Cat E',
        name: isArabic ? 'المواد ونظافة 5S' : 'Materials & 5S',
        desc: isArabic ? 'مطابقة كيت التشغيل، إخلاء الخط، وبيئة 5S' : 'Kit Matching, Line Clearance & 5S'
      };
    case 'A & D':
      return {
        code: 'Cat A & D',
        name: isArabic ? 'الكوادر والجودة' : 'People & Quality',
        desc: isArabic ? 'تأهيل المشغلين والسلامة ومطابقة معايير الجودة' : 'Skill Matrix, HSE & Quality Compliance'
      };
    case 'B & C':
      return {
        code: 'Cat B & C',
        name: isArabic ? 'التعليمات والأدوات' : 'Methods & Tools',
        desc: isArabic ? 'تعليمات التشغيل ومعايرة عزم المفكات والمثبتات' : 'WI Display, Torque Screwdrivers & Fixtures'
      };
    case 'C & D':
      return {
        code: 'Cat C & D',
        name: isArabic ? 'التجهيزات والتتبع' : 'Machines & QA',
        desc: isArabic ? 'سيرفر التتبع، العينة المعيارية، ومحطات الفحص' : 'Traceability Database, Golden Sample & QC'
      };
    case 'D & E':
      return {
        code: 'Cat D & E',
        name: isArabic ? 'التغليف وبيئة 5S' : 'Packaging & 5S',
        desc: isArabic ? 'كراتين التغليف، ملصقات الشحن، ونظافة 5S' : 'Packing Boxes, Shipping Labels & 5S Clearance'
      };
    default:
      return { code: `Cat ${cat}`, name: `Cat ${cat}`, desc: '' };
  }
}

// ─── Stations Mapping & Formatting Helper ─────────────────────────────────────
export function getStationsDisplay(stations, isArabic) {
  if (!stations || stations.length === 0) {
    return {
      isAll: false,
      label: isArabic ? '—' : '—',
      short: '—',
      names: ''
    };
  }

  if (stations.length >= 8) {
    return {
      isAll: true,
      label: isArabic ? 'جميع الـ 8 محطات (1 - 8)' : 'All 8 Stations (1 - 8)',
      short: isArabic ? 'كامل الـ 8 محطات' : 'All 8 Stations',
      names: isArabic ? '1.التجميع 2.العزل 3.التردد 4.المعايرة 5.الفحص 6.التخصيص 7.التغليف 8.الفيرموير' : '1.Assembly 2.Insulation 3.RF 4.Calibration 5.Multin 6.Perso 7.Packaging 8.FW'
    };
  }

  const map = {
    'Assembly': { num: 1, ar: 'التجميع', en: 'Assembly' },
    'Insulation': { num: 2, ar: 'العزل', en: 'Insulation' },
    'RF': { num: 3, ar: 'التردد', en: 'RF' },
    'Calibration': { num: 4, ar: 'المعايرة', en: 'Calibration' },
    'Multin test': { num: 5, ar: 'الفحص الشامل', en: 'Multin test' },
    'Perso': { num: 6, ar: 'التخصيص', en: 'Perso' },
    'Packaging': { num: 7, ar: 'التغليف', en: 'Packaging' },
    'Firmware update': { num: 8, ar: 'الفيرموير', en: 'Firmware' }
  };

  const matched = stations.map(s => map[s] || { num: '?', ar: s, en: s });
  matched.sort((a, b) => (typeof a.num === 'number' && typeof b.num === 'number') ? a.num - b.num : 0);

  const numsAr = matched.map(m => m.num).join('، ');
  const numsEn = matched.map(m => m.num).join(', ');
  const names = matched.map(m => isArabic ? `${m.num}.${m.ar}` : `${m.num}.${m.en}`).join(isArabic ? '، ' : ', ');

  return {
    isAll: false,
    label: isArabic ? `محطات (${numsAr}): ${names}` : `Stations (${numsEn}): ${names}`,
    short: isArabic ? `محطات: ${numsAr}` : `St: ${numsEn}`,
    names
  };
}

// ─── Streamlined Checklist Items with Detailed Inspection Criteria ───────────
// Form PSM-CHK-06-2026 (Start of Production Checklist / قائمة تحقق بدء الإنتاج)
const CHECKLIST_ITEMS = [
  {
    id: 'chk-0',
    cat: 'A',
    title: 'Pre-Shift Standup Meeting & Shift Briefing',
    arabicTitle: 'اجتماع الوقوف وبداية الوردية (Standup Meeting) والتوجيهات',
    stations: ALL_STATION_IDS,
    critical: true,
    tag: 'Briefing & Alignment',
    color: '#4f46e5',
    summary: 'Conducted pre-shift standup meeting with all line operators, reviewed daily targets, previous shift defects/lessons learned, and assigned station roles.',
    arabicSummary: 'عقد اجتماع الوقوف الصباحي السريع مع جميع مشغلي الخط، استعراض أهداف الوردية، مناقشة أخطاء وعيوب الوردية السابقة، وتوزيع المهام على المحطات.',
    details: [
      'Line operators attendance check completed across all 8 stations; all critical workstations manned and ready.',
      'Daily production targets, meter batch numbers, and scheduled run plan clearly communicated.',
      'Quality & defect briefing: review of previous shift defects, KO boards, and lessons learned to prevent recurrence.',
      'Workstation assignment confirmed, safety/HSE reminders briefed, and operator questions addressed.'
    ],
    arabicDetails: [
      'حصر حضور مشغلي الخط لكافة الـ 8 محطات والتأكد من تواجد وتغطية مشغلي المحطات الحساسة في مواقعهم.',
      'استعراض أهداف الإنتاج اليومية، رقم تشغيلة العدادات (Batch)، وخطة التشغيل الزمنية بدقة.',
      'مراجعة تنبيهات الجودة وأعطال الوردية السابقة وحالات التوقف (KO) لتفادي تكرارها.',
      'تأكيد توزيع المهام على المحطات، والتذكير بتعليمات السلامة المهنية وتفريغ الشحنات (ESD).'
    ]
  },
  {
    id: 'chk-1',
    cat: 'A & D',
    title: 'Operator Qualification, HSE & Safety Standards',
    arabicTitle: 'تأهيل المشغلين (Skill Grid) والسلامة المهنية (HSE/PPE) والالتزام',
    stations: ALL_STATION_IDS,
    critical: true,
    tag: 'People & HSE',
    color: '#0284c7',
    summary: 'Operators qualified in skill matrix, wearing full PPE, and compliant with safety & workstation rules.',
    arabicSummary: 'التأكد من إدراج وتأهيل المشغلين بقائمة المهارات، ارتداء مهمات الوقاية كاملة، والالتزام بقواعد السلامة والعمل ومعايير الجودة.',
    details: [
      'Operators listed in Skill Matrix & certified for their assigned station across the 8 production stages.',
      'Required PPE worn: safety shoes, ESD lab coats, grounded wrist straps, and hairnets/gloves where applicable.',
      'Emergency stop buttons and workstation safety rules fully understood by all active operators.'
    ],
    arabicDetails: [
      'اعتماد وتأهيل المشغلين في مصفوفة المهارات (Skill Matrix) للعمل على المحطة المحددة عبر الـ 8 محطات.',
      'الالتزام الكامل بارتداء مهمات الوقاية الشخصية (أحذية السلامة، روب ESD، أساور التأريض، وقفازات/أغطية الشعر عند اللزوم).',
      'التأكد من جاهزية أزرار الإيقاف في حالات الطوارئ (Emergency Stop) واستيعاب قواعد السلامة بمواقع العمل.'
    ]
  },
  {
    id: 'chk-2',
    cat: 'B & C',
    title: 'Work Instructions (WI/FI) & Tool Calibration',
    arabicTitle: 'تعليمات العمل المعتمدة (WI/FI) وصلاحية معايرة الأدوات والمثبتات',
    stations: ALL_STATION_IDS,
    critical: true,
    tag: 'Standards & Tools',
    color: '#7c3aed',
    summary: 'Latest signed work instructions mounted & readable; electric torque screwdrivers and assembly jigs calibrated.',
    arabicSummary: 'توفر تعليمات العمل المحدثة والموقعة ومقروءة، وتوفر الأدوات والمثبتات (Fixtures/Torque) مع ملصقات معايرة سارية.',
    details: [
      'Latest revision signed Work Instructions (WI) and Quality Inspection standards (FI) displayed and readable at each of the 8 stations.',
      'Electric torque screwdrivers verified with valid calibration tags and set to specified torque (Nm) for terminal/cover screws.',
      'Assembly jigs, fixtures, holding clamps, and manual presses inspected for wear, alignment, and secure mounting.',
      'Workbench ESD grounding mats and ground wires verified and physically connected.'
    ],
    arabicDetails: [
      'توفر تعليمات العمل المعتمدة (WI) ومعايير فحص الجودة (FI) محدثة وموقعة ومقروءة عند كل محطة من المحطات الـ 8.',
      'فحص المفكات الكهربائية (Torque Screwdrivers) والتأكد من ملصقات المعايرة السارية وضبط عزم الدوران (Nm) بدقة.',
      'فحص مثبتات التجميع والمكابس اليدوية (Fixtures/Jigs) للتأكد من خلوها من التآكل وتثبيتها بإحكام.',
      'التحقق من توصيل بساط تفريغ الشحنات الكهربائية (ESD Grounding Mats) وأسلاك التأريض بجميع طاولات العمل.'
    ]
  },
  {
    id: 'chk-3',
    cat: 'C',
    title: 'Air Compressor, Machines & Test Benches',
    arabicTitle: 'ضغط الكمبريسر، جاهزية الآلات ومحطات فحص Multin test وتحديث الفيرموير',
    stations: ['Assembly', 'Calibration', 'Multin test', 'Firmware update'],
    critical: true,
    tag: 'Machines & Air',
    color: '#059669',
    summary: 'Air compressor pressure nominal (6-8 Bar), Multin test & Calibration benches active with zero alarm codes, and Firmware update PCs connected.',
    arabicSummary: 'فحص ضغط الهواء بالكمبريسر، جاهزية أجهزة الاختبار Multin test والمعايرة والآلات، ونظام تحديث الفيرموير بدون أي أعطال أو إنذارات.',
    details: [
      'Central air compressor operating pressure within nominal range (6.0 - 8.0 Bar) with zero moisture or air leaks.',
      'Calibration and Multin test benches powered on, calibration due dates valid, and automated testing software running with zero error codes.',
      'Firmware Update PCs connected to local network with firmware flashing directories active and synchronized.',
      'Laser marking machines, label printers, and handheld barcode scanners operational and communicating.'
    ],
    arabicDetails: [
      'ضغط الهواء بالكمبريسر المركزي ضمن النطاق المعياري (6.0 - 8.0 Bar) مع خلو الخطوط من أي تسريب أو رطوبة.',
      'تشغيل محطات المعايرة والفحص الشامل (Multin test)، سريان صلاحية المعايرة، وعمل برامج الاختبار دون أي إنذارات أو أكواد أخطاء.',
      'اتصال أجهزة تحديث الفيرموير (Firmware Update PCs) بالشبكة الداخلية وتزامن مجلدات تسجيل الفيرموير (Logs).',
      'جاهزية ماكينات وسم الليزر وطابعات ملصقات الباركود وقارئات الباركود اليدوية للعمل بكفاءة.'
    ]
  },
  {
    id: 'chk-4',
    cat: 'C & D',
    title: 'Traceability System, Golden Sample & Quality Verification',
    arabicTitle: 'نظام التتبع (Traceability)، فحص العينة المعيارية وجودة المحطات',
    stations: ['RF', 'Calibration', 'Multin test', 'Perso', 'Firmware update'],
    critical: true,
    tag: 'Traceability & Quality',
    color: '#0891b2',
    summary: 'Traceability server connected, pre-shift golden sample test passed 100%, and defect logging sheets ready.',
    arabicSummary: 'فحص نظام التتبع وقارئات الباركود، اجتياز العينة المعيارية لاختبار الـ Multin test والمعايرة بنجاح 100%، وجاهزية سجلات الفحص.',
    details: [
      'Traceability database online; automated serial number, RF test, and MAC address logging confirmed without latency.',
      'Pre-shift "Golden Sample" / Reference Meter run completed on test benches with 100% PASS result.',
      'Quality defect logging sheets and digital inspection forms ready at each inspection checkpoint.',
      'Defect classification guide and visual quality acceptance samples visible at inspection stations.'
    ],
    arabicDetails: [
      'اتصال قاعدة بيانات نظام التتبع (Traceability) ومطابقة قراءة الأرقام التسلسلية وفحص RF وعناوين الماك (MAC) فورياً دون تأخير.',
      'اجتياز اختبار العينة المعيارية (Golden Sample) بنجاح 100% (PASS) على أجهزة الفحص قبل بدء تشغيل الوردية.',
      'جاهزية سجلات ونماذج الفحص الرقمية والورقية لتوثيق أي عيوب أو ملاحظات عند نقاط التفتيش.',
      'توفر دليل تصنيف العيوب ونماذج العينات البصرية المقبولة والمعيبة بوضوح عند محطات الفحص.'
    ]
  },
  {
    id: 'chk-5',
    cat: 'E',
    title: 'Raw Materials, Components & Kit Batch Matching',
    arabicTitle: 'فحص المواد الخام ومطابقة كيت الباتش مع أمر التشغيل',
    stations: ['Assembly', 'Insulation', 'Perso', 'Packaging'],
    critical: true,
    tag: 'Materials & Kit',
    color: '#d97706',
    summary: 'Raw materials verified, kit batch strictly matched with work order to prevent model mix-up, and line clearance completed.',
    arabicSummary: 'التحقق من صحة تعريف المواد الخام والمكونات، وتطابق دفعة الكيت مع أمر التشغيل دون أي خلط لمواد سابقة.',
    details: [
      'Kit batch numbers strictly verified against today’s production work order to prevent mixed meter configurations.',
      'Staged raw materials (terminal blocks, base covers, top covers, screws, seals, and PCBA boards) inspected and labeled.',
      'Line Clearance: all parts, loose boards, and finished goods from previous shift completely removed from workbenches.',
      'Component staging buffers (trolleys and bins) verified with adequate quantities to sustain production.'
    ],
    arabicDetails: [
      'مطابقة رقم دفعة الكيت (Kit Batch) مع أمر التشغيل اليومي لتفادي أي خلط في موديلات أو إعدادات العدادات.',
      'فحص وتعريف المواد المجهزة (الروزتة، القواعد، الأغطية، البراغي، الأختام، وبوردات PCBA المعتمدة).',
      'إخلاء الخط (Line Clearance): إزالة كافة القطع والمكونات وبوردات الوردية السابقة والمنتجات المكتملة تماماً.',
      'التحقق من كفاية المواد في عربات وسلال التخزين المؤقت لاستمرار التدفق الإنتاجي دون انقطاع.'
    ]
  },
  {
    id: 'chk-6',
    cat: 'D & E',
    title: 'Packaging, Palletizing & 5S Line Clearance',
    arabicTitle: 'التغليف النهائي، الملصقات، نظافة 5S وتفريغ الهالك والكراتين',
    stations: ALL_STATION_IDS,
    critical: true,
    tag: 'Packaging & 5S',
    color: '#dc2626',
    summary: 'Packaging cartons, barcode shipping labels & certificates verified; 5S clean, cartoon & red scrap bins emptied.',
    arabicSummary: 'التأكد من جودة كراتين التغليف والملصقات والشهادات، ونظافة محطات العمل 5S، وخلو الخط وتفريغ حاويات الكراتين والهالك.',
    details: [
      'Outer packaging cartons, dividers, bubble wrap, and strapping bands inspected and ready for packing.',
      'Shipping barcode labels, serial number stickers, and calibration test certificates staged and verified.',
      'Palletizing setup verified: solid wooden/plastic pallets, corner protectors available, standard stacking height adhered to.',
      'Workstations 5S clean and organized; cardboard bins cleared, and scrap/reject bins emptied and tagged with red labels.'
    ],
    arabicDetails: [
      'فحص كراتين التغليف الخارجية، القواطع الكرتونية، مواد التبطين، وأشرطة التحزيم وتجهيزها للتعبئة.',
      'مطابقة ملصقات الباركود الخارجية، لاصقات الأرقام التسلسلية، وشهادات المعايرة المعتمدة المطبوعة.',
      'تجهيز باليتات الشحن السليمة، توفر زوايا الحماية الكرتونية، والالتزام بارتفاع الرص المعياري الآمن.',
      'تنظيم المحطات وفق منهجية 5S وتفريغ حاويات الهالك (Reject Bins) والصناديق الكرتونية الفارغة ووضع البطاقات الحمراء.'
    ]
  }
];

function getTodayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getInitialShift() {
  const hour = new Date().getHours();
  return (hour >= 6 && hour < 18) ? 'Day' : 'Night';
}

export default function PreProductionChecklist() {
  const { user } = useAuth();
  const { isArabic, t } = useLanguage();
  const isViewer = user?.access === 'viewer';
  const isAdmin = user?.access === 'admin';

  // Official Form Header Fields (Form No: PSM-CHK-06-2026, Rev: 00)
  const [activeDate, setActiveDate] = useState(getTodayString());
  const [activeShift, setActiveShift] = useState(getInitialShift());
  const [supervisorName, setSupervisorName] = useState(user?.name || 'Supervisor');
  const [generalNotes, setGeneralNotes] = useState('');

  // Station filter ('ALL', 'Assembly', 'Calibration', 'Multi-Test', 'Packaging')
  const [stationFilter, setStationFilter] = useState('ALL');

  // Expanded details cards state { [itemId]: boolean } (hidden by default)
  const [expandedDetails, setExpandedDetails] = useState(() => {
    const exp = {};
    CHECKLIST_ITEMS.forEach(it => { exp[it.id] = false; });
    return exp;
  });

  // Status mapping: { [itemId]: { status: 'PASS' | 'FAIL' | 'PENDING', note: '' } }
  const [itemStatuses, setItemStatuses] = useState(() => {
    const initial = {};
    CHECKLIST_ITEMS.forEach(it => {
      initial[it.id] = { status: 'PENDING', note: '' };
    });
    return initial;
  });

  // History records
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printModalRecord, setPrintModalRecord] = useState(null);

  const openPrintModal = (rec = null) => {
    setPrintModalRecord(rec);
    setShowPrintModal(true);
  };

  // Morning Standup Meeting Attendance for chk-0
  const [standupAttendance, setStandupAttendance] = useState([]);

  // Fetch operators belonging to the active supervisor
  useEffect(() => {
    supabase.from('users').select('*').eq('access', 'operator').then(res => {
      const allOps = res.data || [];
      const myOps = allOps.filter(op => {
        try {
          const meta = JSON.parse(op.team_name);
          return meta.supervisor?.trim().toLowerCase() === supervisorName?.trim().toLowerCase();
        } catch {
          return false;
        }
      });

      const targetOps = myOps.length > 0 ? myOps : (user?.access === 'admin' ? allOps : []);

      setStandupAttendance(prev => {
        const map = {};
        prev.forEach(p => { map[p.id] = p; });

        return targetOps.map(op => ({
          id: op.id,
          name: op.name,
          company_id: op.company_id,
          status: map[op.id]?.status || 'PRESENT',
          reason: map[op.id]?.reason || ''
        }));
      });
    });
  }, [supervisorName, user]);

  const handleSetOperatorAttendance = (opId, status) => {
    setStandupAttendance(prev => prev.map(op => {
      if (op.id === opId) {
        return { ...op, status, reason: status === 'PRESENT' ? '' : op.reason };
      }
      return op;
    }));
  };

  const handleSetOperatorReason = (opId, reason) => {
    setStandupAttendance(prev => prev.map(op => {
      if (op.id === opId) {
        return { ...op, reason };
      }
      return op;
    }));
  };

  const handleMarkAllAttendancePresent = () => {
    setStandupAttendance(prev => prev.map(op => ({
      ...op,
      status: 'PRESENT',
      reason: ''
    })));
  };

  // History search & filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyShiftFilter, setHistoryShiftFilter] = useState('ALL');

  // Auto-fill supervisor name when user logs in
  useEffect(() => {
    if (user?.name && supervisorName === 'Supervisor') {
      setSupervisorName(user.name);
    }
  }, [user, supervisorName]);

  // Load history from Supabase / localStorage
  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pre_production_checklists')
        .select('*')
        .order('date', { ascending: false })
        .order('id', { ascending: false });

      if (error) {
        const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        setHistoryRecords(local);
      } else {
        setHistoryRecords(data || []);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data || []));
      }
    } catch {
      const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      setHistoryRecords(local);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Set individual item status (PASS / FAIL / PENDING)
  const setItemStatus = (itemId, status) => {
    setItemStatuses(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status
      }
    }));
  };

  const setItemNote = (itemId, note) => {
    setItemStatuses(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        note
      }
    }));
  };

  // Toggle detail list view for an item
  const toggleDetails = (itemId) => {
    setExpandedDetails(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Quick Action: Mark all items as PASS
  const markAllPass = () => {
    setItemStatuses(prev => {
      const next = { ...prev };
      CHECKLIST_ITEMS.forEach(it => {
        next[it.id] = { ...next[it.id], status: 'PASS' };
      });
      return next;
    });
  };

  // Reset current checklist
  const resetCurrentChecklist = () => {
    if (window.confirm('Reset all checklist verification selections?')) {
      const reset = {};
      CHECKLIST_ITEMS.forEach(it => {
        reset[it.id] = { status: 'PENDING', note: '' };
      });
      setItemStatuses(reset);
      setGeneralNotes('');
    }
  };

  // KPI & Readiness Statistics (PASS / FAIL / PENDING)
  const stats = useMemo(() => {
    let total = CHECKLIST_ITEMS.length;
    let passedCount = 0;
    let failedCount = 0;
    let pendingCount = 0;
    let criticalFailedCount = 0;

    CHECKLIST_ITEMS.forEach(it => {
      const st = itemStatuses[it.id]?.status || 'PENDING';
      if (st === 'PASS') passedCount++;
      else if (st === 'FAIL') {
        failedCount++;
        if (it.critical) criticalFailedCount++;
      } else {
        pendingCount++;
      }
    });

    const readinessPct = total > 0 ? Math.round((passedCount / total) * 100) : 0;

    let overallStatus = 'PENDING';
    if (failedCount > 0) {
      overallStatus = criticalFailedCount > 0 ? 'CRITICAL_BLOCKER' : 'FAILED_ISSUES';
    } else if (pendingCount === 0 && passedCount === total) {
      overallStatus = 'LINE_CLEARED_PASS';
    } else if (passedCount > 0) {
      overallStatus = 'IN_PROGRESS';
    }

    return { total, passedCount, failedCount, pendingCount, criticalFailedCount, readinessPct, overallStatus };
  }, [itemStatuses]);

  // Filtered items based on active station filter
  const displayedItems = useMemo(() => {
    if (stationFilter === 'ALL') return CHECKLIST_ITEMS;
    return CHECKLIST_ITEMS.filter(it => it.stations.includes(stationFilter));
  }, [stationFilter]);

  // Save / Sign-off current verification
  const handleSaveChecklist = async () => {
    if (isViewer) {
      alert('Viewers have read-only permissions.');
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg('');

    const payload = {
      form_no: 'PSM-CHK-06-2026',
      rev: '00',
      date: activeDate,
      shift: activeShift,
      supervisor: supervisorName.trim() || 'Supervisor',
      status: stats.overallStatus,
      readiness_pct: stats.readinessPct,
      passed_count: stats.passedCount,
      failed_count: stats.failedCount,
      total_items: stats.total,
      item_details: {
        ...itemStatuses,
        'chk-0': {
          ...itemStatuses['chk-0'],
          attendance: standupAttendance
        }
      },
      general_notes: generalNotes.trim(),
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('pre_production_checklists')
        .insert([payload])
        .select();

      if (error) {
        const newRecord = { ...payload, id: Date.now() };
        const updated = [newRecord, ...historyRecords];
        setHistoryRecords(updated);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } else if (data && data[0]) {
        setHistoryRecords(prev => [data[0], ...prev]);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([data[0], ...historyRecords]));
      }

      setSaveSuccessMsg(`Checklist signed off & saved successfully for ${activeShift} Shift! Readiness: ${stats.readinessPct}%`);
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    } catch {
      const newRecord = { ...payload, id: Date.now() };
      const updated = [newRecord, ...historyRecords];
      setHistoryRecords(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      setSaveSuccessMsg(`Saved locally for ${activeShift} Shift!`);
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete history item (Strictly Admin only)
  const handleDeleteHistory = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm('Delete this checklist inspection record?')) return;
    try {
      await supabase.from('pre_production_checklists').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete error:', e);
    }
    const filtered = historyRecords.filter(r => r.id !== id);
    setHistoryRecords(filtered);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historyRecords.filter(r => {
      const matchSearch = historySearch === '' ||
        (r.supervisor && r.supervisor.toLowerCase().includes(historySearch.toLowerCase())) ||
        (r.date && r.date.includes(historySearch));
      const matchShift = historyShiftFilter === 'ALL' || r.shift === historyShiftFilter;
      return matchSearch && matchShift;
    });
  }, [historyRecords, historySearch, historyShiftFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 60 }}>
      {/* ── Status Banner ── */}
      {saveSuccessMsg && (
        <div style={{
          background: '#dcfce7',
          color: '#15803d',
          border: '1px solid #bbf7d0',
          padding: '12px 18px',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontWeight: 700
        }}>
          <CheckCircle2 size={20} />
          {saveSuccessMsg}
        </div>
      )}

      {/* ── Official Form Header (Form PSM-CHK-06-2026) ── */}
      <div className="card-white" style={{ padding: '16px 20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 14 }}>
          {/* Logo & Form Details */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src="/ectron-logo.png" alt="ECTRON" style={{ height: 38, objectFit: 'contain' }} />
            <div style={{ borderLeft: isArabic ? 'none' : '2px solid #cbd5e1', borderRight: isArabic ? '2px solid #cbd5e1' : 'none', paddingLeft: isArabic ? 0 : 14, paddingRight: isArabic ? 14 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 900, color: 'var(--navy)' }}>
                  {t('checklistTitle')}
                </h2>
                <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>
                  Form No: PSM-CHK-06-2026
                </span>
                <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                  Rev: 00
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                {t('checklistSubtitle')}
              </p>
            </div>
          </div>

          {/* Quick Header Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button 
              type="button" 
              className="btn-outline" 
              onClick={() => openPrintModal(null)} 
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}
            >
              <Printer size={15} /> {t('printForm')}
            </button>
            <button 
              type="button" 
              className="btn-outline" 
              onClick={markAllPass}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: '#10b981', color: '#047857', fontWeight: 800, fontSize: '0.82rem' }}
            >
              <CheckCircle2 size={16} /> {t('quickMarkAllPass')}
            </button>
            <button 
              type="button" 
              className="btn-primary" 
              disabled={isSaving || isViewer}
              onClick={handleSaveChecklist}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 8,
                background: stats.overallStatus === 'CRITICAL_BLOCKER' 
                  ? '#ef4444' 
                  : (stats.overallStatus === 'LINE_CLEARED_PASS' ? '#10b981' : '#0284c7'),
                borderColor: 'transparent',
                fontWeight: 800,
                fontSize: '0.85rem'
              }}
            >
              <Save size={16} />
              {isSaving ? t('signingOff') : t('signOffLine')}
            </button>
          </div>
        </div>

        {/* ── Metadata Grid (Supervisor, Shift: Day/Night, Date) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, paddingTop: 14 }}>
          {/* Supervisor / المشرف */}
          <div>
            <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Users size={13} color="#7c3aed" /> {t('supervisor')}:
            </label>
            <input 
              type="text" 
              className="search-input" 
              value={supervisorName} 
              onChange={e => setSupervisorName(e.target.value)} 
              placeholder={isArabic ? 'اسم المشرف' : 'Supervisor name'}
              style={{ fontWeight: 700, fontSize: '0.84rem' }}
            />
          </div>

          {/* Shift / الوردية (Day / Night only) */}
          <div>
            <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Clock size={13} color="#d97706" /> {t('shift')}:
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'Day', label: isArabic ? 'نهاري' : 'Day', icon: '☀️' },
                { key: 'Night', label: isArabic ? 'ليلي' : 'Night', icon: '🌙' }
              ].map(sh => (
                <button
                  key={sh.key}
                  type="button"
                  onClick={() => setActiveShift(sh.key)}
                  style={{
                    flex: 1,
                    padding: '7px 12px',
                    borderRadius: 6,
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    border: activeShift === sh.key ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: activeShift === sh.key ? '#e0f2fe' : '#ffffff',
                    color: activeShift === sh.key ? '#0369a1' : '#64748b'
                  }}
                >
                  {sh.icon} {sh.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date / التاريخ */}
          <div>
            <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Calendar size={13} color="#dc2626" /> {t('date')}:
            </label>
            <input 
              type="date" 
              className="search-input" 
              value={activeDate} 
              onChange={e => setActiveDate(e.target.value)} 
              style={{ fontWeight: 700, fontSize: '0.84rem' }}
            />
          </div>
        </div>
      </div>

      {/* ── Sleek Compact KPI & Readiness Score Bar ── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', 
        gap: 10,
        marginBottom: 16
      }}>
        {/* 1. Readiness Score */}
        <div style={{
          background: 'var(--white)',
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: stats.overallStatus === 'LINE_CLEARED_PASS' ? '#dcfce7' : (stats.overallStatus === 'CRITICAL_BLOCKER' ? '#fee2e2' : '#e0f2fe'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {stats.overallStatus === 'LINE_CLEARED_PASS' ? (
              <ShieldCheck size={20} color="#16a34a" />
            ) : stats.overallStatus === 'CRITICAL_BLOCKER' ? (
              <AlertTriangle size={20} color="#dc2626" />
            ) : (
              <Clock size={20} color="#0284c7" />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {t('lineReadinessScore')}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 900, color: stats.overallStatus === 'LINE_CLEARED_PASS' ? '#16a34a' : (stats.overallStatus === 'CRITICAL_BLOCKER' ? '#dc2626' : 'var(--navy)') }}>
                {stats.readinessPct}%
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: stats.overallStatus === 'LINE_CLEARED_PASS' ? '#16a34a' : (stats.overallStatus === 'CRITICAL_BLOCKER' ? '#dc2626' : '#64748b'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {stats.overallStatus === 'LINE_CLEARED_PASS' ? (isArabic ? 'جاهز' : 'Ready') : (stats.overallStatus === 'CRITICAL_BLOCKER' ? (isArabic ? 'مانع حرج' : 'Blocker') : (isArabic ? 'قيد الفحص' : 'Pending'))}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Verified PASS */}
        <div style={{
          background: 'var(--white)',
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <CheckCircle2 size={20} color="#16a34a" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {t('verifiedPass')}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#16a34a' }}>
                {stats.passedCount}
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>
                / {stats.total}
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16a34a', marginInlineStart: 'auto' }}>
                {isArabic ? 'مطابق' : 'Pass'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Failed / Issues */}
        <div style={{
          background: 'var(--white)',
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: stats.failedCount > 0 ? '#fee2e2' : '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <XCircle size={20} color={stats.failedCount > 0 ? '#dc2626' : '#64748b'} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {t('failedIssues')}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 900, color: stats.failedCount > 0 ? '#dc2626' : '#64748b' }}>
                {stats.failedCount}
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: stats.failedCount > 0 ? '#dc2626' : '#64748b', marginInlineStart: 'auto' }}>
                {stats.failedCount > 0 ? (isArabic ? 'يتطلب معالجة' : 'Issues') : (isArabic ? 'لا معوقات' : 'Zero')}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Remaining Pending */}
        <div style={{
          background: 'var(--white)',
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: stats.pendingCount > 0 ? '#fef3c7' : '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Clock size={20} color={stats.pendingCount > 0 ? '#d97706' : '#16a34a'} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {t('remainingPending')}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 900, color: stats.pendingCount > 0 ? '#d97706' : '#16a34a' }}>
                {stats.pendingCount}
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: stats.pendingCount > 0 ? '#d97706' : '#16a34a', marginInlineStart: 'auto' }}>
                {stats.pendingCount === 0 ? (isArabic ? 'مكتمل' : 'All done') : (isArabic ? 'متبقي' : 'Pending')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Station Filter Tabs (8 Stations) ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: '#f8fafc', padding: '8px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--navy)' }}>{t('filterByStation')}</span>
          <button
            type="button"
            onClick={() => setStationFilter('ALL')}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              border: stationFilter === 'ALL' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
              background: stationFilter === 'ALL' ? '#e0f2fe' : '#ffffff',
              color: stationFilter === 'ALL' ? '#0369a1' : '#64748b'
            }}
          >
            {t('allStations')}
          </button>
          {STANDARD_8_STATIONS.map(st => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStationFilter(st.id)}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: stationFilter === st.id ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                background: stationFilter === st.id ? '#e0f2fe' : '#ffffff',
                color: stationFilter === st.id ? '#0369a1' : '#64748b'
              }}
            >
              {st.num}. {isArabic ? st.nameAr : st.nameEn}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            const allOpen = Object.values(expandedDetails).every(Boolean);
            const next = {};
            CHECKLIST_ITEMS.forEach(it => { next[it.id] = !allOpen; });
            setExpandedDetails(next);
          }}
          style={{
            border: '1.5px solid #0284c7',
            background: Object.values(expandedDetails).every(Boolean) ? '#0284c7' : '#f0f9ff',
            color: Object.values(expandedDetails).every(Boolean) ? '#ffffff' : '#0369a1',
            fontSize: '0.86rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.15s ease'
          }}
        >
          {Object.values(expandedDetails).every(Boolean) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span>{Object.values(expandedDetails).every(Boolean) ? (isArabic ? 'إخفاء كافة معايير الفحص' : 'Collapse All') : (isArabic ? '🔍 عرض كافة معايير الفحص' : 'Expand All Checkpoints')}</span>
        </button>
      </div>

      {/* ── Interactive Checklist Cards with PASS / FAIL Status ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {displayedItems.map((item, idx) => {
          const currentStatus = itemStatuses[item.id]?.status || 'PENDING';
          const currentNote = itemStatuses[item.id]?.note || '';
          const isPass = currentStatus === 'PASS';
          const isFail = currentStatus === 'FAIL';
          const isPending = currentStatus === 'PENDING';
          const isDetailsOpen = expandedDetails[item.id];

          return (
            <div 
              key={item.id} 
              className="card-white" 
              style={{ 
                padding: '16px 20px', 
                border: isFail ? '2px solid #f87171' : (isPass ? '1px solid #86efac' : '1px solid #cbd5e1'),
                background: isFail ? '#fff8f8' : (isPass ? '#fafffd' : '#ffffff'),
                boxShadow: isFail ? '0 2px 10px rgba(220, 38, 38, 0.08)' : '0 2px 6px rgba(0,0,0,0.02)'
              }}
            >
              {/* Card Header & Status Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                {/* Item Titles & Badges */}
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    {/* Category with clarification */}
                    {(() => {
                      const catInfo = getCategoryInfo(item.cat, isArabic);
                      return (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: '0.76rem',
                            fontWeight: 900,
                            background: '#f1f5f9',
                            color: 'var(--navy)',
                            border: '1px solid #cbd5e1'
                          }}>
                            {catInfo.code}
                          </span>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            color: '#0284c7',
                            background: '#f0f9ff',
                            padding: '2px 8px',
                            borderRadius: 6,
                            border: '1px solid #bae6fd'
                          }}>
                            {catInfo.name}
                          </span>
                        </div>
                      );
                    })()}
                    
                    {/* Primary Title */}
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: isArabic ? '1.26rem' : '1.12rem', 
                      fontWeight: 900, 
                      color: 'var(--navy)',
                      lineHeight: 1.4
                    }}>
                      {isArabic ? (item.arabicTitle || item.title) : item.title}
                    </h3>

                    {item.critical && (
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 900,
                        background: '#fee2e2',
                        color: '#b91c1c',
                        padding: '3px 10px',
                        borderRadius: 6,
                        border: '1px solid #fca5a5'
                      }}>
                        {isArabic ? 'إلزامي (MANDATORY)' : 'MANDATORY'}
                      </span>
                    )}
                  </div>

                  {/* Secondary Title (only in Arabic mode) */}
                  {isArabic && (
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
                      {item.title}
                    </div>
                  )}

                  <p style={{ margin: '6px 0 10px', fontSize: '0.96rem', color: '#1e293b', lineHeight: 1.6, fontWeight: 600 }}>
                    {isArabic && item.arabicSummary ? item.arabicSummary : item.summary}
                  </p>

                  {/* Stations badges (8 Stations Aware) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                      {isArabic ? 'المحطات المشمولة:' : 'Applicable Stations:'}
                    </span>
                    {(() => {
                      const stInfo = getStationsDisplay(item.stations, isArabic);
                      if (stInfo.isAll) {
                        return (
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: 6,
                            background: '#f0fdf4',
                            color: '#166534',
                            border: '1px solid #bbf7d0'
                          }}>
                            {stInfo.label}
                          </span>
                        );
                      }
                      return (
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: 6,
                          background: '#f0f9ff',
                          color: '#0369a1',
                          border: '1px solid #bae6fd'
                        }}>
                          {stInfo.label}
                        </span>
                      );
                    })()}
                  </div>

                  {item.id === 'chk-0' && (
                    <div style={{
                      marginTop: 14,
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: 10,
                      padding: 14,
                      width: '100%',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10,
                        paddingBottom: 10,
                        borderBottom: '1px solid #e2e8f0',
                        marginBottom: 12
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '1rem' }}>📋</span>
                          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--navy)' }}>
                            {isArabic ? 'كشف حضور اجتماع الوقوف الصباحي والوردية' : 'Morning Standup Meeting Attendance'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {/* Summary Badges */}
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 12, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                            🟢 {isArabic ? 'حاضر:' : 'Present:'} {standupAttendance.filter(a => a.status === 'PRESENT').length}
                          </span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 12, background: 'rgba(234, 179, 8, 0.12)', color: '#b45309' }}>
                            🟡 {isArabic ? 'تأخير:' : 'Late:'} {standupAttendance.filter(a => a.status === 'LATE').length}
                          </span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 12, background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                            🔴 {isArabic ? 'غياب:' : 'Absent:'} {standupAttendance.filter(a => a.status === 'ABSENT').length}
                          </span>

                          <button
                            type="button"
                            onClick={handleMarkAllAttendancePresent}
                            style={{
                              border: '1px solid #cbd5e1',
                              background: '#f8fafc',
                              color: '#334155',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {isArabic ? '✔ تحديد الكل حاضر' : 'Mark All Present'}
                          </button>

                          <a
                            href="/crew"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: '#eef2ff',
                              color: '#4338ca',
                              border: '1px solid #c7d2fe',
                              textDecoration: 'none'
                            }}
                          >
                            <span>👥</span>
                            <span>{isArabic ? 'طاقم العمل' : 'Crew Page'}</span>
                            <span style={{ fontSize: '0.65rem' }}>↗</span>
                          </a>
                        </div>
                      </div>

                      {/* Operator List */}
                      {standupAttendance.length === 0 ? (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', padding: 8 }}>
                          {isArabic ? 'لا يوجد مشغلين مسجلين تحت هذا المشرف.' : 'No operators found under this supervisor.'}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {standupAttendance.map(op => (
                            <div
                              key={op.id}
                              style={{
                                background: op.status === 'ABSENT' ? '#fef2f2' : op.status === 'LATE' ? '#fffbeb' : '#f8fafc',
                                border: op.status === 'ABSENT' ? '1px solid #fecaca' : op.status === 'LATE' ? '1px solid #fde68a' : '1px solid #e2e8f0',
                                borderRadius: 8,
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 10
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: '50%',
                                  background: op.status === 'ABSENT' ? '#ef4444' : op.status === 'LATE' ? '#f59e0b' : 'var(--navy)',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.72rem',
                                  fontWeight: 700
                                }}>
                                  {op.name.charAt(0)}
                                </div>
                                <div>
                                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--navy)' }}>
                                    {op.name}
                                  </span>
                                  <span style={{ marginLeft: 6, marginRight: 6, fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                                    #{op.company_id}
                                  </span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                {/* 3 Status Toggle Buttons */}
                                <div style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleSetOperatorAttendance(op.id, 'PRESENT')}
                                    style={{
                                      padding: '4px 10px',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      border: 'none',
                                      background: op.status === 'PRESENT' ? '#10b981' : '#ffffff',
                                      color: op.status === 'PRESENT' ? '#ffffff' : '#475569'
                                    }}
                                  >
                                    🟢 {isArabic ? 'حاضر' : 'Present'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSetOperatorAttendance(op.id, 'LATE')}
                                    style={{
                                      padding: '4px 10px',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      borderLeft: '1px solid #cbd5e1',
                                      borderRight: '1px solid #cbd5e1',
                                      background: op.status === 'LATE' ? '#f59e0b' : '#ffffff',
                                      color: op.status === 'LATE' ? '#ffffff' : '#475569'
                                    }}
                                  >
                                    🟡 {isArabic ? 'تأخير' : 'Late'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSetOperatorAttendance(op.id, 'ABSENT')}
                                    style={{
                                      padding: '4px 10px',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      border: 'none',
                                      background: op.status === 'ABSENT' ? '#ef4444' : '#ffffff',
                                      color: op.status === 'ABSENT' ? '#ffffff' : '#475569'
                                    }}
                                  >
                                    🔴 {isArabic ? 'غياب' : 'Absent'}
                                  </button>
                                </div>

                                {/* Reason / Delay Input if Late or Absent */}
                                {op.status !== 'PRESENT' && (
                                  <input
                                    type="text"
                                    value={op.reason || ''}
                                    onChange={e => handleSetOperatorReason(op.id, e.target.value)}
                                    placeholder={
                                      op.status === 'LATE'
                                        ? (isArabic ? 'سبب أو مدة التأخير (مثال: تأخر 20 دقيقة)...' : 'Reason / duration of delay...')
                                        : (isArabic ? 'سبب عدم الحضور (إجازة مرضية / عذر طارئ / بدون إشعار)...' : 'Reason for absence...')
                                    }
                                    style={{
                                      padding: '4px 10px',
                                      fontSize: '0.75rem',
                                      borderRadius: 6,
                                      border: '1px solid #f59e0b',
                                      minWidth: '220px',
                                      background: '#ffffff'
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Action Buttons: PASS / FAIL */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isArabic ? 'flex-start' : 'flex-end', gap: 6 }}>
                  <div style={{ display: 'inline-flex', gap: 6, background: '#f8fafc', padding: 4, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                    {/* PASS Button */}
                    <button
                      type="button"
                      onClick={() => setItemStatus(item.id, 'PASS')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 18px',
                        borderRadius: 6,
                        fontSize: '0.84rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: isPass ? '2px solid #16a34a' : '1px solid transparent',
                        background: isPass ? '#16a34a' : 'transparent',
                        color: isPass ? '#ffffff' : '#15803d',
                        boxShadow: isPass ? '0 2px 6px rgba(220, 38, 38, 0.35)' : 'none'
                      }}
                    >
                      <CheckCircle2 size={16} /> PASS
                    </button>

                    {/* FAIL Button */}
                    <button
                      type="button"
                      onClick={() => setItemStatus(item.id, 'FAIL')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 18px',
                        borderRadius: 6,
                        fontSize: '0.84rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: isFail ? '2px solid #dc2626' : '1px solid transparent',
                        background: isFail ? '#dc2626' : 'transparent',
                        color: isFail ? '#ffffff' : '#b91c1c',
                        boxShadow: isFail ? '0 2px 6px rgba(220, 38, 38, 0.35)' : 'none'
                      }}
                    >
                      <XCircle size={16} /> FAIL
                    </button>

                    {/* Reset Button */}
                    <button
                      type="button"
                      onClick={() => setItemStatus(item.id, 'PENDING')}
                      title="Reset to Pending"
                      style={{
                        padding: '7px 10px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        border: 'none',
                        background: isPending ? '#e2e8f0' : 'transparent',
                        color: '#94a3b8'
                      }}
                    >
                      <Clock size={15} />
                    </button>
                  </div>

                  {/* Toggle detailed checklist accordion button */}
                  <button
                    type="button"
                    onClick={() => toggleDetails(item.id)}
                    style={{
                      border: '1.5px solid #0284c7',
                      background: isDetailsOpen ? '#0284c7' : '#f0f9ff',
                      color: isDetailsOpen ? '#ffffff' : '#0369a1',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 14px',
                      borderRadius: 8,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease',
                      marginTop: 6
                    }}
                  >
                    {isDetailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <span>
                      {isDetailsOpen 
                        ? (isArabic ? 'إخفاء معايير الفحص والتحقق' : 'Hide Inspection Details') 
                        : (isArabic ? `🔍 عرض معايير الفحص والتحقق الإلزامية (${(item.arabicDetails || item.details).length})` : `🔍 Show Mandatory Criteria (${item.details.length})`)}
                    </span>
                  </button>
                </div>
              </div>

              {/* ── Sub-Checkpoints Details List ── */}
              {isDetailsOpen && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1.5px dashed #cbd5e1' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    flexWrap: 'wrap', 
                    gap: 8, 
                    marginBottom: 12,
                    paddingBottom: 6
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.96rem', fontWeight: 900, color: 'var(--navy)' }}>
                      <ClipboardCheck size={20} color="#0284c7" />
                      <span>{t('mandatoryCriteria')}</span>
                    </div>
                    <span style={{ 
                      fontSize: '0.8rem', 
                      fontWeight: 900, 
                      background: '#e0f2fe', 
                      color: '#0369a1', 
                      padding: '3px 12px', 
                      borderRadius: 12 
                    }}>
                      {(isArabic && item.arabicDetails ? item.arabicDetails : item.details).length} {isArabic ? 'معايير فحص إلزامية' : 'Mandatory Criteria'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
                    {(isArabic && item.arabicDetails ? item.arabicDetails : item.details).map((detail, dIdx) => (
                      <div 
                        key={dIdx} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          gap: 12, 
                          background: isPass ? '#f0fdf4' : (isFail ? '#fef2f2' : '#f8fafc'), 
                          padding: '12px 14px', 
                          borderRadius: 8, 
                          border: `1.5px solid ${isPass ? '#86efac' : (isFail ? '#fca5a5' : '#cbd5e1')}`,
                          direction: isArabic ? 'rtl' : 'ltr',
                          textAlign: isArabic ? 'right' : 'left',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{
                          minWidth: 26,
                          height: 26,
                          borderRadius: 7,
                          background: isPass ? '#16a34a' : (isFail ? '#dc2626' : '#e2e8f0'),
                          color: isPass || isFail ? '#ffffff' : '#475569',
                          fontSize: '0.82rem',
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 1
                        }}>
                          {isPass ? <Check size={15} strokeWidth={3} /> : (dIdx + 1)}
                        </div>
                        <span style={{ fontSize: '0.94rem', color: '#0f172a', lineHeight: 1.6, fontWeight: 700 }}>
                          {detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Notes / Defect Reason Input ── */}
              {(isFail || currentNote) && (
                <div style={{ marginTop: 12, background: isFail ? '#fee2e2' : '#f8fafc', padding: '10px 14px', borderRadius: 8, border: isFail ? '1px solid #fca5a5' : '1px solid #cbd5e1' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: isFail ? '#991b1b' : 'var(--navy)', display: 'block', marginBottom: 4 }}>
                    {isFail ? t('defectReasonReq') : (isArabic ? 'ملاحظات المشرف:' : 'Supervisor Remark:')}
                  </label>
                  <input 
                    type="text" 
                    value={currentNote} 
                    onChange={e => setItemNote(item.id, e.target.value)} 
                    placeholder={isFail ? t('defectReasonPlaceholder') : (isArabic ? 'أضف ملاحظة...' : 'Add observation...')}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: isFail ? '1px solid #ef4444' : '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: isFail ? '#991b1b' : 'inherit'
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── General Handover Remarks & Sign-off Section ── */}
      <div className="card-white" style={{ padding: 18, border: '1px solid #cbd5e1' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '0.94rem', fontWeight: 800, color: 'var(--navy)' }}>
          {t('shiftRemarksTitle')}
        </h3>
        <textarea
          rows={2}
          className="search-input"
          value={generalNotes}
          onChange={e => setGeneralNotes(e.target.value)}
          placeholder={t('shiftRemarksPlaceholder')}
          style={{ width: '100%', padding: 10, resize: 'vertical', fontSize: '0.82rem' }}
        />

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <button 
            type="button" 
            className="btn-outline" 
            onClick={resetCurrentChecklist}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.82rem' }}
          >
            <RotateCcw size={14} /> {t('resetCurrentForm')}
          </button>

          <button 
            type="button" 
            className="btn-primary" 
            disabled={isSaving || isViewer}
            onClick={handleSaveChecklist}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 8,
              background: stats.overallStatus === 'CRITICAL_BLOCKER' 
                ? '#ef4444' 
                : (stats.overallStatus === 'LINE_CLEARED_PASS' ? '#10b981' : '#0284c7'),
              borderColor: 'transparent',
              padding: '10px 24px',
              fontWeight: 800,
              fontSize: '0.9rem'
            }}
          >
            <Save size={16} />
            {isSaving ? t('signingOff') : t('signOffLineStart')}
          </button>
        </div>
      </div>

      {/* ── Historical Submissions Audit Trail ── */}
      <div className="card-white" style={{ padding: 20, border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--navy)' }}>
              {t('auditLogTitle')}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {t('auditLogSubtitle')}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="search-wrap" style={{ minWidth: 200 }}>
              <Search className="search-icon" size={14} />
              <input 
                type="text" 
                className="search-input" 
                placeholder={t('searchSupervisorDate')} 
                value={historySearch} 
                onChange={e => setHistorySearch(e.target.value)} 
                style={{ padding: '6px 10px 6px 32px', fontSize: '0.8rem' }}
              />
            </div>

            <select 
              className="search-input" 
              value={historyShiftFilter} 
              onChange={e => setHistoryShiftFilter(e.target.value)}
              style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 700 }}
            >
              <option value="ALL">{isArabic ? 'جميع الورديات' : 'All Shifts'}</option>
              <option value="Day">{isArabic ? 'نهاري' : 'Day'}</option>
              <option value="Night">{isArabic ? 'ليلي' : 'Night'}</option>
            </select>
          </div>
        </div>

        {/* Audit Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('date')}</th>
                <th>{t('shift')}</th>
                <th>{t('supervisor')}</th>
                <th>{isArabic ? 'النسبة' : 'Score'}</th>
                <th>{t('status')}</th>
                <th>{t('resultsBreakdown')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                    {t('loading')}
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                    {isArabic ? 'لم يتم العثور على سجلات سابقة. يمكنك حفظ أول فحص من الأعلى.' : 'No checklist records found. Submit your first checklist above.'}
                  </td>
                </tr>
              ) : (
                filteredHistory.map(rec => {
                  const isCleared = rec.status === 'LINE_CLEARED_PASS' || rec.status === 'READY_FOR_START';
                  const isBlocked = rec.status === 'CRITICAL_BLOCKER';

                  return (
                    <tr key={rec.id}>
                      <td style={{ fontWeight: 800, color: 'var(--navy)' }}>{rec.date}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          background: rec.shift === 'Day' || rec.shift === 'Morning' ? '#fffbeb' : '#f5f3ff',
                          color: rec.shift === 'Day' || rec.shift === 'Morning' ? '#b45309' : '#6d28d9'
                        }}>
                          {rec.shift === 'Day' || rec.shift === 'Morning' ? (isArabic ? '☀️ نهاري' : '☀️ Day') : (isArabic ? '🌙 ليلي' : '🌙 Night')}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{rec.supervisor || rec.inspector}</td>
                      <td style={{ fontWeight: 800, color: isCleared ? '#16a34a' : (isBlocked ? '#dc2626' : '#d97706') }}>
                        {rec.readiness_pct}%
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          background: isCleared ? '#dcfce7' : (isBlocked ? '#fee2e2' : '#fef3c7'),
                          color: isCleared ? '#166534' : (isBlocked ? '#991b1b' : '#92400e')
                        }}>
                          {isCleared ? (isArabic ? 'الخط جاهز ومصرح' : 'Line Cleared') : (isBlocked ? (isArabic ? 'معطل (حرج)' : 'Blocked') : (isArabic ? 'توجد ملاحظات' : 'Issues Flagged'))}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ {rec.passed_count || rec.ok_count || 0} PASS</span>
                        {(rec.failed_count > 0 || rec.ng_count > 0) && (
                          <span style={{ color: '#dc2626', fontWeight: 700, margin: '0 8px' }}>✕ {rec.failed_count || rec.ng_count} FAIL</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn-outline"
                            title={isArabic ? 'معاينة وطباعة التقرير' : 'Preview & Print Report'}
                            onClick={() => openPrintModal(rec)}
                            style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Printer size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-outline"
                            title={isArabic ? 'عرض تفاصيل الفحص' : 'View Checklist Details'}
                            onClick={() => openPrintModal(rec)}
                            style={{ padding: '4px 8px' }}
                          >
                            <Eye size={14} />
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              className="btn-outline"
                              title={isArabic ? 'حذف السجل (للأدمن فقط)' : 'Delete Record (Admin Only)'}
                              onClick={() => handleDeleteHistory(rec.id)}
                              style={{ padding: '4px 8px', color: '#dc2626', borderColor: '#fecdd3' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Official Printable Checklist Report Modal ── */}
      <ChecklistReportModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        record={printModalRecord}
        activeData={{
          date: activeDate,
          shift: activeShift,
          supervisor: supervisorName,
          generalNotes,
          itemStatuses,
          stats,
          standupAttendance
        }}
        isArabic={isArabic}
        t={t}
      />
    </div>
  );
}

// ─── Checklist Report & Official Print Component (A4 Landscape Single Page) ───
function ChecklistReportModal({ isOpen, onClose, record, activeData, isArabic, t }) {
  if (!isOpen) return null;

  const date = record ? record.date : activeData.date;
  const shift = record ? record.shift : activeData.shift;
  const supervisor = record ? (record.supervisor || record.inspector || 'Supervisor') : activeData.supervisor;
  const readinessPct = record ? (record.readiness_pct ?? 0) : activeData.stats.readinessPct;
  const overallStatus = record ? (record.status || 'PENDING') : activeData.stats.overallStatus;
  const generalNotes = record ? (record.general_notes || '') : activeData.generalNotes;
  const itemStatuses = record ? (record.item_details || {}) : activeData.itemStatuses;
  const attendanceData = record?.item_details?.['chk-0']?.attendance || activeData?.standupAttendance || [];

  const isCleared = overallStatus === 'LINE_CLEARED_PASS' || overallStatus === 'READY_FOR_START';
  const isBlocked = overallStatus === 'CRITICAL_BLOCKER';

  const presentCount = attendanceData.filter(a => a.status === 'PRESENT').length;
  const lateCount = attendanceData.filter(a => a.status === 'LATE').length;
  const absentCount = attendanceData.filter(a => a.status === 'ABSENT').length;
  const lateOrAbsent = attendanceData.filter(a => a.status === 'LATE' || a.status === 'ABSENT');

  const handlePrint = () => {
    printReportDocument('report-printable-area', { orientation: 'landscape' });
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal report-modal" style={{ maxWidth: 1080, width: '96vw', maxHeight: '94vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ padding: '12px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Printer size={20} color="var(--teal)" />
            <span className="modal-title" style={{ fontSize: '1rem', fontWeight: 800 }}>
              {isArabic 
                ? `معاينة طباعة نموذج التحقق (PSM-CHK-06-2026) - صفحة أفقية واحدة` 
                : `Checklist Print Preview (PSM-CHK-06-2026) - Single Landscape Page`}
            </span>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Printable Document Area (Engineered to fit in EXACTLY ONE Landscape A4 page) */}
        <div id="report-printable-area" className="report-document" style={{ padding: '8px 12px', background: '#ffffff', color: '#0f172a' }}>
          {/* Official Document Header */}
          <div className="report-doc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--navy)', paddingBottom: 4, marginBottom: 4 }}>
            <div className="report-logo-box" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/ectron-logo.png" alt="ECTRON" className="report-logo-img" style={{ height: 26, objectFit: 'contain' }} />
              <div>
                <div style={{ fontSize: '0.80rem', fontWeight: 900, color: 'var(--navy)', letterSpacing: '0.02em', lineHeight: 1.1 }}>
                  ECTRON S.A.E — SMART METERS DIVISION
                </div>
                <div style={{ fontSize: '0.60rem', color: '#64748b', fontWeight: 600 }}>
                  {isArabic ? 'نظام إلكترون لمتابعة وإدارة الإنتاج والجودة' : 'ECTRON PRODUCTION & QUALITY CONTROL SYSTEM'}
                </div>
              </div>
            </div>

            <div className="report-title-box" style={{ textAlign: isArabic ? 'left' : 'right' }}>
              <div style={{ display: 'flex', gap: 4, justifyContent: isArabic ? 'flex-start' : 'flex-end', marginBottom: 1 }}>
                <span style={{ fontSize: '0.58rem', background: '#0f172a', color: '#ffffff', fontWeight: 800, padding: '1px 5px', borderRadius: 3 }}>
                  FORM NO: PSM-CHK-06-2026
                </span>
                <span style={{ fontSize: '0.58rem', background: '#e2e8f0', color: '#334155', fontWeight: 800, padding: '1px 4px', borderRadius: 3 }}>
                  REV: 00
                </span>
              </div>
              <h1 className="report-main-title" style={{ fontSize: '0.94rem', fontWeight: 900, color: 'var(--navy)', margin: 0, lineHeight: 1.15 }}>
                {isArabic ? 'نموذج التحقق من جاهزية الخط قبل بدء الإنتاج' : 'START OF PRODUCTION CHECKLIST'}
              </h1>
            </div>
          </div>

          {/* Compact Metadata Row */}
          <div className="report-meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, background: '#f8fafc', padding: '4px 8px', borderRadius: 4, border: '1px solid #cbd5e1', marginBottom: 4 }}>
            <div className="report-meta-item">
              <span className="report-meta-label" style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 800, display: 'block' }}>{t('date')}</span>
              <span className="report-meta-value" style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--navy)' }}>{date}</span>
            </div>

            <div className="report-meta-item">
              <span className="report-meta-label" style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 800, display: 'block' }}>{t('shift')}</span>
              <span className="report-meta-value" style={{ fontSize: '0.74rem', fontWeight: 800, color: shift === 'Night' ? '#6d28d9' : '#b45309' }}>
                {shift === 'Night' ? (isArabic ? '🌙 ليلية (Night)' : '🌙 Night') : (isArabic ? '☀️ صباحية (Morning)' : '☀️ Morning')}
              </span>
            </div>

            <div className="report-meta-item">
              <span className="report-meta-label" style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 800, display: 'block' }}>{t('supervisor')}</span>
              <span className="report-meta-value" style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--navy)' }}>{supervisor}</span>
            </div>

            <div className="report-meta-item">
              <span className="report-meta-label" style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 800, display: 'block' }}>{t('lineReadinessScore')}</span>
              <span className="report-meta-value" style={{ fontSize: '0.78rem', fontWeight: 900, color: isCleared ? '#16a34a' : (isBlocked ? '#dc2626' : '#d97706') }}>
                {readinessPct}%
              </span>
            </div>

            <div className="report-meta-item">
              <span className="report-meta-label" style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 800, display: 'block' }}>{t('status')}</span>
              <span className="report-meta-value" style={{ fontSize: '0.68rem', fontWeight: 800, color: isCleared ? '#16a34a' : (isBlocked ? '#dc2626' : '#d97706') }}>
                {isCleared 
                  ? (isArabic ? '✅ مصرح للإنتاج' : '✅ LINE CLEARED')
                  : isBlocked 
                    ? (isArabic ? '🛑 مانع حرج' : '🛑 BLOCKER')
                    : (isArabic ? '⚠️ قيد التحقق' : '⚠️ PENDING')}
              </span>
            </div>
          </div>

          {/* 5M Quality Classification & 8 Stations Reference Legend Banner */}
          <div style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: 4,
            padding: '2px 8px',
            marginBottom: 4,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 6,
            fontSize: '0.56rem',
            lineHeight: 1.2
          }}>
            <div>
              <strong style={{ color: 'var(--navy)' }}>
                {isArabic ? 'تصنيف معايير الجودة (5M Quality Framework): ' : '5M Quality Categories: '}
              </strong>
              <span style={{ color: '#475569' }}>
                {isArabic 
                  ? 'A: الأفراد والسلامة | B: طرق العمل WI | C: الآلات والمعايرة | D: القياس ونظام التتبع | E: المواد وبيئة 5S' 
                  : 'A: Manpower & Safety | B: Methods & WI | C: Machines & Tools | D: Measurement & QA | E: Materials & 5S'}
              </span>
            </div>
            <div>
              <strong style={{ color: '#0369a1' }}>
                {isArabic ? 'المحطات المعتمدة (8 محطات): ' : '8 Line Stations: '}
              </strong>
              <span style={{ color: '#475569' }}>
                {isArabic 
                  ? '1.التجميع 2.العزل 3.التردد 4.المعايرة 5.الفحص الشامل 6.التخصيص 7.التغليف 8.الفيرموير' 
                  : '1.Assembly 2.Insulation 3.RF 4.Calibration 5.Multin test 6.Perso 7.Packaging 8.FW update'}
              </span>
            </div>
          </div>

          {/* Verification Criteria Compact Single-Page Table */}
          <div style={{ marginBottom: 4 }}>
            <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.62rem', marginBottom: 0 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ width: 22, textAlign: 'center', padding: '2px 3px', border: '1px solid #cbd5e1' }}>#</th>
                  <th style={{ width: 95, padding: '2px 4px', border: '1px solid #cbd5e1' }}>{isArabic ? 'التصنيف المعياري' : 'Category'}</th>
                  <th style={{ padding: '2px 6px', border: '1px solid #cbd5e1' }}>{isArabic ? 'بند الفحص والمعيار القياسي' : 'Inspection Item & Standard'}</th>
                  <th style={{ width: 135, padding: '2px 4px', border: '1px solid #cbd5e1' }}>{isArabic ? 'المحطات (من 8)' : 'Stations (of 8)'}</th>
                  <th style={{ width: 65, textAlign: 'center', padding: '2px 3px', border: '1px solid #cbd5e1' }}>{isArabic ? 'النتيجة' : 'Result'}</th>
                  <th style={{ width: 115, padding: '2px 4px', border: '1px solid #cbd5e1' }}>{isArabic ? 'الملاحظات' : 'Remarks'}</th>
                </tr>
              </thead>
              <tbody>
                {CHECKLIST_ITEMS.map((item, idx) => {
                  const rawInfo = itemStatuses?.[item.id];
                  const itemStatus = typeof rawInfo === 'object' ? (rawInfo?.status || 'PENDING') : (rawInfo === true ? 'PASS' : (rawInfo === false ? 'FAIL' : 'PENDING'));
                  const itemNote = typeof rawInfo === 'object' ? (rawInfo?.note || '') : '';
                  const isPass = itemStatus === 'PASS' || itemStatus === 'OK';
                  const isFail = itemStatus === 'FAIL' || itemStatus === 'NG';
                  const catInfo = getCategoryInfo(item.cat, isArabic);
                  const stInfo = getStationsDisplay(item.stations, isArabic);

                  return (
                    <tr key={item.id} style={{ background: isFail ? '#fff1f2' : (idx % 2 === 1 ? '#f8fafc' : '#ffffff') }}>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--navy)', border: '1px solid #cbd5e1', padding: '2px 2px' }}>
                        {idx + 1}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '2px 4px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 900, color: 'var(--navy)', fontSize: '0.62rem', lineHeight: 1.15 }}>
                          {catInfo.code}
                        </div>
                        <div style={{ fontSize: '0.54rem', fontWeight: 700, color: '#0369a1', lineHeight: 1.15, marginTop: 1 }}>
                          {catInfo.name}
                        </div>
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '2px 6px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '0.70rem', lineHeight: 1.2 }}>
                          {isArabic ? (item.arabicTitle || item.title) : item.title}
                        </div>
                        <div style={{ fontSize: '0.58rem', color: '#475569', lineHeight: 1.18, marginTop: 1 }}>
                          {isArabic && item.arabicSummary ? item.arabicSummary : item.summary}
                        </div>

                        {/* For chk-0: Standup Meeting Compact Attendance line */}
                        {item.id === 'chk-0' && attendanceData && attendanceData.length > 0 && (
                          <div style={{
                            marginTop: 2,
                            padding: '1px 5px',
                            background: '#f1f5f9',
                            borderRadius: 3,
                            fontSize: '0.56rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 5
                          }}>
                            <span>📋 {isArabic ? 'حضور الاجتماع:' : 'Attendance:'}</span>
                            <span style={{ color: '#16a34a' }}>🟢 {presentCount} {isArabic ? 'حاضر' : 'Present'}</span>
                            <span style={{ color: '#d97706' }}>🟡 {lateCount} {isArabic ? 'تأخير' : 'Late'}</span>
                            <span style={{ color: '#dc2626' }}>🔴 {absentCount} {isArabic ? 'غياب' : 'Absent'}</span>
                            {lateOrAbsent.length > 0 && (
                              <span style={{ color: '#64748b', fontSize: '0.54rem' }}>
                                ({lateOrAbsent.map(a => `${a.name}: ${a.reason || a.status}`).join(' | ')})
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '2px 4px', verticalAlign: 'middle', fontSize: '0.58rem' }}>
                        {stInfo.isAll ? (
                          <span style={{ 
                            display: 'inline-block',
                            background: '#f0fdf4', 
                            color: '#166534', 
                            fontWeight: 800, 
                            padding: '1px 4px', 
                            borderRadius: 3,
                            border: '1px solid #bbf7d0',
                            fontSize: '0.56rem',
                            whiteSpace: 'nowrap'
                          }}>
                            {stInfo.label}
                          </span>
                        ) : (
                          <div>
                            <span style={{ fontWeight: 800, color: '#0369a1', fontSize: '0.60rem' }}>
                              {stInfo.short}
                            </span>
                            <div style={{ fontSize: '0.52rem', color: '#64748b', lineHeight: 1.15, marginTop: 1 }}>
                              {stInfo.names}
                            </div>
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', border: '1px solid #cbd5e1', padding: '2px 3px', verticalAlign: 'middle' }}>
                        {isPass && <span className="report-badge-pass" style={{ padding: '1px 5px', fontSize: '0.60rem' }}>✓ PASS</span>}
                        {isFail && <span className="report-badge-fail" style={{ padding: '1px 5px', fontSize: '0.60rem' }}>✕ FAIL</span>}
                        {!isPass && !isFail && <span className="report-badge-pending" style={{ padding: '1px 5px', fontSize: '0.60rem' }}>PENDING</span>}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '2px 4px', verticalAlign: 'middle', fontSize: '0.58rem' }}>
                        {itemNote ? (
                          <div style={{ color: isFail ? '#b91c1c' : '#334155', fontWeight: 700, lineHeight: 1.2 }}>
                            {itemNote}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Shift Handover Remarks Box */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, padding: '3px 8px', marginBottom: 4 }}>
            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--navy)', textTransform: 'uppercase', marginInlineEnd: 6 }}>
              {isArabic ? 'ملاحظات تسليم الوردية:' : 'Shift Handover Remarks:'}
            </span>
            <span style={{ fontSize: '0.62rem', color: generalNotes ? '#0f172a' : '#94a3b8', fontStyle: generalNotes ? 'normal' : 'italic' }}>
              {generalNotes || (isArabic ? 'لا توجد ملاحظات مسجلة.' : 'No shift remarks recorded.')}
            </span>
          </div>

          {/* Official 3-Party Sign-Off Block */}
          <div className="report-sign-block" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, paddingTop: 4, borderTop: '1px dashed #cbd5e1' }}>
            <div className="sign-line">
              <span className="sign-line-title" style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--navy)' }}>
                1. {isArabic ? 'المشرف المسؤول (Prepared By)' : 'PREPARED BY (SUPERVISOR)'}
              </span>
              <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#334155', margin: '1px 0' }}>
                {supervisor}
              </div>
              <div className="sign-line-placeholder" style={{ minHeight: 12 }}>
                <span style={{ fontSize: '0.54rem', color: '#94a3b8' }}>Sign: ____________________</span>
              </div>
            </div>

            <div className="sign-line">
              <span className="sign-line-title" style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--navy)' }}>
                2. {isArabic ? 'مراقب الجودة (QA/QC Inspector)' : 'QA/QC INSPECTOR SIGN & STAMP'}
              </span>
              <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#334155', margin: '1px 0' }}>
                QA Department
              </div>
              <div className="sign-line-placeholder" style={{ minHeight: 12 }}>
                <span style={{ fontSize: '0.54rem', color: '#94a3b8' }}>Stamp / Sign: ____________</span>
              </div>
            </div>

            <div className="sign-line">
              <span className="sign-line-title" style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--navy)' }}>
                3. {isArabic ? 'اعتماد إدارة الإنتاج (Production Manager)' : 'PRODUCTION MANAGER APPROVAL'}
              </span>
              <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#334155', margin: '1px 0' }}>
                Operation Head
              </div>
              <div className="sign-line-placeholder" style={{ minHeight: 12 }}>
                <span style={{ fontSize: '0.54rem', color: '#94a3b8' }}>Approval: _________________</span>
              </div>
            </div>
          </div>

          {/* Form Footer Stamp */}
          <div style={{ marginTop: 3, paddingTop: 2, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.52rem', color: '#94a3b8' }}>
            <span>ECTRON MANUFACTURING OPERATIONS — FORM PSM-CHK-06-2026 (REV 00) — A4 LANDSCAPE SINGLE PAGE REPORT</span>
            <span>Printed: {new Date().toLocaleString()}</span>
          </div>
        </div>

        {/* Modal Footer Controls (Screen only, hidden on print) */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('close')}
          </button>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', fontWeight: 800 }}
          >
            <Printer size={16} />
            <span>{isArabic ? '🖨️ طباعة التقرير (A4 أفقي - صفحة واحدة)' : '🖨️ Print Single Page (A4 Landscape)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
