import React, { useState, useCallback } from 'react';
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
  Tooltip
} from 'antd';
import { 
  UploadOutlined, 
  FileDoneOutlined, 
  CloseCircleOutlined, 
  DownloadOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import api from '../utils/api';

const { Title, Text } = Typography;
const { confirm } = Modal;

const AdminBatchUpload = ({ onClose, onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [useAI, setUseAI] = useState(false);
  const [results, setResults] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [filePreview, setFilePreview] = useState(null);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [failedRecords, setFailedRecords] = useState([]);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const MAX_RETRY_ATTEMPTS = 3;

  const validateFile = (file) => {
    const errors = [];
    
    // Check file type
    const isJSON = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
    const isCSV = file.type === 'text/csv' || 
                 file.name.toLowerCase().endsWith('.csv') ||
                 file.type === 'application/vnd.ms-excel';
    
    if (!isJSON && !isCSV) {
      errors.push('Only JSON and CSV files are supported');
    }
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const beforeUpload = (file) => {
    if (!validateFile(file)) {
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
        } else {
          // For CSV, just show first few lines as text
          const lines = content.split('\n').slice(0, 6).join('\n');
          setFilePreview(lines);
        }
        setIsPreviewModalVisible(true);
      } catch (error) {
        console.error('Error previewing file:', error);
        message.error('Failed to preview file. Please check the file format.');
      }
    };
    
    reader.readAsText(file);
    
    setFile(file);
    setResults(null);
    setFailedRecords([]);
    setRetryAttempts(0);
    return false; // Prevent auto upload
  };

  const processFailedRecords = async (failedItems) => {
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
          
          const response = await api.post('/upload/batch', formData, {
            params: { aiEnabled: useAI, isRetry: true },
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          // Update results with retry data
          setResults(prev => ({
            ...prev,
            success: (prev.success || 0) + (response.data.success || 0),
            errors: (response.data.errors || 0) + (failedItems.length - (response.data.success || 0)),
            results: [
              ...(prev.results || []).filter(r => r.status !== 'failed'),
              ...(response.data.results || [])
            ]
          }));
          
          // If there are still failures after retry, show them
          const newFailures = (response.data.results || []).filter(r => r.status === 'failed');
          if (newFailures.length > 0) {
            setFailedRecords(newFailures);
          } else {
            message.success('All records processed successfully!');
          }
        } catch (error) {
          console.error('Retry failed:', error);
          message.error(`Retry failed: ${error.message}`);
        }
      },
      onCancel: () => {
        setFailedRecords(failedItems);
      },
    });
  };

  const handleUpload = async () => {
    if (!file) {
      message.warning('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Only validate JSON files
      const isJSONFile = file.name.toLowerCase().endsWith('.json') || 
                       file.type === 'application/json';
      
      if (isJSONFile) {
        const fileContent = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (error) => {
            console.error('Error reading file:', error);
            message.error('Failed to read file. Please try again.');
            reject(error);
          };
          reader.readAsText(file);
        });
        
        try {
          const data = JSON.parse(fileContent);
          if (!Array.isArray(data)) {
            throw new Error('File must contain an array of records');
          }
          
          // Simple validation for required fields
          const requiredFields = ['email', 'paymentHistory', 'creditUtilization', 'creditAge'];
          const invalidRecords = data.filter(record => 
            !requiredFields.every(field => record[field] !== undefined)
          );
          
          if (invalidRecords.length > 0) {
            throw new Error(`Found ${invalidRecords.length} records missing required fields`);
          }
          
          message.info(`Found ${data.length} valid records to process`);
          
        } catch (parseError) {
          console.error('Invalid data in file:', parseError);
          message.error(`Invalid data: ${parseError.message}`);
          return;
        }
      }
      
      setIsUploading(true);
      setProgress(0);
      setResults(null);
      setFailedRecords([]);
      
      // Show upload progress
      const uploadStartTime = Date.now();
      let lastProgressUpdate = 0;
      
      const response = await api.post('/upload/batch', formData, {
        params: { 
          aiEnabled: useAI,
          timestamp: uploadStartTime // For tracking
        },
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
          'X-Upload-Id': `upload-${Date.now()}`
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const now = Date.now();
            // Throttle progress updates to avoid too many re-renders
            if (now - lastProgressUpdate > 200 || progressEvent.loaded === progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setProgress(percentCompleted);
              lastProgressUpdate = now;
            }
          }
        },
        timeout: 300000, // 5 minutes timeout
      });
      
      const uploadTime = ((Date.now() - uploadStartTime) / 1000).toFixed(2);
      console.log(`Upload completed in ${uploadTime}s`, response.data);
      
      // Process response
      const { successCount, errorCount, totalRecords, uploadId } = response.data;
      const failedItems = []; // We don't have individual failed items in the current response
      
      // Update UI with results
      setResults({
        total: totalRecords,
        success: successCount,
        errors: errorCount,
        uploadId,
        uploadTime
      });
      
      if (errorCount === 0) {
        message.success(`Successfully processed ${successCount} records in ${uploadTime}s`);
      } else if (successCount > 0) {
        message.warning(
          `Processed ${successCount} records successfully, but ${errorCount} failed`,
          5 // Show for 5 seconds
        );
      } else {
        message.error('Failed to process any records. Please check the file format and try again.');
      }
      
      // Handle failed records with retry logic
      if (failedItems.length > 0) {
        await processFailedRecords(failedItems);
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
  };

  const renderFilePreview = () => {
    if (!filePreview) return null;
    
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
                          <p>Please upload a JSON or CSV file with the following format:</p>
                          <pre style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4 }}>
{`[
  {
    "email": "user@example.com",
    "paymentHistory": 0.95,
    "creditUtilization": 0.3,
    "creditAge": 5,
    "creditMix": 0.8,
    "inquiries": 2,
    "totalDebt": 5000,
    "totalCredit": 20000,
    "monthlyIncome": 5000,
    "recentMissedPayments": 0,
    "recentDefaults": 0,
    "lastActiveDate": "2023-01-01"
  },
  // ... more records
]`}
                          </pre>
                          <p style={{ marginTop: 16 }}>
                            <strong>Required Fields:</strong> email, paymentHistory, creditUtilization, creditAge
                          </p>
                          <p>
                            <strong>Optional Fields:</strong> creditMix, inquiries, totalDebt, totalCredit, 
                            monthlyIncome, recentMissedPayments, recentDefaults, lastActiveDate
                          </p>
                        </div>
                      ),
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
            accept=".json,.csv,application/json,text/csv"
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
              Support for a single JSON or CSV file
            </p>
          </Upload.Dragger>
        </div>
        
        <div style={{ margin: '16px 0' }}>
          <Space>
            <Switch 
              checked={useAI} 
              onChange={setUseAI} 
              checkedChildren="AI Scoring" 
              unCheckedChildren="Manual Scoring" 
            />
            <Text type="secondary">
              {useAI 
                ? 'Using AI-powered credit scoring' 
                : 'Using traditional scoring model'}
            </Text>
          </Space>
        </div>
        
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Button
            type="primary"
            onClick={handleUpload}
            disabled={!file || isUploading}
            loading={isUploading}
            icon={<UploadOutlined />}
          >
            {isUploading ? 'Processing...' : 'Start Batch Processing'}
          </Button>
          
          <Button
            type="default"
            icon={<DownloadOutlined />}
            onClick={() => {
              const template = [{
                email: 'user@example.com',
                paymentHistory: 0.95,
                creditUtilization: 0.3,
                creditAge: 5,
                creditMix: 0.8,
                inquiries: 2,
                totalDebt: 5000,
                totalCredit: 20000,
                monthlyIncome: 5000,
                recentMissedPayments: 0,
                recentDefaults: 0,
                lastActiveDate: '2023-01-01'
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
        
        {results && (
          <div style={{ marginTop: 16 }}>
            <Alert
              type={results.errors === 0 ? 'success' : results.success > 0 ? 'warning' : 'error'}
              message={
                <span>
                  Processed {results.total} records
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
                                    <strong>{item.email || `Record ${index + 1}`}</strong>
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
    </>
  );
};

export default AdminBatchUpload;