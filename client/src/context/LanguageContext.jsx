import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'ectron_language';

const TRANSLATIONS = {
  en: {
    // ── Navigation ──
    dashboard: 'Dashboard',
    management: 'Management',
    production: 'Production',
    preShiftChecklist: 'Pre-Shift Checklist',
    downtime: 'Downtime',
    defectMeters: 'Defect Meters',
    kitMeters: 'Kit Meters',
    batches: 'Batches',
    users: 'Users',
    logout: 'Logout',

    // ── Common Actions & Filters ──
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    add: 'Add',
    search: 'Search...',
    all: 'All',
    status: 'Status',
    actions: 'Actions',
    date: 'Date',
    shift: 'Shift',
    supervisor: 'Supervisor',
    morning: 'Morning',
    evening: 'Evening',
    day: 'Day',
    night: 'Night',
    pass: 'PASS',
    fail: 'FAIL',
    pending: 'Pending',
    refresh: 'Refresh',
    print: 'Print',
    export: 'Export',
    upload: 'Upload',
    notes: 'Notes',
    team: 'Team',
    line: 'Line',
    total: 'Total',
    product: 'Product',
    quantity: 'Quantity',
    achieved: 'Achieved',
    target: 'Target',
    details: 'Details',
    loading: 'Loading...',
    switchLang: 'العربية',
    today: 'Today',
    past7Days: 'Past 7 Days',
    past30Days: 'Past 30 Days',
    allRecords: 'All Records',
    custom: 'Custom',
    overview: 'Overview',

    // ── Pre-Shift Checklist ──
    checklistTitle: 'Start of Production Checklist / قائمة تحقق بدء الإنتاج',
    checklistSubtitle: 'Standardized quality & line verification across Assembly, Calibration, Multi-Test, and Packaging stations',
    printForm: 'Print Form',
    quickMarkAllPass: 'Quick Mark All PASS',
    signOffLine: 'Sign-Off & Approve Line',
    signingOff: 'Signing off...',
    lineReadinessScore: 'LINE READINESS SCORE',
    verifiedPass: 'VERIFIED (PASS)',
    failedIssues: 'FAILED / ISSUES (FAIL)',
    remainingPending: 'REMAINING PENDING',
    filterByStation: 'Filter by Station:',
    allStations: 'All Stations (الكل)',
    expandAllDetails: 'Expand All Details',
    collapseAllDetails: 'Collapse All Details',
    showDetails: 'Show Details',
    hideDetails: 'Hide Inspection Details',
    mandatoryCriteria: 'Mandatory Inspection Criteria / بنود التحقق التفصيلية:',
    defectReasonReq: '⚠️ Required: Defect Reason & Immediate Corrective Action:',
    defectReasonPlaceholder: 'Specify exact station failure, machine issue, or missing component...',
    shiftRemarksTitle: 'General Shift Verification Remarks / ملاحظات المشرف وتسليم الوردية',
    shiftRemarksPlaceholder: 'Record any general machine observations, compressor status notes, material lots, or shift handover instructions...',
    resetCurrentForm: 'Reset Current Form',
    signOffLineStart: 'Sign-Off & Approve Line Start',
    auditLogTitle: 'Checklist Inspection Audit Log / أرشيف سجلات بدء الإنتاج',
    auditLogSubtitle: 'Historical audit trail of shift line clearances and supervisor sign-offs',
    searchSupervisorDate: 'Search by supervisor, date...',
    resultsBreakdown: 'Results Breakdown',

    // ── Dashboard ──
    dashboardTitle: 'Executive Production & FPY Dashboard',
    dashboardSubtitle: 'Real-time yields, stage throughput, station bottlenecks, and downtime analytics',
    overviewFpyTab: 'Overview & FPY',
    downtimeTab: 'Downtime Analysis',
    trendTab: 'Production Trends',
    cumulativeThroughput: 'Cumulative Stage Throughput',
    cumulativeThroughputDesc: 'Total tested and validated smart meters across filtered period',
    overallFpy: 'OVERALL FPY',
    targetProgress: 'TARGET PROGRESS',
    totalDefects: 'TOTAL DEFECTS',
    bottleneckStation: 'BOTTLENECK STATION',
    stageThroughputRate: 'Stage Throughput & Yields',
    productionVsTarget: 'Production vs Target',
    downtimeByStage: 'Downtime by Production Stage',

    // ── Production ──
    prodTitle: 'Production Operations & Records',
    prodSubtitle: 'Auto-synced with Update PCs (1 & 2), FPY Excel inspection, and production tracking',
    uploadFpyBtn: 'Upload FPY Report (Excel)',
    totalRecordsLogged: 'Total Records Logged',
    totalBoardsInput: 'Total Boards Input',
    finalOkOutput: 'Final OK Output',
    updatedFwQtyTotal: 'Updated FW QTY Total',
    uploadModalTitle: 'Upload SAGEMCOM FPY Report',
    productionHistory: 'Production History Log',

    // ── Downtime ──
    downtimeTitle: 'Downtime Management',
    downtimeSubtitle: 'Track and record downtime across the 7 production stages',
    easyRecorder: 'Easy Downtime Recorder',
    selectStageToStart: 'Select Stage to Start Downtime:',
    startRecording: 'Start Downtime Timer',
    stopAndSaveLive: 'Stop & Save Downtime',
    cancelRecording: 'Cancel Live Session',
    totalDowntimeRecorded: 'Total Downtime Recorded',
    activeIncidents: 'Active Stoppages',
    testAlertEmail: 'Test Alert Email',
    downtimeHistory: 'Downtime Incidents History',
    recordingInProgress: 'Recording in progress',
    stopAndSave: 'Stop & Save Record',
    recordsCount: 'Records Count',
    showAllDates: 'Show All Dates',
    viewPrintReport: 'View / Print Report',
    manualEntry: 'Manual Entry',
    allStages: 'All Stages (1-7)',
    allUsers: 'All Users',
    startTime: 'Start Time',
    endTime: 'End Time',
    totalTime: 'Total Time',
    duration: 'Duration',
    user: 'User',
    stage: 'Stage',
    noDowntimeRecorded: 'No downtime recorded',
    reportPreview: 'Downtime Report Preview',
    reportSubtitle: 'Official Production Downtime Summary',
    preparedBy: 'Prepared By (User)',
    supervisorSign: 'Production Supervisor',
    dateAndVerification: 'Date & Verification',
    printOrPdf: 'Print / Save as PDF',

    // ── Defect Meters ──
    defectMetersTitle: 'Defect Meters & Rejects Tracking',
    defectMetersSubtitle: 'Stage-by-stage defect diagnostics, calibration scrap, and scrap rate metrics',
    defectiveTrackerTab: 'Defective Meters Tracker & Rework Hub',
    analyticsCalibrationTab: 'Statistical Calibration & Rework Ratio',
    scanOrEnterSerial: 'Scan Barcode / Enter Serial Number',
    selectStage: 'Select Failure Stage',
    defectCodeLabel: 'Defect Code / Failure Symptom',
    defectCodePlaceholder: 'e.g. -640, E-101, KO_COMM...',
    loggedBySupervisor: 'Logged by (Supervisor / Inspector)',
    registerDefectBtn: 'Register Defective Meter',
    updatingDefectBtn: 'Registering...',
    underInspectionStatus: 'Under Inspection / Repair',
    returnedToLineStatus: 'Repaired & Returned to Line',
    scrappedStatus: 'Scrapped / KO Permanent',
    entryCountLabel: 'In (Entries)',
    returnCountLabel: 'Out (Returns)',
    markRepairedAction: 'Mark Repaired & Return',
    viewHistoryAction: 'View Lifecycle History',
    scrapAction: 'Scrap Meter',
    repeatedFailureAlert: '⚠️ REPEATED FAILURE ALERT: This meter failed previously!',
    criticalRecurringAlert: '🛑 CRITICAL RECURRING: 3+ Failures detected. Quality escalation required!',
    lifecycleModalTitle: 'Meter Defect & Rework Lifecycle History',
    repairModalTitle: 'Complete Rework & Return to Production Line',
    technicianName: 'Technician / Repairer Name',
    repairActionTaken: 'Action Taken / Replaced Components',
    repairNotesPlaceholder: 'Describe root cause and components replaced/repaired...',
    returnDestination: 'Return Destination Station',
    confirmReturnBtn: 'Confirm & Return to Production Line',
    totalDefectsDetected: 'Total Defects Detected',
    actualMetersTested: 'Total Meters Tested',
    defectRatio: 'Defect Ratio',
    stageDefectAnalysis: 'Defects Breakdown by Stage',
    baselineDefects: 'Baseline Physical Defective Meters (Ground Truth)',
    calibrationRatio: 'Current Calibration Ratio',
    actualNetDefects: 'Actual Net Defective Meters',
    reportedFailures: 'Reported Failures (Boards KO)',
    estimatedDefectRate: 'Estimated Net Defect Rate',
    filterByMonth: 'Filter by Month',
    filterByTeam: 'Filter by Team',
    allMonths: 'All Months',
    allTeams: 'All Teams',
    defectsByStage: 'Defects Breakdown by Production Stage',
    reportedKO: 'Reported KO',
    calibratedDefects: 'Calibrated Defective Meters',
    stageFailureShare: 'Share of Total Failures',
    action: 'Action',
    viewShifts: 'View Shifts',

    // ── Kit Meters ──
    kitMetersTitle: 'Kit Meters (Kit Quantities & Batch Management)',
    kitMetersSubtitle: 'Track incoming meter kits, batch quantities, Three Phase & Single Phase allocation',
    addKitBatch: 'Add Kit Batch',
    totalKitsStaged: 'Total Kits Staged',
    activeKitsReady: 'Active Kits Ready',
    kitBatchesHistory: 'Kit Batches Log',
    receivedKits: 'Received Kits (Actual)',
    deliveryPlan: 'Delivery Plan (Incoming)',
    totalKitBatches: 'Total Kit Batches',
    threePhaseKits: 'Three Phase Kits',
    singlePhaseKits: 'Single Phase Kits',
    batchNumber: 'Batch Number',
    productName: 'Product Name',
    received: 'Received',
    planned: 'Planned',
    filterStatus: 'Filter Status',
    searchBatches: 'Search batch number or notes...',

    // ── Batches ──
    batchesTitle: 'Batches & Meter Serial Lookup',
    batchesSubtitle: 'Factory lot verification, pallet & box barcodes, and device firmware registers',
    uploadBatchFile: 'Upload Batches Excel',
    searchSerialPallet: 'Search by Serial Number, Box, Pallet...',
    totalDevicesRegistered: 'Total Devices Registered',
    totalBoxesPallets: 'Total Boxes & Pallets',
    batchDetails: 'Batch Details',
    batchesTabTitle: 'Shipment Batches',
    meterLookupTabTitle: 'Meter Serial Number Lookup',
    totalShipments: 'Total Shipments / Batches',
    totalMetersInBatches: 'Total Meters in Batches',
    searchBatchName: 'Search batch name, destination...',
    batchName: 'Batch Name',
    shipmentDate: 'Shipment Date',
    destination: 'Destination',
    meterCount: 'Meters Count',
    inspectBatch: 'Inspect Batch',

    // ── Users ──
    usersTitle: 'User & Role Management',
    usersSubtitle: 'Manage team access, permissions (Admin, Supervisor, Viewer), and company IDs',
    addNewUser: 'Add New User',
    totalUsersCount: 'Total Users Registered',
    adminUsersCount: 'Administrators',
    supervisorUsersCount: 'Supervisors',
    viewerUsersCount: 'Viewers',
    searchUsers: 'Search users...',
    accessLevel: 'Access Level',
    companyId: 'Company ID',
    phone: 'Phone Number',
    password: 'Password',
    newPassword: 'New Password',
    saveChanges: 'Save Changes',
    deleteUserConfirm: 'Delete user',
    cannotUndo: 'This action cannot be undone.'
  },
  ar: {
    // ── Navigation ──
    dashboard: 'لوحة التحكم',
    management: 'لوحة الإدارة',
    production: 'الإنتاج',
    preShiftChecklist: 'مهام التحقق قبل الإنتاج',
    downtime: 'أوقات التوقف',
    defectMeters: 'عدادات العيوب',
    kitMeters: 'عدادات الكيت',
    batches: 'دفعات الإنتاج',
    users: 'المستخدمين',
    logout: 'تسجيل الخروج',

    // ── Common Actions & Filters ──
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    close: 'إغلاق',
    add: 'إضافة',
    search: 'بحث...',
    all: 'الكل',
    status: 'الحالة',
    actions: 'الإجراءات',
    date: 'التاريخ',
    shift: 'الوردية',
    supervisor: 'المشرف',
    morning: 'صباحي',
    evening: 'مسائي',
    day: 'نهاري',
    night: 'ليلي',
    pass: 'ناجح (PASS)',
    fail: 'راسب (FAIL)',
    pending: 'قيد الانتظار',
    refresh: 'تحديث',
    print: 'طباعة',
    export: 'تصدير',
    upload: 'رفع ملف',
    notes: 'ملاحظات',
    team: 'الفريق',
    line: 'الخط',
    total: 'الإجمالي',
    product: 'المنتج',
    quantity: 'الكمية',
    achieved: 'المنجز',
    target: 'المستهدف',
    details: 'التفاصيل',
    loading: 'جارِ التحميل...',
    switchLang: 'English',
    today: 'اليوم',
    past7Days: 'آخر 7 أيام',
    past30Days: 'آخر 30 يوماً',
    allRecords: 'جميع السجلات',
    custom: 'مخصص',
    overview: 'نظرة عامة',

    // ── Pre-Shift Checklist ──
    checklistTitle: 'قائمة تحقق بدء الإنتاج',
    checklistSubtitle: 'الفحص المعياري لجودة وجاهزية الخط قبل بدء الوردية عبر جميع محطات التصنيع',
    printForm: 'طباعة النموذج',
    quickMarkAllPass: 'اعتماد الكل ناجح (PASS)',
    signOffLine: 'اعتماد وتوقيع الخط',
    signingOff: 'جارِ الاعتماد...',
    lineReadinessScore: 'مؤشر جاهزية الخط',
    verifiedPass: 'المطابقة والمعتمدة (PASS)',
    failedIssues: 'العيوب والمعطلات (FAIL)',
    remainingPending: 'المتبقي قيد الفحص',
    filterByStation: 'تصفية حسب المحطة:',
    allStations: 'جميع المحطات (الكل)',
    expandAllDetails: 'عرض جميع التفاصيل',
    collapseAllDetails: 'طي جميع التفاصيل',
    showDetails: 'عرض التفاصيل',
    hideDetails: 'إخفاء التفاصيل',
    mandatoryCriteria: 'معايير الفحص والتحقق الإلزامية:',
    defectReasonReq: '⚠️ إجباري: سبب العطل والإجراء التصحيحي المطلوب:',
    defectReasonPlaceholder: 'حدد العطل أو المحطة أو القطعة الناقصة بالتفصيل...',
    shiftRemarksTitle: 'ملاحظات المشرف وتسليم الوردية الإجمالية',
    shiftRemarksPlaceholder: 'سجل أي ملاحظات عامة حول الماكينات، ضغط الكمبريسر، أو تعليمات تسليم الوردية...',
    resetCurrentForm: 'إعادة تعيين النموذج',
    signOffLineStart: 'اعتماد وتوقيع بدء الخط',
    auditLogTitle: 'سجل وأرشيف فحوصات بدء الإنتاج',
    auditLogSubtitle: 'سجل التدقيق التاريخي لتصاريح إخلاء الخط وتوقيعات المشرفين',
    searchSupervisorDate: 'بحث باسم المشرف، التاريخ...',
    resultsBreakdown: 'تفاصيل النتائج',

    // ── Dashboard ──
    dashboardTitle: 'لوحة تحكم الإنتاج ومعدلات الجودة (FPY)',
    dashboardSubtitle: 'معدلات الجودة والإنتاجية اللحظية، اختناقات المحطات، وتحليلات أوقات التوقف',
    overviewFpyTab: 'نظرة عامة ومعدل الجودة (FPY)',
    downtimeTab: 'تحليل أوقات التوقف',
    trendTab: 'اتجاهات الإنتاج',
    cumulativeThroughput: 'إجمالي إنتاجية المحطات التراكمية',
    cumulativeThroughputDesc: 'إجمالي العدادات المفحوصة والمطابقة خلال الفترة المحددة',
    overallFpy: 'معدل الجودة الإجمالي (FPY)',
    targetProgress: 'نسبة تحقيق الهدف',
    totalDefects: 'إجمالي العيوب',
    bottleneckStation: 'المحطة الأكثر اختناقاً',
    stageThroughputRate: 'إنتاجية ومعدلات المحطات',
    productionVsTarget: 'الإنتاج الفعلي مقابل المستهدف',
    downtimeByStage: 'أوقات التوقف حسب المحطة',

    // ── Production ──
    prodTitle: 'عمليات وسجلات الإنتاج',
    prodSubtitle: 'مزامنة تلقائية مع أجهزة التحديث (Update PCs 1 & 2) وتقارير الجودة ومتابعة الإنتاج',
    uploadFpyBtn: 'رفع تقرير FPY (إكسيل)',
    totalRecordsLogged: 'إجمالي السجلات المسجلة',
    totalBoardsInput: 'إجمالي اللوحات المدخلة',
    finalOkOutput: 'الإنتاج النهائي المطابق (OK)',
    updatedFwQtyTotal: 'إجمالي تحديث الفيرموير (FW QTY)',
    uploadModalTitle: 'رفع تقرير FPY الخاص بشركة SAGEMCOM',
    productionHistory: 'سجل وتاريخ الإنتاج',

    // ── Downtime ──
    downtimeTitle: 'إدارة أوقات التوقف',
    downtimeSubtitle: 'تتبع وتسجيل أوقات توقف الإنتاج عبر محطات التصنيع السبعة',
    easyRecorder: 'مسجل أوقات التوقف السريع',
    selectStageToStart: 'اختر المحطة لبدء تسجيل التوقف:',
    startRecording: 'بدء عداد التوقف',
    stopAndSaveLive: 'إيقاف وحفظ التوقف',
    cancelRecording: 'إلغاء الجلسة الحالية',
    totalDowntimeRecorded: 'إجمالي أوقات التوقف المسجلة',
    activeIncidents: 'التوقفات النشطة حالياً',
    testAlertEmail: 'إرسال إيميل تنبيه تجريبي',
    downtimeHistory: 'سجل حوادث التوقف',
    recordingInProgress: 'التسجيل جارٍ الآن',
    stopAndSave: 'إيقاف وحفظ السجل',
    recordsCount: 'عدد السجلات',
    showAllDates: 'عرض جميع التواريخ',
    viewPrintReport: 'عرض / طباعة التقرير',
    manualEntry: 'إدخال يدوي',
    allStages: 'جميع المراحل (1-7)',
    allUsers: 'جميع المستخدمين',
    startTime: 'وقت البدء',
    endTime: 'وقت الانتهاء',
    totalTime: 'الوقت الإجمالي',
    duration: 'المدة',
    user: 'المستخدم',
    stage: 'المرحلة',
    noDowntimeRecorded: 'لا توجد أوقات توقف مسجلة',
    reportPreview: 'معاينة تقرير أوقات التوقف',
    reportSubtitle: 'الملخص الرسمي لأوقات توقف خطوط الإنتاج',
    preparedBy: 'أُعِدّ بواسطة (المستخدم)',
    supervisorSign: 'مشرف الإنتاج',
    dateAndVerification: 'التاريخ والاعتماد',
    printOrPdf: 'طباعة / حفظ كملف PDF',

    // ── Defect Meters ──
    defectMetersTitle: 'تتبع عدادات العيوب والهالك',
    defectMetersSubtitle: 'تشخيص العيوب لكل محطة، تالف المعايرة، ونسب العيوب الدقيقة',
    defectiveTrackerTab: 'نظام تتبع العدادات المعطلة وحلقات الإصلاح',
    analyticsCalibrationTab: 'المعايرة الإحصائية ونسب إعادة الفحص',
    scanOrEnterSerial: 'امسح الباركود أو أدخل سيريال العداد',
    selectStage: 'اختر مرحلة الخروج / العطل',
    defectCodeLabel: 'كود العطل / نوع الخلل',
    defectCodePlaceholder: 'مثال: -640، E-101، KO_COMM...',
    loggedBySupervisor: 'اسم المشرف / المدخل',
    registerDefectBtn: 'تسجيل العداد المعطل',
    updatingDefectBtn: 'جارِ التسجيل...',
    underInspectionStatus: 'قيد المعاينة والإصلاح',
    returnedToLineStatus: 'تم الإصلاح وعاد لخط الإنتاج',
    scrappedStatus: 'تالف نهائي (Scrapped)',
    entryCountLabel: 'مرات الدخول',
    returnCountLabel: 'مرات الخروج',
    markRepairedAction: 'تسجيل الإصلاح والعودة للإنتاج',
    viewHistoryAction: 'سجل دورة حياة العداد',
    scrapAction: 'استبعاد كتالف نهائي',
    repeatedFailureAlert: '⚠️ تنبيه: هذا العداد تكرر تعطله ودخل الفحص سابقاً!',
    criticalRecurringAlert: '🛑 تنبيه حرج: العداد دخل 3 مرات أو أكثر! يتطلب استبعاداً أو فحص جودة استثنائي',
    lifecycleModalTitle: 'سجل دورة حياة وتاريخ أعطال العداد',
    repairModalTitle: 'توثيق الإصلاح وإعادة العداد إلى خط الإنتاج',
    technicianName: 'اسم الفني القائم بالإصلاح',
    repairActionTaken: 'الإجراء التصحيحي / القطع المستبدلة',
    repairNotesPlaceholder: 'سجل سبب العطل والقطع التي تم استبدالها أو إصلاحها...',
    returnDestination: 'محطة العودة المستهدفة',
    confirmReturnBtn: 'تأكيد الإصلاح والإرجاع لخط الإنتاج',
    totalDefectsDetected: 'إجمالي العيوب المرصودة',
    actualMetersTested: 'إجمالي العدادات المفحوصة',
    defectRatio: 'نسبة العيوب',
    stageDefectAnalysis: 'تحليل العيوب حسب المحطة',
    baselineDefects: 'العدد الفعلي المعتمد للعدادات المعيبة (المعيار الأساسي)',
    calibrationRatio: 'نسبة المعايرة الحالية',
    actualNetDefects: 'صافي العدادات المعيبة الفعلي',
    reportedFailures: 'حالات الفشل المسجلة (Boards KO)',
    estimatedDefectRate: 'معدل العيوب الصافي التقديري',
    filterByMonth: 'تصفية بالشهر',
    filterByTeam: 'تصفية بالفريق',
    allMonths: 'جميع الشهور',
    allTeams: 'جميع الفِرق',
    defectsByStage: 'توزيع العيوب حسب مرحلة الإنتاج',
    reportedKO: 'المسجل كراسب',
    calibratedDefects: 'العدادات المعيبة المعايرة',
    stageFailureShare: 'نسبة المساهمة في الأعطال',
    action: 'الإجراء',
    viewShifts: 'عرض الورديات',

    // ── Kit Meters ──
    kitMetersTitle: 'عدادات الكيت (كميات الكيت وإدارة الدفعات)',
    kitMetersSubtitle: 'متابعة كيتات العدادات الواردة، كميات الدفعات، وتوزيع عدادات 3 فاز و 1 فاز',
    addKitBatch: 'إضافة دفعة كيت جديدة',
    totalKitsStaged: 'إجمالي الكيتات المحضرة',
    activeKitsReady: 'الكيتات الجاهزة للتجميع',
    kitBatchesHistory: 'سجل دفعات الكيت',
    receivedKits: 'الكيتات المستلمة (الفعلي)',
    deliveryPlan: 'خطة التوريد (المتوقع وصوله)',
    totalKitBatches: 'إجمالي دفعات الكيت',
    threePhaseKits: 'كيتات 3 فاز',
    singlePhaseKits: 'كيتات 1 فاز',
    batchNumber: 'رقم الدفعة',
    productName: 'اسم المنتج',
    received: 'مستلم',
    planned: 'مخطط',
    filterStatus: 'تصفية بالحالة',
    searchBatches: 'بحث برقم الدفعة أو الملاحظات...',

    // ── Batches ──
    batchesTitle: 'دفعات الإنتاج والبحث بالسيريال',
    batchesSubtitle: 'فحص الباتشات، باركود الصناديق والباليتات، وسجلات فيرموير الأجهزة',
    uploadBatchFile: 'رفع ملف إكسيل للباتشات',
    searchSerialPallet: 'بحث بالسيريال نمبر، الصندوق، الباليت...',
    totalDevicesRegistered: 'إجمالي الأجهزة المسجلة',
    totalBoxesPallets: 'إجمالي الصناديق والباليتات',
    batchDetails: 'تفاصيل الباتش',
    batchesTabTitle: 'دفعات الشحن (Batches)',
    meterLookupTabTitle: 'البحث عن سيريال العداد',
    totalShipments: 'إجمالي الشحنات / الدفعات',
    totalMetersInBatches: 'إجمالي العدادات في الدفعات',
    searchBatchName: 'بحث باسم الشحنة، الوجهة...',
    batchName: 'اسم الدفعة',
    shipmentDate: 'تاريخ الشحنة',
    destination: 'الوجهة',
    meterCount: 'عدد العدادات',
    inspectBatch: 'معاينة الدفعة',

    // ── Users ──
    usersTitle: 'إدارة المستخدمين والصلاحيات',
    usersSubtitle: 'إدارة حسابات الفريق، الصلاحيات (مدير، مشرف، مشاهد)، وأرقام الشركة (Company ID)',
    addNewUser: 'إضافة مستخدم جديد',
    totalUsersCount: 'إجمالي المستخدمين المسجلين',
    adminUsersCount: 'المدراء (Admin)',
    supervisorUsersCount: 'المشرفين (Supervisor)',
    viewerUsersCount: 'المشاهدين (Viewer)',
    searchUsers: 'بحث في المستخدمين...',
    accessLevel: 'مستوى الصلاحية',
    companyId: 'رقم الشركة',
    phone: 'رقم الهاتف',
    password: 'كلمة المرور',
    newPassword: 'كلمة مرور جديدة',
    saveChanges: 'حفظ التعديلات',
    deleteUserConfirm: 'حذف المستخدم',
    cannotUndo: 'لا يمكن التراجع عن هذا الإجراء.'
  }
};

