export const LOCAL_STORAGE_KEY = "ectron_preproduction_checklists";

// Standard 8 Production Stations Sequence
export const STANDARD_8_STATIONS = [
  { id: "Assembly", nameAr: "التجميع", nameEn: "Assembly", num: 1 },
  { id: "Insulation", nameAr: "العزل", nameEn: "Insulation", num: 2 },
  { id: "RF", nameAr: "التردد اللاسلكي", nameEn: "RF", num: 3 },
  { id: "Calibration", nameAr: "المعايرة", nameEn: "Calibration", num: 4 },
  { id: "Multin test", nameAr: "الفحص الشامل", nameEn: "Multin test", num: 5 },
  { id: "Perso", nameAr: "التخصيص", nameEn: "Perso", num: 6 },
  { id: "Packaging", nameAr: "التغليف", nameEn: "Packaging", num: 7 },
  {
    id: "Firmware update",
    nameAr: "تحديث الفيرموير",
    nameEn: "Firmware update",
    num: 8,
  },
];

export const ALL_STATION_IDS = STANDARD_8_STATIONS.map((s) => s.id);
export const ALL_STATIONS = ALL_STATION_IDS;

export function getCategoryInfo(cat, isArabic) {
  switch (cat) {
    case "A":
      return {
        code: "Cat A",
        name: isArabic ? "الأفراد والكوادر" : "Manpower & Safety",
        desc: isArabic
          ? "حضور المشغلين، مصفوفة المهارات، واجتماع الوردية"
          : "Line Operators, Skill Grid & Standup Meeting",
      };
    case "B":
      return {
        code: "Cat B",
        name: isArabic ? "طرق وتعليمات العمل" : "Methods & WI",
        desc: isArabic
          ? "تعليمات العمل المعتمدة WI ومعايير الجودة FI"
          : "Standard Work Instructions & Quality Criteria",
      };
    case "C":
      return {
        code: "Cat C",
        name: isArabic ? "الآلات والتجهيزات" : "Machines & Tools",
        desc: isArabic
          ? "ضغط الكمبريسر، ماكينات الفحص، وعزم المفكات"
          : "Air Pressure, Test Benches & Tool Calibration",
      };
    case "D":
      return {
        code: "Cat D",
        name: isArabic ? "القياس والتتبع" : "Measurement & QA",
        desc: isArabic
          ? "العينة المعيارية، نظام التتبع، وسجلات الفحص"
          : "Golden Sample, Traceability & Quality Logs",
      };
    case "E":
      return {
        code: "Cat E",
        name: isArabic ? "المواد ونظافة 5S" : "Materials & 5S",
        desc: isArabic
          ? "مطابقة كيت التشغيل، إخلاء الخط، وبيئة 5S"
          : "Kit Matching, Line Clearance & 5S",
      };
    case "A & D":
      return {
        code: "Cat A & D",
        name: isArabic ? "الكوادر والجودة" : "People & Quality",
        desc: isArabic
          ? "تأهيل المشغلين والسلامة ومطابقة معايير الجودة"
          : "Skill Matrix, HSE & Quality Compliance",
      };
    case "B & C":
      return {
        code: "Cat B & C",
        name: isArabic ? "التعليمات والأدوات" : "Methods & Tools",
        desc: isArabic
          ? "تعليمات التشغيل ومعايرة عزم المفكات والمثبتات"
          : "WI Display, Torque Screwdrivers & Fixtures",
      };
    case "C & D":
      return {
        code: "Cat C & D",
        name: isArabic ? "التجهيزات والتتبع" : "Machines & QA",
        desc: isArabic
          ? "سيرفر التتبع، العينة المعيارية، ومحطات الفحص"
          : "Traceability Database, Golden Sample & QC",
      };
    case "D & E":
      return {
        code: "Cat D & E",
        name: isArabic ? "التغليف وبيئة 5S" : "Packaging & 5S",
        desc: isArabic
          ? "كراتين التغليف، ملصقات الشحن، ونظافة 5S"
          : "Packing Boxes, Shipping Labels & 5S Clearance",
      };
    default:
      return { code: `Cat ${cat}`, name: `Cat ${cat}`, desc: "" };
  }
}

