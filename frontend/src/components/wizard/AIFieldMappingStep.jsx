import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Select, 
  Button, 
  Alert, 
  Progress, 
  Tag, 
  Space, 
  Typography, 
  Divider,
  Tooltip,
  Switch,
  Row,
  Col,
  List,
  Badge
} from 'antd';
import { 
  RobotOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SyncOutlined,
  BulbOutlined,
  SettingOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useUploadWizard, WIZARD_STEPS } from '../../contexts/UploadWizardContext';
import { useAIMapping } from '../../hooks/useAIMapping';

const { Option } = Select;
const { Text, Title, Paragraph } = Typography;

const AIFieldMappingStep = () => {
  const { wizardData, updateWizardData, setStepValidation } = useUploadWizard();
  const { 
    isAnalyzing, 
    suggestions, 
    confidence, 
    analyzeHeaders, 
    applySuggestions, 
    improveSuggestions 
  } = useAIMapping();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoApply, setAutoApply] = useState(true);
  const [mappingMode, setMappingMode] = useState('ai'); // 'ai' | 'manual' | 'hybrid'

  // Available fields (this would come from your system)
  const availableFields = {
    phoneNumber: { description: 'User phone number', required: true, type: 'string' },
    monthlyIncome: { description: 'Monthly income (ETB)', required: true, type: 'number' },
    monthlyDebtPayments: { description: 'Monthly debt payments (ETB)', required: true, type: 'number' },
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
    // Additional fields that were detected but missing from available fields
    loanTypeCounts: { description: 'Loan type counts', required: false, type: 'number' },
    employmentStatus: { description: 'Employment status', required: false, type: 'string' },
    collateralValue: { description: 'Collateral value', required: false, type: 'number' },
    notes: { description: 'Additional notes', required: false, type: 'string' }
  };

  // Get detected fields from file validation
  const detectedFields = wizardData.fileValidation?.fileInfo?.fields || [];

  // Normalize fieldMappings to an array of { targetField, sourceField, transformation? }
  const getFieldMappingsArray = useCallback(() => {
    const fm = wizardData.fieldMappings;
    if (Array.isArray(fm)) return fm;
    if (fm && typeof fm === 'object') {
      return Object.entries(fm).map(([targetField, val]) => (
        typeof val === 'string' 
          ? { targetField, sourceField: val }
          : { targetField, ...val }
      ));
    }
    return [];
  }, [wizardData.fieldMappings]);

  const setFieldMappingsArray = useCallback((arr) => {
    updateWizardData({ fieldMappings: arr });
  }, [updateWizardData]);

  // Build a quick lookup of current mappings by targetField
  const getMappingsDict = useCallback(() => {
    const dict = {};
    for (const m of getFieldMappingsArray()) {
      if (m?.targetField && m?.sourceField) dict[m.targetField] = m;
    }
    return dict;
  }, [getFieldMappingsArray]);

  const areRequiredFieldsMapped = useCallback((dict) => {
    const requiredTargets = Object.entries(availableFields)
      .filter(([_, cfg]) => cfg.required)
      .map(([key]) => key);
    return requiredTargets.every(t => !!dict[t]);
  }, [availableFields]);

  // Handler: apply a single mapping
  const handleManualMapping = useCallback((targetField, sourceField, transformation = null) => {
    const current = getMappingsDict();
    current[targetField] = { targetField, sourceField, transformation };
    const nextArray = Object.values(current);
    setFieldMappingsArray(nextArray);
    setStepValidation(WIZARD_STEPS.MAPPING_SETUP, areRequiredFieldsMapped(current));
  }, [getMappingsDict, setFieldMappingsArray, setStepValidation, areRequiredFieldsMapped]);

  // Handler: Apply All AI suggestions
  const handleApplyAISuggestions = useCallback(() => {
    if (!suggestions || suggestions.length === 0) return;
    // Prefer highest confidence per targetField
    const bestByTarget = {};
    for (const s of suggestions) {
      if (!availableFields[s.targetField]) continue; // skip unknown targets
      const existing = bestByTarget[s.targetField];
      if (!existing || (typeof s.confidence === 'number' && s.confidence > (existing.confidence ?? 0))) {
        bestByTarget[s.targetField] = s;
      }
    }
    // Merge with existing mappings
    const merged = { ...getMappingsDict() };
    for (const [targetField, s] of Object.entries(bestByTarget)) {
      merged[targetField] = {
        targetField,
        sourceField: s.sourceField,
        transformation: s.transformation ?? null
      };
    }
    const nextArray = Object.values(merged);
    setFieldMappingsArray(nextArray);
    setStepValidation(WIZARD_STEPS.MAPPING_SETUP, areRequiredFieldsMapped(merged));
  }, [suggestions, getMappingsDict, setFieldMappingsArray, setStepValidation, areRequiredFieldsMapped, availableFields]);

  // Handler: Improve suggestions (delegates to hook)
  const handleImproveSuggestions = useCallback(() => {
    if (typeof improveSuggestions === 'function') {
      improveSuggestions(detectedFields, availableFields);
    } else if (typeof analyzeHeaders === 'function') {
      analyzeHeaders(detectedFields, availableFields);
    }
  }, [improveSuggestions, analyzeHeaders, detectedFields, availableFields]);

  useEffect(() => {
    if (detectedFields.length > 0 && mappingMode === 'ai') {
      analyzeHeaders(detectedFields, availableFields);
    }
  }, [detectedFields, mappingMode, analyzeHeaders]);

  useEffect(() => {
    if (!isAnalyzing && autoApply && suggestions.length > 0) {
      // Apply suggestions automatically using our normalized handler
      handleApplyAISuggestions();
    }
  }, [isAnalyzing, autoApply, suggestions, handleApplyAISuggestions]);

  // Simple similarity calculation
  const calculateSimilarity = useCallback((str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }, []);

  // Levenshtein distance calculation
  const levenshteinDistance = useCallback((str1, str2) => {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[len1][len2];
  }, []);

  // Inline function for useEffect to avoid dependency issues
  const generateBasicSuggestionsInline = (headers, availableFields) => {
    const suggestions = [];
    const targetFields = Object.keys(availableFields);

    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Find best matches using fuzzy matching
      let bestMatch = null;
      let bestScore = 0;

      targetFields.forEach(targetField => {
        const normalizedTarget = targetField.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Calculate similarity score
        const score = calculateSimilarity(normalizedHeader, normalizedTarget);
        
        if (score > bestScore && score > 0.3) { // Lower threshold to 30% similarity
          bestScore = score;
          bestMatch = targetField;
        }
      });

      if (bestMatch) {
        suggestions.push({
          sourceField: header,
          targetField: bestMatch,
          confidence: bestScore,
          transformation: null
        });
      }
    });

    return suggestions;
  };

  // Basic suggestion generation function
  const generateBasicSuggestions = useCallback((headers, availableFields) => {
    const suggestions = [];
    const targetFields = Object.keys(availableFields);

    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Find best matches using fuzzy matching
      let bestMatch = null;
      let bestScore = 0;

      targetFields.forEach(targetField => {
        const normalizedTarget = targetField.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Calculate similarity score
        const score = calculateSimilarity(normalizedHeader, normalizedTarget);
        
        if (score > bestScore && score > 0.3) { // Lower threshold to 30% similarity
          bestScore = score;
          bestMatch = targetField;
        }
      });

      if (bestMatch) {
        suggestions.push({
          sourceField: header,
          targetField: bestMatch,
          confidence: bestScore,
          transformation: null
        });
      }
    });

    return suggestions;
  }, []);

  const handleAIAnalysis = useCallback(async () => {
    if (detectedFields.length === 0) return;

    try {
      const aiSuggestions = await analyzeHeaders(detectedFields, availableFields);
      
      if (autoApply && aiSuggestions.length > 0) {
        const mappings = applySuggestions(aiSuggestions);
        updateWizardData({ 
          fieldMappings: mappings,
          aiSuggestions: aiSuggestions
        });
      } else {
        updateWizardData({ aiSuggestions: aiSuggestions });
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      // Fallback to basic suggestions even if AI fails
      const basicSuggestions = generateBasicSuggestionsInline(detectedFields, availableFields);
      updateWizardData({ aiSuggestions: basicSuggestions });
    }
  }, [detectedFields, availableFields, analyzeHeaders, applySuggestions, autoApply, updateWizardData]);

  useEffect(() => {
    // Validate step completion
    const isValid = areRequiredFieldsMapped(getMappingsDict());
    setStepValidation(WIZARD_STEPS.MAPPING_SETUP, isValid);
  }, [wizardData.fieldMappings, setStepValidation, areRequiredFieldsMapped, getMappingsDict]);

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const renderAISuggestions = () => {
    if (suggestions.length === 0) return null;

    return (
      <Card 
        title={
          <Space>
            <RobotOutlined style={{ color: '#1890ff' }} />
            <span>AI Suggestions</span>
            <Badge count={suggestions.length} style={{ backgroundColor: '#52c41a' }} />
          </Space>
        }
        style={{ marginBottom: 16 }}
        extra={
          <Space>
            <Text type="secondary">Confidence: {Math.round(confidence * 100)}%</Text>
            <Button 
              type="primary" 
              size="small" 
              onClick={handleApplyAISuggestions}
              disabled={suggestions.length === 0}
            >
              Apply All
            </Button>
            <Button 
              size="small" 
              icon={<SyncOutlined />}
              onClick={handleImproveSuggestions}
            >
              Improve
            </Button>
          </Space>
        }
      >
        <div 
          className="field-mapping-container"
          style={{ 
            maxHeight: '300px', 
            overflowY: 'auto',
            paddingRight: 8
          }}
        >
          <List
            size="small"
            dataSource={suggestions}
            renderItem={(suggestion) => (
              <List.Item
                actions={[
                  <Button 
                    type="link" 
                    size="small"
                    onClick={() => handleManualMapping(suggestion.targetField, suggestion.sourceField)}
                  >
                    Apply
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{suggestion.sourceField}</Text>
                      <Text type="secondary">→</Text>
                      <Text strong>{suggestion.targetField}</Text>
                      <Tag color={getConfidenceColor(suggestion.confidence)}>
                        {Math.round(suggestion.confidence * 100)}%
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small">
                      <Text type="secondary">
                        {availableFields[suggestion.targetField]?.description}
                      </Text>
                      {suggestion.transformation && (
                        <Tag size="small" color="blue">
                          Transform: {suggestion.transformation}
                        </Tag>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      </Card>
    );
  };

  const renderManualMapping = () => {
    // Get unmapped detected fields
    const mappedSourceFields = getFieldMappingsArray().map(m => m.sourceField);
    const unmappedDetectedFields = detectedFields.filter(field => !mappedSourceFields.includes(field));
    
    return (
      <Card 
        title={
          <Space>
            <span>Manual Field Mapping</span>
            <Tag color="blue">{detectedFields.length} detected fields</Tag>
            <Tag color="green">{getFieldMappingsArray().length} mapped</Tag>

            {unmappedDetectedFields.length > 0 && (
              <Tag color="orange">{unmappedDetectedFields.length} unmapped</Tag>
            )}
          </Space>
        } 
        style={{ marginBottom: 16 }}
      >
        {/* Show detected fields summary */}
        {detectedFields.length > 0 && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f6ffed', borderRadius: 6 }}>
            <Text strong>Detected Fields:</Text>
            <div style={{ marginTop: 8 }}>
              {detectedFields.map((field, index) => {
                const isMapped = mappedSourceFields.includes(field);
                return (
                  <Tag 
                    key={index} 
                    style={{ margin: 2 }}
                    color={isMapped ? 'green' : 'orange'}
                  >
                    {field} {isMapped ? '✓' : '!'}
                  </Tag>
                );
              })}
            </div>
          </div>
        )}
        
        <div 
          className="field-mapping-container"
          style={{ 
            maxHeight: '400px', 
            overflowY: 'auto',
            paddingRight: 8
          }}
        >
          <Row gutter={[16, 16]}>
            {/* Standard available fields */}
            {Object.entries(availableFields).map(([targetField, fieldMeta]) => {
              const currentMapping = getMappingsDict()[targetField];
              
              return (
                <Col xs={24} sm={12} lg={8} key={targetField}>
                  <div style={{ 
                    border: '1px solid #d9d9d9', 
                    borderRadius: 6, 
                    padding: 12,
                    background: currentMapping ? '#f6ffed' : fieldMeta.required ? '#fff2e8' : '#fff',
                    height: '100%'
                  }}>
                    <div style={{ marginBottom: 8 }}>
                      <Text strong>{targetField}</Text>
                      {fieldMeta.required && <Text type="danger"> *</Text>}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {fieldMeta.description}
                    </Text>
                    
                    <div style={{ marginTop: 8 }}>
                      <Select
                        placeholder="Select source field"
                        value={(getMappingsDict()[targetField]?.sourceField) || undefined}

                        onChange={(value) => handleManualMapping(targetField, value)}
                        style={{ width: '100%' }}
                        allowClear
                      >
                        {detectedFields.map(field => (
                          <Option key={field} value={field}>{field}</Option>
                        ))}
                      </Select>
                    </div>
                    
                    {currentMapping && (
                      <div style={{ marginTop: 8 }}>
                        <Space>
                          <Tag color="green" size="small">Mapped</Tag>
                          {currentMapping.manual && (
                            <Tag color="blue" size="small">Manual</Tag>
                          )}
                          <Button 
                            type="text" 
                            size="small" 
                            danger
                            onClick={() => {
                              const dict = getMappingsDict();
                              delete dict[targetField];
                              const nextArray = Object.values(dict);
                              setFieldMappingsArray(nextArray);
                              setStepValidation(WIZARD_STEPS.MAPPING_SETUP, areRequiredFieldsMapped(dict));
                            }}
                          >
                            Remove
                          </Button>
                        </Space>
                      </div>
                    )}
                  </div>
                </Col>
              );
            })}
            
            {/* Custom fields */}
            {Object.entries(wizardData.fieldMappings)
              .filter(([field, mapping]) => mapping.custom)
              .map(([targetField, mapping]) => (
                <Col xs={24} sm={12} lg={8} key={targetField}>
                  <div style={{ 
                    border: '1px solid #fa8c16', 
                    borderRadius: 6, 
                    padding: 12,
                    background: '#fff7e6',
                    height: '100%'
                  }}>
                    <div style={{ marginBottom: 8 }}>
                      <Text strong>{targetField.replace('custom_', '')}</Text>
                      <Tag color="orange" size="small" style={{ marginLeft: 8 }}>Custom</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Custom field mapping
                    </Text>
                    
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Source: <Text code>{mapping.sourceField}</Text>
                      </Text>
                    </div>
                    
                    <div style={{ marginTop: 8 }}>
                      <Space>
                        <Tag color="green" size="small">Mapped</Tag>
                        <Tag color="orange" size="small">Custom</Tag>
                        <Button 
                          type="text" 
                          size="small" 
                          danger
                          onClick={() => {
                            const dict = getMappingsDict();
                            delete dict[targetField];
                            const nextArray = Object.values(dict);
                            setFieldMappingsArray(nextArray);
                            setStepValidation(WIZARD_STEPS.MAPPING_SETUP, areRequiredFieldsMapped(dict));
                          }}
                        >
                          Remove
                        </Button>
                      </Space>
                    </div>
                  </div>
                </Col>
              ))}
          </Row>
        </div>
        
        {/* Show unmapped detected fields */}
        {unmappedDetectedFields.length > 0 && (
          <Card 
            title={
              <Space>
                <span>Unmapped Detected Fields</span>
                <Tag color="orange">{unmappedDetectedFields.length} fields</Tag>
              </Space>
            }
            style={{ marginTop: 16 }}
          >
            <div style={{ padding: 12, background: '#fff7e6', borderRadius: 6 }}>
              <Text type="secondary">
                The following fields were detected in your file but are not mapped to any target field. 
                You can either map them to available fields above or they will be ignored during processing.
              </Text>
              <div style={{ marginTop: 12 }}>
                {unmappedDetectedFields.map((field, index) => (
                  <Tag key={index} color="orange" style={{ margin: 2 }}>
                    {field}
                  </Tag>
                ))}
              </div>
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Button 
                  type="dashed" 
                  size="small"
                  onClick={() => {
                    // Create custom mappings for unmapped fields
                    const customMappings = {};
                    unmappedDetectedFields.forEach(field => {
                      customMappings[`custom_${field}`] = {
                        sourceField: field,
                        transformation: null,
                        confidence: 1.0,
                        manual: true,
                        custom: true
                      };
                    });
                    updateWizardData({ 
                      fieldMappings: { ...wizardData.fieldMappings, ...customMappings }
                    });
                  }}
                >
                  Create Custom Mappings for All Unmapped Fields
                </Button>
              </div>
            </div>
          </Card>
        )}
      </Card>
    );
  };

  const renderMappingSummary = () => {
    const dict = getMappingsDict();
    const mappedCount = Object.keys(dict).length;
    const totalRequired = Object.values(availableFields).filter(f => f.required).length;
    const mappedRequired = Object.keys(dict).filter(field => availableFields[field]?.required).length;
    const mappedSourceFields = Object.values(dict).map(m => m.sourceField);
    const unmappedDetectedFields = detectedFields.filter(field => !mappedSourceFields.includes(field));

    const completionPercentage = Math.round((mappedCount / Object.keys(availableFields).length) * 100);

    return (
      <Card title="Mapping Summary" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                {mappedCount}
              </Title>
              <Text type="secondary">Fields Mapped</Text>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: mappedRequired === totalRequired ? '#52c41a' : '#faad14' }}>
                {mappedRequired}/{totalRequired}
              </Title>
              <Text type="secondary">Required Fields</Text>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                {completionPercentage}%
              </Title>
              <Text type="secondary">Completion</Text>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ margin: 0, color: unmappedDetectedFields.length > 0 ? '#fa8c16' : '#52c41a' }}>
                {unmappedDetectedFields.length}
              </Title>
              <Text type="secondary">Unmapped</Text>
            </div>
          </Col>
        </Row>
        
        {/* Progress bar */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text>Mapping Progress</Text>
            <Text type="secondary">{completionPercentage}%</Text>
          </div>
          <Progress 
            percent={completionPercentage} 
            status={completionPercentage === 100 ? 'success' : 'active'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
        </div>
        
        {/* Status indicators */}
        <div style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Space direction="vertical" size="small">
                <div>
                  <Tag color="green">✓</Tag>
                  <Text>All required fields mapped</Text>
                </div>
                <div>
                  <Tag color={unmappedDetectedFields.length > 0 ? 'orange' : 'green'}>
                    {unmappedDetectedFields.length > 0 ? '!' : '✓'}
                  </Tag>
                  <Text>All detected fields handled</Text>
                </div>
              </Space>
            </Col>
            <Col span={12}>
              <Space direction="vertical" size="small">
                <div>
                  <Tag color={mappedCount > 0 ? 'blue' : 'default'}>
                    {mappedCount > 0 ? '✓' : '-'}
                  </Tag>
                  <Text>Field mappings configured</Text>
                </div>
                <div>
                  <Tag color={completionPercentage >= 80 ? 'green' : 'orange'}>
                    {completionPercentage >= 80 ? '✓' : '!'}
                  </Tag>
                  <Text>Ready for processing</Text>
                </div>
              </Space>
            </Col>
          </Row>
        </div>
        
        {mappedRequired < totalRequired && (
          <Alert
            type="warning"
            message="Required fields missing"
            description={`${totalRequired - mappedRequired} required fields still need to be mapped.`}
            style={{ marginTop: 16 }}
            showIcon
          />
        )}
        
        {unmappedDetectedFields.length > 0 && (
          <Alert
            type="info"
            message="Unmapped detected fields"
            description={`${unmappedDetectedFields.length} fields from your file are not mapped. They will be ignored during processing.`}
            style={{ marginTop: 16 }}
            showIcon
          />
        )}
        
        {/* Debug Information */}
        <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
          <Text strong>Debug Information</Text>
          <div style={{ marginTop: 8, fontSize: 12, fontFamily: 'monospace' }}>
            <div>Detected Fields: {detectedFields.length}</div>
            <div>Available Fields: {Object.keys(availableFields).length}</div>
            <div>AI Suggestions: {wizardData.aiSuggestions?.length || 0}</div>
            <div>Current Mappings: {Object.keys(wizardData.fieldMappings).length}</div>
            <div>Mapping Mode: {mappingMode}</div>
            <div>Auto Apply: {autoApply ? 'Yes' : 'No'}</div>
            <div>Is Analyzing: {isAnalyzing ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div style={{ 
      minHeight: 'fit-content'
    }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3}>
          <BulbOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          Field Mapping
        </Title>
        <Paragraph>
          Map your data fields to our system. AI suggestions are available to help you quickly identify the correct mappings.
        </Paragraph>
        
        {/* Show selected mapping profile if available */}
        {wizardData.mappingProfile && (
          <Alert
            message={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>Using Mapping Profile: {wizardData.mappingProfile.name}</span>
              </Space>
            }
            description={
              <div>
                <Text type="secondary">
                  Partner: {wizardData.selectedPartner} | 
                  Fields Mapped: {Object.keys(wizardData.fieldMappings || {}).length}
                </Text>
              </div>
            }
            type="success"
            showIcon={false}
            style={{ marginTop: 16 }}
          />
        )}
        
        {/* Show new mapping creation mode */}
        {wizardData.createNewMapping === true && !wizardData.mappingProfile && (
          <Alert
            message={
              <Space>
                <PlusOutlined style={{ color: '#1890ff' }} />
                <span>Creating New Mapping Profile</span>
              </Space>
            }
            description={
              <div>
                <Text type="secondary">
                  Partner: {wizardData.selectedPartner} | 
                  You'll create a new mapping profile for this organization
                </Text>
              </div>
            }
            type="info"
            showIcon={false}
            style={{ marginTop: 16 }}
          />
        )}
      </div>

      {/* Content Container - No need for own scrolling since parent handles it */}
      <div style={{ 
        paddingRight: 8
      }}>
        {/* Mapping Mode Selection */}
        <Card style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>Mapping Mode</Text>
              <Switch
                checkedChildren="AI Assisted"
                unCheckedChildren="Manual Only"
                checked={mappingMode === 'ai'}
                onChange={(checked) => setMappingMode(checked ? 'ai' : 'manual')}
              />
            </div>
            
            {mappingMode === 'ai' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary">Auto-apply AI suggestions</Text>
                <Switch
                  checked={autoApply}
                  onChange={setAutoApply}
                  size="small"
                />
              </div>
            )}
          </Space>
        </Card>

        {/* AI Analysis Progress */}
        {isAnalyzing && (
          <Card style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SyncOutlined spin />
                <Text>AI is analyzing your data fields...</Text>
              </div>
              <Progress percent={75} status="active" showInfo={false} />
            </Space>
          </Card>
        )}

              {/* AI Suggestions */}
      {mappingMode === 'ai' && (
        <>
          {suggestions.length === 0 && detectedFields.length > 0 && !isAnalyzing && (
            <Card style={{ marginBottom: 16 }}>
              <div style={{ textAlign: 'center', padding: 16 }}>
                <Text type="secondary">No AI suggestions available</Text>
                <br />
                <Button 
                  type="primary" 
                  size="small" 
                  onClick={() => {
                    const basicSuggestions = generateBasicSuggestionsInline(detectedFields, availableFields);
                    updateWizardData({ aiSuggestions: basicSuggestions });
                  }}
                  style={{ marginTop: 8 }}
                >
                  Generate Basic Suggestions
                </Button>
              </div>
            </Card>
          )}
          {renderAISuggestions()}
        </>
      )}

        {/* Manual Mapping */}
        {renderManualMapping()}

        {/* Mapping Summary */}
        {renderMappingSummary()}

              {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <Card title="Debug Information" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontFamily: 'monospace' }}>
            <div><strong>Detected Fields:</strong> {detectedFields.length}</div>
            <div><strong>Available Fields:</strong> {Object.keys(availableFields).length}</div>
            <div><strong>AI Suggestions:</strong> {suggestions.length}</div>
            <div><strong>Current Mappings:</strong> {Object.keys(wizardData.fieldMappings).length}</div>
            <div><strong>Mapping Mode:</strong> {mappingMode}</div>
            <div><strong>Auto Apply:</strong> {autoApply ? 'Yes' : 'No'}</div>
            <div><strong>Is Analyzing:</strong> {isAnalyzing ? 'Yes' : 'No'}</div>
          </div>
        </Card>
      )}

      {/* Advanced Options */}
      <Card 
        title={
          <Space>
            <SettingOutlined />
            <span>Advanced Options</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
          <Button 
            type="text" 
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
          </Button>
          
          {showAdvanced && (
            <div style={{ marginTop: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>Advanced mapping options will be available here.</Text>
                <Text type="secondary">
                  Features like custom transformations, data validation rules, and field dependencies.
                </Text>
              </Space>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AIFieldMappingStep;