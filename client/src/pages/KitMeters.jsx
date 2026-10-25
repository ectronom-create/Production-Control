import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
  FileText,
  Clock,
  ArrowUpRight,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { getTodayString, getBatchStatus } from '../utils/kitStatus';

const LOCAL_STORAGE_KEY = 'ectron_kit_meters_records';


export default function KitMeters() {
  const { user } = useAuth();
  const { t, isArabic } = useLanguage();
  const isViewer = user?.access === 'viewer';
  const isAdmin = user?.access === 'admin';

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [dbWarning, setDbWarning] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduct, setFilterProduct] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'RECEIVED' | 'PLANNED'
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
        setDbWarning(`Supabase Error (${error.message || error.code || 'Permission Denied'}). Using local storage cache.`);
        const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        setRecords(local);
      } else {
        setDbWarning('');
        setRecords(data || []);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data || []));
      }
    } catch (err) {
      console.warn('Kit meters load error:', err);
      setDbWarning(`Connection error: ${err.message}. Using local storage.`);
      const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      setRecords(local);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync locally cached batches to Supabase once permissions are granted
  const handleSyncLocalToSupabase = async () => {
    setIsSyncing(true);
    try {
      const { data: remoteData, error: readError } = await supabase.from('kit_meters').select('*');
      if (readError) {
        alert(`Supabase is still reporting an error: ${readError.message}\n\nPlease run the GRANT SQL in the Supabase SQL Editor.`);
        setIsSyncing(false);
        return;
      }

      const remoteKeys = new Set((remoteData || []).map(r => `${r.batch_number}_${r.date}`));
      const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      const toInsert = local
        .filter(r => !remoteKeys.has(`${r.batch_number}_${r.date}`))
        .map(r => ({
          batch_number: r.batch_number,
          kit_quantity: r.kit_quantity,
          date: r.date,
          product_name: r.product_name || 'Three Phase',
          notes: r.notes || '',
          created_by: r.created_by || user?.name || 'Admin',
          updated_at: new Date().toISOString()
        }));

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from('kit_meters').insert(toInsert);
        if (insertError) {
          alert(`Error syncing batches to Supabase: ${insertError.message}`);
          setIsSyncing(false);
          return;
        }
      }

      await loadRecords();
      setDbWarning('');
      setSaveSuccessMsg(`Successfully synced ${toInsert.length} batch(es) to Supabase database!`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

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
      setModalError('Please enter a Batch Number.');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setModalError('Please enter a valid kit quantity greater than 0.');
      return;
    }
    if (!recordDate) {
      setModalError('Please select a date.');
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
          const updated = records.map(r => r.id === editingRecord.id ? { ...r, ...payload } : r);
          setRecords(updated);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
          setDbWarning(`Supabase write issue: ${error.message || 'Permission Denied'}. Record saved locally in browser.`);
          setSaveSuccessMsg(`⚠️ Batch ${batchNumber} saved locally (Supabase table permissions required)`);
        } else {
          setDbWarning('');
          await loadRecords();
          setSaveSuccessMsg(`Batch ${batchNumber} updated in Supabase successfully!`);
        }
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('kit_meters')
          .insert([payload])
          .select();

        if (error) {
          console.warn('Insert kit_meters Supabase error:', error);
          const newRec = { ...payload, id: Date.now() };
          const updated = [newRec, ...records];
          setRecords(updated);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
          setDbWarning(`Supabase write issue: ${error.message || 'Permission Denied'}. Record saved locally in browser.`);
          setSaveSuccessMsg(`⚠️ Batch ${batchNumber} saved locally only (Supabase permission denied)`);
        } else {
          setDbWarning('');
          await loadRecords();
          setSaveSuccessMsg(`Batch ${batchNumber} added to Supabase with ${qty.toLocaleString()} kits successfully!`);
        }
      }

      setShowModal(false);
      setTimeout(() => setSaveSuccessMsg(''), 6000);
    } catch (err) {
      console.error('Submit error:', err);
      setModalError(err.message || 'An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete record (Strictly Admin only)
  const handleDeleteRecord = async (id, batch) => {
    if (!isAdmin) {
      alert('Only administrators have permission to delete kit records.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete kit batch "${batch}"?`)) return;

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
    const today = getTodayString();
    return records.filter(r => {
      const matchSearch = searchTerm === '' || 
        (r.batch_number && r.batch_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchProduct = filterProduct === 'ALL' || r.product_name === filterProduct;
      const matchDate = filterDate === '' || r.date === filterDate;
      
      let matchStatus = true;
      if (filterStatus === 'RECEIVED') {
        matchStatus = !getBatchStatus(r.date, r.notes).isPlanned;
      } else if (filterStatus === 'PLANNED') {
        matchStatus = getBatchStatus(r.date, r.notes).isPlanned;
      }

      return matchSearch && matchProduct && matchDate && matchStatus;
    });
  }, [records, searchTerm, filterProduct, filterDate, filterStatus]);

  // KPI Statistics (Computed across all records to show overall pipeline & delivery plan)
  const stats = useMemo(() => {
    let totalKits = 0;
    let receivedKits = 0;
    let plannedKits = 0;
    let receivedBatches = 0;
    let plannedBatches = 0;
    let threePhaseKits = 0;
    let singlePhaseKits = 0;
    let nearestIncomingDate = null;
    let nearestIncomingDays = null;

    records.forEach(r => {
      const q = r.kit_quantity || 0;
      totalKits += q;
      if (r.product_name === 'Three Phase') threePhaseKits += q;
      if (r.product_name === 'Single Phase') singlePhaseKits += q;

      const bStatus = getBatchStatus(r.date, r.notes);
      if (bStatus.isPlanned) {
        plannedKits += q;
        plannedBatches += 1;
        if (!nearestIncomingDate || r.date < nearestIncomingDate) {
          nearestIncomingDate = r.date;
          nearestIncomingDays = bStatus.daysDiff;
        }
      } else {
        receivedKits += q;
        receivedBatches += 1;
      }
    });

    const totalBatches = records.length;
    const receivedPct = totalKits > 0 ? ((receivedKits / totalKits) * 100) : 0;

    return { 
      totalKits, 
      receivedKits, 
      plannedKits, 
      totalBatches, 
      receivedBatches, 
      plannedBatches, 
      threePhaseKits, 
      singlePhaseKits,
      nearestIncomingDate,
      nearestIncomingDays,
      receivedPct
    };
  }, [records]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Status Banner ── */}
      {saveSuccessMsg && (
        <div style={{ 
          background: saveSuccessMsg.includes('⚠️') ? '#fef3c7' : '#dcfce7', 
          color: saveSuccessMsg.includes('⚠️') ? '#92400e' : '#15803d', 
          border: `1px solid ${saveSuccessMsg.includes('⚠️') ? '#fde68a' : '#bbf7d0'}`, 
          padding: '12px 18px', 
          borderRadius: 10, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 10, 
          fontWeight: 700 
        }}>
          {saveSuccessMsg.includes('⚠️') ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          {saveSuccessMsg}
        </div>
      )}

      {/* ── Supabase Permissions / Warning Banner ── */}
      {dbWarning && (
        <div style={{ 
          background: '#fffbeb', 
          color: '#92400e', 
          border: '1.5px solid #fde68a', 
          padding: '14px 18px', 
          borderRadius: 12, 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: 12, 
          fontSize: '0.88rem'
        }}>
          <AlertCircle size={22} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#b45309', marginBottom: 4 }}>
              Supabase Database Connection Alert (kit_meters table permissions)
            </div>
            <div style={{ color: '#78350f', lineHeight: 1.5 }}>
              Current records are saved locally in the browser cache because the <code>kit_meters</code> table in Supabase requires access permissions (GRANT & RLS) to be enabled via the Supabase SQL Editor.
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSyncLocalToSupabase}
                disabled={isSyncing}
                style={{
                  background: '#d97706',
                  color: 'white',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Syncing...' : 'Retry Sync with Supabase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">{t('kitMetersTitle')}</h1>
          <p className="page-subtitle">{t('kitMetersSubtitle')}</p>
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
            {t('addKitBatch')}
          </button>
        )}
      </div>

      {/* ── Summary Counters ── */}
      <div className="kpi-grid">
        {/* Card 1: Received Kits (Actual) */}
        <div className="kpi-card" style={{ borderLeft: '4px solid #16a34a' }}>
          <div className="kpi-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <CheckCircle size={24} />
          </div>
          <div className="kpi-data">
            <span className="kpi-title">{isArabic ? 'الكيتات المستلمة (الفعلي)' : 'Received Kits (Actual)'}</span>
            <span className="kpi-val" style={{ color: '#15803d' }}>
              {stats.receivedKits.toLocaleString()}
            </span>
            <span className="kpi-sub">
              {isArabic ? (
                <><strong>{stats.receivedBatches}</strong> دفعات مستلمة • {stats.receivedPct.toFixed(1)}% من الإجمالي</>
              ) : (
                <><strong>{stats.receivedBatches}</strong> received batches • {stats.receivedPct.toFixed(1)}% of total</>
              )}
            </span>
          </div>
        </div>

        {/* Card 2: Delivery Plan (Incoming) */}
        <div className="kpi-card" style={{ borderLeft: '4px solid #4f46e5' }}>
          <div className="kpi-icon" style={{ background: '#eef2ff', color: '#4338ca' }}>
            <Clock size={24} />
          </div>
          <div className="kpi-data">
            <span className="kpi-title">{isArabic ? 'خطة التوريد (المتوقع وصوله)' : 'Delivery Plan (Incoming)'}</span>
            <span className="kpi-val" style={{ color: '#4338ca' }}>
              {stats.plannedKits.toLocaleString()}
            </span>
            <span className="kpi-sub">
              {isArabic ? (
                <><strong>{stats.plannedBatches}</strong> دفعات مجدولة {stats.nearestIncomingDays ? `• القادم بعد ${stats.nearestIncomingDays} يوم` : ''}</>
              ) : (
                <><strong>{stats.plannedBatches}</strong> planned batches {stats.nearestIncomingDays ? `• Next in ${stats.nearestIncomingDays}d` : ''}</>
              )}
            </span>
          </div>
        </div>

        {/* Card 3: Total Batches Logged */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--navy)' }}>
          <div className="kpi-icon" style={{ background: '#f1f5f9', color: 'var(--navy)' }}>
            <Layers size={24} />
          </div>
          <div className="kpi-data">
            <span className="kpi-title">{isArabic ? 'إجمالي دفعات الخط' : 'Total Pipeline Batches'}</span>
            <span className="kpi-val" style={{ color: 'var(--navy)' }}>
              {stats.totalBatches}
            </span>
            <span className="kpi-sub">
              {isArabic 
                ? `${stats.receivedBatches} مستلم • ${stats.plannedBatches} خطة توريد`
                : `${stats.receivedBatches} Received • ${stats.plannedBatches} Delivery Plan`}
            </span>
          </div>
        </div>

        {/* Card 4: Total Kits & Product Split */}
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--teal)' }}>
          <div className="kpi-icon" style={{ background: 'var(--teal-light)', color: 'var(--teal-dark)' }}>
            <Package size={24} />
          </div>
          <div className="kpi-data">
            <span className="kpi-title">{isArabic ? 'إجمالي كيتات الشحنات' : 'Total Kits (All Shipments)'}</span>
            <span className="kpi-val" style={{ color: 'var(--teal-dark)' }}>
              {stats.totalKits.toLocaleString()}
            </span>
            <span className="kpi-sub">
              {isArabic 
                ? `${stats.threePhaseKits.toLocaleString()} 3 فاز • ${stats.singlePhaseKits.toLocaleString()} 1 فاز`
                : `${stats.threePhaseKits.toLocaleString()} 3-Phase • ${stats.singlePhaseKits.toLocaleString()} 1-Phase`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Search and Filter Bar ── */}
      <div className="filter-card" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input 
            type="text" 
            placeholder={isArabic ? 'بحث برقم الدفعة أو الملاحظات...' : 'Search by Batch Number or Notes...'} 
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
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ width: 'auto', fontWeight: 700 }}
          >
            <option value="ALL">{isArabic ? 'جميع الحالات (مستلم ومخطط)' : 'All Statuses (Received & Planned)'}</option>
            <option value="RECEIVED">{isArabic ? '🟢 المستلم فقط (فعلي)' : '🟢 Received Only (Actual)'}</option>
            <option value="PLANNED">{isArabic ? '🔵 خطة التوريد فقط (المتوقع)' : '🔵 Delivery Plan Only (Incoming)'}</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select 
            className="form-select"
            value={filterProduct}
            onChange={e => setFilterProduct(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="ALL">{isArabic ? 'جميع المنتجات' : 'All Products'}</option>
            <option value="Three Phase">{isArabic ? 'ثلاثي الفاز (Three Phase)' : 'Three Phase'}</option>
            <option value="Single Phase">{isArabic ? 'أحادي الفاز (Single Phase)' : 'Single Phase'}</option>
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
              {isArabic ? 'مسح' : 'Clear'}
            </button>
          )}
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="table-card">
        <div className="table-header">
          <div className="table-title">
            <span>{isArabic ? `سجل دفعات الكيت (${filteredRecords.length})` : `Kit Batches Log (${filteredRecords.length})`}</span>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('batchNumber')}</th>
                <th>{t('status')}</th>
                <th>{isArabic ? 'تاريخ الاستلام / الجدولة' : 'Receipt / Scheduled Date'}</th>
                <th>{t('product')}</th>
                <th style={{ textAlign: 'right' }}>{t('quantity')}</th>
                <th>{isArabic ? 'أُدخل بواسطة' : 'Entered By'}</th>
                <th>{t('notes')}</th>
                <th style={{ textAlign: 'center' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--gray-500)' }}>
                      <span className="spinner" /> {t('loading')}
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                    {isArabic ? 'لا توجد دفعات كيت مطابقة للفلاتر الحالية.' : 'No kit batches found matching current filters.'}
                  </td>
                </tr>
              ) : (
                filteredRecords.map(r => {
                  const bStatus = getBatchStatus(r.date, r.notes);
                  return (
                    <tr key={r.id} style={{ borderLeft: bStatus.isPlanned ? '4px solid #6366f1' : '4px solid #16a34a' }}>
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Hash size={14} color="var(--teal)" />
                          <span>{r.batch_number}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            background: bStatus.bg,
                            color: bStatus.color,
                            border: `1px solid ${bStatus.border}`,
                            width: 'fit-content'
                          }}>
                            {bStatus.isPlanned ? <Clock size={12} /> : <CheckCircle size={12} />}
                            {isArabic ? (bStatus.isPlanned ? 'خطة توريد (مجدول)' : 'مستلم (فعلي)') : bStatus.label}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: bStatus.isPlanned ? '#4338ca' : '#64748b', fontWeight: bStatus.isPlanned ? 700 : 500, paddingLeft: 2 }}>
                            {bStatus.sublabel}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: bStatus.isPlanned ? '#4338ca' : 'var(--gray-700)' }}>
                          {r.date}
                        </span>
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
                          {r.product_name === 'Three Phase' 
                            ? (isArabic ? '⚡ 3 فاز' : '⚡ Three Phase') 
                            : (isArabic ? '🔌 1 فاز' : '🔌 Single Phase')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--navy)' }}>
                          {r.kit_quantity?.toLocaleString()}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginLeft: 4 }}>{isArabic ? 'كيت' : 'Kits'}</span>
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
                                title={t('edit')}
                                onClick={() => handleOpenEditModal(r)}
                              >
                                <Edit3 size={15} />
                              </button>

                              {isAdmin && (
                                <button 
                                  type="button"
                                  className="btn-icon btn-delete" 
                                  title={isArabic ? 'حذف (للأدمن فقط)' : 'Delete (Admin only)'}
                                  onClick={() => handleDeleteRecord(r.id, r.batch_number)}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </>
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

      {/* ── MODAL: Add / Edit Kit Batch ── */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={20} color="var(--teal)" />
                <span className="modal-title">
                  {editingRecord 
                    ? (isArabic ? `تعديل دفعة الكيت (${editingRecord.batch_number})` : `Edit Kit Batch (${editingRecord.batch_number})`)
                    : (isArabic ? 'إضافة دفعة كيت جديدة' : 'Add New Kit Batch')}
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
                    <label style={{ fontWeight: 800, color: 'var(--navy)' }}>{t('batchNumber')} *</label>
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
                    <label style={{ fontWeight: 800, color: 'var(--teal-dark)' }}>{t('quantity')} *</label>
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
                      {isArabic ? 'مثال: 25,000 كيت' : 'e.g. 25,000 kits'}
                    </span>
                  </div>
                </div>

                {/* Date & Product Type */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 800, color: 'var(--navy)' }}>{t('date')} *</label>
                    <input 
                      type="date" 
                      value={recordDate}
                      onChange={e => setRecordDate(e.target.value)}
                      disabled={isSubmitting}
                      required
                      style={{ fontWeight: 700 }}
                    />
                    {recordDate && (() => {
                      const st = getBatchStatus(recordDate);
                      return (
                        <div style={{ 
                          marginTop: 6, 
                          padding: '6px 10px', 
                          background: st.bg, 
                          border: `1px solid ${st.border}`, 
                          borderRadius: 6, 
                          fontSize: '0.76rem', 
                          color: st.color, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 6, 
                          fontWeight: 700 
                        }}>
                          {st.isPlanned ? <Clock size={14} /> : <CheckCircle size={14} />}
                          <span>
                            {isArabic 
                              ? (st.isPlanned ? `تاريخ مستقبلي (${st.sublabel}): مجدول ضمن خطة التوريد القادمة.` : `تاريخ حالي/سابق (${st.sublabel}): مسجل كشحنة مستلمة فعلياً.`)
                              : (st.isPlanned ? `Future date (${st.sublabel}): Scheduled under Incoming Delivery Plan.` : `Current/Past date (${st.sublabel}): Logged as Received Shipment.`)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 800, color: 'var(--navy)' }}>{t('product')} *</label>
                    <select 
                      className="form-select"
                      value={productName}
                      onChange={e => setProductName(e.target.value)}
                      disabled={isSubmitting}
                      style={{ fontWeight: 700 }}
                    >
                      <option value="Three Phase">{isArabic ? 'ثلاثي الفاز (Three Phase)' : 'Three Phase'}</option>
                      <option value="Single Phase">{isArabic ? 'أحادي الفاز (Single Phase)' : 'Single Phase'}</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={15} /> {t('notes')}
                  </label>
                  <textarea 
                    rows={2}
                    className="search-input"
                    style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', padding: '8px 12px' }}
                    placeholder={isArabic ? 'أي ملاحظات إضافية بخصوص الشحنة أو موقع التخزين...' : 'Any additional notes regarding shipment or storage location...'}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} disabled={isSubmitting}>
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <span className="spinner" /> : (editingRecord ? t('saveChanges') : t('addKitBatch'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
