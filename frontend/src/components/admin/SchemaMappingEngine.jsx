import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  Upload,
  message,
  Modal,
  Form,
  Input,
  Select,
  Table,
  Tag,
  Space,
  Typography,
  Divider,
  Alert,
  Progress,
  Tooltip,
  Switch,
  Row,
  Col,
  Tabs,
  List,
  Badge,
  Spin,
  Empty,
  Statistic
} from 'antd';
import {
  UploadOutlined,
  FileSearchOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import api from '../../utils/api';
import debounce from 'lodash/debounce';
import MappingResults from './MappingResults';
import ScoringResults from './ScoringResults';
import TestResults from './TestResults';
import useMappings from './useMappings';

// Constants
const FILE_TYPES = {
  JSON: 'application/json',
  CSV: 'text/csv',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  XLS: 'application/vnd.ms-excel'
};

const REQUIRED_FIELDS = [
  'creditUtilization',
  'creditAge',
  'creditMix',
  'paymentHistory',
  'totalAccounts'
];

const ENGINE_OPTIONS = [
  { value: 'default', label: 'FF Score' },
  { value: 'ai', label: 'AI Scoring' },
  { value: 'creditworthiness', label: 'TF Score' }
];

const ENGINE_REQUIRED_FIELDS = {
  default: REQUIRED_FIELDS,
  ai: [],
  creditworthiness: []
};

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Add a useIsMobile hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

const SchemaMappingEngine = () => {
  const [mappingForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('detect');
  
  // State management
  const [fileState, setFileState] = useState({
    file: null,
    uploadedFile: null,
    sampleData: [],
    fileType: '',
    detectionResult: null
  });

  const [mappingState, setMappingState] = useState({
    mappings: [],
    selectedMapping: null,
    fieldMappings: {},
    mappingName: '',
    mappingDescription: ''
  });
  
  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [mappingResults, setMappingResults] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [scoringResults, setScoringResults] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCreatingMapping, setIsCreatingMapping] = useState(false);
  const [isApplyingMapping, setIsApplyingMapping] = useState(false);
  const [isTestingMapping, setIsTestingMapping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableFields, setAvailableFields] = useState({});

  // FIX: Move useMappings hook to top level
  const [partnerMappings, setPartnerMappings] = useMappings(selectedPartner?.id);

  const isMobile = useIsMobile();

  // Load available fields and partners
  useEffect(() => {
    const loadResources = async () => {
      try {
        const [fieldsRes, partnersRes] = await Promise.all([
          api.get('/schema-mapping/fields'),
          api.get('/partners')
        ]);
        
        if (fieldsRes.data.success) {
          setAvailableFields(fieldsRes.data.data);
        }
        
        if (partnersRes.data.success) {
          setPartners(partnersRes.data.data);
        }
      } catch (error) {
        console.error('Failed to load resources:', error);
        message.error('Failed to load required resources');
      }
    };

    loadResources();
  }, []);

  // File upload handling
  const beforeUpload = useCallback((file) => {
    const safeName = file.name.replace(/[^a-z0-9_.-]/gi, '');
    const sanitizedFile = new File([file], safeName, { type: file.type });
    
    // Validate file type
    const isValidType = Object.values(FILE_TYPES).includes(file.type);
    if (!isValidType) {
      message.error('Only JSON, CSV, and Excel files are supported');
      return Upload.LIST_IGNORE;
    }
    
    // Validate file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      message.error('File size must be less than 10MB');
      return Upload.LIST_IGNORE;
    }
    
    // Validate JSON structure
    if (file.type === FILE_TYPES.JSON) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          JSON.parse(e.target.result);
        } catch (err) {
          message.error('Invalid JSON format');
          return Upload.LIST_IGNORE;
        }
      };
      reader.readAsText(file);
    }
    
    setFileState(prev => ({ ...prev, file: sanitizedFile }));
    return false;
  }, []);

  // Detect fields in uploaded file
  const detectFields = useCallback(async () => {
    if (!fileState.file) {
      message.warning('Please select a file first');
      return;
    }

    setIsDetecting(true);
    const formData = new FormData();
    formData.append('file', fileState.file);

    try {
      const response = await api.post('/schema-mapping/detect-fields', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setFileState(prev => ({
          ...prev,
          detectionResult: response.data.data,
          sampleData: response.data.sampleData,
          fileType: response.data.fileType,
          uploadedFile: fileState.file
        }));
        message.success('Field detection completed successfully');
      }
    } catch (error) {
      const status = error.response?.status;
      message.error(
        status === 413 ? 'File too large' :
        status === 415 ? 'Unsupported file type' :
        'Field detection failed'
      );
      console.error('Field detection failed:', error);
    } finally {
      setIsDetecting(false);
    }
  }, [fileState.file]);

  // Create new mapping
  const createMapping = useCallback(async (values) => {
    const engineType = values.engineType;
    const requiredFields = ENGINE_REQUIRED_FIELDS[engineType] || [];
    const missingRequired = requiredFields.filter(
      field => !Object.keys(mappingState.fieldMappings).includes(field)
    );
    
    if (missingRequired.length > 0) {
      message.error(`Missing required fields: ${missingRequired.join(', ')}`);
      return;
    }

    if (!selectedPartner) {
      message.error('Please select a partner first');
      return;
    }

    setIsCreatingMapping(true);

    try {
      const version = mappingState.mappings.filter(m => m.name === values.name).length + 1;
      const mappingData = {
        name: values.name,
        description: values.description,
        partnerId: selectedPartner.id,
        partnerName: selectedPartner.name,
        fileType: fileState.fileType,
        fieldMappings: mappingState.fieldMappings,
        sampleData: fileState.sampleData,
        version,
        engineType,
        validationRules: {
          requiredFields: Object.keys(mappingState.fieldMappings)
            .filter(key => mappingState.fieldMappings[key].isRequired),
          optionalFields: Object.keys(mappingState.fieldMappings)
            .filter(key => !mappingState.fieldMappings[key].isRequired)
        }
      };

      const response = await api.post('/schema-mapping/create', mappingData);

      if (response.data.success) {
        message.success('Schema mapping created successfully');
        setMappingState(prev => ({
          ...prev,
          mappings: [...prev.mappings, response.data.data],
          fieldMappings: {}
        }));
        mappingForm.resetFields();
        setActiveTab('apply');
      }
    } catch (error) {
      const status = error.response?.status;
      message.error(
        status === 409 ? 'Mapping name already exists' :
        status === 400 ? 'Invalid mapping data' :
        'Failed to create mapping'
      );
      console.error('Failed to create mapping:', error);
    } finally {
      setIsCreatingMapping(false);
    }
  }, [fileState, mappingState, selectedPartner, mappingForm]);

  // Apply mapping to data
  const applyMapping = useCallback(async () => {
    if (!fileState.uploadedFile) {
      message.warning('Please upload a file first');
      return;
    }

    if (!mappingState.selectedMapping) {
      message.warning('Please select a mapping first');
      return;
    }

    setIsApplyingMapping(true);
    const formData = new FormData();
    formData.append('file', fileState.uploadedFile);
    formData.append('partnerId', selectedPartner.id);

    try {
      const response = await api.post(
        `/schema-mapping/apply/${mappingState.selectedMapping}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.success) {
        setMappingResults(response.data.data);
        setScoringResults(response.data.data.scoringResults);
        message.success(`Mapping applied successfully. Processed ${response.data.data.summary.mappedRecords} records`);
      }
    } catch (error) {
      const status = error.response?.status;
      message.error(
        status === 404 ? 'Mapping not found' :
        status === 413 ? 'File too large' :
        status === 415 ? 'Unsupported file type' :
        'Failed to apply mapping'
      );
      console.error('Failed to apply mapping:', error);
    } finally {
      setIsApplyingMapping(false);
    }
  }, [fileState.uploadedFile, mappingState.selectedMapping, selectedPartner]);

  // Test mapping with sample data
  const testMapping = useCallback(async () => {
    if (!fileState.sampleData || fileState.sampleData.length === 0) {
      message.warning('No sample data available');
      return;
    }
    
    setIsTestingMapping(true);
    try {
      const response = await api.post('/schema-mapping/test-mapping', {
        fieldMappings: mappingState.fieldMappings,
        sampleData: fileState.sampleData.slice(0, 5)
      });
      
      if (response.data.success) {
        setTestResults(response.data.data);
        message.success('Mapping test completed');
      }
    } catch (error) {
      message.error('Failed to test mapping');
      console.error('Failed to test mapping:', error);
    } finally {
      setIsTestingMapping(false);
    }
  }, [fileState.sampleData, mappingState.fieldMappings]);

  // Field mapping management
  const addFieldMapping = useCallback((sourceField, targetField, transformation = 'none', isRequired = false) => {
    if (mappingState.fieldMappings[targetField]) {
      message.warning(`Mapping for "${targetField}" already exists!`);
      return;
    }
    
    setMappingState(prev => ({
      ...prev,
      fieldMappings: {
        ...prev.fieldMappings,
        [targetField]: {
          sourceField,
          targetField,
          transformation,
          isRequired,
          defaultValue: undefined
        }
      }
    }));
  }, [mappingState.fieldMappings]);

  const removeFieldMapping = useCallback((targetField) => {
    setMappingState(prev => {
      const newMappings = { ...prev.fieldMappings };
      delete newMappings[targetField];
      return { ...prev, fieldMappings: newMappings };
    });
  }, []);

  const updateFieldMapping = useCallback((targetField, updates) => {
    setMappingState(prev => {
      const newMappings = { ...prev.fieldMappings };
      
      if (updates.targetField && updates.targetField !== targetField) {
        // Handle field rename
        newMappings[updates.targetField] = {
          ...newMappings[targetField],
          ...updates
        };
        delete newMappings[targetField];
      } else {
        // Update existing field
        newMappings[targetField] = {
          ...newMappings[targetField],
          ...updates
        };
      }
      
      return { ...prev, fieldMappings: newMappings };
    });
  }, []);

  const updateDetectedFieldTarget = useCallback((sourceField, oldTargetField, newTargetField) => {
    setFileState(prev => {
      if (!prev.detectionResult) return prev;
      
      return {
        ...prev,
        detectionResult: {
          ...prev.detectionResult,
          detectedFields: prev.detectionResult.detectedFields.map(field => 
            field.sourceField === sourceField && field.targetField === oldTargetField
              ? { ...field, targetField: newTargetField }
              : field
          )
        }
      };
    });
  }, []);

  const confirmDelete = useCallback((targetField) => {
    Modal.confirm({
      title: 'Delete Mapping?',
      content: 'This action cannot be undone',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => removeFieldMapping(targetField)
    });
  }, [removeFieldMapping]);

  const addAllDetectedFields = useCallback(() => {
    if (!fileState.detectionResult) return;

    setMappingState(prev => {
      const newMappings = { ...prev.fieldMappings };
      let added = 0;
      
      fileState.detectionResult.detectedFields.forEach(field => {
        if (!newMappings[field.targetField]) {
          newMappings[field.targetField] = {
            sourceField: field.sourceField,
            targetField: field.targetField,
            transformation: field.transformation || 'none',
            isRequired: field.isRequired || false
          };
          added++;
        }
      });
      
      if (added > 0) {
        message.success(`Added ${added} new field mappings`);
      } else {
        message.info('All detected fields already mapped');
      }
      
      return { ...prev, fieldMappings: newMappings };
    });
  }, [fileState.detectionResult]);

  // Column generators
  const fieldDetectionColumns = useCallback((onUpdate) => [
    {
      title: 'Source Field',
      dataIndex: 'sourceField',
      key: 'sourceField',
      render: (text, record) => (
        <Tag color={record.isRequired ? 'red' : 'blue'}>
          {text}
          {record.isRequired && <span style={{ marginLeft: 4 }}>(required)</span>}
        </Tag>
      )
    },
    {
      title: 'Detected Target',
      dataIndex: 'targetField',
      key: 'targetField',
      render: (text, record) => (
        <Select
          value={text}
          style={{ width: '100%' }}
          onChange={(value) => onUpdate(record.sourceField, record.targetField, value)}
        >
          {Object.entries(availableFields).map(([field, config]) => (
            <Select.Option key={field} value={field}>
              {field} - {config.description}
            </Select.Option>
          ))}
        </Select>
      )
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (value) => (
        <Tooltip title={`Confidence: ${Math.round(value * 100)}%`}>
          <Progress 
            percent={Math.round(value * 100)} 
            size="small"
            status={value > 0.8 ? 'success' : value > 0.5 ? 'normal' : 'exception'}
          />
        </Tooltip>
      )
    },
    {
      title: 'Required',
      dataIndex: 'isRequired',
      key: 'isRequired',
      render: (required) => <Switch checked={required} disabled />
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          type="primary" 
          size="small"
          onClick={() => addFieldMapping(
            record.sourceField, 
            record.targetField, 
            record.transformation, 
            record.isRequired
          )}
        >
          Add Mapping
        </Button>
      )
    }
  ], [availableFields, addFieldMapping]);

  const mappingColumns = useCallback((onDelete) => [
    {
      title: 'Source Field',
      dataIndex: 'sourceField',
      key: 'sourceField',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Target Field',
      dataIndex: 'targetField',
      key: 'targetField',
      render: (text) => <Tag color="green">{text}</Tag>
    },
    {
      title: 'Transformation',
      dataIndex: 'transformation',
      key: 'transformation',
      render: (text) => <span>{text}</span>
    },
    {
      title: 'Required',
      dataIndex: 'isRequired',
      key: 'isRequired',
      render: (required) => <Switch checked={required} disabled />
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          type="text" 
          danger 
          icon={<DeleteOutlined />}
          onClick={() => onDelete(record.targetField)} 
        />
      )
    }
  ], []);

  // Render functions
  const renderFileUploadCard = () => (
    <Card title="Upload File for Field Detection" style={{ marginBottom: 16 }}>
      <Upload.Dragger
        beforeUpload={beforeUpload}
        fileList={fileState.file ? [fileState.file] : []}
        onRemove={() => setFileState(prev => ({ ...prev, file: null }))}
        accept=".json,.csv,.xlsx,.xls"
        maxCount={1}
      >
        <p className="ant-upload-drag-icon">
          <UploadOutlined />
        </p>
        <p className="ant-upload-text">Click or drag file to upload</p>
        <p className="ant-upload-hint">
          Supports JSON, CSV, Excel files (max 10MB)
        </p>
      </Upload.Dragger>
      <Button
        type="primary"
        icon={<FileSearchOutlined />}
        onClick={detectFields}
        loading={isDetecting}
        disabled={!fileState.file}
        style={{ marginTop: 16 }}
      >
        Detect Fields
      </Button>
    </Card>
  );

  // 1. Sample Data Preview Table Responsive
      {fileState.fileType === 'csv' && fileState.sampleData?.length > 0 && (
        <Card title="Sample Data Preview" style={{ marginBottom: 16 }}>
          <div style={{ overflowX: 'auto' }}>
            <Table
              dataSource={fileState.sampleData.slice(0, 3)}
              columns={Object.keys(fileState.sampleData[0] || {}).map(key => ({
                title: key,
                dataIndex: key,
                ellipsis: true
              }))}
              pagination={false}
              scroll={{ x: true }}
              size="small"
            />
          </div>
        </Card>
      )}

  // Field Detection: true mobile card view with runtime check
  const renderFieldDetection = (isMobile) => {
    if (!fileState.detectionResult) return null;
    const { detectedFields = [] } = fileState.detectionResult;
    if (detectedFields.length === 0) {
      return (
        <Card title="Detected Fields" style={{ marginBottom: 16 }}>
          <Empty description="No detectable fields found">
            <Button type="primary" onClick={detectFields}>
              Retry Detection
            </Button>
          </Empty>
        </Card>
      );
    }
    // True mobile card view (no AntD Table)
    if (isMobile) {
      return (
        <>
          <div style={{ border: '2px solid red', marginBottom: 16, padding: 8, borderRadius: 8 }}>
            <div style={{ fontWeight: 'bold', color: 'red', marginBottom: 8 }}>MOBILE CARD</div>
            {detectedFields.map((field, idx) => (
              <div key={idx} className="bg-white dark:bg-[#0d261c] rounded-xl shadow border border-gray-200 dark:border-[#1a4a38] p-4 flex flex-col gap-2 w-full mb-3">
                <div className="flex flex-col gap-1">
                  <div className="font-semibold text-gray-900 dark:text-white text-base">{field.sourceField}</div>
                  <div className="text-xs text-gray-600 dark:text-[#a8d5ba]">Target: <b>{field.targetField}</b></div>
                  <div className="text-xs text-gray-600 dark:text-[#a8d5ba]">Confidence: {Math.round(field.confidence * 100)}%</div>
                  <div className="text-xs text-gray-600 dark:text-[#a8d5ba]">Required: {field.isRequired ? 'Yes' : 'No'}</div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    className="bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1 text-xs font-semibold"
                    onClick={() => addFieldMapping(field.sourceField, field.targetField, field.transformation, field.isRequired)}
                  >
                    Add Mapping
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      );
    }
    // Desktop: AntD Table
    return (
      <Card title="Detected Fields" style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Search fields..."
          allowClear
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginBottom: 16, maxWidth: 300 }}
        />
        <Spin spinning={isDetecting} tip="Detecting fields...">
          <div style={{ overflowX: 'auto' }}>
            <Table
              dataSource={detectedFields
                .filter(f =>
                  !searchTerm ||
                  f.sourceField.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  f.targetField.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(f => ({
                  ...f,
                  key: `${f.sourceField}_${f.targetField}`
                }))}
              columns={fieldDetectionColumns(updateDetectedFieldTarget)}
              pagination={false}
            />
          </div>
        </Spin>
      </Card>
    );
  };

  // Field Mappings: true mobile card view
  const renderFieldMappings = () => {
    const mappings = Object.values(mappingState.fieldMappings);
    if (mappings.length === 0) {
      return (
        <Card title="Field Mappings" style={{ marginBottom: 16 }}>
          <Empty description="No field mappings configured">
            <Button type="primary" onClick={() => setActiveTab('detect')}>
              Detect Fields
            </Button>
          </Empty>
        </Card>
      );
    }
    // True mobile card view (no AntD Table)
    const mobileCards = (
      <div className="block md:hidden space-y-3 w-full">
        {mappings.map((m, idx) => (
          <div key={idx} className="bg-white dark:bg-[#0d261c] rounded-xl shadow border border-gray-200 dark:border-[#1a4a38] p-4 flex flex-col gap-2 w-full">
            <div className="flex flex-col gap-1">
              <div className="font-semibold text-gray-900 dark:text-white text-base">{m.sourceField}</div>
              <div className="text-xs text-gray-600 dark:text-[#a8d5ba]">Target: <b>{m.targetField}</b></div>
              <div className="text-xs text-gray-600 dark:text-[#a8d5ba]">Transformation: {m.transformation}</div>
              <div className="text-xs text-gray-600 dark:text-[#a8d5ba]">Required: {m.isRequired ? 'Yes' : 'No'}</div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                className="bg-red-600 hover:bg-red-700 text-white rounded px-3 py-1 text-xs font-semibold"
                onClick={() => confirmDelete(m.targetField)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    );
    return (
      <Card title="Field Mappings" style={{ marginBottom: 16 }}>
        {mobileCards}
        <div className="hidden md:block" style={{ overflowX: 'auto' }}>
          <Table 
            dataSource={mappings.map((m, i) => ({ ...m, key: `${m.sourceField}_${i}` }))} 
            columns={mappingColumns(confirmDelete)} 
            pagination={false} 
          />
        </div>
      </Card>
    );
  };

  const renderMappingConfiguration = () => {
    const engineType = mappingForm.getFieldValue('engineType') || 'default';
    const requiredFields = ENGINE_REQUIRED_FIELDS[engineType] || [];
    const missingRequired = requiredFields.filter(
      field => !Object.keys(mappingState.fieldMappings).includes(field)
    );

    return (
      <Card title="Mapping Configuration" style={{ marginBottom: 16 }}>
        <Form form={mappingForm} layout="vertical" onFinish={createMapping} 
          initialValues={{ engineType: 'default' }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="name"
                label="Mapping Name"
                rules={[{ 
                  required: true, 
                  message: 'Please enter a mapping name' 
                }]}
              >
                <Input placeholder="e.g., Bank A CSV Mapping" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="description"
                label="Description"
                rules={[{ max: 200, message: 'Description too long' }]}
              >
                <TextArea 
                  placeholder="Describe this mapping..." 
                  rows={2} 
                  showCount 
                  maxLength={200} 
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="engineType"
                label="Scoring Engine"
                rules={[{ required: true, message: 'Please select a scoring engine' }]}
              >
                <Select
                  onChange={value => mappingForm.setFieldsValue({ engineType: value })}
                  style={{ width: '100%' }}
                >
                  {ENGINE_OPTIONS.map(opt => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          {missingRequired.length > 0 && (
            <Alert
              type="error"
              showIcon
              message={`Missing required fields: ${missingRequired.join(', ')}`}
              style={{ marginBottom: 16 }}
            />
          )}
          <Button
            type="primary"
            icon={<SaveOutlined />}
            htmlType="submit"
            loading={isCreatingMapping}
            disabled={Object.keys(mappingState.fieldMappings).length === 0}
          >
            Create Mapping
          </Button>
        </Form>
      </Card>
    );
  };

  const renderApplyMappingCard = () => {
    // Mobile card layout
    const mobileCard = (
      <div className="block md:hidden space-y-4 w-full">
        <div className="bg-white dark:bg-[#0d261c] rounded-xl shadow border border-gray-200 dark:border-[#1a4a38] p-4 flex flex-col gap-4 w-full">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-[#a8d5ba] mb-1">Partner</label>
            <Select
              placeholder="Select partner"
              onChange={value => setSelectedPartner(partners.find(p => p.id === value))}
              value={selectedPartner?.id}
              loading={partners.length === 0}
              style={{ width: '100%' }}
            >
              {partners.map(partner => (
                <Option key={partner.id} value={partner.id}>{partner.name}</Option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-[#a8d5ba] mb-1">Mapping</label>
            <Select
              placeholder="Select mapping"
              onChange={value => setMappingState(prev => ({ ...prev, selectedMapping: value }))}
              value={mappingState.selectedMapping}
              disabled={!selectedPartner}
              loading={!partnerMappings}
              style={{ width: '100%' }}
            >
              {(partnerMappings || []).map(mapping => (
                <Option key={mapping._id} value={mapping._id}>{mapping.name} (v{mapping.version})</Option>
              ))}
            </Select>
          </div>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={applyMapping}
            loading={isApplyingMapping}
            disabled={!mappingState.selectedMapping || !fileState.uploadedFile}
            style={{ width: '100%', marginTop: 8 }}
          >
            Apply Mapping
          </Button>
        </div>
      </div>
    );
    // Desktop layout
    return (
      <>
        {mobileCard}
        <div className="hidden md:block">
          <Card title="Apply Mapping" style={{ marginBottom: 16 }}>
            <Form layout="vertical">
              <Form.Item label="Partner" required>
                <Select
                  placeholder="Select partner"
                  onChange={value => setSelectedPartner(
                    partners.find(p => p.id === value)
                  )}
                  value={selectedPartner?.id}
                  loading={partners.length === 0}
                >
                  {partners.map(partner => (
                    <Option key={partner.id} value={partner.id}>
                      {partner.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item label="Mapping" required>
                <Select
                  placeholder="Select mapping"
                  onChange={value => setMappingState(prev => ({
                    ...prev, 
                    selectedMapping: value
                  }))}
                  value={mappingState.selectedMapping}
                  disabled={!selectedPartner}
                  loading={!partnerMappings}
                >
                  {(partnerMappings || []).map(mapping => (
                    <Option key={mapping._id} value={mapping._id}>
                      {mapping.name} (v{mapping.version})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={applyMapping}
              loading={isApplyingMapping}
              disabled={!mappingState.selectedMapping || !fileState.uploadedFile}
              style={{ marginTop: 16 }}
            >
              Apply Mapping
            </Button>
          </Card>
        </div>
      </>
    );
  };

  const renderTestMappingCard = () => (
    <>
      <div className="block md:hidden w-full">
        <div className="bg-white dark:bg-[#0d261c] rounded-xl shadow border border-gray-200 dark:border-[#1a4a38] p-4 flex flex-col gap-4 w-full">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={testMapping}
            loading={isTestingMapping}
            disabled={Object.keys(mappingState.fieldMappings).length === 0}
            style={{ width: '100%' }}
          >
            Test with Sample Data
          </Button>
        </div>
      </div>
      <div className="hidden md:block">
        <Card title="Test Mapping" style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={testMapping}
            loading={isTestingMapping}
            disabled={Object.keys(mappingState.fieldMappings).length === 0}
          >
            Test with Sample Data
          </Button>
        </Card>
      </div>
    </>
  );

  // Tabs configuration
  const tabsItems = useMemo(() => [
    {
      key: 'detect',
      label: 'Field Detection',
      children: (
        <>
          {renderFileUploadCard()}
          {renderFieldDetection(isMobile)}
        </>
      )
    },
    {
      key: 'create',
      label: 'Create Mapping',
      children: (
        <>
          <Card title="Partner Selection" style={{ marginBottom: 24 }}>
            <Select
              placeholder="Select partner"
              style={{ width: '100%' }}
              onChange={value => setSelectedPartner(
                partners.find(p => p.id === value)
              )}
              value={selectedPartner?.id}
            >
              {partners.map(partner => (
                <Option key={partner.id} value={partner.id}>
                  {partner.name}
                </Option>
              ))}
            </Select>
          </Card>
          
          {renderFieldMappings()}
          {renderMappingConfiguration()}
        </>
      )
    },
    {
      key: 'apply',
      label: 'Apply Mapping',
      children: (
        <>
          {renderApplyMappingCard()}
          {mappingResults && <MappingResults results={mappingResults} />}
          {scoringResults && <ScoringResults results={scoringResults} />}
        </>
      )
    },
    {
      key: 'test',
      label: 'Test',
      children: (
        <>
          {renderTestMappingCard()}
          {testResults && <TestResults results={testResults} />}
        </>
      )
    }
  ], [
    fileState, 
    mappingState, 
    partners, 
    selectedPartner, 
    testResults,
    mappingResults,
    scoringResults,
    isMobile
  ]);

  return (
    <div className="schema-mapping-engine" style={{ padding: 24 }}>
      <Title level={2}>
        <SettingOutlined /> Schema Mapping Engine
      </Title>
      <Paragraph type="secondary">
        Upload files in any format and map them to our credit scoring schema
      </Paragraph>
      
      {fileState.fileType === 'csv' && fileState.sampleData?.length > 0 && (
        <Card title="Sample Data Preview" style={{ marginBottom: 16 }}>
          <div style={{ overflowX: 'auto' }}>
            <Table
              dataSource={fileState.sampleData.slice(0, 3)}
              columns={Object.keys(fileState.sampleData[0] || {}).map(key => ({
                title: key,
                dataIndex: key,
                ellipsis: true
              }))}
              pagination={false}
              scroll={{ x: true }}
              size="small"
            />
          </div>
        </Card>
      )}
      
      <Tabs 
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabsItems} 
        tabBarExtraContent={
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => window.location.reload()}
          >
            Reset
          </Button>
        }
      />
    </div>
  );
};

export default SchemaMappingEngine;