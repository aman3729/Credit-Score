// Web Worker for heavy file processing tasks
// This runs in a separate thread to avoid blocking the main UI

// Import required libraries (if using a bundler that supports it)
// import Papa from 'papaparse';
// import XLSX from 'xlsx';

// Worker message types
const MESSAGE_TYPES = {
  PROCESS_CSV: 'PROCESS_CSV',
  PROCESS_EXCEL: 'PROCESS_EXCEL',
  VALIDATE_DATA: 'VALIDATE_DATA',
  TRANSFORM_DATA: 'TRANSFORM_DATA',
  ANALYZE_DATA: 'ANALYZE_DATA',
  GENERATE_PREVIEW: 'GENERATE_PREVIEW'
};

// Data validation rules
const VALIDATION_RULES = {
  phoneNumber: {
    pattern: /^\+?[1-9]\d{1,14}$/,
    required: true,
    message: 'Invalid phone number format'
  },
  monthlyIncome: {
    type: 'number',
    min: 0,
    max: 10000000,
    required: true,
    message: 'Income must be a positive number'
  },
  monthlyDebtPayments: {
    type: 'number',
    min: 0,
    max: 10000000,
    required: true,
    message: 'Debt payments must be a positive number'
  },
  paymentHistory: {
    type: 'number',
    min: 0,
    max: 1,
    required: false,
    message: 'Payment history must be between 0 and 1'
  }
};

// Data transformation functions
const TRANSFORMATIONS = {
  phoneFormat: (value) => {
    // Standardize phone number format
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('251')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      return `+251${cleaned.slice(1)}`;
    }
    return `+251${cleaned}`;
  },
  
  currencyFormat: (value) => {
    // Convert to number and format as currency
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  },
  
  percentageFormat: (value) => {
    // Convert percentage to decimal
    const num = parseFloat(value);
    if (isNaN(num)) return 0;
    return num > 1 ? num / 100 : num;
  },
  
  dateFormat: (value) => {
    // Standardize date format
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  }
};

