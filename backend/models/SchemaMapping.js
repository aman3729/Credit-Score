import mongoose from 'mongoose';

const schemaMappingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  partnerId: {
    type: String,
    required: true,
    trim: true
  },
  partnerName: {
    type: String,
    required: true,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  fileType: {
    type: String,
    enum: ['csv', 'json', 'excel', 'xml'],
    required: true
  },
  schemaVersion: {
    type: String,
    default: '1.2',
    trim: true
  },
  fieldMappings: {
    type: Map,
    of: {
      sourceField: String,
      targetField: String,
      transformation: {
        type: String,
        enum: ['none', 'uppercase', 'lowercase', 'trim', 'to_lower', 'to_upper', 'parse_date', 'parse_number', 'sanitize', 'phone_format', 'date_format', 'number_format'],
        default: 'none'
      },
      transformationParams: mongoose.Schema.Types.Mixed,
      isRequired: {
        type: Boolean,
        default: false
      },
      defaultValue: mongoose.Schema.Types.Mixed
    },
    default: new Map()
  },
  // Sample data structure for validation
  sampleData: {
    type: mongoose.Schema.Types.Mixed
  },
  // Validation rules
  validationRules: {
    requiredFields: [String],
    optionalFields: [String],
    fieldTypes: {
      type: Map,
      of: String
    }
  },
  // Statistics
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date
  },
  successRate: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
schemaMappingSchema.index({ partnerId: 1, isActive: 1 });
schemaMappingSchema.index({ createdBy: 1 });
schemaMappingSchema.index({ fileType: 1 });
schemaMappingSchema.index({ isDefault: 1 });

// Pre-save hook to validate field names for security
schemaMappingSchema.pre('save', function(next) {
  // Validate field names - only allow alphanumeric characters and underscores
  // Field names must start with a letter or underscore and be 1-64 characters
  const validField = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;
  
  for (const field of this.fieldMappings.keys()) {
    if (!validField.test(field)) {
      return next(new Error(`Invalid field name: ${field}. Field names must start with a letter or underscore and contain only alphanumeric characters and underscores.`));
    }
  }
  
  // Validate source field names in mappings
  for (const mapping of this.fieldMappings.values()) {
    if (mapping.sourceField && !validField.test(mapping.sourceField)) {
      return next(new Error(`Invalid source field name: ${mapping.sourceField}. Field names must start with a letter or underscore and contain only alphanumeric characters and underscores.`));
    }
    
    if (mapping.targetField && !validField.test(mapping.targetField)) {
      return next(new Error(`Invalid target field name: ${mapping.targetField}. Field names must start with a letter or underscore and contain only alphanumeric characters and underscores.`));
    }
  }
  
  next();
});

// Virtual for mapping summary
schemaMappingSchema.virtual('mappingSummary').get(function() {
  const mappings = Array.from(this.fieldMappings.values());
  return {
    totalMappings: mappings.length,
    requiredMappings: mappings.filter(m => m.isRequired).length,
    optionalMappings: mappings.filter(m => !m.isRequired).length
  };
});

// Method to apply mapping to data
schemaMappingSchema.methods.applyMapping = function(sourceData) {
  const mappedData = {};
  const errors = [];
  
  // Sanitize input data for security
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters that could be used for XSS or injection
      return value.replace(/[<>"'`;]/g, '');
    }
    return value;
  };
  
  for (const [targetField, mapping] of this.fieldMappings) {
    const sourceValue = sourceData[mapping.sourceField];
    
    if (sourceValue === undefined || sourceValue === null) {
      if (mapping.isRequired) {
        errors.push(`Required field '${mapping.sourceField}' is missing`);
        continue;
      } else if (mapping.defaultValue !== undefined) {
        mappedData[targetField] = sanitizeValue(mapping.defaultValue);
        continue;
      }
    }
    
    let transformedValue = sanitizeValue(sourceValue);
    
    // Apply transformations
    if (mapping.transformation !== 'none') {
      transformedValue = this.applyTransformation(transformedValue, mapping.transformation, mapping.transformationParams);
    }
    
    mappedData[targetField] = transformedValue;
  }
  
  return { mappedData, errors };
};

// Method to apply transformations
schemaMappingSchema.methods.applyTransformation = function(value, transformation, params) {
  if (value === null || value === undefined) return value;
  
  switch (transformation) {
    case 'uppercase':
    case 'to_upper':
      return String(value).toUpperCase();
    case 'lowercase':
    case 'to_lower':
      return String(value).toLowerCase();
    case 'trim':
      return String(value).trim();
    case 'parse_date':
      return new Date(value);
    case 'parse_number':
      return parseFloat(value);
    case 'sanitize':
      return typeof value === 'string' ? 
        value.replace(/[<>"'`;]/g, '') : value;
    case 'phone_format':
      return this.formatPhoneNumber(value);
    case 'date_format':
      return this.formatDate(value, params);
    case 'number_format':
      return this.formatNumber(value, params);
    case 'none':
    default:
      return value;
  }
};

// Helper methods for transformations
schemaMappingSchema.methods.formatPhoneNumber = function(phone) {
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length >= 9 && cleaned.length <= 15) {
    return cleaned;
  }
  return phone;
};

schemaMappingSchema.methods.formatDate = function(date, params) {
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return date;
    
    const format = params?.format || 'YYYY-MM-DD';
    // Simple date formatting - could be enhanced with a library like moment.js
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return format.replace('YYYY', year).replace('MM', month).replace('DD', day);
  } catch (error) {
    return date;
  }
};

schemaMappingSchema.methods.formatNumber = function(number, params) {
  const num = parseFloat(number);
  if (isNaN(num)) return number;
  
  const decimals = params?.decimals || 2;
  return Number(num.toFixed(decimals));
};

// Static method to find mapping by partner and file type
schemaMappingSchema.statics.findByPartnerAndType = function(partnerId, fileType) {
  return this.findOne({
    partnerId,
    fileType,
    isActive: true
  }).sort({ isDefault: -1, usageCount: -1 });
};

// Static method to get all mappings for a partner
schemaMappingSchema.statics.findByPartner = function(partnerId) {
  return this.find({
    partnerId,
    isActive: true
  }).sort({ isDefault: -1, name: 1 });
};

const SchemaMapping = mongoose.model('SchemaMapping', schemaMappingSchema);

export default SchemaMapping; 