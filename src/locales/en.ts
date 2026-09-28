const en = {
  // Navigation
  dashboard: 'Dashboard',
  downtime: 'Downtime',
  dailyProduction: 'Daily Production',
  future: 'Future',
  settings: 'Settings',
  users: 'Users',

  // Auth
  login: 'Login',
  logout: 'Logout',
  email: 'Email',
  password: 'Password',
  loginTitle: 'Production Control',
  loginSubtitle: 'Sign in to your account',
  loggingIn: 'Signing in...',
  loginError: 'Invalid email or password',

  // Common
  save: 'Save',
  cancel: 'Cancel',
  edit: 'Edit',
  delete: 'Delete',
  add: 'Add',
  search: 'Search',
  filter: 'Filter',
  export: 'Export',
  loading: 'Loading...',
  noData: 'No data available',
  confirm: 'Confirm',
  close: 'Close',
  yes: 'Yes',
  no: 'No',
  actions: 'Actions',
  submit: 'Submit',
  reset: 'Reset',
  required: 'Required',
  optional: 'Optional',
  total: 'Total',
  all: 'All',

  // Date Filters
  today: 'Today',
  yesterday: 'Yesterday',
  last7Days: 'Last 7 Days',
  last30Days: 'Last 30 Days',
  customRange: 'Custom Range',
  startDate: 'Start Date',
  endDate: 'End Date',
  date: 'Date',

  // Production
  target: 'Target',
  actual: 'Actual',
  defects: 'Defects',
  goodQty: 'Good Quantity',
  achievement: 'Achievement',
  achievementPct: 'Achievement %',
  remarks: 'Remarks',
  productionLine: 'Production Line',
  singlePhase: 'Single Phase',
  threePhase: 'Three Phase',
  totalProduction: 'Total Production',
  dailyTarget: 'Daily Target',
  actualProduction: 'Actual Production',

  // Groups
  group: 'Group',
  groupA: 'Group A',
  groupB: 'Group B',
  groupC: 'Group C',
  groupD: 'Group D',
  productionByGroup: 'Production by Group',
  productionByLine: 'Production by Line',

  // Shifts
  shift: 'Shift',
  morning: 'Morning',
  evening: 'Evening',
  shiftInfo: 'Shift Information',
  currentShift: 'Current Shift',
  currentGroup: 'Current Group',
  shiftTime: 'Shift Time',
  shiftStart: 'Shift Start',
  shiftEnd: 'Shift End',
  nextRotation: 'Next Rotation',
  rotationDay: 'Rotation Day',

  // Dashboard
  todayProduction: "Today's Production",
  kpiCards: 'KPI Overview',
  charts: 'Charts',
  dailyTrend: 'Daily Production Trend',
  targetVsActual: 'Target vs Actual',
  defectsTrend: 'Defects Trend',
  downtimeTrend: 'Downtime Trend',
  filterBy: 'Filter by',

  // Downtime
  downtimeLog: 'Downtime Log',
  downtimeReason: 'Downtime Reason',
  customReason: 'Custom Reason',
  description: 'Description',
  startTime: 'Start Time',
  endTime: 'End Time',
  duration: 'Duration',
  addDowntime: 'Add Downtime',
  editDowntime: 'Edit Downtime',
  deleteDowntime: 'Delete Downtime',
  confirmDeleteDowntime: 'Are you sure you want to delete this downtime record?',
  downtimeReasons: {
    machineBreakdown: 'Machine Breakdown',
    materialShortage: 'Material Shortage',
    quality: 'Quality',
    maintenance: 'Maintenance',
    noOperator: 'No Operator',
    other: 'Other',
  },
  totalDowntime: 'Total Downtime',

  // Daily Production
  dailyReport: 'Daily Production Report',
  addReport: 'Add Report',
  editReport: 'Edit Report',
  deleteReport: 'Delete Report',
  confirmDeleteReport: 'Are you sure you want to delete this report?',
  reportDate: 'Report Date',
  createdBy: 'Created By',
  createdAt: 'Created At',

  // Validation
  fieldRequired: '{{field}} is required',
  mustBePositive: '{{field}} must be a positive number',
  endAfterStart: 'End time must be after start time',
  defectsExceedActual: 'Defects cannot exceed actual production',
  customReasonRequired: 'Please enter a custom reason',

  // Success / Error
  savedSuccess: 'Record saved successfully',
  deletedSuccess: 'Record deleted successfully',
  errorOccurred: 'An error occurred. Please try again.',
  networkError: 'Network error. Please check your connection.',

  // Future Page
  futureTitle: 'Coming Soon',
  futureSubtitle: 'This section will be configured later.',
  futureDescription: 'This feature is planned and will be available in a future update.',

  // Profile
  profile: 'Profile',
  role: 'Role',
  name: 'Name',
  active: 'Active',
  inactive: 'Inactive',
  admin: 'Admin',
  supervisor: 'Supervisor',
  operator: 'Operator',
  viewer: 'Viewer',

  // Theme
  darkMode: 'Dark Mode',
  lightMode: 'Light Mode',
  language: 'Language',
};

export default en;
