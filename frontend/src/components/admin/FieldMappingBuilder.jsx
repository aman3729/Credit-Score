import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Typography,
  Alert,
  Divider,
  Row,
  Col,
  Tag,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

const FieldMappingBuilder = ({ 
  detectedFields = [], 
  availableFields = {}, 
  onMappingsChange,
  initialMappings = {}
}) => {
  const [mappings, setMappings] = useState(initialMappings);
  const [form] = Form.useForm();

  useEffect(() => {
    onMappingsChange(mappings);
  }, [mappings, onMappingsChange]);

  const addMapping = (sourceField, targetField, transformation = 'none', isRequired = false) => {
    const newMapping = {
      sourceField,
      targetField,
      transformation,
      isRequired,
      defaultValue: undefined
    };

    setMappings(prev => ({
      ...prev,
      [targetField]: newMapping
    }));
  };

  const removeMapping = (targetField) => {
    setMappings(prev => {
      const newMappings = { ...prev };
      delete newMappings[targetField];
      return newMappings;
    });
  };

  const updateMapping = (targetField, updates) => {
    setMappings(prev => ({
      ...prev,
      [targetField]: {
        ...prev[targetField],
        ...updates
      }
    }));
  };

  const getFieldDescription = (fieldName) => {
    return availableFields[fieldName]?.description || 'No description available';
  };

  const getFieldType = (fieldName) => {
    return availableFields[fieldName]?.type || 'unknown';
  };

  const isFieldRequired = (fieldName) => {
    return availableFields[fieldName]?.required || false;
  };

  const renderDetectedFields = () => {
    if (detectedFields.length === 0) {
      return (
        <Alert
          message="No fields detected"
          description="Upload a file first to detect fields automatically"
          type="info"
          showIcon
        />
      );
    }

    return (
      <Card title="Detected Fields" size="small" style={{ marginBottom: 16 }}>
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {detectedFields.map((field, index) => (
            <div key={index} style={{ 
              padding: 8, 
              border: '1px solid #d9d9d9', 
              borderRadius: 4, 
              marginBottom: 8,
              backgroundColor: '#fafafa'
            }}>
              <Row gutter={16} align="middle">
                <Col span={8}>
                  <Text strong>{field.sourceField}</Text>
                  <br />
                  <Text type="secondary">Source Field</Text>
                </Col>
                <Col span={6}>
                  <Text>→</Text>
                </Col>
                <Col span={8}>
                  <Select
                    placeholder="Select target field"
                    style={{ width: '100%' }}
                    dropdownStyle={{ minWidth: 260 }}
                    optionLabelProp="label"
                    onChange={(value) => addMapping(field.sourceField, value, field.transformation, field.isRequired)}
                  >
                    {Object.keys(availableFields).map(fieldName => (
                      <Option key={fieldName} value={fieldName} label={fieldName} style={{ padding: 0 }}>
                        <div style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid #f0f0f0',
                          background: '#fff',
                          borderRadius: 4,
                          margin: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          minWidth: 220
                        }}>
                          <span style={{ fontWeight: 600, fontSize: 15, color: '#1F2937' }}>{fieldName}</span>
                          <span style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{getFieldDescription(fieldName)}</span>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col span={2}>
                  <Tooltip title="Confidence score">
                    <Tag color={field.confidence > 0.8 ? 'green' : field.confidence > 0.5 ? 'orange' : 'red'}>
                      {Math.round(field.confidence * 100)}%
                    </Tag>
                  </Tooltip>
                </Col>
              </Row>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  const renderCurrentMappings = () => {
    const mappingEntries = Object.entries(mappings);

    if (mappingEntries.length === 0) {
      return (
        <Alert
          message="No mappings created"
          description="Add field mappings to transform your data"
          type="info"
          showIcon
        />
      );
    }

    return (
      <Card title="Current Mappings" size="small" style={{ marginBottom: 16 }}>
        {mappingEntries.map(([targetField, mapping]) => (
          <div key={targetField} style={{ 
            padding: 12, 
            border: '1px solid #d9d9d9', 
            borderRadius: 6, 
            marginBottom: 12,
            backgroundColor: '#fff'
          }}>
            <Row gutter={16} align="middle">
              <Col span={6}>
                <Text strong>{mapping.sourceField}</Text>
                <br />
                <Text type="secondary">Source</Text>
              </Col>
              <Col span={2}>
                <Text>→</Text>
              </Col>
              <Col span={6}>
                <div>
                  <Text strong style={{ color: isFieldRequired(targetField) ? '#cf1322' : '#52c41a' }}>
                    {targetField}
                    {isFieldRequired(targetField) && <Text type="danger"> *</Text>}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {getFieldDescription(targetField)}
                  </Text>
                </div>
              </Col>
              <Col span={4}>
                <Select
                  value={mapping.transformation}
                  style={{ width: '100%' }}
                  onChange={(value) => updateMapping(targetField, { transformation: value })}
                >
                  <Option value="none">No Transform</Option>
                  <Option value="uppercase">Uppercase</Option>
                  <Option value="lowercase">Lowercase</Option>
                  <Option value="trim">Trim</Option>
                  <Option value="phone_format">Phone Format</Option>
                  <Option value="date_format">Date Format</Option>
                  <Option value="number_format">Number Format</Option>
                </Select>
              </Col>
              <Col span={3}>
                <Switch
                  checked={mapping.isRequired}
                  onChange={(checked) => updateMapping(targetField, { isRequired: checked })}
                  size="small"
                />
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>Required</Text>
              </Col>
              <Col span={3}>
                <Space>
                  <Tooltip title="Remove mapping">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                      onClick={() => removeMapping(targetField)}
                    />
                  </Tooltip>
                  {isFieldRequired(targetField) && (
                    <Tooltip title="Required field">
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    </Tooltip>
                  )}
                </Space>
              </Col>
            </Row>
          </div>
        ))}
      </Card>
    );
  };

  const renderManualMapping = () => {
    return (
      <Card title="Add Manual Mapping" size="small" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Source Field">
                <Input placeholder="Enter source field name" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Target Field">
                <Select placeholder="Select target field">
                  {Object.keys(availableFields).map(fieldName => (
                    <Option key={fieldName} value={fieldName}>
                      {fieldName} - {getFieldDescription(fieldName)}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Transformation">
                <Select defaultValue="none">
                  <Option value="none">No Transform</Option>
                  <Option value="uppercase">Uppercase</Option>
                  <Option value="lowercase">Lowercase</Option>
                  <Option value="trim">Trim</Option>
                  <Option value="phone_format">Phone Format</Option>
                  <Option value="date_format">Date Format</Option>
                  <Option value="number_format">Number Format</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Button type="dashed" icon={<PlusOutlined />}>
            Add Mapping
          </Button>
        </Form>
      </Card>
    );
  };

  const renderSummary = () => {
    const mappingEntries = Object.entries(mappings);
    const requiredMappings = mappingEntries.filter(([_, mapping]) => mapping.isRequired);
    const optionalMappings = mappingEntries.filter(([_, mapping]) => !mapping.isRequired);

    return (
      <Card title="Mapping Summary" size="small">
        <Row gutter={16}>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                {mappingEntries.length}
              </Title>
              <Text type="secondary">Total Mappings</Text>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#cf1322' }}>
                {requiredMappings.length}
              </Title>
              <Text type="secondary">Required</Text>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                {optionalMappings.length}
              </Title>
              <Text type="secondary">Optional</Text>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#faad14' }}>
                {Object.keys(availableFields).filter(field => 
                  availableFields[field].required && !mappings[field]
                ).length}
              </Title>
              <Text type="secondary">Missing Required</Text>
            </div>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <div>
      <Title level={4}>
        <InfoCircleOutlined /> Field Mapping Builder
      </Title>
      
      {renderDetectedFields()}
      {renderCurrentMappings()}
      {renderManualMapping()}
      {renderSummary()}
    </div>
  );
};

export default FieldMappingBuilder; 