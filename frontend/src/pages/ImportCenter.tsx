import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Upload,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  Save,
  Download,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import api from '../services/api';

const INTERNAL_FIELDS = [
  { field: 'trip_date', label: 'Trip Date', required: true },
  { field: 'vehicle_number', label: 'Vehicle Number', required: true },
  { field: 'vehicle_type', label: 'Vehicle Type', required: false },
  { field: 'vendor_name', label: 'Vendor Partner', required: false },
  { field: 'total_km', label: 'Total Distance (KM)', required: true },
  { field: 'employee_count', label: 'Employee Count', required: false },
  { field: 'trip_category', label: 'Trip Category', required: false },
  { field: 'bill_category', label: 'Bill Category', required: false },
  { field: 'waiting_time', label: 'Waiting Time (Hrs)', required: false },
  { field: 'toll_amount', label: 'Toll Charges', required: false },
  { field: 'parking_amount', label: 'Parking Charges', required: false },
];

export const ImportCenter: React.FC = () => {
  const [step, setStep] = useState(1); // 1: Upload & Client, 2: Column Mapping, 3: Validation & Preview, 4: Complete
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Uploaded data state
  const [fileName, setFileName] = useState('');
  const [totalRows, setTotalRows] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  // Mappings state: { internalField: sourceColumn }
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [templateName, setTemplateName] = useState('Standard Client Template');

  // Processing Results
  const [loading, setLoading] = useState(false);
  const [importSummary, setImportSummary] = useState<any>(null);
  const [importJob, setImportJob] = useState<any>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data);
      if (res.data.length > 0) setSelectedClientId(res.data[0].id);
    } catch (err) {
      console.error('Fetch clients error:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setFileName(uploadedFile.name);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const res = await api.post('/imports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setHeaders(res.data.headers);
      setTotalRows(res.data.totalRows);
      setPreviewRows(res.data.previewRows);

      // Set suggested mappings
      setMappings(res.data.suggestedMappings);
      setStep(2);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to read upload file headers');
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (internalField: string, sourceCol: string) => {
    setMappings((prev) => ({
      ...prev,
      [internalField]: sourceCol,
    }));
  };

  const handleConfirmAndProcess = async () => {
    if (!selectedClientId) {
      alert('Please select a client account');
      return;
    }

    setLoading(true);
    try {
      // 1. Save mapping template for reuse
      await api.post('/imports/save-mapping', {
        clientId: selectedClientId,
        templateName,
        mappings,
      });

      // Read complete file rows again for processing
      let allRows: any[] = [];
      if (file?.name.endsWith('.csv')) {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        allRows = parsed.data;
      } else if (file) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        allRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      }

      // 2. Process import on backend
      const res = await api.post('/imports/process', {
        clientId: selectedClientId,
        fileName,
        rawRows: allRows,
        mappings,
      });

      setImportJob(res.data.job);
      setImportSummary(res.data.summary);
      setStep(4);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Import processing failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadErrorsCsv = () => {
    if (!importJob || !importJob.errors) return;
    const csvData = importJob.errors.map((e: any) => ({
      'Row Number': e.rowNumber,
      Field: e.field,
      'Error Message': e.errorMessage,
      'Raw Row Data': e.rawValue,
    }));
    const csvString = Papa.unparse(csvData);
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Import_Errors_${fileName}.csv`;
    a.click();
  };

  const resetWorkflow = () => {
    setStep(1);
    setFile(null);
    setFileName('');
    setHeaders([]);
    setMappings({});
    setImportSummary(null);
    setImportJob(null);
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-brand-600" />
            Excel / CSV Import & Standardization Center
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Dynamic column mapping engine — Normalizes any client spreadsheet format into standard internal trip schema
          </p>
        </div>

        {step > 1 && (
          <button
            onClick={resetWorkflow}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Workflow</span>
          </button>
        )}
      </div>

      {/* Step Progress Indicator */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { num: 1, title: 'Upload & Client' },
          { num: 2, title: 'Column Mapping' },
          { num: 3, title: 'Validate & Normalize' },
          { num: 4, title: 'Import Summary' },
        ].map((s) => (
          <div
            key={s.num}
            className={`p-3 rounded-xl border flex items-center space-x-3 transition-all ${
              step === s.num
                ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/20'
                : step > s.num
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-white text-gray-400 border-gray-200'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                step === s.num
                  ? 'bg-white text-brand-600'
                  : step > s.num
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {step > s.num ? <CheckCircle className="w-4 h-4" /> : s.num}
            </div>
            <span className="text-xs font-bold">{s.title}</span>
          </div>
        ))}
      </div>

      {/* STEP 1: UPLOAD & CLIENT SELECTION */}
      {step === 1 && (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <h3 className="text-base font-bold text-gray-900">Step 1: Select Client & Upload Spreadsheet</h3>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Select Corporate Client Account *</label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full max-w-md px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.gstNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="border-2 border-dashed border-gray-300 hover:border-brand-500 bg-gray-50/50 rounded-2xl p-10 text-center transition-colors">
            <Upload className="w-12 h-12 text-brand-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-gray-800">Upload Client Spreadsheet (.xlsx, .csv)</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Drop your client duty sheet here or browse. Headers like <code className="bg-gray-200 px-1 py-0.5 rounded text-[10px]">FinalKMS</code>, <code className="bg-gray-200 px-1 py-0.5 rounded text-[10px]">VehicleRegNo</code> will be auto-suggested.
            </p>
            <input
              type="file"
              accept=".xlsx, .csv"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center space-x-2 mt-5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/30 cursor-pointer transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Select File from Computer</span>
            </label>
          </div>
        </div>
      )}

      {/* STEP 2: DYNAMIC COLUMN MAPPING MATRIX */}
      {step === 2 && (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Step 2: Dynamic Column Mapping Matrix</h3>
              <p className="text-xs text-gray-500">
                Map raw Excel headers from <span className="font-semibold text-brand-600">{fileName}</span> ({totalRows} rows) to standard internal schema
              </p>
            </div>
            <button
              onClick={() => setStep(3)}
              className="flex items-center space-x-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/20"
            >
              <span>Preview & Validate</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INTERNAL_FIELDS.map((item) => (
              <div
                key={item.field}
                className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                    {item.label}
                    {item.required && <span className="text-rose-500">*</span>}
                  </span>
                  <span className="block text-[10px] text-gray-400 font-mono">schema: {item.field}</span>
                </div>

                <select
                  value={mappings[item.field] || ''}
                  onChange={(e) => handleMappingChange(item.field, e.target.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg border font-medium ${
                    mappings[item.field]
                      ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                      : item.required
                      ? 'bg-rose-50 border-rose-300 text-rose-800'
                      : 'bg-white border-gray-300 text-gray-600'
                  }`}
                >
                  <option value="">-- Ignore / Unmapped --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & CONFIRM IMPORT */}
      {step === 3 && (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Step 3: Normalized Data Preview & Execution</h3>
              <p className="text-xs text-gray-500">
                Ready to validate and import {totalRows} records for client account
              </p>
            </div>

            <button
              onClick={handleConfirmAndProcess}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4" />
              <span>{loading ? 'Processing Import...' : 'Confirm & Process Import'}</span>
            </button>
          </div>

          {/* Raw Header Preview Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Spreadsheet Sample Rows</h4>
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className="py-2.5 px-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {headers.map((h) => (
                        <td key={h} className="py-2 px-3 text-gray-700 whitespace-nowrap">
                          {String(row[h] || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORT SUMMARY REPORT */}
      {step === 4 && importSummary && (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Import Job Processed Successfully!</h3>
                <p className="text-xs text-gray-500">File: {fileName}</p>
              </div>
            </div>

            <button
              onClick={resetWorkflow}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/30"
            >
              Upload Another File
            </button>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-xs font-semibold text-gray-500">Total Rows</span>
              <h4 className="text-2xl font-bold text-gray-900 mt-1">{importSummary.totalRows}</h4>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-xs font-semibold text-emerald-700">Valid Imported Trips</span>
              <h4 className="text-2xl font-bold text-emerald-900 mt-1">{importSummary.validRows}</h4>
            </div>

            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
              <span className="text-xs font-semibold text-rose-700">Invalid Rows</span>
              <h4 className="text-2xl font-bold text-rose-900 mt-1">{importSummary.invalidRows}</h4>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-xs font-semibold text-amber-700">Duplicate Trips</span>
              <h4 className="text-2xl font-bold text-amber-900 mt-1">{importSummary.duplicateRows}</h4>
            </div>
          </div>

          {/* Download Error Log Section */}
          {importJob?.errors?.length > 0 && (
            <div className="p-5 bg-rose-50/60 rounded-xl border border-rose-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  {importJob.errors.length} Validation Errors Detected
                </h4>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Download error logs as CSV to inspect row-level missing vehicles or date errors.
                </p>
              </div>

              <button
                onClick={downloadErrorsCsv}
                className="flex items-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Error CSV</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