export function getStationsDisplay(stations, isArabic) {
  if (!stations || stations.length === 0) {
    return {
      isAll: false,
      label: isArabic ? "—" : "—",
      short: "—",
      names: "",
    };
  }

  if (stations.length >= 8) {
    return {
      isAll: true,
      label: isArabic ? "جميع الـ 8 محطات (1 - 8)" : "All 8 Stations (1 - 8)",
      short: isArabic ? "كامل الـ 8 محطات" : "All 8 Stations",
      names: isArabic
        ? "1.التجميع 2.العزل 3.التردد 4.المعايرة 5.الفحص 6.التخصيص 7.التغليف 8.الفيرموير"
        : "1.Assembly 2.Insulation 3.RF 4.Calibration 5.Multin 6.Perso 7.Packaging 8.FW",
    };
  }

  const map = {
    Assembly: { num: 1, ar: "التجميع", en: "Assembly" },
    Insulation: { num: 2, ar: "العزل", en: "Insulation" },
    RF: { num: 3, ar: "التردد", en: "RF" },
    Calibration: { num: 4, ar: "المعايرة", en: "Calibration" },
    "Multin test": { num: 5, ar: "الفحص الشامل", en: "Multin test" },
    Perso: { num: 6, ar: "التخصيص", en: "Perso" },
    Packaging: { num: 7, ar: "التغليف", en: "Packaging" },
    "Firmware update": { num: 8, ar: "الفيرموير", en: "Firmware" },
  };

  const matched = stations.map((s) => map[s] || { num: "?", ar: s, en: s });
  matched.sort((a, b) =>
    typeof a.num === "number" && typeof b.num === "number" ? a.num - b.num : 0,
  );

  const numsAr = matched.map((m) => m.num).join("، ");
  const numsEn = matched.map((m) => m.num).join(", ");
  const names = matched
    .map((m) => (isArabic ? `${m.num}.${m.ar}` : `${m.num}.${m.en}`))
    .join(isArabic ? "، " : ", ");

  return {
    isAll: false,
    label: isArabic
      ? `محطات (${numsAr}): ${names}`
      : `Stations (${numsEn}): ${names}`,
    short: isArabic ? `محطات: ${numsAr}` : `St: ${numsEn}`,
    names,
  };
}

