import React, { useState, useCallback, useMemo } from 'react';
import { Upload, Button, Alert, Collapse, Progress, Tag, Space, Typography, Tooltip } from 'antd';
import { 
  UploadOutlined, 
  FileTextOutlined, 
  SecurityScanOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useFileValidation } from '../hooks/useFileValidation';
import { useChunkedUpload } from '../hooks/useChunkedUpload';

const { Panel } = Collapse;
const { Text, Title } = Typography;

const FileUploadCard = ({ 
  file, 
  onFileChange, 
  onRemove, 
  isUploading, 
  validationErrors, 
  filePreview, 
  beforeUpload,
  onValidationComplete,
  maxFileSize = 100 * 1024 * 1024 // 100MB default
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const { validationState, isValidating, validateFile } = useFileValidation();
  const { uploadState, startUpload, abortUpload } = useChunkedUpload();

  const fileSize = useMemo(() => {
    if (!file) return null;
    const bytes = file.size;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  }, [file]);

  const handleFileSelect = useCallback(async (selectedFile) => {
    if (selectedFile) {
      // Validate file before setting
      const validation = await validateFile(selectedFile);
      if (validation.isValid) {
        onFileChange(selectedFile);
        onValidationComplete?.(validation);
      }
    }
  }, [validateFile, onFileChange, onValidationComplete]);

  const renderFileInfo = () => {
    if (!file) return null;

    return (
      <div style={{ 
        background: '#f8f9fa', 
        border: '1px solid #e9ecef', 
        borderRadius: 8, 
        padding: 16, 
        marginTop: 12 
      }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileTextOutlined style={{ fontSize: 20, color: '#1890ff' }} />
              <div>
                <Text strong>{file.name}</Text>
                <br />
                <Text type="secondary">{fileSize}</Text>
              </div>
            </div>
            <Space>
              {validationState.isValid && (
                <Tag icon={<CheckCircleOutlined />} color="success">
                  Validated
                </Tag>
              )}
              {validationState.securityStatus?.hasThreats && (
                <Tag icon={<ExclamationCircleOutlined />} color="error">
                  Security Issue
                </Tag>
              )}
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => setShowPreview(!showPreview)}
                size="small"
              >
                {showPreview ? 'Hide' : 'Preview'}
              </Button>
            </Space>
          </div>

          {showPreview && (
            <Collapse ghost size="small">
              <Panel header="File Preview" key="preview">
                <div style={{ 
                  background: '#fff', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: 4, 
                  padding: 12,
                  maxHeight: 300,
                  overflow: 'auto'
                }}>
                  <pre style={{ margin: 0, fontSize: 12 }}>
                    {typeof filePreview === 'string' 
                      ? filePreview 
                      : JSON.stringify(filePreview, null, 2)
                    }
                  </pre>
                </div>
              </Panel>
              
              {validationState.fileInfo && (
                <Panel header="File Analysis" key="analysis">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text strong>Type:</Text> {validationState.fileInfo.type}
                    </div>
                    <div>
                      <Text strong>Records:</Text> {validationState.fileInfo.recordCount}
                    </div>
                    <div>
                      <Text strong>Fields:</Text> {validationState.fileInfo.fields?.length || 0}
                    </div>
                    {validationState.dataQuality && (
                      <div>
                        <Text strong>Data Quality Score:</Text> {validationState.dataQuality.qualityScore}%
                      </div>
                    )}
                  </Space>
                </Panel>
              )}
            </Collapse>
          )}
        </Space>
      </div>
    );
  };

  const renderValidationResults = () => {
    if (!validationState.errors.length && !validationState.warnings.length) return null;

    return (
      <div style={{ marginTop: 12 }}>
        {validationState.errors.length > 0 && (
          <Alert
            type="error"
            message="Validation Errors"
            description={
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {validationState.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            }
            showIcon
            style={{ marginBottom: validationState.warnings.length > 0 ? 8 : 0 }}
          />
        )}
        
        {validationState.warnings.length > 0 && (
          <Alert
            type="warning"
            message="Validation Warnings"
            description={
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {validationState.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            }
            showIcon
          />
        )}
      </div>
    );
  };

  const renderSecurityStatus = () => {
    if (!validationState.securityStatus) return null;

    const { securityStatus } = validationState;
    
    return (
      <div style={{ marginTop: 8 }}>
        <Space>
          <SecurityScanOutlined 
            style={{ 
              color: securityStatus.hasThreats ? '#ff4d4f' : '#52c41a',
              fontSize: 16 
            }} 
          />
          <Text type={securityStatus.hasThreats ? 'danger' : 'success'}>
            {securityStatus.hasThreats ? 'Security threats detected' : 'Security scan passed'}
          </Text>
        </Space>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ 
        border: '2px dashed #d9d9d9', 
        borderRadius: 8, 
        padding: 24, 
        textAlign: 'center',
        background: '#fafafa',
        transition: 'all 0.3s ease'
      }}>
        <Upload.Dragger
          beforeUpload={(file) => {
            handleFileSelect(file);
            return false; // Prevent default upload
          }}
          fileList={file ? [file] : []}
          onRemove={onRemove}
          accept=".json,.csv,.xlsx,.xls,.xml,.txt,.pdf"
          maxCount={1}
          disabled={isUploading || isValidating}
          style={{ 
            width: '100%',
            border: 'none',
            background: 'transparent'
          }}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <Title level={4} style={{ margin: '16px 0 8px 0' }}>
            {isValidating ? 'Analyzing File...' : 'Upload Credit Data File'}
          </Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            {isValidating 
              ? 'Validating file format, security, and data quality...'
              : 'Drag and drop your file here, or click to browse'
            }
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 14 }}>
            Supports JSON, CSV, Excel, XML, TXT, PDF (up to {Math.round(maxFileSize / (1024 * 1024))}MB)
          </Text>
        </Upload.Dragger>

        {isValidating && (
          <div style={{ marginTop: 16 }}>
            <Progress 
              percent={uploadProgress} 
              status="active" 
              strokeColor="#1890ff"
              showInfo={false}
            />
            <Text type="secondary">Validating file...</Text>
          </div>
        )}
      </div>

      {file && renderFileInfo()}
      {renderSecurityStatus()}
      {renderValidationResults()}
      
      {validationErrors && validationErrors.length > 0 && (
        <Alert
          type="error"
          message="Upload Errors"
          description={
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {validationErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          }
          style={{ marginTop: 12 }}
          showIcon
        />
      )}

      {/* Download Error Report Button */}
      {validationState.errors.length > 0 && (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <Button
            type="dashed"
            icon={<DownloadOutlined />}
            onClick={() => {
              const report = {
                fileName: file?.name,
                timestamp: new Date().toISOString(),
                errors: validationState.errors,
                warnings: validationState.warnings,
                securityStatus: validationState.securityStatus,
                dataQuality: validationState.dataQuality
              };
              
              const blob = new Blob([JSON.stringify(report, null, 2)], { 
                type: 'application/json' 
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `validation-report-${file?.name || 'unknown'}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            Download Error Report
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileUploadCard; 