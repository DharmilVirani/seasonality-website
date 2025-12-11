const express = require('express');
const router = express.Router();
const multer = require('multer');
const { prisma } = require('../app');
const csvService = require('../services/csvService');
const uploadService = require('../services/uploadService');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: process.env.MAX_FILE_SIZE || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// File upload endpoint
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload a CSV file'
      });
    }

    // Process the uploaded CSV file
    const result = await uploadService.processUploadedFile(req.file);

    res.status(200).json({
      success: true,
      message: 'File processed successfully',
      data: {
        fileName: 'Seasonality', // All files are merged into this name
        recordsProcessed: result.recordsProcessed,
        tickersFound: result.tickersFound,
        tickersCreated: result.tickersCreated,
        dataEntriesCreated: result.dataEntriesCreated
      }
    });

  } catch (error) {
    next(error);
  }
});

// Health check for upload service
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'upload-service',
    maxFileSize: process.env.MAX_FILE_SIZE || '10MB'
  });
});

module.exports = router;