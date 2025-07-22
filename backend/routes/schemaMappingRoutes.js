import express from 'express';
import multer from 'multer';
import { auth, requireAdmin } from '../middleware/auth.js';
import SchemaMappingService from '../services/schemaMappingService.js';
import { logSecurityEvent } from '../services/securityLogs.js';
import { calculateCreditScore } from '../utils/creditScoring.js';
import csv from 'csv-parser';
import xlsx from 'xlsx';
import streamifier from 'streamifier';
import { processRecord } from './uploadRoutes.js';

console.log('🔧 Loading schema mapping routes...');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

console.log('✅ Schema mapping routes loaded successfully!');

// Helper function to parse uploaded files
async function parseUploadedFile(file) {
  const mimeType = file.mimetype;
  
  if (mimeType === 'application/json') {
    return JSON.parse(file.buffer.toString());
  }
  
  if (mimeType.includes('csv')) {
    return new Promise((resolve, reject) => {
      const results = [];
      streamifier.createReadStream(file.buffer)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }
  
  if (mimeType.includes('excel') || mimeType.includes('spreadsheetml')) {
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    return rows;
  }
  
  throw new Error('Unsupported file type');
}

/**
 * @route   POST /api/schema-mapping/detect-fields
 * @desc    Detect fields in uploaded file and suggest mappings
 * @access  Private/Admin
 */
router.post('/detect-fields', auth, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Parse the uploaded file
    const data = await parseUploadedFile(req.file);
    
    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data found in uploaded file'
      });
    }

    // Detect file type
    const fileType = req.file.originalname.split('.').pop().toLowerCase();
    
    // Detect fields using the service
    const detectionResult = await SchemaMappingService.detectFields(data, fileType);
    
    // Log security event
    await logSecurityEvent({
      userId: req.user._id,
      action: 'field_detection_performed',
      details: {
        fileType,
        fieldCount: detectionResult.totalFields,
        detectedFields: detectionResult.detectedFields.length
      }
    });

    res.json({
      success: true,
      data: detectionResult,
      sampleData: data.slice(0, 3), // Return first 3 records as sample
      fileType
    });
    
  } catch (error) {
    console.error('Field detection error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/schema-mapping/create
 * @desc    Create a new schema mapping
 * @access  Private/Admin
 */
router.post('/create', auth, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      partnerId,
      partnerName,
      fileType,
      fieldMappings,
      sampleData,
      validationRules
    } = req.body;

    // Validate required fields
    if (!name || !partnerId || !partnerName || !fileType || !fieldMappings) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Create the mapping
    const mapping = await SchemaMappingService.createMapping({
      name,
      description,
      partnerId,
      partnerName,
      fileType,
      fieldMappings: new Map(Object.entries(fieldMappings)),
      sampleData,
      validationRules
    }, req.user._id);

    res.json({
      success: true,
      data: mapping
    });
    
  } catch (error) {
    console.error('Create mapping error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/schema-mapping/partner/:partnerId
 * @desc    Get all mappings for a partner
 * @access  Private/Admin
 */
router.get('/partner/:partnerId', auth, requireAdmin, async (req, res) => {
  try {
    const { partnerId } = req.params;
    
    const mappings = await SchemaMappingService.getPartnerMappings(partnerId);
    
    res.json({
      success: true,
      data: mappings
    });
    
  } catch (error) {
    console.error('Get mappings error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/schema-mapping/:mappingId
 * @desc    Update a schema mapping
 * @access  Private/Admin
 */
router.put('/:mappingId', auth, requireAdmin, async (req, res) => {
  try {
    const { mappingId } = req.params;
    const updateData = req.body;
    
    const mapping = await SchemaMappingService.updateMapping(mappingId, updateData, req.user._id);
    
    res.json({
      success: true,
      data: mapping
    });
    
  } catch (error) {
    console.error('Update mapping error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/schema-mapping/:mappingId
 * @desc    Delete a schema mapping
 * @access  Private/Admin
 */
router.delete('/:mappingId', auth, requireAdmin, async (req, res) => {
  try {
    const { mappingId } = req.params;
    
    await SchemaMappingService.deleteMapping(mappingId, req.user._id);
    
    res.json({
      success: true,
      message: 'Mapping deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete mapping error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/schema-mapping/apply/:mappingId
 * @desc    Apply a schema mapping to uploaded data and score it
 * @access  Private/Admin
 */
router.post('/apply/:mappingId', auth, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { mappingId } = req.params;
    const { partnerId, autoScore = true } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required'
      });
    }

    // Parse the uploaded file
    const data = await parseUploadedFile(req.file);
    
    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data found in uploaded file'
      });
    }

    console.log('DEBUG req.user:', req.user);
    console.log('DEBUG uploadedBy:', req.user && req.user._id);
    // Apply the mapping
    const mappingResult = await SchemaMappingService.applyMappingToData(
      data,
      mappingId,
      partnerId,
      {
        uploadedBy: req.user._id,
        filename: req.file?.originalname || 'batch-upload'
      }
    );
    
    // Score the mapped data if autoScore is enabled
    let scoringResults = [];
    let totalScore = 0;
    let scoredRecords = 0;
    if (autoScore && mappingResult.mappedData.length > 0) {
      for (let i = 0; i < mappingResult.mappedData.length; i++) {
        const mappedRecord = mappingResult.mappedData[i];
        // Call processRecord to create/update CreditScore and CreditReport
        try {
          const processResult = await processRecord(mappedRecord, req.user, autoScore, req);
          console.log('[SCHEMA_MAPPING] processRecord result:', processResult);
        } catch (err) {
          console.error('[SCHEMA_MAPPING] processRecord error:', err);
        }
        // Continue with scoring for response
        try {
          const scoreResult = calculateCreditScore(mappedRecord);
          scoringResults.push({
            originalIndex: i,
            phoneNumber: mappedRecord.phoneNumber,
            score: scoreResult.score,
            classification: scoreResult.classification,
            breakdown: scoreResult.breakdown,
            mappedData: mappedRecord
          });
          totalScore += scoreResult.score;
          scoredRecords++;
        } catch (e) {
        scoringResults.push({
          originalIndex: i,
          phoneNumber: mappedRecord.phoneNumber,
            error: e.message,
          mappedData: mappedRecord
        });
        }
      }
    }
    
    // Log security event
    await logSecurityEvent({
      userId: req.user._id,
      action: 'schema_mapping_applied',
      details: {
        mappingId,
        partnerId,
        recordCount: data.length,
        successCount: mappingResult.successCount,
        scoredCount: scoredRecords
      }
    });

    res.json({
      success: true,
      data: {
        ...mappingResult,
        scoringResults,
        summary: {
          totalRecords: data.length,
          mappedRecords: mappingResult.successCount,
          scoredRecords,
          averageScore: scoredRecords > 0 ? totalScore / scoredRecords : 0
        }
      }
    });
    
  } catch (error) {
    console.error('Apply mapping error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/schema-mapping/fields
 * @desc    Get available internal schema fields
 * @access  Private/Admin
 */
router.get('/fields', auth, requireAdmin, async (req, res) => {
  try {
    const { INTERNAL_SCHEMA_FIELDS } = await import('../services/schemaMappingService.js');
    
    res.json({
      success: true,
      data: INTERNAL_SCHEMA_FIELDS
    });
    
  } catch (error) {
    console.error('Get fields error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/schema-mapping/test-mapping
 * @desc    Test a mapping with sample data
 * @access  Private/Admin
 */
router.post('/test-mapping', auth, requireAdmin, async (req, res) => {
  try {
    const { fieldMappings, sampleData } = req.body;
    
    if (!fieldMappings || !sampleData) {
      return res.status(400).json({
        success: false,
        message: 'Field mappings and sample data are required'
      });
    }

    // Create a temporary mapping object for testing
    const tempMapping = {
      fieldMappings: new Map(Object.entries(fieldMappings))
    };

    // Apply the mapping to sample data
    const results = [];
    const errors = [];
    
    for (let i = 0; i < sampleData.length; i++) {
      try {
        const { mappedData, errors: rowErrors } = tempMapping.applyMapping(sampleData[i]);
        
        if (rowErrors.length === 0) {
          results.push(mappedData);
        } else {
          errors.push({
            row: i + 1,
            errors: rowErrors,
            originalData: sampleData[i]
          });
        }
      } catch (error) {
        errors.push({
          row: i + 1,
          errors: [error.message],
          originalData: sampleData[i]
        });
      }
    }

    res.json({
      success: true,
      data: {
        mappedData: results,
        errors,
        successCount: results.length,
        errorCount: errors.length,
        successRate: results.length / sampleData.length
      }
    });
    
  } catch (error) {
    console.error('Test mapping error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router; 