export function LanguageProvider({ children }) {
  const { user } = useAuth();
  const userRole = (user?.access || 'viewer').toLowerCase();

  // Language can only be switched by admin or supervisor. Viewers are strictly English.
  const canChangeLanguage = userRole === 'admin' || userRole === 'supervisor';

  // Read saved language from localStorage (defaults to 'en')
  const [savedLanguage, setSavedLanguage] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'en';
  });

  // Effective language: strictly 'en' for viewer, or savedLanguage for admin/supervisor
  const effectiveLanguage = canChangeLanguage ? savedLanguage : 'en';

  const isArabic = effectiveLanguage === 'ar';

  // Apply HTML document direction and language attributes
  useEffect(() => {
    document.documentElement.lang = effectiveLanguage;
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
    if (isArabic) {
      document.body.classList.add('lang-ar');
    } else {
      document.body.classList.remove('lang-ar');
    }
  }, [effectiveLanguage, isArabic]);

  // Toggle between English and Arabic (only allowed for admin and supervisor)
  const toggleLanguage = useCallback(() => {
    if (!canChangeLanguage) return;
    const nextLang = savedLanguage === 'ar' ? 'en' : 'ar';
    setSavedLanguage(nextLang);
    localStorage.setItem(STORAGE_KEY, nextLang);
  }, [canChangeLanguage, savedLanguage]);

  // Set explicit language
  const setLanguage = useCallback((lang) => {
    if (!canChangeLanguage) return;
    const target = lang === 'ar' ? 'ar' : 'en';
    setSavedLanguage(target);
    localStorage.setItem(STORAGE_KEY, target);
  }, [canChangeLanguage]);

  // Translation helper function
  const t = useCallback((key, fallback = '') => {
    const dict = TRANSLATIONS[effectiveLanguage] || TRANSLATIONS.en;
    return dict[key] || fallback || key;
  }, [effectiveLanguage]);

  const value = useMemo(() => ({
    language: effectiveLanguage,
    isArabic,
    canChangeLanguage,
    toggleLanguage,
    setLanguage,
    t
  }), [effectiveLanguage, isArabic, canChangeLanguage, toggleLanguage, setLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
