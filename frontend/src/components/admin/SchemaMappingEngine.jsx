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

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const SchemaMappingEngine = () => {
  const [mappingForm] = Form.useForm();
  
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
  const [isCreatingPartner] = useState(false);
  const [mappingResults, setMappingResults] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [scoringResults, setScoringResults] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCreatingMapping, setIsCreatingMapping] = useState(false);
  const [isApplyingMapping, setIsApplyingMapping] = useState(false);
  const [isTestingMapping, setIsTestingMapping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mappingCreated, setMappingCreated] = useState(false);
  const [availableFields, setAvailableFields] = useState({});

  // Compute missing required fields
  const missingRequired = useMemo(() => {
    return REQUIRED_FIELDS.filter(
      field => !Object.keys(mappingState.fieldMappings).includes(field)
    );
  }, [mappingState.fieldMappings]);

  // Custom hooks
  const [partnerMappings, setPartnerMappings] = useMappings(selectedPartner?.id);

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
        validationRules: {
          requiredFields: Object.keys(mappingState.fieldMappings)
            .filter(key => mappingState.fieldMappings[key].isRequired),
          optionalFields: Object.keys(mappingState.fieldMappings)
            .filter(key => !mappingState.fieldMappings[key].isRequired)
        }
      };

      const response = await api.post('/schema-mapping/create', mappingData);

      if (response.data.success) {
        setMappingCreated(true);
        message.success('Schema mapping created successfully');
        setMappingState(prev => ({
          ...prev,
          mappings: [...prev.mappings, response.data.data],
          fieldMappings: {}
        }));
        mappingForm.resetFields();
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
  }, [fileState, mappingState, selectedPartner, missingRequired, mappingForm]);

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

  // Memoized components
  const FieldTable = useMemo(() => React.memo(({ fields, onUpdate }) => (
    <Table 
      dataSource={fields} 
      columns={fieldDetectionColumns(onUpdate)} 
      rowKey="key" 
      pagination={false} 
    />
  )), []);

  const MappingTable = useMemo(() => React.memo(({ mappings, onDelete }) => (
    <Table 
      dataSource={mappings} 
      columns={mappingColumns(onDelete)} 
      rowKey="key" 
      pagination={false} 
    />
  )), []);

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

  const renderFieldDetection = () => {
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

    return (
      <>
        <Card title="Detected Fields" style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Search fields..."
            allowClear
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ marginBottom: 16, maxWidth: 300 }}
          />
          <Spin spinning={isDetecting} tip="Detecting fields...">
            <FieldTable
              fields={detectedFields
                .filter(f => 
                  !searchTerm ||
                  f.sourceField.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  f.targetField.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(f => ({
                  ...f,
                  key: `${f.sourceField}_${f.targetField}`
                }))}
              onUpdate={updateDetectedFieldTarget}
            />
          </Spin>
        </Card>

        <Card title="Next Steps" style={{ marginBottom: 16 }}>
          <Alert
            message="Field Detection Complete!"
            description={
              <div>
                <p><strong>To process your data:</strong></p>
                <ol>
                  <li>Add field mappings using the action buttons</li>
                  <li>Review mappings in the Create Mapping tab</li>
                  <li>Create and apply your mapping</li>
                </ol>
              </div>
            }
            type="success"
            showIcon
          />
          <Space style={{ marginTop: 16 }}>
            <Button 
              type="primary" 
              icon={<SaveOutlined />}
              onClick={() => document.querySelector('.ant-tabs-tab:nth-child(2)').click()}
            >
              Create Mapping
            </Button>
            <Button 
              type="default" 
              icon={<EyeOutlined />}
              onClick={() => document.querySelector('.ant-tabs-tab:nth-child(3)').click()}
            >
              Apply Mapping
            </Button>
            <Button 
              icon={<CheckCircleOutlined />}
              onClick={addAllDetectedFields}
            >
              Add All Fields
            </Button>
          </Space>
        </Card>
      </>
    );
  };

  const renderFieldMappings = () => {
    const mappings = Object.values(mappingState.fieldMappings);
    
    if (mappings.length === 0) {
      return (
        <Card title="Field Mappings" style={{ marginBottom: 16 }}>
          <Empty description="No field mappings configured">
            <Button type="primary" onClick={() => document.querySelector('.ant-tabs-tab:first-child').click()}>
              Detect Fields
            </Button>
          </Empty>
        </Card>
      );
    }

    return (
      <Card title="Field Mappings" style={{ marginBottom: 16 }}>
        <MappingTable 
          mappings={mappings.map((m, i) => ({ ...m, key: `${m.sourceField}_${i}` }))} 
          onDelete={confirmDelete} 
        />
      </Card>
    );
  };

  const renderMappingConfiguration = () => (
    <Card title="Mapping Configuration" style={{ marginBottom: 16 }}>
      <Form form={mappingForm} layout="vertical" onFinish={createMapping}>
        <Row gutter={16}>
          <Col span={12}>
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
          <Col span={12}>
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
          onClick={() => mappingForm.submit()}
          loading={isCreatingMapping}
          disabled={Object.keys(mappingState.fieldMappings).length === 0}
        >
          Create Mapping
        </Button>
      </Form>
    </Card>
  );

  const renderApplyMappingCard = () => (
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
  );

  const renderTestMappingCard = () => (
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
  );

  // Tabs configuration
  const tabsItems = useMemo(() => [
    {
      key: 'detect',
      label: 'Field Detection',
      children: (
        <>
          {renderFileUploadCard()}
          {renderFieldDetection()}
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
    partnerMappings, 
    testResults,
    mappingResults,
    scoringResults
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
        </Card>
      )}
      
      <Tabs 
        defaultActiveKey="detect" 
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