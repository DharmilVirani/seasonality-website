# API Testing Guide for Bulk CSV Upload

## Prerequisites
- Backend running on http://localhost:3001
- MinIO running on http://localhost:9000
- Redis running on http://localhost:6379

---

## Step 1: Get Presigned Upload URLs

**Endpoint:** `POST http://localhost:3001/api/upload/bulk/presign`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "files": [
    {
      "name": "test_data.csv",
      "size": 1024
    },
    {
      "name": "test_data2.csv",
      "size": 2048
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batchId": "batch_1701234567890",
    "files": [
      {
        "fileName": "test_data.csv",
        "fileSize": 1024,
        "objectKey": "uploads/batch_1701234567890/1701234567890_0_test_data.csv",
        "uploadUrl": "http://localhost:9000/seasonality-uploads/..."
      }
    ],
    "expiresIn": 3600
  }
}
```

---

## Step 2: Upload Files to MinIO (using presigned URLs)

**Endpoint:** `PUT <presigned_url_from_step_1>`

**Headers:**
```
Content-Type: text/csv
```

**Body:** Select your CSV file in Postman's "Body" → "form-data" or "binary" tab

**Important:** Use the exact `uploadUrl` returned in Step 1.

---

## Step 3: Start Batch Processing

**Endpoint:** `POST http://localhost:3001/api/upload/bulk/process`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "batchId": "batch_1701234567890",
  "objectKeys": [
    "uploads/batch_1701234567890/1701234567890_0_test_data.csv",
    "uploads/batch_1701234567890/1701234567890_1_test_data2.csv"
  ],
  "fileNames": [
    "test_data.csv",
    "test_data2.csv"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batchId": "batch_1701234567890",
    "status": "PROCESSING",
    "totalFiles": 2,
    "message": "2 files queued for processing"
  }
}
```

---

## Step 4: Check Batch Status

**Endpoint:** `GET http://localhost:3001/api/upload/bulk/{batchId}/status`

**Example:** `GET http://localhost:3001/api/upload/bulk/batch_1701234567890/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "batchId": "batch_1701234567890",
    "status": "COMPLETED",
    "progress": 100,
    "totalFiles": 2,
    "processedFiles": 2,
    "failedFiles": 0,
    "pendingFiles": 0,
    "queue": {
      "waiting": 0,
      "active": 0,
      "completed": 2,
      "failed": 0,
      "delayed": 0
    },
    "files": [
      {
        "id": 1,
        "fileName": "test_data.csv",
        "status": "COMPLETED",
        "recordsProcessed": 1500,
        "processedAt": "2024-12-23T07:00:00.000Z"
      }
    ]
  }
}
```

---

## Quick Test with curl

### Step 1: Get presigned URLs
```bash
curl -X POST http://localhost:3001/api/upload/bulk/presign \
  -H "Content-Type: application/json" \
  -d '{"files": [{"name": "data.csv", "size": 1024}]}'
```

### Step 2: Upload file to MinIO
```bash
curl -X PUT "<presigned_url>" \
  -H "Content-Type: text/csv" \
  --data-binary @data.csv
```

### Step 3: Start processing
```bash
curl -X POST http://localhost:3001/api/upload/bulk/process \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": "batch_1234567890",
    "objectKeys": ["uploads/batch_1234567890/1234567890_0_data.csv"],
    "fileNames": ["data.csv"]
  }'
```

### Step 4: Check status
```bash
curl http://localhost:3001/api/upload/bulk/batch_1234567890/status
```

---

## Single File Upload (Simpler Alternative)

If you want to test a simple single file upload:

**Endpoint:** `POST http://localhost:3001/api/upload`

**Body:** form-data with key `file` and your CSV file

**Response:**
```json
{
  "success": true,
  "message": "File processed successfully",
  "data": {
    "fileName": "data.csv",
    "recordsProcessed": 1500,
    "tickersFound": 5,
    "tickersCreated": 2,
    "dataEntriesCreated": 1500
  }
}
```