export const CHECKLIST_ITEMS = [
  {
    id: "chk-0",
    cat: "A",
    title: "Pre-Shift Standup Meeting & Shift Briefing",
    arabicTitle: "اجتماع الوقوف وبداية الوردية (Standup Meeting) والتوجيهات",
    stations: ALL_STATION_IDS,
    critical: true,
    tag: "Briefing & Alignment",
    color: "#4f46e5",
    summary:
      "Conducted pre-shift standup meeting with all line operators, reviewed daily targets, previous shift defects/lessons learned, and assigned station roles.",
    arabicSummary:
      "عقد اجتماع الوقوف الصباحي السريع مع جميع مشغلي الخط، استعراض أهداف الوردية، مناقشة أخطاء وعيوب الوردية السابقة، وتوزيع المهام على المحطات.",
    details: [
      "Line operators attendance check completed across all 8 stations; all critical workstations manned and ready.",
      "Daily production targets, meter batch numbers, and scheduled run plan clearly communicated.",
      "Quality & defect briefing: review of previous shift defects, KO boards, and lessons learned to prevent recurrence.",
      "Workstation assignment confirmed, safety/HSE reminders briefed, and operator questions addressed.",
    ],
    arabicDetails: [
      "حصر حضور مشغلي الخط لكافة الـ 8 محطات والتأكد من تواجد وتغطية مشغلي المحطات الحساسة في مواقعهم.",
      "استعراض أهداف الإنتاج اليومية، رقم تشغيلة العدادات (Batch)، وخطة التشغيل الزمنية بدقة.",
      "مراجعة تنبيهات الجودة وأعطال الوردية السابقة وحالات التوقف (KO) لتفادي تكرارها.",
      "تأكيد توزيع المهام على المحطات، والتذكير بتعليمات السلامة المهنية وتفريغ الشحنات (ESD).",
    ],
  },
  {
    id: "chk-1",
    cat: "A & D",
    title: "Operator Qualification, HSE & Safety Standards",
    arabicTitle:
      "تأهيل المشغلين (Skill Grid) والسلامة المهنية (HSE/PPE) والالتزام",
    stations: ALL_STATION_IDS,
    critical: true,
    tag: "People & HSE",
    color: "#0284c7",
    summary:
      "Operators qualified in skill matrix, wearing full PPE, and compliant with safety & workstation rules.",
    arabicSummary:
      "التأكد من إدراج وتأهيل المشغلين بقائمة المهارات، ارتداء مهمات الوقاية كاملة، والالتزام بقواعد السلامة والعمل ومعايير الجودة.",
    details: [
      "Operators listed in Skill Matrix & certified for their assigned station across the 8 production stages.",
      "Required PPE worn: safety shoes, ESD lab coats, grounded wrist straps, and hairnets/gloves where applicable.",
      "Emergency stop buttons and workstation safety rules fully understood by all active operators.",
    ],
    arabicDetails: [
      "اعتماد وتأهيل المشغلين في مصفوفة المهارات (Skill Matrix) للعمل على المحطة المحددة عبر الـ 8 محطات.",
      "الالتزام الكامل بارتداء مهمات الوقاية الشخصية (أحذية السلامة، روب ESD، أساور التأريض، وقفازات/أغطية الشعر عند اللزوم).",
      "التأكد من جاهزية أزرار الإيقاف في حالات الطوارئ (Emergency Stop) واستيعاب قواعد السلامة بمواقع العمل.",
    ],
  },
  {
    id: "chk-2",
    cat: "B & C",
    title: "Work Instructions (WI/FI) & Tool Calibration",
    arabicTitle:
      "تعليمات العمل المعتمدة (WI/FI) وصلاحية معايرة الأدوات والمثبتات",
    stations: ALL_STATION_IDS,
    critical: true,
    tag: "Standards & Tools",
    color: "#7c3aed",
    summary:
      "Latest signed work instructions mounted & readable; electric torque screwdrivers and assembly jigs calibrated.",
    arabicSummary:
      "توفر تعليمات العمل المحدثة والموقعة ومقروءة، وتوفر الأدوات والمثبتات (Fixtures/Torque) مع ملصقات معايرة سارية.",
    details: [
      "Latest revision signed Work Instructions (WI) and Quality Inspection standards (FI) displayed and readable at each of the 8 stations.",
      "Electric torque screwdrivers verified with valid calibration tags and set to specified torque (Nm) for terminal/cover screws.",
      "Assembly jigs, fixtures, holding clamps, and manual presses inspected for wear, alignment, and secure mounting.",
      "Workbench ESD grounding mats and ground wires verified and physically connected.",
    ],
    arabicDetails: [
      "توفر تعليمات العمل المعتمدة (WI) ومعايير فحص الجودة (FI) محدثة وموقعة ومقروءة عند كل محطة من المحطات الـ 8.",
      "فحص المفكات الكهربائية (Torque Screwdrivers) والتأكد من ملصقات المعايرة السارية وضبط عزم الدوران (Nm) بدقة.",
      "فحص مثبتات التجميع والمكابس اليدوية (Fixtures/Jigs) للتأكد من خلوها من التآكل وتثبيتها بإحكام.",
      "التحقق من توصيل بساط تفريغ الشحنات الكهربائية (ESD Grounding Mats) وأسلاك التأريض بجميع طاولات العمل.",
    ],
  },
  {
    id: "chk-3",
    cat: "C",
    title: "Air Compressor, Machines & Test Benches",
    arabicTitle:
      "ضغط الكمبريسر، جاهزية الآلات ومحطات فحص Multin test وتحديث الفيرموير",
    stations: ["Assembly", "Calibration", "Multin test", "Firmware update"],
    critical: true,
    tag: "Machines & Air",
    color: "#059669",
    summary:
      "Air compressor pressure nominal (6-8 Bar), Multin test & Calibration benches active with zero alarm codes, and Firmware update PCs connected.",
    arabicSummary:
      "فحص ضغط الهواء بالكمبريسر، جاهزية أجهزة الاختبار Multin test والمعايرة والآلات، ونظام تحديث الفيرموير بدون أي أعطال أو إنذارات.",
    details: [
      "Central air compressor operating pressure within nominal range (6.0 - 8.0 Bar) with zero moisture or air leaks.",
      "Calibration and Multin test benches powered on, calibration due dates valid, and automated testing software running with zero error codes.",
      "Firmware Update PCs connected to local network with firmware flashing directories active and synchronized.",
      "Laser marking machines, label printers, and handheld barcode scanners operational and communicating.",
    ],
    arabicDetails: [
      "ضغط الهواء بالكمبريسر المركزي ضمن النطاق المعياري (6.0 - 8.0 Bar) مع خلو الخطوط من أي تسريب أو رطوبة.",
      "تشغيل محطات المعايرة والفحص الشامل (Multin test)، سريان صلاحية المعايرة، وعمل برامج الاختبار دون أي إنذارات أو أكواد أخطاء.",
      "اتصال أجهزة تحديث الفيرموير (Firmware Update PCs) بالشبكة الداخلية وتزامن مجلدات تسجيل الفيرموير (Logs).",
      "جاهزية ماكينات وسم الليزر وطابعات ملصقات الباركود وقارئات الباركود اليدوية للعمل بكفاءة.",
    ],
  },
  {
    id: "chk-4",
    cat: "C & D",
    title: "Traceability System, Golden Sample & Quality Verification",
    arabicTitle:
      "نظام التتبع (Traceability)، فحص العينة المعيارية وجودة المحطات",
    stations: ["RF", "Calibration", "Multin test", "Perso", "Firmware update"],
    critical: true,
    tag: "Traceability & Quality",
    color: "#0891b2",
    summary:
      "Traceability server connected, pre-shift golden sample test passed 100%, and defect logging sheets ready.",
    arabicSummary:
      "فحص نظام التتبع وقارئات الباركود، اجتياز العينة المعيارية لاختبار الـ Multin test والمعايرة بنجاح 100%، وجاهزية سجلات الفحص.",
    details: [
      "Traceability database online; automated serial number, RF test, and MAC address logging confirmed without latency.",
      'Pre-shift "Golden Sample" / Reference Meter run completed on test benches with 100% PASS result.',
      "Quality defect logging sheets and digital inspection forms ready at each inspection checkpoint.",
      "Defect classification guide and visual quality acceptance samples visible at inspection stations.",
    ],
    arabicDetails: [
      "اتصال قاعدة بيانات نظام التتبع (Traceability) ومطابقة قراءة الأرقام التسلسلية وفحص RF وعناوين الماك (MAC) فورياً دون تأخير.",
      "اجتياز اختبار العينة المعيارية (Golden Sample) بنجاح 100% (PASS) على أجهزة الفحص قبل بدء تشغيل الوردية.",
      "جاهزية سجلات ونماذج الفحص الرقمية والورقية لتوثيق أي عيوب أو ملاحظات عند نقاط التفتيش.",
      "توفر دليل تصنيف العيوب ونماذج العينات البصرية المقبولة والمعيبة بوضوح عند محطات الفحص.",
    ],
  },
  {
    id: "chk-5",
    cat: "E",
    title: "Raw Materials, Components & Kit Batch Matching",
    arabicTitle: "فحص المواد الخام ومطابقة كيت الباتش مع أمر التشغيل",
    stations: ["Assembly", "Insulation", "Perso", "Packaging"],
    critical: true,
    tag: "Materials & Kit",
    color: "#d97706",
    summary:
      "Raw materials verified, kit batch strictly matched with work order to prevent model mix-up, and line clearance completed.",
    arabicSummary:
      "التحقق من صحة تعريف المواد الخام والمكونات، وتطابق دفعة الكيت مع أمر التشغيل دون أي خلط لمواد سابقة.",
    details: [
      "Kit batch numbers strictly verified against today’s production work order to prevent mixed meter configurations.",
      "Staged raw materials (terminal blocks, base covers, top covers, screws, seals, and PCBA boards) inspected and labeled.",
      "Line Clearance: all parts, loose boards, and finished goods from previous shift completely removed from workbenches.",
      "Component staging buffers (trolleys and bins) verified with adequate quantities to sustain production.",
    ],
    arabicDetails: [
      "مطابقة رقم دفعة الكيت (Kit Batch) مع أمر التشغيل اليومي لتفادي أي خلط في موديلات أو إعدادات العدادات.",
      "فحص وتعريف المواد المجهزة (الروزتة، القواعد، الأغطية، البراغي، الأختام، وبوردات PCBA المعتمدة).",
      "إخلاء الخط (Line Clearance): إزالة كافة القطع والمكونات وبوردات الوردية السابقة والمنتجات المكتملة تماماً.",
      "التحقق من كفاية المواد في عربات وسلال التخزين المؤقت لاستمرار التدفق الإنتاجي دون انقطاع.",
    ],
  },
  {
    id: "chk-6",
    cat: "D & E",
    title: "Packaging, Palletizing & 5S Line Clearance",
    arabicTitle: "التغليف النهائي، الملصقات، نظافة 5S وتفريغ الهالك والكراتين",
    stations: ALL_STATION_IDS,
    critical: true,
    tag: "Packaging & 5S",
    color: "#dc2626",
    summary:
      "Packaging cartons, barcode shipping labels & certificates verified; 5S clean, cartoon & red scrap bins emptied.",
    arabicSummary:
      "التأكد من جودة كراتين التغليف والملصقات والشهادات، ونظافة محطات العمل 5S، وخلو الخط وتفريغ حاويات الكراتين والهالك.",
    details: [
      "Outer packaging cartons, dividers, bubble wrap, and strapping bands inspected and ready for packing.",
      "Shipping barcode labels, serial number stickers, and calibration test certificates staged and verified.",
      "Palletizing setup verified: solid wooden/plastic pallets, corner protectors available, standard stacking height adhered to.",
      "Workstations 5S clean and organized; cardboard bins cleared, and scrap/reject bins emptied and tagged with red labels.",
    ],
    arabicDetails: [
      "فحص كراتين التغليف الخارجية، القواطع الكرتونية، مواد التبطين، وأشرطة التحزيم وتجهيزها للتعبئة.",
      "مطابقة ملصقات الباركود الخارجية، لاصقات الأرقام التسلسلية، وشهادات المعايرة المعتمدة المطبوعة.",
      "تجهيز باليتات الشحن السليمة، توفر زوايا الحماية الكرتونية، والالتزام بارتفاع الرص المعياري الآمن.",
      "تنظيم المحطات وفق منهجية 5S وتفريغ حاويات الهالك (Reject Bins) والصناديق الكرتونية الفارغة ووضع البطاقات الحمراء.",
    ],
  },
];

export function getTodayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getInitialShift() {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "Day" : "Night";
}
