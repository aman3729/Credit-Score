# Enhanced Upload System API Documentation

## 🚀 Overview

This document describes the API endpoints for the Enhanced Upload System, designed to handle large-scale credit data processing with AI-powered field mapping and advanced validation.

## 🔐 Authentication

All API endpoints require authentication using JWT tokens in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## 📋 Base URL

```
Production: https://api.creditscore.com/v2
Development: http://localhost:3001/api/v2
```

## 🔄 Upload Endpoints

### 1. Create Upload Session

**Endpoint:** `POST /upload/create-session`

**Description:** Creates a new upload session for chunked file uploads.

**Request Body:**
```json
{
  "sessionId": "uuid-v4-string",
  "uploadId": "upload-timestamp",
  "fileName": "credit-data.csv",
  "fileSize": 52428800,
  "partnerId": "commercial-bank-of-ethiopia",
  "profileId": "profile-123",
  "scoringEngine": "enhanced",
  "totalChunks": 10
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid-v4-string",
  "uploadId": "upload-timestamp",
  "chunkSize": 5242880,
  "maxConcurrentChunks": 3,
  "expiresAt": "2024-01-15T10:30:00Z"
}
```

**Error Codes:**
- `400`: Invalid request parameters
- `401`: Unauthorized
- `413`: File size too large
- `429`: Rate limit exceeded

### 2. Upload File Chunk

**Endpoint:** `POST /upload/chunk`

**Description:** Uploads a single chunk of the file.

**Request:** Multipart form data
```
chunk: <binary-data>
chunkIndex: 0
sessionId: uuid-v4-string
uploadId: upload-timestamp
totalChunks: 10
```

**Response:**
```json
{
  "success": true,
  "chunkIndex": 0,
  "uploadedSize": 5242880,
  "checksum": "sha256-hash"
}
```

**Error Codes:**
- `400`: Invalid chunk data
- `404`: Session not found
- `409`: Chunk already uploaded
- `413`: Chunk size too large

### 3. Finalize Upload

**Endpoint:** `POST /upload/finalize`

**Description:** Finalizes the upload and begins processing.

**Request Body:**
```json
{
  "sessionId": "uuid-v4-string",
  "uploadId": "upload-timestamp"
}
```

**Response:**
```json
{
  "success": true,
  "uploadId": "upload-timestamp",
  "processingId": "proc-123",
  "estimatedTime": 300,
  "status": "processing"
}
```

### 4. Get Upload Status

**Endpoint:** `GET /upload/status/:uploadId`

**Description:** Retrieves the current status of an upload.

**Response:**
```json
{
  "uploadId": "upload-timestamp",
  "status": "completed",
  "progress": 100,
  "processedRecords": 10000,
  "successfulRecords": 9850,
  "failedRecords": 150,
  "averageScore": 750,
  "processingTime": 245,
  "completedAt": "2024-01-15T10:35:00Z",
  "errors": [
    {
      "row": 150,
      "field": "phoneNumber",
      "error": "Invalid phone number format"
    }
  ]
}
```

## 🤖 AI Mapping Endpoints

### 1. Get AI Mapping Suggestions

**Endpoint:** `POST /ai/mapping-suggestions`

**Description:** Analyzes file headers and suggests field mappings.

**Request Body:**
```json
{
  "sourceHeaders": [
    "Phone Number",
    "Monthly Income",
    "Debt Payments",
    "Payment History"
  ],
  "targetFields": [
    "phoneNumber",
    "monthlyIncome",
    "monthlyDebtPayments",
    "paymentHistory"
  ],
  "fieldDescriptions": {
    "phoneNumber": {
      "description": "User phone number",
      "type": "string",
      "required": true
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "sourceField": "Phone Number",
      "targetField": "phoneNumber",
      "confidence": 0.95,
      "transformation": "phone-format",
      "reasoning": "Exact match with target field"
    }
  ],
  "confidence": 0.87,
  "processingTime": 1.2
}
```

### 2. Improve AI Suggestions

**Endpoint:** `POST /ai/improve-mappings`

**Description:** Improves existing mappings based on sample data.

**Request Body:**
```json
{
  "currentMappings": {
    "phoneNumber": {
      "sourceField": "Phone Number",
      "transformation": "phone-format"
    }
  },
  "sampleData": [
    {
      "Phone Number": "+251911234567",
      "Monthly Income": "50000"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "improvedMappings": {
    "phoneNumber": {
      "sourceField": "Phone Number",
      "transformation": "phone-format",
      "confidence": 0.98,
      "validation": "passed"
    }
  }
}
```

