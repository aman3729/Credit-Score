import { useState, useCallback } from 'react';
import { message } from 'antd';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const SUPPORTED_FORMATS = {
  'application/json': ['.json'],
  'text/csv': ['.csv'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/xml': ['.xml'],
  'text/xml': ['.xml'],
  'text/plain': ['.txt'],
  'application/pdf': ['.pdf']
};

export const useFileValidation = () => {
  const [validationState, setValidationState] = useState({
    isValid: false,
    errors: [],
    warnings: [],
    fileInfo: null,
    dataQuality: null,
    securityStatus: null
  });

  const [isValidating, setIsValidating] = useState(false);

  const validateFile = useCallback(async (file) => {
    setIsValidating(true);
    setValidationState({
      isValid: false,
      errors: [],
      warnings: [],
      fileInfo: null,
      dataQuality: null,
      securityStatus: null
    });

    const errors = [];
    const warnings = [];
    let fileInfo = null;
    let dataQuality = null;
    let securityStatus = null;

    try {
      // 1. Basic file validation
      const basicValidation = await validateBasicFile(file);
      errors.push(...basicValidation.errors);
      warnings.push(...basicValidation.warnings);

      if (basicValidation.errors.length === 0) {
        // 2. Security validation
        securityStatus = await validateSecurity(file);
        if (securityStatus.hasThreats) {
          errors.push('Security threat detected in file');
        }

        // 3. Content validation
        const contentValidation = await validateContent(file);
        errors.push(...contentValidation.errors);
        warnings.push(...contentValidation.warnings);
        fileInfo = contentValidation.fileInfo;

        // 4. Data quality analysis
        if (contentValidation.fileInfo) {
          dataQuality = await analyzeDataQuality(file, contentValidation.fileInfo);
          warnings.push(...dataQuality.warnings);
        }
      }

      const isValid = errors.length === 0;

      setValidationState({
        isValid,
        errors,
        warnings,
        fileInfo,
        dataQuality,
        securityStatus
      });

      if (isValid) {
        message.success('File validation passed');
      } else {
        message.error(`File validation failed: ${errors.length} errors found`);
      }

      return { isValid, errors, warnings, fileInfo, dataQuality, securityStatus };

    } catch (error) {
      console.error('File validation error:', error);
      const errorMessage = 'File validation failed due to an unexpected error';
      setValidationState({
        isValid: false,
        errors: [errorMessage],
        warnings: [],
        fileInfo: null,
        dataQuality: null,
        securityStatus: null
      });
      message.error(errorMessage);
      return { isValid: false, errors: [errorMessage], warnings: [] };
    } finally {
      setIsValidating(false);
    }
  }, []);

  const validateBasicFile = useCallback(async (file) => {
    const errors = [];
    const warnings = [];

    // File size validation
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File size (${formatFileSize(file.size)}) exceeds maximum limit of ${formatFileSize(MAX_FILE_SIZE)}`);
    } else if (file.size > 50 * 1024 * 1024) { // 50MB
      warnings.push('Large file detected. Upload may take longer than usual.');
    }

    // File type validation
    const isValidType = Object.entries(SUPPORTED_FORMATS).some(([mimeType, extensions]) => {
      return file.type === mimeType || extensions.some(ext => file.name.toLowerCase().endsWith(ext));
    });

    if (!isValidType) {
      errors.push('Unsupported file format. Please upload JSON, CSV, Excel, XML, TXT, or PDF files.');
    }

    // File name validation
    if (file.name.length > 255) {
      errors.push('File name is too long (maximum 255 characters)');
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      warnings.push('File name contains special characters. Consider using only letters, numbers, dots, underscores, and hyphens.');
    }

    return { errors, warnings };
  }, []);

  const validateSecurity = useCallback(async (file) => {
    try {
      // Check file signature (magic numbers)
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      
      const signatures = {
        // JSON
        json: [0x7B, 0x22], // {" or {"
        // CSV
        csv: [0xEF, 0xBB, 0xBF], // UTF-8 BOM
        // Excel
        xlsx: [0x50, 0x4B, 0x03, 0x04], // ZIP signature
        xls: [0xD0, 0xCF, 0x11, 0xE0], // OLE signature
        // PDF
        pdf: [0x25, 0x50, 0x44, 0x46] // %PDF
      };

      let detectedFormat = null;
      for (const [format, sig] of Object.entries(signatures)) {
        if (uint8Array.length >= sig.length && 
            sig.every((byte, index) => uint8Array[index] === byte)) {
          detectedFormat = format;
          break;
        }
      }

      // Check for executable content
      const executableSignatures = [
        [0x4D, 0x5A], // MZ (Windows executable)
        [0x7F, 0x45, 0x4C, 0x46], // ELF (Linux executable)
        [0xFE, 0xED, 0xFA, 0xCE] // Mach-O (macOS executable)
      ];

      const hasExecutableContent = executableSignatures.some(sig =>
        uint8Array.length >= sig.length && 
        sig.every((byte, index) => uint8Array[index] === byte)
      );

      if (hasExecutableContent) {
        return { hasThreats: true, threats: ['Executable content detected'] };
      }

      // Check for suspicious patterns
      const content = new TextDecoder().decode(uint8Array.slice(0, 1000));
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /on\w+\s*=/i,
        /eval\s*\(/i,
        /document\./i
      ];

      const suspiciousMatches = suspiciousPatterns.filter(pattern => pattern.test(content));
      if (suspiciousMatches.length > 0) {
        return { 
          hasThreats: true, 
          threats: [`Suspicious content detected: ${suspiciousMatches.join(', ')}`] 
        };
      }

      return { hasThreats: false, detectedFormat };

    } catch (error) {
      console.error('Security validation error:', error);
      return { hasThreats: false, error: 'Security validation failed' };
    }
  }, []);

  const validateContent = useCallback(async (file) => {
    const errors = [];
    const warnings = [];
    let fileInfo = null;

    try {
      const content = await file.text();
      
      if (file.name.endsWith('.json')) {
        try {
          const jsonData = JSON.parse(content);
          fileInfo = {
            type: 'json',
            recordCount: Array.isArray(jsonData) ? jsonData.length : 1,
            fields: Array.isArray(jsonData) && jsonData.length > 0 ? Object.keys(jsonData[0]) : [],
            sampleData: Array.isArray(jsonData) ? jsonData.slice(0, 3) : [jsonData]
          };
        } catch (parseError) {
          errors.push('Invalid JSON format');
        }
      } else if (file.name.endsWith('.csv')) {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          errors.push('CSV file must contain at least a header row and one data row');
        } else {
          const headers = lines[0].split(',').map(h => h.trim());
          const dataRows = lines.slice(1).filter(row => row.trim());
          
          fileInfo = {
            type: 'csv',
            recordCount: dataRows.length,
            fields: headers,
            sampleData: dataRows.slice(0, 3).map(row => {
              const values = row.split(',');
              const obj = {};
              headers.forEach((header, index) => {
                obj[header] = values[index] || '';
              });
              return obj;
            })
          };

          // Check for consistent column count
          const inconsistentRows = dataRows.filter(row => 
            row.split(',').length !== headers.length
          );
          if (inconsistentRows.length > 0) {
            warnings.push(`${inconsistentRows.length} rows have inconsistent column counts`);
          }
        }
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // For Excel files, we'll need to use a library like SheetJS
        // For now, we'll provide basic info
        fileInfo = {
          type: 'excel',
          recordCount: 'Unknown (requires Excel parsing library)',
          fields: [],
          sampleData: []
        };
        warnings.push('Excel file validation requires additional processing');
      } else if (file.name.endsWith('.xml')) {
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, 'text/xml');
          const parseError = xmlDoc.getElementsByTagName('parsererror');
          
          if (parseError.length > 0) {
            errors.push('Invalid XML format');
          } else {
            fileInfo = {
              type: 'xml',
              recordCount: 'Unknown (XML structure analysis required)',
              fields: [],
              sampleData: []
            };
          }
        } catch (parseError) {
          errors.push('Invalid XML format');
        }
      } else if (file.name.endsWith('.pdf')) {
        fileInfo = {
          type: 'pdf',
          recordCount: 'Unknown (PDF text extraction required)',
          fields: [],
          sampleData: []
        };
        warnings.push('PDF content validation requires text extraction');
      }

      // Check for empty or very small files
      if (content.length < 100) {
        warnings.push('File appears to be very small or empty');
      }

      // Check for encoding issues
      if (content.includes('') || content.includes('')) {
        warnings.push('File may have encoding issues');
      }

    } catch (error) {
      console.error('Content validation error:', error);
      errors.push('Failed to read file content');
    }

    return { errors, warnings, fileInfo };
  }, []);

  const analyzeDataQuality = useCallback(async (file, fileInfo) => {
    const warnings = [];
    let qualityScore = 100;

    try {
      if (fileInfo.sampleData && fileInfo.sampleData.length > 0) {
        const sample = fileInfo.sampleData[0];
        
        // Check for missing values
        const missingValues = Object.values(sample).filter(value => 
          value === null || value === undefined || value === '' || value === 'null'
        ).length;
        
        const missingPercentage = (missingValues / Object.keys(sample).length) * 100;
        if (missingPercentage > 20) {
          warnings.push(`High percentage of missing values (${Math.round(missingPercentage)}%)`);
          qualityScore -= 20;
        }

        // Check for data type consistency
        const typeInconsistencies = [];
        Object.entries(sample).forEach(([key, value]) => {
          if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
            typeInconsistencies.push(key);
          }
        });
        
        if (typeInconsistencies.length > 0) {
          warnings.push(`Potential data type inconsistencies in fields: ${typeInconsistencies.join(', ')}`);
          qualityScore -= 10;
        }

        // Check for duplicate records
        const uniqueRecords = new Set(fileInfo.sampleData.map(JSON.stringify));
        if (uniqueRecords.size < fileInfo.sampleData.length) {
          warnings.push('Duplicate records detected in sample data');
          qualityScore -= 15;
        }
      }

      return { warnings, qualityScore: Math.max(0, qualityScore) };

    } catch (error) {
      console.error('Data quality analysis error:', error);
      return { warnings: ['Data quality analysis failed'], qualityScore: 50 };
    }
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return {
    validationState,
    isValidating,
    validateFile,
    resetValidation: () => {
      setValidationState({
        isValid: false,
        errors: [],
        warnings: [],
        fileInfo: null,
        dataQuality: null,
        securityStatus: null
      });
    }
  };
}; 