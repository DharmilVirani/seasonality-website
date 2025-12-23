/**
 * MinIO Client Configuration
 * Handles connection to MinIO S3-compatible object storage
 */

const Minio = require('minio');

// Initialize MinIO client
const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

// Bucket configuration
const BUCKETS = {
    UPLOADS: 'seasonality-uploads',
    PROCESSED: 'seasonality-processed',
    BACKUPS: 'seasonality-backups',
};

/**
 * Ensure bucket exists, create if not
 */
async function ensureBucket(bucketName) {
    try {
        const exists = await minioClient.bucketExists(bucketName);
        if (!exists) {
            await minioClient.makeBucket(bucketName);
            console.log(`Bucket '${bucketName}' created successfully`);
        }
    } catch (error) {
        console.error(`Error ensuring bucket '${bucketName}':`, error.message);
        throw error;
    }
}

/**
 * Initialize all buckets
 */
async function initializeBuckets() {
    try {
        await ensureBucket(BUCKETS.UPLOADS);
        await ensureBucket(BUCKETS.PROCESSED);
        await ensureBucket(BUCKETS.BACKUPS);
        console.log('All MinIO buckets initialized');
    } catch (error) {
        console.error('Error initializing MinIO buckets:', error.message);
        throw error;
    }
}

/**
 * Generate presigned URL for PUT upload
 * @param {string} bucketName - Target bucket
 * @param {string} objectKey - Object key (path + filename)
 * @param {number} expiry - URL expiry in seconds (default 3600 = 1 hour)
 * @returns {Promise<string>} Presigned upload URL
 */
async function getPresignedPutUrl(bucketName, objectKey, expiry = 3600) {
    try {
        const url = await minioClient.presignedPutObject(bucketName, objectKey, expiry);
        return url;
    } catch (error) {
        console.error('Error generating presigned PUT URL:', error.message);
        throw error;
    }
}

/**
 * Generate presigned URL for GET download
 * @param {string} bucketName - Source bucket
 * @param {string} objectKey - Object key
 * @param {number} expiry - URL expiry in seconds
 * @returns {Promise<string>} Presigned download URL
 */
async function getPresignedGetUrl(bucketName, objectKey, expiry = 3600) {
    try {
        const url = await minioClient.presignedGetObject(bucketName, objectKey, expiry);
        return url;
    } catch (error) {
        console.error('Error generating presigned GET URL:', error.message);
        throw error;
    }
}

/**
 * Download file from MinIO to local path
 * @param {string} bucketName - Source bucket
 * @param {string} objectKey - Object key
 * @param {string} filePath - Local file path
 */
async function downloadToFile(bucketName, objectKey, filePath) {
    try {
        await minioClient.fGetObject(bucketName, objectKey, filePath);
    } catch (error) {
        console.error('Error downloading from MinIO:', error.message);
        throw error;
    }
}

/**
 * Upload file from local path to MinIO
 * @param {string} bucketName - Target bucket
 * @param {string} objectKey - Object key
 * @param {string} filePath - Local file path
 */
async function uploadFromFile(bucketName, objectKey, filePath) {
    try {
        await minioClient.fPutObject(bucketName, objectKey, filePath);
    } catch (error) {
        console.error('Error uploading to MinIO:', error.message);
        throw error;
    }
}

/**
 * Delete object from MinIO
 * @param {string} bucketName - Source bucket
 * @param {string} objectKey - Object key
 */
async function deleteObject(bucketName, objectKey) {
    try {
        await minioClient.removeObject(bucketName, objectKey);
    } catch (error) {
        console.error('Error deleting from MinIO:', error.message);
        throw error;
    }
}

/**
 * List objects in bucket with prefix
 * @param {string} bucketName - Source bucket
 * @param {string} prefix - Object prefix filter
 * @returns {Promise<Array>} List of objects
 */
async function listObjects(bucketName, prefix = '') {
    try {
        const objects = [];
        const stream = minioClient.listObjects(bucketName, prefix, true);

        return new Promise((resolve, reject) => {
            stream.on('data', (obj) => objects.push(obj));
            stream.on('end', () => resolve(objects));
            stream.on('error', reject);
        });
    } catch (error) {
        console.error('Error listing MinIO objects:', error.message);
        throw error;
    }
}

module.exports = {
    minioClient,
    BUCKETS,
    initializeBuckets,
    getPresignedPutUrl,
    getPresignedGetUrl,
    downloadToFile,
    uploadFromFile,
    deleteObject,
    listObjects,
};