## 🔍 Validation Endpoints

### 1. Validate File

**Endpoint:** `POST /validation/file`

**Description:** Validates file format, content, and security.

**Request:** Multipart form data
```
file: <file-data>
validationLevel: "strict"
```

**Response:**
```json
{
  "success": true,
  "isValid": true,
  "fileInfo": {
    "type": "csv",
    "recordCount": 10000,
    "fields": ["phoneNumber", "income"],
    "encoding": "utf-8"
  },
  "dataQuality": {
    "qualityScore": 85,
    "missingValues": 150,
    "typeInconsistencies": 25
  },
  "securityStatus": {
    "hasThreats": false,
    "scannedAt": "2024-01-15T10:30:00Z"
  },
  "warnings": [
    "High percentage of missing values in income field"
  ]
}
```

### 2. Security Scan

**Endpoint:** `POST /validation/security`

**Description:** Performs security scanning on uploaded files.

**Request Body:**
```json
{
  "fileId": "file-123",
  "scanType": "comprehensive"
}
```

**Response:**
```json
{
  "success": true,
  "scanId": "scan-456",
  "status": "completed",
  "hasThreats": false,
  "threats": [],
  "scanTime": 2.5,
  "scannedAt": "2024-01-15T10:30:00Z"
}
```

## 🎯 Scoring Engine Endpoints

### 1. Get Available Engines

**Endpoint:** `GET /scoring/engines`

**Description:** Retrieves available scoring engines with their configurations.

**Response:**
```json
{
  "success": true,
  "engines": [
    {
      "id": "enhanced",
      "name": "Enhanced AI Model",
      "description": "Advanced machine learning model with 95% accuracy",
      "version": "2.1.0",
      "features": ["AI-powered", "Real-time processing", "High accuracy"],
      "performance": {
        "accuracy": 0.95,
        "processingTime": 2.5,
        "throughput": 1000
      },
      "pricing": {
        "perRecord": 0.001,
        "monthly": 500
      }
    }
  ]
}
```

### 2. Test Engine Performance

**Endpoint:** `POST /scoring/engines/:engineId/test`

**Description:** Tests a scoring engine with sample data.

**Request Body:**
```json
{
  "testData": [
    {
      "phoneNumber": "+251911234567",
      "monthlyIncome": 50000,
      "monthlyDebtPayments": 15000
    }
  ],
  "testType": "accuracy"
}
```

**Response:**
```json
{
  "success": true,
  "engineId": "enhanced",
  "results": {
    "accuracy": 0.94,
    "processingTime": 2.3,
    "throughput": 950,
    "testRecords": 1000
  },
  "testTime": 1.5
}
```

### 3. Update Engine Configuration

**Endpoint:** `PUT /scoring/engines/:engineId/config`

**Description:** Updates scoring engine configuration.

**Request Body:**
```json
{
  "config": {
    "modelType": "neural_network",
    "layers": [64, 32, 16],
    "activation": "relu",
    "dropout": 0.2
  }
}
```

