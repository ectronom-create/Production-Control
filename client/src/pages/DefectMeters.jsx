export default function DefectMeters() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Defect Meters</h1>
        <p className="page-subtitle">Measure and analyse product defects</p>
      </div>
      <div className="empty-page">
        <div className="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="empty-label">Defect Meters</div>
        <p className="empty-desc">This page is ready for future development.</p>
      </div>
    </div>
  );
}