// Process CSV data
const processCSV = (csvText, options = {}) => {
  try {
    // Simple CSV parser (in production, use Papa Parse)
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    const data = lines.slice(1).map((line, index) => {
      const values = line.split(',');
      const row = {};
      headers.forEach((header, i) => {
        row[header] = values[i] ? values[i].trim() : '';
      });
      row._rowIndex = index + 1;
      return row;
    });

    return {
      success: true,
      headers,
      data,
      totalRows: data.length,
      processingTime: Date.now()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Process Excel data
const processExcel = (arrayBuffer, options = {}) => {
  try {
    // In production, use XLSX library
    // const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    // const sheetName = workbook.SheetNames[0];
    // const worksheet = workbook.Sheets[sheetName];
    // const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // For now, return mock data
    return {
      success: true,
      headers: ['phoneNumber', 'monthlyIncome', 'monthlyDebtPayments'],
      data: [],
      totalRows: 0,
      processingTime: Date.now()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Validate data according to rules
const validateData = (data, rules = VALIDATION_RULES) => {
  const errors = [];
  const warnings = [];
  let validRows = 0;
  let invalidRows = 0;

  data.forEach((row, index) => {
    const rowErrors = [];
    const rowWarnings = [];

    Object.entries(rules).forEach(([field, rule]) => {
      const value = row[field];
      
      // Check required fields
      if (rule.required && (!value || value === '')) {
        rowErrors.push({
          field,
          message: `${field} is required`,
          value: value
        });
        return;
      }

      // Skip validation if value is empty and not required
      if (!value || value === '') return;

      // Type validation
      if (rule.type === 'number') {
        const num = parseFloat(value);
        if (isNaN(num)) {
          rowErrors.push({
            field,
            message: `${field} must be a number`,
            value: value
          });
          return;
        }
        
        // Range validation
        if (rule.min !== undefined && num < rule.min) {
          rowErrors.push({
            field,
            message: `${field} must be at least ${rule.min}`,
            value: value
          });
        }
        
        if (rule.max !== undefined && num > rule.max) {
          rowWarnings.push({
            field,
            message: `${field} value seems unusually high`,
            value: value
          });
        }
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        rowErrors.push({
          field,
          message: rule.message || `${field} format is invalid`,
          value: value
        });
      }
    });

    if (rowErrors.length > 0) {
      errors.push({
        row: index + 1,
        errors: rowErrors
      });
      invalidRows++;
    } else {
      validRows++;
    }

    if (rowWarnings.length > 0) {
      warnings.push({
        row: index + 1,
        warnings: rowWarnings
      });
    }
  });

  return {
    success: true,
    validRows,
    invalidRows,
    totalRows: data.length,
    errors,
    warnings,
    validationTime: Date.now()
  };
};

// Transform data according to mapping
const transformData = (data, mappings) => {
  const transformed = [];
  const transformations = [];

  data.forEach((row, index) => {
    const transformedRow = {};
    
    Object.entries(mappings).forEach(([targetField, mapping]) => {
      const sourceField = mapping.sourceField;
      const transformation = mapping.transformation;
      
      let value = row[sourceField];
      
      // Apply transformation if specified
      if (transformation && TRANSFORMATIONS[transformation]) {
        value = TRANSFORMATIONS[transformation](value);
        transformations.push({
          row: index + 1,
          field: targetField,
          originalValue: row[sourceField],
          transformedValue: value,
          transformation: transformation
        });
      }
      
      transformedRow[targetField] = value;
    });
    
    transformed.push(transformedRow);
  });

  return {
    success: true,
    data: transformed,
    transformations,
    transformationTime: Date.now()
  };
};

// Analyze data for insights
const analyzeData = (data) => {
  const analysis = {
    totalRecords: data.length,
    fields: {},
    quality: {
      missingValues: 0,
      duplicateRecords: 0,
      dataTypes: {}
    }
  };

  if (data.length === 0) return analysis;

  // Analyze each field
  const fields = Object.keys(data[0]);
  fields.forEach(field => {
    const values = data.map(row => row[field]).filter(v => v !== null && v !== undefined && v !== '');
    const uniqueValues = new Set(values);
    
    analysis.fields[field] = {
      total: values.length,
      unique: uniqueValues.size,
      missing: data.length - values.length,
      missingPercentage: ((data.length - values.length) / data.length) * 100,
      sampleValues: Array.from(uniqueValues).slice(0, 5)
    };

    // Detect data type
    const sampleValue = values[0];
    if (sampleValue) {
      if (!isNaN(parseFloat(sampleValue))) {
        analysis.fields[field].type = 'number';
        analysis.fields[field].min = Math.min(...values.map(v => parseFloat(v)));
        analysis.fields[field].max = Math.max(...values.map(v => parseFloat(v)));
        analysis.fields[field].average = values.reduce((sum, v) => sum + parseFloat(v), 0) / values.length;
      } else if (sampleValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        analysis.fields[field].type = 'date';
      } else if (sampleValue.match(/^\+?[1-9]\d{1,14}$/)) {
        analysis.fields[field].type = 'phone';
      } else {
        analysis.fields[field].type = 'string';
      }
    }
  });

  // Check for duplicate records
  const recordStrings = data.map(row => JSON.stringify(row));
  const uniqueRecords = new Set(recordStrings);
  analysis.quality.duplicateRecords = data.length - uniqueRecords.size;

  // Calculate overall missing values
  analysis.quality.missingValues = Object.values(analysis.fields)
    .reduce((sum, field) => sum + field.missing, 0);

  return {
    success: true,
    analysis,
    analysisTime: Date.now()
  };
};

// Generate data preview
const generatePreview = (data, maxRows = 10) => {
  return {
    success: true,
    preview: data.slice(0, maxRows),
    totalRows: data.length,
    previewRows: Math.min(maxRows, data.length)
  };
};

// Main message handler
self.onmessage = function(event) {
  const { type, data, options } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case MESSAGE_TYPES.PROCESS_CSV:
        result = processCSV(data, options);
        break;
        
      case MESSAGE_TYPES.PROCESS_EXCEL:
        result = processExcel(data, options);
        break;
        
      case MESSAGE_TYPES.VALIDATE_DATA:
        result = validateData(data, options?.rules);
        break;
        
      case MESSAGE_TYPES.TRANSFORM_DATA:
        result = transformData(data, options?.mappings);
        break;
        
      case MESSAGE_TYPES.ANALYZE_DATA:
        result = analyzeData(data);
        break;
        
      case MESSAGE_TYPES.GENERATE_PREVIEW:
        result = generatePreview(data, options?.maxRows);
        break;
        
      default:
        result = {
          success: false,
          error: `Unknown message type: ${type}`
        };
    }
    
    // Send result back to main thread
    self.postMessage({
      type: type,
      result: result,
      timestamp: Date.now()
    });
    
  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      type: type,
      error: error.message,
      timestamp: Date.now()
    });
  }
};

// Handle worker errors
self.onerror = function(error) {
  self.postMessage({
    type: 'ERROR',
    error: error.message,
    timestamp: Date.now()
  });
}; 