**Response:**
```json
{
  "success": true,
  "engineId": "enhanced",
  "config": {
    "modelType": "neural_network",
    "layers": [64, 32, 16],
    "activation": "relu",
    "dropout": 0.2
  },
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

## 📋 Template Management Endpoints

### 1. Get Templates

**Endpoint:** `GET /templates`

**Description:** Retrieves available upload templates.

**Query Parameters:**
- `category`: Filter by template category
- `partnerId`: Filter by partner
- `search`: Search template names

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "id": "template-1",
      "name": "Standard Credit Data",
      "description": "Standard template for credit data uploads",
      "category": "credit-data",
      "partnerId": "commercial-bank",
      "fileType": "csv",
      "fields": [
        {
          "name": "phoneNumber",
          "required": true,
          "type": "string",
          "description": "User phone number"
        }
      ],
      "version": "1.0.0",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 2. Create Template

**Endpoint:** `POST /templates`

**Description:** Creates a new upload template.

**Request Body:**
```json
{
  "name": "Custom Template",
  "description": "Custom template for specific use case",
  "category": "custom",
  "fileType": "csv",
  "fields": [
    {
      "name": "customField",
      "required": true,
      "type": "string",
      "description": "Custom field description"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "template": {
    "id": "template-2",
    "name": "Custom Template",
    "version": "1.0.0",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Update Template

**Endpoint:** `PUT /templates/:templateId`

**Description:** Updates an existing template.

**Request Body:**
```json
{
  "name": "Updated Template",
  "description": "Updated description",
  "fields": [
    {
      "name": "updatedField",
      "required": true,
      "type": "string"
    }
  ]
}
```

### 4. Delete Template

**Endpoint:** `DELETE /templates/:templateId`

**Description:** Deletes a template.

**Response:**
```json
{
  "success": true,
  "message": "Template deleted successfully"
}
```

## ⏰ Batch Scheduling Endpoints

### 1. Get Schedules

**Endpoint:** `GET /schedules`

**Description:** Retrieves batch upload schedules.

**Query Parameters:**
- `status`: Filter by schedule status (active, paused, completed)
- `partnerId`: Filter by partner

**Response:**
```json
{
  "success": true,
  "schedules": [
    {
      "id": "schedule-1",
      "name": "Daily Credit Data Upload",
      "description": "Daily upload at 2 AM",
      "cronExpression": "0 2 * * *",
      "timezone": "Africa/Addis_Ababa",
      "status": "active",
      "partnerId": "commercial-bank",
      "templateId": "template-1",
      "scoringEngine": "enhanced",
      "nextRun": "2024-01-16T02:00:00Z",
      "lastRun": "2024-01-15T02:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Create Schedule

**Endpoint:** `POST /schedules`

**Description:** Creates a new batch upload schedule.

**Request Body:**
```json
{
  "name": "Weekly Upload",
  "description": "Weekly upload every Monday",
  "cronExpression": "0 2 * * 1",
  "timezone": "Africa/Addis_Ababa",
  "partnerId": "commercial-bank",
  "templateId": "template-1",
  "scoringEngine": "enhanced",
  "enabled": true
}
```

### 3. Update Schedule

**Endpoint:** `PUT /schedules/:scheduleId`

**Description:** Updates an existing schedule.

**Request Body:**
```json
{
  "enabled": false,
  "cronExpression": "0 3 * * 1"
}
```

### 4. Run Schedule Now

**Endpoint:** `POST /schedules/:scheduleId/run`

**Description:** Executes a schedule immediately.

**Response:**
```json
{
  "success": true,
  "executionId": "exec-123",
  "status": "started",
  "estimatedTime": 300
}
```

## 📊 Analytics Endpoints

### 1. Get Upload Analytics

**Endpoint:** `GET /analytics/uploads`

**Description:** Retrieves upload analytics and metrics.

**Query Parameters:**
- `startDate`: Start date (ISO 8601)
- `endDate`: End date (ISO 8601)
- `partnerId`: Partner filter
- `status`: Status filter

**Response:**
```json
{
  "success": true,
  "analytics": {
    "totalUploads": 1250,
    "successfulUploads": 1180,
    "failedUploads": 70,
    "averageProcessingTime": 180,
    "totalRecordsProcessed": 1250000,
    "averageFileSize": 25.5,
    "topPartners": [
      {
        "partnerId": "commercial-bank-of-ethiopia",
        "uploadCount": 450,
        "successRate": 0.96
      }
    ]
  },
  "timeSeries": [
    {
      "date": "2024-01-15",
      "uploads": 45,
      "successRate": 0.93
    }
  ]
}
```

### 2. Get Performance Metrics

**Endpoint:** `GET /analytics/performance`

**Description:** Retrieves system performance metrics.

**Response:**
```json
{
  "success": true,
  "metrics": {
    "averageResponseTime": 150,
    "throughput": 1000,
    "errorRate": 0.02,
    "activeSessions": 25,
    "queueLength": 10,
    "systemLoad": 0.65
  },
  "alerts": [
    {
      "type": "warning",
      "message": "High queue length detected",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## 🔌 WebSocket Endpoints

### 1. Real-time Monitoring

**Endpoint:** `WS /ws/monitoring`

**Description:** WebSocket connection for real-time monitoring.

**Connection:**
```javascript
const ws = new WebSocket('wss://api.creditscore.com/v2/ws/monitoring');
```

**Message Types:**

#### Subscribe to Upload Progress
```json
{
  "type": "subscribe_upload",
  "uploadId": "upload-123"
}
```

#### Subscribe to System Status
```json
{
  "type": "subscribe_system_status"
}
```

#### Ping (Heartbeat)
```json
{
  "type": "ping"
}
```

**Received Messages:**

#### Upload Progress Update
```json
{
  "type": "upload_progress",
  "uploadId": "upload-123",
  "progress": {
    "percentage": 75,
    "chunksUploaded": 8,
    "totalChunks": 10,
    "estimatedTimeRemaining": 120
  }
}
```

#### System Status Update
```json
{
  "type": "system_status",
  "status": {
    "systemLoad": 65,
    "activeUploads": 12,
    "queueLength": 8,
    "memoryUsage": 45,
    "cpuUsage": 30
  }
}
```

#### Notification
```json
{
  "type": "notification",
  "notification": {
    "type": "success",
    "title": "Upload Completed",
    "message": "Upload upload-123 completed successfully",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Pong Response
```json
{
  "type": "pong",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 🚨 Error Logging Endpoints

### 1. Log Error

**Endpoint:** `POST /errors/log`

**Description:** Logs client-side errors for monitoring.

**Request Body:**
```json
{
  "errorId": "error-123",
  "message": "Failed to process file",
  "stack": "Error stack trace...",
  "componentStack": "React component stack...",
  "url": "https://app.creditscore.com/upload",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2024-01-15T10:30:00Z",
  "userId": "user-123",
  "sessionId": "session-456"
}
```

**Response:**
```json
{
  "success": true,
  "errorId": "error-123",
  "loggedAt": "2024-01-15T10:30:00Z"
}
```

### 2. Get Error Reports

**Endpoint:** `GET /errors/reports`

**Description:** Retrieves error reports for analysis.

**Query Parameters:**
- `startDate`: Start date filter
- `endDate`: End date filter
- `severity`: Error severity filter
- `userId`: User filter

**Response:**
```json
{
  "success": true,
  "reports": [
    {
      "errorId": "error-123",
      "message": "Failed to process file",
      "severity": "high",
      "occurrenceCount": 5,
      "firstOccurrence": "2024-01-15T10:30:00Z",
      "lastOccurrence": "2024-01-15T11:30:00Z",
      "affectedUsers": 3
    }
  ]
}
```

## 📈 Rate Limiting

- **Standard**: 100 requests per minute
- **Upload**: 10 uploads per hour
- **AI Processing**: 50 requests per hour
- **WebSocket**: 1000 messages per minute

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642234567
```

## 🔄 Webhooks

### Webhook Events
- `upload.started`: Upload processing started
- `upload.completed`: Upload processing completed
- `upload.failed`: Upload processing failed
- `validation.completed`: File validation completed
- `schedule.executed`: Batch schedule executed
- `error.occurred`: Error occurred

### Webhook Payload
```json
{
  "event": "upload.completed",
  "timestamp": "2024-01-15T10:35:00Z",
  "data": {
    "uploadId": "upload-timestamp",
    "status": "completed",
    "processedRecords": 10000,
    "processingTime": 245
  }
}
```

## 📚 SDK Examples

### JavaScript SDK
```javascript
import { UploadClient } from '@creditscore/upload-sdk';

const client = new UploadClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.creditscore.com/v2'
});

// Create upload session
const session = await client.createSession({
  fileName: 'data.csv',
  fileSize: 52428800,
  partnerId: 'bank-123'
});

// Upload chunks
for (let i = 0; i < chunks.length; i++) {
  await client.uploadChunk(session.sessionId, chunks[i], i);
}

// Finalize upload
const result = await client.finalizeUpload(session.sessionId);
```

### Python SDK
```python
from creditscore_upload import UploadClient

client = UploadClient(api_key="your-api-key")

# Upload file
result = client.upload_file(
    file_path="data.csv",
    partner_id="bank-123",
    auto_validate=True
)

print(f"Upload completed: {result.upload_id}")
```

## 🔐 Security Considerations

### Data Encryption
- All data encrypted in transit (TLS 1.3)
- Data encrypted at rest (AES-256)
- API keys stored securely

### Access Control
- Role-based access control (RBAC)
- IP whitelisting support
- Audit logging for all operations

### Compliance
- GDPR compliant
- SOC 2 Type II certified
- PCI DSS compliant

---

**API Version**: v4.0.0
**Last Updated**: January 2024
**Status**: Production Ready 