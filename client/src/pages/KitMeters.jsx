import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  Package, 
  Plus, 
  Calendar, 
  Layers, 
  TrendingUp, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  CheckCircle,
  Hash,
  FileText
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'ectron_kit_meters_records';

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function KitMeters() {
  const { user } = useAuth();
  const isViewer = user?.access === 'viewer';

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [batchNumber, setBatchNumber] = useState('');
  const [kitQuantity, setKitQuantity] = useState('');
  const [recordDate, setRecordDate] = useState(getTodayString());
  const [productName, setProductName] = useState('Three Phase');
  const [notes, setNotes] = useState('');
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load records from Supabase with localStorage fallback
  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('kit_meters')
        .select('*')
        .order('date', { ascending: false })
        .order('id', { ascending: false });

      if (error) {
        console.warn('Supabase kit_meters fetch error:', error);
        // Fallback to local storage
        const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        setRecords(local);
      } else {
        setRecords(data || []);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data || []));
      }
    } catch (err) {
      console.warn('Kit meters load error:', err);
      const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      setRecords(local);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Open modal for new record
  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setBatchNumber('');
    setKitQuantity('');
    setRecordDate(getTodayString());
    setProductName('Three Phase');
    setNotes('');
    setModalError('');
    setShowModal(true);
  };

  // Open modal for editing record
  const handleOpenEditModal = (rec) => {
    setEditingRecord(rec);
    setBatchNumber(rec.batch_number || '');
    setKitQuantity(rec.kit_quantity || '');
    setRecordDate(rec.date || getTodayString());
    setProductName(rec.product_name || 'Three Phase');
    setNotes(rec.notes || '');
    setModalError('');
    setShowModal(true);
  };

  // Submit record (Add or Edit)
  const handleSubmitRecord = async (e) => {
    e.preventDefault();
    const qty = parseInt(kitQuantity, 10);
    if (!batchNumber.trim()) {
      setModalError('يرجى إدخال رقم الباتش (Batch Number).');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setModalError('يرجى إدخال عدد كت صحيح أكبر من صفر.');
      return;
    }
    if (!recordDate) {
      setModalError('يرجى تحديد التاريخ.');
      return;
    }

    setIsSubmitting(true);
    setModalError('');

    const payload = {
      batch_number: batchNumber.trim(),
      kit_quantity: qty,
      date: recordDate,
      product_name: productName,
      notes: notes.trim(),
      created_by: user?.name || 'Admin',
      updated_at: new Date().toISOString()
    };

    try {
      if (editingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('kit_meters')
          .update(payload)
          .eq('id', editingRecord.id);

        if (error) {
          console.warn('Update kit_meters Supabase error:', error);
          // Local fallback
          const updated = records.map(r => r.id === editingRecord.id ? { ...r, ...payload } : r);
          setRecords(updated);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        } else {
          await loadRecords();
        }
        setSaveSuccessMsg(`تم تحديث بيانات الباتش ${batchNumber} بنجاح!`);
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('kit_meters')
          .insert([payload])
          .select();

        if (error) {
          console.warn('Insert kit_meters Supabase error:', error);
          // Local fallback
          const newRec = { ...payload, id: Date.now() };
          const updated = [newRec, ...records];
          setRecords(updated);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        } else {
          await loadRecords();
        }
        setSaveSuccessMsg(`تمت إضافة الباتش ${batchNumber} بعدد ${qty.toLocaleString()} كت بنجاح!`);
      }

      setShowModal(false);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Submit error:', err);
      setModalError(err.message || 'حدث خطأ أثناء الحفظ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete record
  const handleDeleteRecord = async (id, batch) => {
    if (!window.confirm(`هل أنت متأكد من حذف سجل الباتش "${batch}"؟`)) return;

    try {
      const { error } = await supabase.from('kit_meters').delete().eq('id', id);
      if (error) {
        console.warn('Delete kit_meters Supabase error:', error);
      }
      const updated = records.filter(r => r.id !== id);
      setRecords(updated);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      await loadRecords();
    } catch (err) {
      console.warn('Delete error:', err);
    }
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchSearch = searchTerm === '' || 
        (r.batch_number && r.batch_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchProduct = filterProduct === 'ALL' || r.product_name === filterProduct;
      const matchDate = filterDate === '' || r.date === filterDate;
      return matchSearch && matchProduct && matchDate;
    });
  }, [records, searchTerm, filterProduct, filterDate]);

  // KPI Statistics
  const stats = useMemo(() => {
    const totalKits = filteredRecords.reduce((sum, r) => sum + (r.kit_quantity || 0), 0);
    const threePhaseKits = filteredRecords
      .filter(r => r.product_name === 'Three Phase')
      .reduce((sum, r) => sum + (r.kit_quantity || 0), 0);
    const singlePhaseKits = filteredRecords
      .filter(r => r.product_name === 'Single Phase')
      .reduce((sum, r) => sum + (r.kit_quantity || 0), 0);
    const totalBatches = filteredRecords.length;
    return { totalKits, threePhaseKits, singlePhaseKits, totalBatches };
  }, [filteredRecords]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
          <CheckCircle size={20} />
          {saveSuccessMsg}
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Kit Meters (إدارة كميات الكيت والباتشات)</h1>
          <p className="page-subtitle">Track incoming meter kits, batch quantities, Three Phase & Single Phase allocation</p>
        </div>

        {/* Action Button at Top */}
        {!isViewer && (
          <button 
            type="button"
            className="btn-primary" 
            style={{ 
              background: 'var(--teal)', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '10px 20px', 
              fontWeight: 700, 
              fontSize: '0.92rem',
              boxShadow: '0 4px 12px rgba(0, 175, 170, 0.25)' 
            }}
            onClick={handleOpenAddModal}
          >
            <Plus size={18} />
            Add Kit Batch (إضافة باتش كيت جديد)
          </button>
        )}
      </div>

      {/* ── Summary Counters ── */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--teal)' }}>
          <div className="kpi-icon" style={{ background: 'var(--teal-light)', color: 'var(--teal-dark)' }}>
            <Package size={24} />
          </div>
          <div className="kpi-data">
            <span className="kpi-title">Total Kits (إجمالي عدد الكيت)</span>
            <span className="kpi-val" style={{ color: 'var(--navy)' }}>
              {stats.totalKits.toLocaleString()}
            </span>
            <span className="kpi-sub">عبر جميع الباتشات المسجلة</span>
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="kpi-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
            <Layers size={24} />
          </div>
          <div className="kpi-data">
            <span className="kpi-title">Three Phase Kits (ثلاثي الطور)</span>
            <span className="kpi-val" style={{ color: '#1d4ed8' }}>
              {stats.threePhaseKits.toLocaleString()}
            </span>
            <span className="kpi-sub">
              {stats.totalKits > 0 ? `${((stats.threePhaseKits / stats.totalKits) * 100).toFixed(1)}% من الإجمالي` : '0%'}
            </span>
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="kpi-icon" style={{ background: '#ede9fe', color: '#6d28d9' }}>
            <TrendingUp size={24} />
          </div>
          <div className="kpi-data">
            <span className="kpi-title">Single Phase Kits (أحادي الطور)</span>
            <span className="kpi-val" style={{ color: '#6d28d9' }}>
              {stats.singlePhaseKits.toLocaleString()}
            </span>
            <span className="kpi-sub">
              {stats.totalKits > 0 ? `${((stats.singlePhaseKits / stats.totalKits) * 100).toFixed(1)}% من الإجمالي` : '0%'}
            </span>
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="kpi-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <Hash size={24} />
          </div>
          <div className="kpi-data">
            <span className="kpi-title">Total Batches (إجمالي الباتشات)</span>
            <span className="kpi-val" style={{ color: '#b45309' }}>
              {stats.totalBatches}
            </span>
            <span className="kpi-sub">شحنات / دفعات مسجلة</span>
          </div>
        </div>
      </div>

      {/* ── Search and Filter Bar ── */}
      <div className="filter-card" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input 
            type="text" 
            placeholder="Search by Batch Number or Notes..." 
            className="search-input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} color="var(--gray-500)" />
          <select 
            className="form-select"
            value={filterProduct}
            onChange={e => setFilterProduct(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="ALL">All Products (جميع المنتجات)</option>
            <option value="Three Phase">Three Phase (ثلاثي الطور)</option>
            <option value="Single Phase">Single Phase (أحادي الطور)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={16} color="var(--gray-500)" />
          <input 
            type="date" 
            className="form-input"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            style={{ width: 'auto' }}
          />
          {filterDate && (
            <button 
              type="button" 
              className="btn-outline" 
              onClick={() => setFilterDate('')}
              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="table-card">
        <div className="table-header">
          <div className="table-title">
            <span>Kit Batches Log ({filteredRecords.length})</span>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Batch Number (رقم الباتش)</th>
                <th>Date (التاريخ)</th>
                <th>Product Type (نوع المنتج)</th>
                <th style={{ textAlign: 'right' }}>Kit Quantity (عدد الكت)</th>
                <th>Entered By</th>
                <th>Notes</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--gray-500)' }}>
                      <span className="spinner" /> Loading kit meter batches...
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                    No kit batches found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Hash size={14} color="var(--teal)" />
                        <span>{r.batch_number}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{r.date}</span>
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        background: r.product_name === 'Three Phase' ? '#dbeafe' : '#ede9fe',
                        color: r.product_name === 'Three Phase' ? '#1d4ed8' : '#6d28d9'
                      }}>
                        {r.product_name === 'Three Phase' ? '⚡ Three Phase' : '🔌 Single Phase'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--navy)' }}>
                        {r.kit_quantity?.toLocaleString()}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginLeft: 4 }}>Kits</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                        {r.created_by || 'Admin'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--gray-500)', maxWidth: 220, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.notes || '—'}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns" style={{ justifyContent: 'center' }}>
                        {!isViewer && (
                          <>
                            <button 
                              type="button"
                              className="btn-icon" 
                              style={{ background: '#e0f2fe', color: '#0369a1' }}
                              title="Edit Batch"
                              onClick={() => handleOpenEditModal(r)}
                            >
                              <Edit3 size={15} />
                            </button>

                            <button 
                              type="button"
                              className="btn-icon btn-delete" 
                              title="Delete Batch"
                              onClick={() => handleDeleteRecord(r.id, r.batch_number)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: Add / Edit Kit Batch ── */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={20} color="var(--teal)" />
                <span className="modal-title">
                  {editingRecord ? `Edit Kit Batch (${editingRecord.batch_number})` : 'Add New Kit Batch (إضافة باتش كيت جديد)'}
                </span>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmitRecord}>
              <div className="modal-body">
                {modalError && <div className="modal-error">{modalError}</div>}

                {/* Batch Number & Kit Quantity */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 800, color: 'var(--navy)' }}>Batch Number (رقم الباتش) *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Batch 1 / Batch 25" 
                      value={batchNumber}
                      onChange={e => setBatchNumber(e.target.value)}
                      disabled={isSubmitting}
                      required
                      style={{ fontWeight: 700 }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 800, color: 'var(--teal-dark)' }}>Kit Quantity (عدد الكت) *</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 25000" 
                      value={kitQuantity}
                      onChange={e => setKitQuantity(e.target.value)}
                      disabled={isSubmitting}
                      min="1"
                      required
                      style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--navy)' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 2, display: 'block' }}>
                      مثال: 25,000 كت
                    </span>
                  </div>
                </div>

                {/* Date & Product Type */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 800, color: 'var(--navy)' }}>Date (التاريخ) *</label>
                    <input 
                      type="date" 
                      value={recordDate}
                      onChange={e => setRecordDate(e.target.value)}
                      disabled={isSubmitting}
                      required
                      style={{ fontWeight: 700 }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 800, color: 'var(--navy)' }}>Product Name (اسم المنتج) *</label>
                    <select 
                      className="form-select"
                      value={productName}
                      onChange={e => setProductName(e.target.value)}
                      disabled={isSubmitting}
                      style={{ fontWeight: 700 }}
                    >
                      <option value="Three Phase">Three Phase (ثلاثي الطور)</option>
                      <option value="Single Phase">Single Phase (أحادي الطور)</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={15} /> Notes / Description (ملاحظات الشحنة أو الباتش)
                  </label>
                  <textarea 
                    rows={2}
                    className="search-input"
                    style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', padding: '8px 12px' }}
                    placeholder="أي ملاحظات إضافية حول التوريد أو موقع التخزين..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <span className="spinner" /> : (editingRecord ? 'Save Changes' : 'Add Kit Batch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
