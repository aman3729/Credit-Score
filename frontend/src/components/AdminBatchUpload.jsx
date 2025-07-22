import React, { useState, useCallback, useEffect } from 'react';
import { 
  Button, 
  Card, 
  Progress, 
  Alert, 
  Switch, 
  Space, 
  Typography, 
  Upload, 
  message, 
  Modal, 
  List,
  Tag,
  Tooltip,
  Select
} from 'antd';
import { 
  UploadOutlined, 
  FileDoneOutlined, 
  CloseCircleOutlined, 
  DownloadOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined,
  StarOutlined
} from '@ant-design/icons';
import api from '../utils/api';
import FieldMappingBuilder from './admin/FieldMappingBuilder';
import { getMappingProfiles, createMappingProfile } from '../lib/api';

const { Title, Text } = Typography;
const { confirm } = Modal;
const { Option } = Select;

const AdminBatchUpload = ({ onClose, onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scoringEngine, setScoringEngine] = useState('default'); // New state for scoring engine
  const [results, setResults] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [filePreview, setFilePreview] = useState(null);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [failedRecords, setFailedRecords] = useState([]);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const MAX_RETRY_ATTEMPTS = 3;
  
  // Schema mapping integration (always required)
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [availableMappings, setAvailableMappings] = useState([]);
  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);

  // Load partners and mappings on component mount
  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    // Updated list of Ethiopian banks
    setPartners([
      { id: 'commercial-bank-of-ethiopia', name: 'Commercial Bank of Ethiopia' },
      { id: 'development-bank-of-ethiopia', name: 'Development Bank of Ethiopia' },
      { id: 'awash-bank', name: 'Awash Bank' },
      { id: 'dashen-bank', name: 'Dashen Bank' },
      { id: 'bank-of-abyssinia', name: 'Bank of Abyssinia' },
      { id: 'wegagen-bank', name: 'Wegagen Bank' },
      { id: 'nib-international-bank', name: 'Nib International Bank' },
      { id: 'hibret-bank', name: 'Hibret Bank' },
      { id: 'lion-international-bank', name: 'Lion International Bank' },
      { id: 'cooperative-bank-of-oromia', name: 'Cooperative Bank of Oromia' },
      { id: 'zemen-bank', name: 'Zemen Bank' },
      { id: 'oromia-international-bank', name: 'Oromia International Bank' },
      { id: 'bunna-bank', name: 'Bunna Bank' },
      { id: 'berhan-bank', name: 'Berhan Bank' },
      { id: 'abay-bank', name: 'Abay Bank' },
      { id: 'addis-international-bank', name: 'Addis International Bank' },
      { id: 'debub-global-bank', name: 'Debub Global Bank' },
      { id: 'enat-bank', name: 'Enat Bank' },
      { id: 'gadaa-bank', name: 'Gadaa Bank' },
      { id: 'hijra-bank', name: 'Hijra Bank' },
      { id: 'shabelle-bank', name: 'Shabelle Bank' },
      { id: 'siinqee-bank', name: 'Siinqee Bank' },
      { id: 'tsehay-bank', name: 'Tsehay Bank' },
      { id: 'amhara-bank', name: 'Amhara Bank' },
      { id: 'ahadu-bank', name: 'Ahadu Bank' },
      { id: 'goh-betoch-bank', name: 'Goh Betoch Bank' },
      { id: 'aman-bank', name: 'AMAN Bank' },
    ]);
  };

  const loadPartnerMappings = async (partnerId) => {
    try {
      const response = await api.get(`/schema-mapping/partner/${partnerId}`);
      if (response.data.success) {
        setAvailableMappings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load partner mappings:', error);
      message.error('Failed to load partner mappings');
    }
  };

  const validateFile = (file) => {
    const errors = [];
    
    // Check file type - now supports any format
    const validTypes = [
      'application/json', 
      'text/csv', 
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/xml',
      'text/xml',
      'text/plain',
      'application/pdf' // PDF support
    ];
    
    const isJSON = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
    const isCSV = file.type.includes('csv') || file.name.toLowerCase().endsWith('.csv');
    const isExcel = file.type.includes('excel') || file.type.includes('spreadsheet') || 
                   file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
    const isXML = file.type.includes('xml') || file.name.toLowerCase().endsWith('.xml');
    const isText = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isJSON && !isCSV && !isExcel && !isXML && !isText && !isPDF) {
      errors.push('File format not recognized. Supported formats: JSON, CSV, Excel, XML, TXT, PDF');
    }
    
    // Check file size (max 50MB for larger files)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      errors.push(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const [detectedFields, setDetectedFields] = useState([]);
  const [fieldMappings, setFieldMappings] = useState({});
  const [showMappingUI, setShowMappingUI] = useState(false);
  const [availableFields, setAvailableFields] = useState({
    phoneNumber: { description: 'User phone number', required: true, type: 'string' },
    monthlyIncome: { description: 'Monthly income (ETB)', required: true, type: 'number' },
    monthlyDebtPayments: { description: 'Monthly debt payments (ETB)', required: true, type: 'number' },
    monthlyExpenses: { description: 'Monthly non-debt expenses (ETB)', required: false, type: 'number' },
    averageDailyBalance: { description: 'Average daily bank balance (ETB)', required: false, type: 'number' },
    utilityPayments: { description: 'On-time utility payment rate (0–1)', required: false, type: 'number' },
    rentPayments: { description: 'On-time rent payment rate (0–1)', required: false, type: 'number' },
    employmentStability: { description: "Employment stability ('stable', 'moderate', 'unstable')", required: false, type: 'string' },
    budgetingConsistency: { description: 'Budgeting consistency score (0-100)', required: false, type: 'number' },
    savingsConsistencyScore: { description: 'Savings consistency score (0-100)', required: false, type: 'number' },
    hasFinancialCourse: { description: 'Has completed financial literacy course', required: false, type: 'boolean' },
    industryRisk: { description: "Industry risk level ('low', 'medium', 'high')", required: false, type: 'string' },
    residenceStabilityMonths: { description: 'Months at current residence', required: false, type: 'number' },
    jobHopsInLast2Years: { description: 'Job changes in last 2 years', required: false, type: 'number' },
    bankruptcies: { description: 'Number of bankruptcies', required: false, type: 'number' },
    legalIssues: { description: 'Number of legal issues', required: false, type: 'number' },
    collateralValue: { description: 'Collateral value (ETB)', required: false, type: 'number' },
    collateralType: { description: "Collateral type ('realEstate', 'vehicle', 'securedDeposit', 'other')", required: false, type: 'string' },
    fileUpload: { description: 'File upload object (e.g., income verification PDF)', required: false, type: 'object' },
    currencyRate: { description: 'ETB-to-USD exchange rate', required: false, type: 'number' },
    paymentHistory: { description: 'Payment history (0-1)', required: false, type: 'number' },
    creditUtilization: { description: 'Credit utilization (0-1)', required: false, type: 'number' },
    creditAge: { description: 'Credit age (years)', required: false, type: 'number' },
    creditMix: { description: 'Credit mix (0-1)', required: false, type: 'number' },
    inquiries: { description: 'Number of inquiries', required: false, type: 'number' },
    totalDebt: { description: 'Total debt', required: false, type: 'number' },
    recentMissedPayments: { description: 'Recent missed payments', required: false, type: 'number' },
    recentDefaults: { description: 'Recent defaults', required: false, type: 'number' },
    lastActiveDate: { description: 'Last active date', required: false, type: 'string' },
    activeLoanCount: { description: 'Active loan count', required: false, type: 'number' },
    oldestAccountAge: { description: 'Oldest account age (months)', required: false, type: 'number' },
    transactionsLast90Days: { description: 'Transactions in last 90 days', required: false, type: 'number' },
    onTimePaymentRate: { description: 'On-time payment rate', required: false, type: 'number' },
    onTimeRateLast6Months: { description: 'On-time rate last 6 months', required: false, type: 'number' },
    missedPaymentsLast12: { description: 'Missed payments last 12 months', required: false, type: 'number' },
    recentLoanApplications: { description: 'Recent loan applications', required: false, type: 'number' },
    defaultCountLast3Years: { description: 'Defaults last 3 years', required: false, type: 'number' },
    consecutiveMissedPayments: { description: 'Consecutive missed payments', required: false, type: 'number' },
    monthsSinceLastDelinquency: { description: 'Months since last delinquency', required: false, type: 'number' },
    loanTypeCounts: { description: 'Loan type counts', required: false, type: 'object' },
  });

  // After file preview, extract detected fields and show mapping UI
  const afterPreview = (data) => {
    // data: array of records or single record
    let fields = [];
    if (Array.isArray(data) && data.length > 0) {
      fields = Object.keys(data[0]).map(key => ({ sourceField: key, confidence: 1 }));
    } else if (data && typeof data === 'object') {
      fields = Object.keys(data).map(key => ({ sourceField: key, confidence: 1 }));
    }
    setDetectedFields(fields);
    setShowMappingUI(true);
  };

  const beforeUpload = (file) => {
    const isValid = validateFile(file);
    if (!isValid) {
      message.error('Invalid file. Please check the file requirements.');
      return Upload.LIST_IGNORE;
    }
    
    // Preview file content
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(content);
          setFilePreview(Array.isArray(data) ? data.slice(0, 5) : [data]);
          afterPreview(Array.isArray(data) ? data : [data]);
        } else if (file.name.endsWith('.pdf')) {
          setFilePreview({ type: 'pdf', name: file.name, size: file.size });
          // For PDF, skip field mapping for now (could be enhanced with backend extraction)
          setDetectedFields([{ sourceField: 'pdfText', confidence: 1 }]);
          setShowMappingUI(true);
        } else {
          const lines = content.split('\n').slice(0, 6).join('\n');
          setFilePreview(lines);
          // Try to extract headers from first line for CSV
          const headers = content.split('\n')[0].split(',').map(h => h.trim());
          setDetectedFields(headers.map(h => ({ sourceField: h, confidence: 1 })));
          setShowMappingUI(true);
        }
        setIsPreviewModalVisible(true);
      } catch (error) {
        console.error('Error previewing file:', error);
        message.error('Failed to preview file. Please check the file format.');
      }
    };
    
    if (file.name.endsWith('.pdf')) {
      setFilePreview({ type: 'pdf', name: file.name, size: file.size });
      setDetectedFields([{ sourceField: 'pdfText', confidence: 1 }]);
      setShowMappingUI(true);
      setIsPreviewModalVisible(true);
    } else {
      reader.readAsText(file);
    }
    
    setFile(file);
    setResults(null);
    setFailedRecords([]);
    setRetryAttempts(0);
    return false; // Prevent auto upload
  };

  const processFailedRecords = useCallback(async (failedItems) => {
    if (!failedItems.length || retryAttempts >= MAX_RETRY_ATTEMPTS) {
      setFailedRecords(failedItems);
      return false;
    }

    confirm({
      title: `Retry failed records?`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>{failedItems.length} records failed to process. Retry attempt {retryAttempts + 1} of {MAX_RETRY_ATTEMPTS}.</p>
          <p>Failed records will be retried automatically.</p>
        </div>
      ),
      onOk: async () => {
        try {
          setRetryAttempts(prev => prev + 1);
          message.info(`Retrying ${failedItems.length} failed records...`);
          
          // Process only the failed records
          const formData = new FormData();
          const blob = new Blob([JSON.stringify(failedItems)], { type: 'application/json' });
          formData.append('file', blob, 'retry-records.json');
          
          const endpoint = `/schema-mapping/apply/${selectedMapping}`;
          const params = { partnerId: selectedPartner, autoScore: true };
          
          const response = await api.post(endpoint, formData, {
            params: params,
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          const {
            successCount = 0,
            errorCount = 0,
            failedRecords: newFailedRecords = []
          } = response.data;
          
          // Update results with retry data
          setResults(prev => ({
            ...prev,
            success: (prev.success || 0) + successCount,
            errors: errorCount
          }));
          
          // Update failed records
          setFailedRecords(newFailedRecords);
          
          if (newFailedRecords.length > 0) {
            message.warning(`${successCount} records succeeded, ${newFailedRecords.length} still failed`);
          } else {
            message.success('All records processed successfully!');
          }
        } catch (error) {
          console.error('Retry failed:', error);
          message.error(`Retry failed: ${error.message || 'Unknown error'}`);
        }
      },
      onCancel: () => {
        setFailedRecords(failedItems);
      },
    });
  }, [retryAttempts, selectedPartner, selectedMapping]);

  const handleUpload = async () => {
    if (!file) {
      message.warning('Please select a file first');
      return;
    }
    if (!selectedPartner) {
      message.error('Please select a partner for schema mapping');
      return;
    }
    if (!selectedMapping) {
      message.error('Please select a schema mapping for this file');
      return;
    }
    setIsUploading(true);
    setProgress(0);
    setResults(null);
    setFailedRecords([]);
    const uploadStartTime = Date.now(); // <-- Fix: define uploadStartTime
    try {
      const endpoint = `/schema-mapping/apply/${selectedMapping}`;
      const params = { autoScore: true, partnerId: selectedPartner, engine: scoringEngine };
      let response;
      let lastProgressUpdate = 0;
      // Always send file as FormData when using a saved mapping
      const formData = new FormData();
      formData.append('file', file);
      formData.append('partnerId', selectedPartner);
      response = await api.post(endpoint, formData, {
        params,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
          'X-Upload-Id': `upload-${Date.now()}`
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const now = Date.now();
            if (now - lastProgressUpdate > 200 || progressEvent.loaded === progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setProgress(percentCompleted);
              lastProgressUpdate = now;
            }
          }
        },
        timeout: 300000, // 5 minutes timeout
      });
      const uploadTime = ((Date.now() - uploadStartTime) / 1000).toFixed(2);
      // Process response
      const { data } = response.data;
      if (!data || !data.summary) {
        // Try to show backend error message if present
        const backendError = response.data?.message || response.data?.error;
        if (backendError) {
          message.error(`Upload failed: ${backendError}`);
        } else {
          message.error('Upload failed: No summary data returned from server.');
        }
        setIsUploading(false);
        return;
      }
      const resultData = {
        total: data.summary.totalRecords,
        success: data.summary.mappedRecords,
        errors: data.summary.totalRecords - data.summary.mappedRecords,
        scoredRecords: data.summary.scoredRecords,
        averageScore: data.summary.averageScore,
        uploadTime
      };
      setResults(resultData);
      if (resultData.errors === 0) {
        message.success(`Successfully mapped and scored ${resultData.success} records in ${uploadTime}s. Average score: ${Math.round(resultData.averageScore)}`);
      } else {
        message.warning(`${resultData.success} records mapped, ${resultData.errors} failed. Average score: ${Math.round(resultData.averageScore)}`);
      }
      if (onUploadComplete) {
        onUploadComplete(response.data);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      let errorMessage = 'Upload failed. Please try again.';
      if (error.response) {
        errorMessage = error.response.data?.message || 
                     error.response.data?.error || 
                     'Server error occurred during upload.';
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else if (error.message) {
        errorMessage = `Upload error: ${error.message}`;
      }
      message.error(errorMessage);
      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setResults(null);
    setProgress(0);
    setValidationErrors([]);
  };

  const renderFilePreview = () => {
    if (!filePreview) return null;
    
    if (filePreview.type === 'pdf') {
      return (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <FileDoneOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          <div style={{ marginTop: 12 }}>
            <strong>{filePreview.name}</strong>
          </div>
          <div style={{ color: '#888', marginTop: 4 }}>
            PDF file selected ({(filePreview.size / 1024).toFixed(2)} KB)
          </div>
          <div style={{ color: '#aaa', marginTop: 8 }}>
            PDF preview is not supported. File will be processed after upload.
          </div>
        </div>
      );
    }
    if (Array.isArray(filePreview)) {
      return (
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          <pre style={{ margin: 0 }}>
            {JSON.stringify(filePreview, null, 2)}
          </pre>
        </div>
      );
    }
    
    return (
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
        {filePreview}
      </pre>
    );
  };

  // Add state for transformed data and validation errors
  const [transformedData, setTransformedData] = useState([]);
  const [mappingValidationErrors, setMappingValidationErrors] = useState([]);

  // Helper: transform data using mappings
  const transformDataWithMappings = (data, mappings) => {
    return data.map(record => {
      const transformed = {};
      Object.entries(mappings).forEach(([targetField, map]) => {
        let value = record[map.sourceField];
        // Apply simple transformations if needed
        switch (map.transformation) {
          case 'uppercase': value = typeof value === 'string' ? value.toUpperCase() : value; break;
          case 'lowercase': value = typeof value === 'string' ? value.toLowerCase() : value; break;
          case 'trim': value = typeof value === 'string' ? value.trim() : value; break;
          // Add more as needed
          default: break;
        }
        transformed[targetField] = value;
      });
      return transformed;
    });
  };

  // Helper: validate transformed data
  const validateTransformedData = (data, availableFields) => {
    const errors = [];
    data.forEach((record, idx) => {
      Object.entries(availableFields).forEach(([field, meta]) => {
        if (meta.required && (record[field] === undefined || record[field] === '')) {
          errors.push(`Row ${idx + 1}: Missing required field '${field}'`);
        }
        if (record[field] !== undefined && meta.type) {
          if (meta.type === 'number' && isNaN(Number(record[field]))) {
            errors.push(`Row ${idx + 1}: Field '${field}' should be a number`);
          }
          if (meta.type === 'string' && typeof record[field] !== 'string') {
            errors.push(`Row ${idx + 1}: Field '${field}' should be a string`);
          }
          // Add more type checks as needed
        }
      });
    });
    return errors;
  };

  // When mappings change, transform and validate data
  useEffect(() => {
    if (!filePreview || !fieldMappings || Object.keys(fieldMappings).length === 0) return;
    let rawData = [];
    if (Array.isArray(filePreview)) {
      rawData = filePreview;
    } else if (filePreview && typeof filePreview === 'object') {
      rawData = [filePreview];
    }
    const transformed = transformDataWithMappings(rawData, fieldMappings);
    setTransformedData(transformed);
    const errors = validateTransformedData(transformed, availableFields);
    setMappingValidationErrors(errors);
  }, [filePreview, fieldMappings, availableFields]);

  const [mappingProfiles, setMappingProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Fetch mapping profiles when partner changes
  useEffect(() => {
    if (!selectedPartner) {
      setMappingProfiles([]);
      setSelectedProfileId(null);
      return;
    }
    getMappingProfiles(selectedPartner)
      .then(res => {
        if (res.data.success) setMappingProfiles(res.data.data);
        else setMappingProfiles([]);
      })
      .catch(() => setMappingProfiles([]));
  }, [selectedPartner]);

  // When a profile is selected, apply its mapping
  useEffect(() => {
    if (!selectedProfileId) return;
    const profile = mappingProfiles.find(p => p._id === selectedProfileId);
    if (profile && profile.fieldsMapping) {
      setFieldMappings(profile.fieldsMapping);
      message.success(`Mapping profile '${profile.name}' applied.`);
    }
  }, [selectedProfileId, mappingProfiles]);

  // Save current mapping as a new profile
  const handleSaveMappingProfile = async () => {
    if (!selectedPartner) {
      message.error('Select a partner before saving a mapping profile.');
      return;
    }
    if (!fieldMappings || Object.keys(fieldMappings).length === 0) {
      message.error('No field mappings to save.');
      return;
    }
    const name = prompt('Enter a name for this mapping profile:');
    if (!name) return;
    const description = prompt('Enter a description for this mapping profile (optional):') || '';
    const partnerObj = partners.find(p => p.id === selectedPartner);
    const partnerName = partnerObj ? partnerObj.name : '';
    // Try to infer file type from file name
    let fileType = '';
    if (file?.name) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (["csv", "json", "xlsx", "xls", "xml", "txt", "pdf"].includes(ext)) {
        fileType = ext;
      }
    }
    setIsSavingProfile(true);
    try {
      const res = await createMappingProfile({
        name,
        description,
        partnerId: selectedPartner,
        partnerName,
        fileType,
        fieldMappings: fieldMappings
      });
      if (res.data.success) {
        setMappingProfiles(prev => [res.data.data, ...prev]);
        message.success('Mapping profile saved!');
      } else {
        message.error('Failed to save mapping profile.');
      }
    } catch (err) {
      message.error('Failed to save mapping profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Helper: get extraction status for UI
  const getExtractionStatus = () => {
    if (!detectedFields || detectedFields.length === 0) return null;
    if (detectedFields.length === 1 && detectedFields[0].sourceField === 'pdfText') {
      return { type: 'raw', message: 'No structured data detected in PDF. Only raw text is available for mapping.' };
    }
    if (detectedFields.length > 1 && detectedFields.every(f => f.sourceField)) {
      return { type: 'table', message: `Table detected in PDF: ${detectedFields.length} fields.` };
    }
    if (detectedFields.length > 0 && detectedFields.some(f => f.sourceField.match(/:/))) {
      return { type: 'kv', message: 'Key-value pairs detected in PDF.' };
    }
    return { type: 'fields', message: `Detected ${detectedFields.length} fields.` };
  };

  const extractionStatus = getExtractionStatus();

  // Helper: preview extracted data
  const renderExtractionPreview = () => {
    if (!filePreview) return null;
    let previewData = null;
    if (Array.isArray(filePreview) && filePreview.length > 0) {
      previewData = filePreview.slice(0, 3);
    } else if (filePreview && typeof filePreview === 'object') {
      previewData = [filePreview];
    }
    if (!previewData) return null;
    return (
      <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 4, padding: 8, marginBottom: 12 }}>
        <strong>Extracted Data Preview:</strong>
        <pre style={{ margin: 0, fontSize: 12 }}>{JSON.stringify(previewData, null, 2)}</pre>
      </div>
    );
  };

  // State to control mapping mode
  const [mappingMode, setMappingMode] = useState(null); // 'create' | 'use-existing' | null

  // When a profile is selected and 'Use Mapping' is clicked, apply it and skip manual mapping
  const handleUseMapping = () => {
    if (!selectedProfileId) {
      message.error('Please select a mapping profile.');
      return;
    }
    const profile = mappingProfiles.find(p => p._id === selectedProfileId);
    if (profile && profile.fieldMappings) {
      setFieldMappings(profile.fieldMappings);
      setSelectedMapping(profile._id);
      setMappingMode('use-existing');
      message.success(`Mapping profile '${profile.name}' applied.`);
    }
  };

  return (
    <>
      <Modal
        title="File Preview"
        open={isPreviewModalVisible}
        onOk={() => {
          setIsPreviewModalVisible(false);
          handleUpload();
        }}
        onCancel={() => setIsPreviewModalVisible(false)}
        okText="Process File"
        cancelText="Cancel"
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>File: </Text>
          <Text>{file?.name}</Text>
          <br />
          <Text type="secondary">
            {file?.size ? `Size: ${(file.size / 1024).toFixed(2)} KB` : ''}
          </Text>
        </div>
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: 12, 
          borderRadius: 4,
          maxHeight: 400,
          overflow: 'auto'
        }}>
          {renderFilePreview()}
        </div>
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Text type="secondary">
            Showing first {Array.isArray(filePreview) ? filePreview.length : 'few lines'}. 
            {filePreview && filePreview.length > 0 && ' Click "Process File" to continue.'}
          </Text>
        </div>
      </Modal>
      
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Batch Upload Credit Data</span>
            <div>
              <Tooltip title="Help with file format">
                <Button 
                  type="text" 
                  icon={<InfoCircleOutlined />} 
                  onClick={() => {
                    Modal.info({
                      title: 'File Format Help',
                      width: 700,
                      content: (
                        <div>
                          <p>Please upload a file in any supported format (JSON, CSV, Excel, XML, TXT, PDF). <b>Schema mapping is required for all uploads.</b></p>
                          <p>You must select a partner and a mapping before uploading.</p>
                        </div>
                      )
                    });
                  }}
                />
              </Tooltip>
              {onClose && (
                <Button
                  type="text"
                  icon={<CloseCircleOutlined />}
                  onClick={onClose}
                  style={{ marginLeft: 8 }}
                />
              )}
            </div>
          </div>
        }
        style={{ marginBottom: 24 }}
      >
        <div style={{ marginBottom: 16 }}>
          <Upload.Dragger
            beforeUpload={beforeUpload}
            fileList={file ? [file] : []}
            onRemove={handleRemove}
            accept=".json,.csv,.xlsx,.xls,.xml,.txt,.pdf"
            maxCount={1}
            disabled={isUploading}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">
              Click or drag file to this area to upload
            </p>
            <p className="ant-upload-hint">
              Support for a single JSON, CSV, Excel, XML, TXT, or PDF file
            </p>
          </Upload.Dragger>
        </div>
        
        <div style={{ margin: '16px 0' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Space>
                <label style={{ fontWeight: 600, marginRight: 8 }}>Scoring Engine:</label>
                <Select 
                  value={scoringEngine} 
                  onChange={setScoringEngine} 
                  style={{ width: 200 }}
                >
                  <Option value="default">FF Score</Option>
                  <Option value="ai">AI Scoring</Option>
                  <Option value="creditworthiness">TF Score</Option>
                </Select>
                <Text type="secondary">
                  Select the engine for scoring the batch data.
                </Text>
              </Space>
            </div>
            
            {/* Partner Selection Dropdown and Create New Mapping Button */}
            {showMappingUI && (
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <label style={{ fontWeight: 600, marginRight: 8 }}>Select Partner:</label>
                <Select
                  value={selectedPartner}
                  onChange={value => {
                    setSelectedPartner(value);
                    loadPartnerMappings(value);
                    setSelectedProfileId(null);
                    setMappingMode(null);
                  }}
                  placeholder="Choose a partner"
                  style={{ minWidth: 220, marginRight: 12 }}
                  disabled={isUploading}
                >
                  {partners.map(partner => (
                    <Option key={partner.id} value={partner.id}>{partner.name}</Option>
                  ))}
                </Select>
                {/* If mapping profiles exist, show mapping profile selection and Use Mapping button */}
                {selectedPartner && mappingProfiles.length > 0 && (
                  <>
                    <Select
                      value={selectedProfileId}
                      onChange={setSelectedProfileId}
                      placeholder="Select a mapping profile"
                      style={{ minWidth: 220, marginLeft: 8 }}
                    >
                      {mappingProfiles.map(profile => (
                        <Option key={profile._id} value={profile._id}>{profile.name} ({profile.fileType})</Option>
                      ))}
                    </Select>
                    <Button
                      type="primary"
                      onClick={handleUseMapping}
                      disabled={!selectedProfileId}
                      style={{ marginLeft: 8 }}
                    >
                      Use Mapping
                    </Button>
                  </>
                )}
                {/* Always show Create New Mapping button */}
                <Button
                  type="dashed"
                  onClick={() => {
                    setSelectedMapping(null);
                    setSelectedProfileId(null);
                    setMappingMode('create');
                    setFieldMappings({});
                  }}
                  style={{ marginLeft: 8 }}
                  disabled={!selectedPartner}
                >
                  Create New Mapping
                </Button>
              </div>
            )}

            {/* Show FieldMappingBuilder and Save Mapping only if creating a new mapping */}
            {showMappingUI && mappingMode === 'create' && (
              <div style={{ marginBottom: 16 }}>
                <FieldMappingBuilder
                  detectedFields={detectedFields}
                  availableFields={availableFields}
                  onMappingsChange={setFieldMappings}
                  initialMappings={fieldMappings}
                />
                <Button
                  type="primary"
                  onClick={handleSaveMappingProfile}
                  disabled={!selectedPartner || !fieldMappings || Object.keys(fieldMappings).length === 0 || isSavingProfile}
                  loading={isSavingProfile}
                  style={{ marginTop: 12 }}
                >
                  Save Mapping Profile
                </Button>
              </div>
            )}
          </Space>
        </div>
        
        {/* Mapping Profiles Dropdown and Save Button */}
        {showMappingUI && mappingProfiles.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Select
              placeholder="Select mapping profile"
              style={{ width: 300, marginRight: 8 }}
              value={selectedProfileId}
              onChange={setSelectedProfileId}
              allowClear
            >
              {mappingProfiles.map(profile => (
                <Option key={profile._id} value={profile._id}>
                  {profile.name} (updated {new Date(profile.updatedAt).toLocaleDateString()})
                </Option>
              ))}
            </Select>
            {/* The Save Mapping Profile button is now moved inside FieldMappingBuilder */}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Button
            type="primary"
            onClick={handleUpload}
            disabled={!file || !selectedPartner || !selectedMapping || isUploading || (showMappingUI && mappingValidationErrors.length > 0)}
            loading={isUploading}
            icon={<FileDoneOutlined />}
          >
            {isUploading ? 'Processing...' : 'Start Batch Processing'}
          </Button>
          
          <Button
            type="default"
            icon={<DownloadOutlined />}
            onClick={() => {
              const template = [{
                "phone number": "0954880513",
                paymentHistory: 0.95,
                creditUtilization: 0.2,
                creditAge: 0.85,
                creditMix: 0.7,
                inquiries: 1,
                totalDebt: 10000,
                monthlyIncome: 5000,
                recentMissedPayments: 1,
                recentDefaults: 0,
                lastActiveDate: "2024-12-01",
                activeLoanCount: 3,
                oldestAccountAge: 60,
                transactionsLast90Days: 40,
                onTimePaymentRate: 0.94,
                onTimeRateLast6Months: 0.96,
                missedPaymentsLast12: 1,
                recentLoanApplications: 2,
                defaultCountLast3Years: 0,
                consecutiveMissedPayments: 0,
                monthsSinceLastDelinquency: 8,
                loanTypeCounts: { creditCard: 2, carLoan: 1 }
              }];
              
              const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'credit_data_template.json';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            Download Template
          </Button>
        </div>
        
        {progress > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Upload Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress 
              percent={progress} 
              status={progress < 100 ? 'active' : 'success'}
              size={['small', 8]}
              strokeColor={progress === 100 ? '#52c41a' : '#1890ff'}
              showInfo={false}
            />
            {results?.uploadTime && (
              <div style={{ textAlign: 'right', fontSize: 12, color: '#666', marginTop: 4 }}>
                Completed in {results.uploadTime}s
              </div>
            )}
          </div>
        )}
        
        {validationErrors.length > 0 && (
          <Alert
            type="error"
            message="Validation Errors"
            description={
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {validationErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            }
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}
        
        {mappingValidationErrors.length > 0 && showMappingUI && (
          <Alert
            type="error"
            message="Mapping Validation Errors"
            description={
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {mappingValidationErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            }
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}
        
        {results && (
          <div style={{ marginTop: 16 }}>
            <Alert
              type={results.errors === 0 ? 'success' : results.success > 0 ? 'warning' : 'error'}
              message={
                <span>
                  Mapped and scored {results.total} records
                  {results.uploadTime && ` in ${results.uploadTime}s`}
                </span>
              }
              description={
                <div>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                    <Tag icon={<CheckCircleOutlined />} color="success">
                      {results.success} successful
                    </Tag>
                    {results.errors > 0 && (
                      <Tag icon={<CloseCircleOutlined />} color="error">
                        {results.errors} failed
                      </Tag>
                    )}
                    {results.total > 0 && (
                      <Tag>
                        {Math.round((results.success / results.total) * 100)}% success rate
                      </Tag>
                    )}
                  </div>
                  
                  {failedRecords.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>Failed Records ({failedRecords.length})</strong>
                        {retryAttempts < MAX_RETRY_ATTEMPTS && (
                          <Button 
                            type="link" 
                            size="small" 
                            icon={<ReloadOutlined />}
                            onClick={() => processFailedRecords(failedRecords)}
                            disabled={isUploading}
                          >
                            Retry All ({MAX_RETRY_ATTEMPTS - retryAttempts} attempts left)
                          </Button>
                        )}
                      </div>
                      <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8, border: '1px solid #f0f0f0', padding: 8, borderRadius: 4 }}>
                        <List
                          size="small"
                          dataSource={failedRecords}
                          renderItem={(item, index) => (
                            <List.Item>
                              <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>
                                    <strong>{item["phone number"] || `Record ${index + 1}`}</strong>
                                    {item.rowNumber && ` (Row ${item.rowNumber})`}
                                  </span>
                                  <Tag color="error">Failed</Tag>
                                </div>
                                {item.message && (
                                  <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>
                                    {item.message}
                                  </div>
                                )}
                              </div>
                            </List.Item>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              }
              showIcon
            />
          </div>
        )}
      </Card>
      {showMappingUI && (
        <>
          {extractionStatus && (
            <Alert
              type={extractionStatus.type === 'raw' ? 'warning' : 'info'}
              message={extractionStatus.message}
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}
          {renderExtractionPreview()}
        </>
      )}
    </>
  );
};

export default AdminBatchUpload;