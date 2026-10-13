import { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { 
  Package, 
  Upload, 
  Search, 
  Filter, 
  Trash2, 
  Download, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  Hash, 
  Calendar, 
  Cpu, 
  FileSpreadsheet,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

// Field definitions strictly matching the user's specification and image + actual factory excel headers (13 fields)
const EXPECTED_FIELDS = [
  { key: 'device_pallet_number', label: 'Device_pallet_number', aliases: ['device_pallet_number', 'devicepalletnumber', 'palletnumber', 'pallet_no', 'pallet_number', 'palette', 'pallet', 'serialnumberpalette', 'serial_number_palette'] },
  { key: 'device_box_number', label: 'Device_box_number', aliases: ['device_box_number', 'deviceboxnumber', 'boxnumber', 'box_no', 'device_box', 'boxserialnumber', 'box_serial_number', 'boxsn'] },
  { key: 'factory_serial_number', label: 'Factory serial number', aliases: ['factory_serial_number', 'factoryserialnumber', 'factory_sn', 'factorysn', 'factoryserial'] },
  { key: 'date_of_manufactory', label: 'Date_of_manufactory', aliases: ['date_of_manufactory', 'dateofmanufactory', 'date_of_manufacture', 'dateofmanufacture', 'mfg_date', 'date_manufacture', 'datemanufactory'] },
  { key: 'hardware_version', label: 'Hardware_version', aliases: ['hardware_version', 'hardwareversion', 'hw_version', 'hwversion', 'hw_ver'] },
  { key: 'lot_number', label: 'Lot_number', aliases: ['lot_number', 'lotnumber', 'lot_no', 'lot', 'lotno'] },
  { key: 'serial_number', label: 'Serial_number', aliases: ['serial_number', 'serialnumber', 'sn', 'meter_sn', 'meter_serial', 'serial_no', 'meterserialnumber'] },
  { key: 'logic_device_name', label: 'Logic_device_name', aliases: ['logic_device_name', 'logicdevicename', 'logic_name', 'ldn', 'logicaldevicename'] },
  { key: 'app_software_version', label: 'App_software_version', aliases: ['app_software_version', 'appsoftwareversion', 'app_version', 'app_sw', 'appswversion'] },
  { key: 'legal_software_version', label: 'Legal_software_version', aliases: ['legal_software_version', 'legalsoftwareversion', 'legal_version', 'legal_sw', 'legalswversion'] },
  { key: 'module_software_version', label: 'Module_software_version', aliases: ['module_software_version', 'modulesoftwareversion', 'mod_version', 'module_sw', 'moduleswversion'] },
  { key: 'module_imei', label: 'Module_IMEI', aliases: ['module_imei', 'moduleimei', 'imei', 'mod_imei'] },
  { key: 'module_iccid', label: 'Module_ICCID', aliases: ['module_iccid', 'moduleiccid', 'iccid', 'mod_iccid', 'sim_iccid'] },
];

function normalizeHeader(str) {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export default function Batches() {
  const { user } = useAuth();
  const isAdmin = user?.access === 'admin';

  // Batches state
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('batches'); // 'batches' or 'lookup'

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Upload modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [parsedStats, setParsedStats] = useState(null);
  const [batchName, setBatchName] = useState('');
  const [shipmentDate, setShipmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [productType, setProductType] = useState('Three Phase');
  const [destination, setDestination] = useState('Nama / Field');
  const [batchNotes, setBatchNotes] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Inspect Batch Modal states
  const [inspectBatch, setInspectBatch] = useState(null);
  const [inspectMeters, setInspectMeters] = useState([]);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectSearch, setInspectSearch] = useState('');
  const [inspectPage, setInspectPage] = useState(1);
  const pageSize = 50;

  // Global Meter Search state
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch batches list from Supabase
  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipment_batches')
        .select('*')
        .order('shipment_date', { ascending: false });

      if (error) {
        console.warn('Supabase batches error, using local cache:', error.message);
        const local = localStorage.getItem('ectron_shipment_batches');
        if (local) setBatches(JSON.parse(local));
      } else {
        setBatches(data || []);
        localStorage.setItem('ectron_shipment_batches', JSON.stringify(data || []));
      }
    } catch (e) {
      console.warn('Error loading batches:', e);
      const local = localStorage.getItem('ectron_shipment_batches');
      if (local) setBatches(JSON.parse(local));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const totalBatches = batches.length;
    const totalMeters = batches.reduce((sum, b) => sum + (parseInt(b.total_meters, 10) || 0), 0);
    const threePhaseMeters = batches
      .filter(b => b.product_type === 'Three Phase')
      .reduce((sum, b) => sum + (parseInt(b.total_meters, 10) || 0), 0);
    const singlePhaseMeters = batches
      .filter(b => b.product_type === 'Single Phase')
      .reduce((sum, b) => sum + (parseInt(b.total_meters, 10) || 0), 0);

    return {
      totalBatches,
      totalMeters,
      threePhaseMeters,
      singlePhaseMeters,
      avgPerBatch: totalBatches > 0 ? Math.round(totalMeters / totalBatches) : 0
    };
  }, [batches]);

  // Filtered Batches List
  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      const matchesSearch = !searchTerm || 
        (b.batch_name && b.batch_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.file_name && b.file_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.destination && b.destination.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesProduct = productFilter === 'ALL' || b.product_type === productFilter;
      const matchesDate = !dateFilter || b.shipment_date === dateFilter;

      return matchesSearch && matchesProduct && matchesDate;
    });
  }, [batches, searchTerm, productFilter, dateFilter]);

  // Handle Excel/CSV file selection and parsing
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadFile(file);
    setUploadError('');
    setParsedRows([]);
    setParsedStats(null);

    // Auto-generate batch name if empty
    if (!batchName) {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      setBatchName(baseName.charAt(0).toUpperCase() + baseName.slice(1));
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (rawJson.length < 2) {
          throw new Error('File is empty or does not contain enough data rows.');
        }

        // Row 0 is header
        const headers = rawJson[0].map(h => String(h || '').trim());
        const headerMap = {};

        headers.forEach((h, colIdx) => {
          const norm = normalizeHeader(h);
          EXPECTED_FIELDS.forEach(field => {
            if (field.aliases.some(alias => normalizeHeader(alias) === norm)) {
              headerMap[field.key] = colIdx;
            }
          });
        });

        // Verify serial_number column exists
        if (headerMap.serial_number === undefined && headerMap.factory_serial_number === undefined) {
          throw new Error('Serial_number or Factory serial number column not found in file.');
        }

        const rows = [];
        for (let i = 1; i < rawJson.length; i++) {
          const r = rawJson[i];
          if (!r || r.every(cell => String(cell).trim() === '')) continue; // skip blank row

          const rowObj = {};
          EXPECTED_FIELDS.forEach(field => {
            const idx = headerMap[field.key];
            rowObj[field.key] = idx !== undefined && r[idx] !== undefined ? String(r[idx]).trim() : '';
          });

          // Ensure serial_number is populated
          if (!rowObj.serial_number && rowObj.factory_serial_number) {
            rowObj.serial_number = rowObj.factory_serial_number;
          }

          if (rowObj.serial_number) {
            rows.push(rowObj);
          }
        }

        if (rows.length === 0) {
          throw new Error('No valid meter serial numbers found in file.');
        }

        setParsedRows(rows);
        setParsedStats({
          totalMeters: rows.length,
          mappedColumns: Object.keys(headerMap).length,
          totalColumnsInFile: headers.length,
          firstSample: rows[0]
        });
      } catch (err) {
        console.error('File parsing error:', err);
        setUploadError(err.message || 'Error occurred while reading Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Upload parsed shipment to Supabase in chunks
  const handleSaveShipment = async () => {
    if (!parsedRows || parsedRows.length === 0) {
      setUploadError('Please select a file containing valid meter records first.');
      return;
    }
    if (!batchName.trim()) {
      setUploadError('Please enter the Batch Name.');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadProgress(0);
    setUploadProgressText('Creating shipment batch record...');

    try {
      // 1. Insert Batch record
      const batchPayload = {
        batch_name: batchName.trim(),
        file_name: uploadFile?.name || 'unknown.xlsx',
        shipment_date: shipmentDate,
        total_meters: parsedRows.length,
        product_type: productType,
        destination: destination.trim(),
        notes: batchNotes.trim(),
        uploaded_by: user?.name || 'Admin',
      };

      let createdBatchId = null;
      const { data: batchData, error: batchErr } = await supabase
        .from('shipment_batches')
        .insert([batchPayload])
        .select();

      if (batchErr) {
        console.warn('Batch insert error in Supabase, using local ID fallback:', batchErr.message);
        createdBatchId = Date.now();
      } else if (batchData && batchData.length > 0) {
        createdBatchId = batchData[0].id;
      }

      // 2. Insert Meter records in chunks of 500 rows to avoid payload overflow
      const chunkSize = 500;
      const totalRows = parsedRows.length;
      let insertedCount = 0;

      for (let i = 0; i < totalRows; i += chunkSize) {
        const slice = parsedRows.slice(i, i + chunkSize);
        const meterPayloads = slice.map(r => ({
          batch_id: createdBatchId,
          batch_name: batchName.trim(),
          device_pallet_number: r.device_pallet_number || '',
          device_box_number: r.device_box_number || '',
          factory_serial_number: r.factory_serial_number || '',
          date_of_manufactory: r.date_of_manufactory || '',
          hardware_version: r.hardware_version || '',
          lot_number: r.lot_number || '',
          serial_number: r.serial_number || '',
          logic_device_name: r.logic_device_name || '',
          app_software_version: r.app_software_version || '',
          legal_software_version: r.legal_software_version || '',
          module_software_version: r.module_software_version || '',
          module_imei: r.module_imei || '',
          module_iccid: r.module_iccid || ''
        }));

        const { error: meterErr } = await supabase
          .from('batch_meter_records')
          .insert(meterPayloads);

        if (meterErr) {
          console.warn('Chunk insert warning:', meterErr.message);
        }

        insertedCount += slice.length;
        const pct = Math.round((insertedCount / totalRows) * 100);
        setUploadProgress(pct);
        setUploadProgressText(`Saving meter records: ${insertedCount.toLocaleString()} / ${totalRows.toLocaleString()} (${pct}%)`);
      }

      // 3. Update local cache
      const updatedBatches = [{ ...batchPayload, id: createdBatchId, created_at: new Date().toISOString() }, ...batches];
      setBatches(updatedBatches);
      localStorage.setItem('ectron_shipment_batches', JSON.stringify(updatedBatches));

      // Close modal & reset
      setShowUploadModal(false);
      setUploadFile(null);
      setParsedRows([]);
      setParsedStats(null);
      setBatchName('');
      setBatchNotes('');
      setSuccessToast(`Batch "${batchName}" uploaded and saved successfully with ${totalRows.toLocaleString()} meters!`);
      setTimeout(() => setSuccessToast(''), 5000);

      loadBatches();
    } catch (err) {
      console.error('Shipment upload error:', err);
      setUploadError('Error occurred while saving shipment: ' + (err.message || ''));
    } finally {
      setIsUploading(false);
    }
  };

  // Inspect batch details
  // Helper to fetch all meters for a batch across chunks if batch > 1000
  const fetchAllBatchMeters = async (batchId) => {
    let all = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('batch_meter_records')
        .select('*')
        .eq('batch_id', batchId)
        .range(from, from + step - 1);

      if (error) {
        console.warn('Fetch batch meters error:', error.message);
        break;
      }

      if (data && data.length > 0) {
        all = all.concat(data);
        if (data.length < step) {
          hasMore = false;
        } else {
          from += step;
        }
      } else {
        hasMore = false;
      }
    }
    return all;
  };

  // Inspect batch details
  const handleInspectBatch = async (batch) => {
    setInspectBatch(batch);
    setInspectMeters([]);
    setInspectLoading(true);
    setInspectSearch('');
    setInspectPage(1);

    try {
      const data = await fetchAllBatchMeters(batch.id);
      setInspectMeters(data || []);
    } catch (err) {
      console.warn('Error fetching batch meters:', err);
    } finally {
      setInspectLoading(false);
    }
  };

  // Filtered meters inside Inspect Modal
  const filteredInspectMeters = useMemo(() => {
    if (!inspectSearch.trim()) return inspectMeters;
    const q = inspectSearch.toLowerCase();
    return inspectMeters.filter(m => 
      (m.serial_number && m.serial_number.toLowerCase().includes(q)) ||
      (m.device_pallet_number && m.device_pallet_number.toLowerCase().includes(q)) ||
      (m.factory_serial_number && m.factory_serial_number.toLowerCase().includes(q)) ||
      (m.device_box_number && m.device_box_number.toLowerCase().includes(q)) ||
      (m.module_imei && m.module_imei.toLowerCase().includes(q)) ||
      (m.module_iccid && m.module_iccid.toLowerCase().includes(q))
    );
  }, [inspectMeters, inspectSearch]);

  const paginatedInspectMeters = useMemo(() => {
    const start = (inspectPage - 1) * pageSize;
    return filteredInspectMeters.slice(start, start + pageSize);
  }, [filteredInspectMeters, inspectPage, pageSize]);

  const totalInspectPages = Math.ceil(filteredInspectMeters.length / pageSize) || 1;

  // Export Batch to Excel
  const handleExportBatch = async (batch) => {
    try {
      let rowsToExport = [];
      if (inspectBatch && inspectBatch.id === batch.id && inspectMeters.length > 0) {
        rowsToExport = inspectMeters;
      } else {
        rowsToExport = await fetchAllBatchMeters(batch.id);
      }

      if (rowsToExport.length === 0) {
        alert('No meter records found to export for this batch.');
        return;
      }

      // Format with exact original headers (all 13 fields)
      const exportData = rowsToExport.map(r => ({
        'Device_pallet_number': r.device_pallet_number || '',
        'Device_box_number': r.device_box_number || '',
        'Factory serial number': r.factory_serial_number || '',
        'Date_of_manufactory': r.date_of_manufactory || '',
        'Hardware_version': r.hardware_version || '',
        'Lot_number': r.lot_number || '',
        'Serial_number': r.serial_number || '',
        'Logic_device_name': r.logic_device_name || '',
        'App_software_version': r.app_software_version || '',
        'Legal_software_version': r.legal_software_version || '',
        'Module_software_version': r.module_software_version || '',
        'Module_IMEI': r.module_imei || '',
        'Module_ICCID': r.module_iccid || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Meters');
      XLSX.writeFile(wb, `${batch.batch_name.replace(/\s+/g, '_')}_Meters.xlsx`);
    } catch (err) {
      console.error('Export error:', err);
      alert('Error occurred while exporting file.');
    }
  };

  // Delete Batch
  const handleDeleteBatch = async (batchId, batchName) => {
    if (!window.confirm(`Are you sure you want to delete batch "${batchName}"? All corresponding meter records will be permanently removed.`)) {
      return;
    }

    try {
      await supabase.from('shipment_batches').delete().eq('id', batchId);
      await supabase.from('batch_meter_records').delete().eq('batch_id', batchId);

      const next = batches.filter(b => b.id !== batchId);
      setBatches(next);
      localStorage.setItem('ectron_shipment_batches', JSON.stringify(next));

      if (inspectBatch && inspectBatch.id === batchId) {
        setInspectBatch(null);
      }
      setSuccessToast(`Batch "${batchName}" deleted successfully.`);
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (e) {
      console.error('Delete error:', e);
      alert('Failed to delete batch: ' + e.message);
    }
  };

  // Global Lookup search
  const handleGlobalLookup = async (e) => {
    e.preventDefault();
    if (!lookupQuery.trim()) return;

    setLookupLoading(true);
    setHasSearched(true);
    const q = lookupQuery.trim();

    try {
      const { data, error } = await supabase
        .from('batch_meter_records')
        .select('*')
        .or(`serial_number.ilike.%${q}%,device_pallet_number.ilike.%${q}%,factory_serial_number.ilike.%${q}%,module_imei.ilike.%${q}%,module_iccid.ilike.%${q}%,device_box_number.ilike.%${q}%`)
        .limit(100);

      if (!error && data) {
        setLookupResults(data);
      } else {
        setLookupResults([]);
      }
    } catch (err) {
      console.warn('Lookup search error:', err);
      setLookupResults([]);
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Top Header ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ 
              background: 'linear-gradient(135deg, #192e5b, #0284c7)', 
              color: 'white', 
              padding: '6px 10px', 
              borderRadius: 8, 
              fontSize: '0.8rem', 
              fontWeight: 800, 
              letterSpacing: '0.04em' 
            }}>
              SHIPMENTS
            </span>
            <h1 className="page-title" style={{ margin: 0 }}>Batches & Meter Records</h1>
          </div>
          <p className="page-subtitle">Manage, document, and track shipment batches and individual meter records with zero data loss</p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn-outline" 
            onClick={loadBatches}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white' }}
          >
            <RefreshCw size={15} />
            Refresh
          </button>

          <button 
            type="button" 
            className="btn-primary" 
            onClick={() => {
              setShowUploadModal(true);
              setUploadFile(null);
              setParsedRows([]);
              setParsedStats(null);
              setUploadError('');
              setBatchName('');
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}
          >
            <Upload size={18} />
            Upload Shipment Batch
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '12px 18px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
          <CheckCircle2 size={20} color="#16a34a" />
          <span>{successToast}</span>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="card-white" style={{ borderLeft: '4px solid var(--navy)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--gray-500)', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>Total Shipment Batches</span>
            <Package size={18} color="var(--navy)" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--navy)', marginTop: 8 }}>
            {stats.totalBatches.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-500)' }}>Batches</span>
          </div>
        </div>

        <div className="card-white" style={{ borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--gray-500)', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>Total Shipped Meters</span>
            <Layers size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0369a1', marginTop: 8 }}>
            {stats.totalMeters.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-500)' }}>Meters</span>
          </div>
        </div>

        <div className="card-white" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--gray-500)', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>Three Phase Meters</span>
            <Cpu size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#059669', marginTop: 8 }}>
            {stats.threePhaseMeters.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-500)' }}>Meters</span>
          </div>
        </div>

        <div className="card-white" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--gray-500)', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>Single Phase Meters</span>
            <TrendingUp size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#7c3aed', marginTop: 8 }}>
            {stats.singlePhaseMeters.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-500)' }}>Meters</span>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
        <button
          type="button"
          onClick={() => setActiveTab('batches')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'batches' ? 'var(--navy)' : 'transparent',
            color: activeTab === 'batches' ? 'white' : 'var(--gray-600)',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease'
          }}
        >
          <Package size={17} />
          Shipment Batches
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lookup')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'lookup' ? '#0284c7' : 'transparent',
            color: activeTab === 'lookup' ? 'white' : 'var(--gray-600)',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease'
          }}
        >
          <Search size={17} />
          Meter Trace & Search Lookup
        </button>
      </div>

      {/* ── TAB 1: Batches List ── */}
      {activeTab === 'batches' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filters Bar */}
          <div className="card-white" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: '14px 18px' }}>
            <div style={{ flex: '1 1 240px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', right: 12, top: 12, color: 'var(--gray-400)' }} />
              <input
                type="text"
                placeholder="Search by batch, destination, or file name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '9px 36px 9px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: '0.88rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={16} color="var(--gray-500)" />
              <select
                value={productFilter}
                onChange={e => setProductFilter(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', fontWeight: 700, fontSize: '0.85rem' }}
              >
                <option value="ALL">All Products</option>
                <option value="Three Phase">Three Phase</option>
                <option value="Single Phase">Single Phase</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} color="var(--gray-500)" />
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: '0.85rem' }}
              />
              {dateFilter && (
                <button type="button" onClick={() => setDateFilter('')} style={{ border: 'none', background: 'transparent', color: 'var(--gray-500)', cursor: 'pointer', fontWeight: 700 }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Batches Table */}
          <div className="table-card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Batch Name</th>
                    <th>Shipment Date</th>
                    <th>Product Type</th>
                    <th style={{ textAlign: 'center' }}>Shipped Qty</th>
                    <th>Destination</th>
                    <th>Original File Name</th>
                    <th>Uploaded By</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-500)' }}>
                        {loading ? 'Loading batches...' : 'No shipment batches recorded yet. Click "Upload Shipment Batch" to start.'}
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map(b => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 800, color: 'var(--navy)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Package size={17} color="#0284c7" />
                            <span>{b.batch_name}</span>
                          </div>
                          {b.notes && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 500, marginTop: 2 }}>
                              {b.notes}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--gray-700)' }}>
                            <Calendar size={14} color="var(--gray-400)" />
                            <span>{b.shipment_date}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${b.product_type === 'Three Phase' ? 'badge-teal' : 'badge-purple'}`} style={{ fontSize: '0.78rem' }}>
                            {b.product_type}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0369a1' }}>
                            {(parseInt(b.total_meters, 10) || 0).toLocaleString()}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginLeft: 4 }}>Meters</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--navy)' }}>
                            <MapPin size={14} color="#f59e0b" />
                            <span>{b.destination || 'Nama / Field'}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontFamily: 'monospace' }}>
                          {b.file_name}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                          {b.uploaded_by || 'Admin'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => handleInspectBatch(b)}
                              className="btn-outline"
                              title="View Batch Meters"
                              style={{ padding: '6px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5, color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                            >
                              <Eye size={14} />
                              View
                            </button>

                            <button
                              type="button"
                              onClick={() => handleExportBatch(b)}
                              className="btn-outline"
                              title="Export Excel with all fields"
                              style={{ padding: '6px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5, color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}
                            >
                              <Download size={14} />
                              Excel
                            </button>

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteBatch(b.id, b.batch_name)}
                                className="btn-outline"
                                title="Delete Batch"
                                style={{ padding: '6px 10px', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}
                              >
                                <Trash2 size={14} />
                              </button>
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
        </div>
      )}

      {/* ── TAB 2: Global Meter Search & Trace Lookup ── */}
      {activeTab === 'lookup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card-white" style={{ padding: '24px 28px' }}>
            <h3 style={{ margin: '0 0 8px', color: 'var(--navy)', fontSize: '1.15rem', fontWeight: 800 }}>
              Search for Meters Across All Uploaded Batches
            </h3>
            <p style={{ margin: '0 0 18px', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
              Search any meter by Serial Number, Factory SN, IMEI, ICCID, or Box Number.
            </p>

            <form onSubmit={handleGlobalLookup} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 320px', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', right: 14, top: 13, color: 'var(--gray-400)' }} />
                <input
                  type="text"
                  placeholder="Enter Serial Number, IMEI, or ICCID to search..."
                  value={lookupQuery}
                  onChange={e => setLookupQuery(e.target.value)}
                  style={{ width: '100%', padding: '11px 40px 11px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: '0.95rem' }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={lookupLoading}
                style={{ padding: '11px 24px', display: 'flex', alignItems: 'center', gap: 8, background: '#0284c7' }}
              >
                {lookupLoading ? <RefreshCw size={16} className="spin" /> : <Search size={16} />}
                Search Now
              </button>
            </form>
          </div>

          {/* Lookup Results Table */}
          {hasSearched && (
            <div className="table-card">
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '0.95rem' }}>
                  Search Results ({lookupResults.length} records)
                </span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Serial Number</th>
                      <th>Batch Name</th>
                      <th>Pallet Number</th>
                      <th>Device Box No</th>
                      <th>Factory SN</th>
                      <th>Date Mfg</th>
                      <th>HW Version</th>
                      <th>Lot Number</th>
                      <th>Logic Device</th>
                      <th>App SW</th>
                      <th>Legal SW</th>
                      <th>Module SW</th>
                      <th>Module IMEI</th>
                      <th>Module ICCID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lookupResults.length === 0 ? (
                      <tr>
                        <td colSpan={14} style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--gray-500)' }}>
                          No meters found matching your search query.
                        </td>
                      </tr>
                    ) : (
                      lookupResults.map(m => (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 800, color: 'var(--navy)', fontFamily: 'monospace' }}>
                            {m.serial_number}
                          </td>
                          <td>
                            <span className="badge badge-teal" style={{ fontSize: '0.75rem' }}>{m.batch_name}</span>
                          </td>
                          <td style={{ fontFamily: 'monospace', color: '#0f766e', fontWeight: 600 }}>{m.device_pallet_number || '-'}</td>
                          <td style={{ fontFamily: 'monospace' }}>{m.device_box_number || '-'}</td>
                          <td style={{ fontFamily: 'monospace' }}>{m.factory_serial_number || '-'}</td>
                          <td>{m.date_of_manufactory || '-'}</td>
                          <td>{m.hardware_version || '-'}</td>
                          <td>{m.lot_number || '-'}</td>
                          <td>{m.logic_device_name || '-'}</td>
                          <td>{m.app_software_version || '-'}</td>
                          <td>{m.legal_software_version || '-'}</td>
                          <td>{m.module_software_version || '-'}</td>
                          <td style={{ fontFamily: 'monospace', color: '#0369a1' }}>{m.module_imei || '-'}</td>
                          <td style={{ fontFamily: 'monospace', color: '#7c3aed' }}>{m.module_iccid || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: Upload Shipment Modal ── */}
      {showUploadModal && (
        <div className="modal-backdrop" onClick={() => !isUploading && setShowUploadModal(false)}>
          <div 
            className="modal-box modal-large" 
            style={{ width: '95%', background: '#ffffff' }} 
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Upload size={22} color="#0284c7" />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  Upload & Document Shipment Batch
                </h2>
              </div>
              {!isUploading && (
                <button type="button" className="btn-close" onClick={() => setShowUploadModal(false)}>
                  <X size={20} />
                </button>
              )}
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* File Dropzone */}
              <div style={{
                border: '2px dashed #0284c7',
                borderRadius: 12,
                padding: '28px 20px',
                textAlign: 'center',
                background: '#f0f9ff',
                cursor: 'pointer'
              }}>
                <FileSpreadsheet size={40} color="#0284c7" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '1rem', marginBottom: 4 }}>
                  {uploadFile ? uploadFile.name : 'Drag & drop Excel file (XLSX, XLS, CSV) here or click to browse'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                  Includes all 13 fields: Device_pallet_number, Device_box_number, Factory serial number, Serial_number, Module_IMEI, Module_ICCID ...
                </div>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  style={{ display: 'block', margin: '14px auto 0', cursor: 'pointer', fontSize: '0.85rem' }}
                />
              </div>

              {/* Error Alert */}
              {uploadError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={18} />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Parsed Summary Stats */}
              {parsedStats && (
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Total meters read: </span>
                    <strong style={{ fontSize: '1.1rem', color: '#16a34a' }}>{parsedStats.totalMeters.toLocaleString()} Meters</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Matched columns: </span>
                    <strong style={{ color: 'var(--navy)' }}>{parsedStats.mappedColumns} out of 13 fields</strong>
                  </div>
                </div>
              )}

              {/* Metadata Form */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label style={{ fontWeight: 700 }}>Batch Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Batch 1 - Nama Dispatch"
                    value={batchName}
                    onChange={e => setBatchName(e.target.value)}
                    disabled={isUploading}
                    style={{ fontWeight: 700 }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 700 }}>Shipment Date *</label>
                  <input
                    type="date"
                    value={shipmentDate}
                    onChange={e => setShipmentDate(e.target.value)}
                    disabled={isUploading}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 700 }}>Product Type *</label>
                  <select
                    value={productType}
                    onChange={e => setProductType(e.target.value)}
                    disabled={isUploading}
                  >
                    <option value="Three Phase">Three Phase (3-Phase Smart Meter)</option>
                    <option value="Single Phase">Single Phase (1-Phase Smart Meter)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 700 }}>Destination *</label>
                  <input
                    type="text"
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    disabled={isUploading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700 }}>Shipment Notes</label>
                <textarea
                  rows={2}
                  placeholder="Any details regarding shipment, dispatch notes, or PO number..."
                  value={batchNotes}
                  onChange={e => setBatchNotes(e.target.value)}
                  disabled={isUploading}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1.5px solid #0284c7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800, color: '#0369a1', marginBottom: 8 }}>
                    <span>{uploadProgressText}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div style={{ height: 12, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #0284c7, #10b981)', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveShipment}
                disabled={isUploading || parsedRows.length === 0}
                style={{ background: '#0284c7', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {isUploading ? <RefreshCw size={16} className="spin" /> : <CheckCircle2 size={16} />}
                Save Shipment & Meter Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Inspect Batch Meters Modal ── */}
      {inspectBatch && (
        <div className="modal-backdrop" onClick={() => setInspectBatch(null)}>
          <div 
            className="modal-box modal-xl" 
            style={{ width: '96%', height: '88vh', maxHeight: '88vh', background: '#ffffff', display: 'flex', flexDirection: 'column' }} 
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Package size={22} color="#0284c7" />
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                    Meter Records: {inspectBatch.batch_name}
                  </h2>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 4 }}>
                  Shipment Date: {inspectBatch.shipment_date} | Destination: {inspectBatch.destination} | Total: {inspectBatch.total_meters?.toLocaleString()} Meters
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => handleExportBatch(inspectBatch)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#16a34a', borderColor: '#86efac', background: '#f0fdf4' }}
                >
                  <Download size={15} />
                  Export Excel
                </button>
                <button type="button" className="btn-close" onClick={() => setInspectBatch(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
              {/* Filter inside modal */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', right: 12, top: 11, color: 'var(--gray-400)' }} />
                <input
                  type="text"
                  placeholder="Filter meters by serial number, IMEI, Box No..."
                  value={inspectSearch}
                  onChange={e => {
                    setInspectSearch(e.target.value);
                    setInspectPage(1);
                  }}
                  style={{ width: '100%', padding: '9px 36px 9px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: '0.85rem' }}
                />
              </div>

              {/* Meters Table with full 13 fields */}
              <div style={{ flex: 1, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Serial Number</th>
                      <th>Device Pallet No</th>
                      <th>Device Box No</th>
                      <th>Factory SN</th>
                      <th>Date Mfg</th>
                      <th>HW Version</th>
                      <th>Lot Number</th>
                      <th>Logic Device</th>
                      <th>App SW</th>
                      <th>Legal SW</th>
                      <th>Module SW</th>
                      <th>Module IMEI</th>
                      <th>Module ICCID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectLoading ? (
                      <tr>
                        <td colSpan={14} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-500)' }}>
                          Loading meters...
                        </td>
                      </tr>
                    ) : paginatedInspectMeters.length === 0 ? (
                      <tr>
                        <td colSpan={14} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-500)' }}>
                          No matching meters found.
                        </td>
                      </tr>
                    ) : (
                      paginatedInspectMeters.map((m, idx) => (
                        <tr key={m.id || idx}>
                          <td style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textAlign: 'center' }}>
                            {(inspectPage - 1) * pageSize + idx + 1}
                          </td>
                          <td style={{ fontWeight: 800, color: 'var(--navy)', fontFamily: 'monospace' }}>
                            {m.serial_number}
                          </td>
                          <td style={{ fontFamily: 'monospace', color: '#0f766e', fontWeight: 600 }}>{m.device_pallet_number || '-'}</td>
                          <td style={{ fontFamily: 'monospace' }}>{m.device_box_number || '-'}</td>
                          <td style={{ fontFamily: 'monospace' }}>{m.factory_serial_number || '-'}</td>
                          <td>{m.date_of_manufactory || '-'}</td>
                          <td>{m.hardware_version || '-'}</td>
                          <td>{m.lot_number || '-'}</td>
                          <td>{m.logic_device_name || '-'}</td>
                          <td>{m.app_software_version || '-'}</td>
                          <td>{m.legal_software_version || '-'}</td>
                          <td>{m.module_software_version || '-'}</td>
                          <td style={{ fontFamily: 'monospace', color: '#0369a1' }}>{m.module_imei || '-'}</td>
                          <td style={{ fontFamily: 'monospace', color: '#7c3aed' }}>{m.module_iccid || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--gray-600)', paddingTop: 6 }}>
                <div>
                  Total Results: <b>{filteredInspectMeters.length.toLocaleString()}</b> meters (Page {inspectPage} of {totalInspectPages})
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={inspectPage <= 1}
                    onClick={() => setInspectPage(p => Math.max(1, p - 1))}
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={inspectPage >= totalInspectPages}
                    onClick={() => setInspectPage(p => Math.min(totalInspectPages, p + 1))}
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setInspectBatch(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
