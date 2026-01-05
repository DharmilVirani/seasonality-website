// /**
//  * MinIO Client Configuration - FIXED VERSION
//  * Handles connection to MinIO S3-compatible object storage
//  */

// const Minio = require('minio');

// // Get configuration from environment
// const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
// const port = parseInt(process.env.MINIO_PORT) || 9000;
// const useSSL = process.env.MINIO_USE_SSL === 'true';

// // Initialize MinIO client with CORRECTED configuration
// const minioClient = new Minio.Client({
//     endPoint: endpoint,
//     port: port,
//     useSSL: useSSL,
//     accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
//     secretKey: process.env.MINIO_SECRET_KEY || 'admin12345',
//     // IMPORTANT: Set region explicitly (must match what's in the presigned URL)
//     region: 'us-east-1',
//     // Force path-style URLs (critical for MinIO)
//     pathStyle: true,
// });

// // Bucket configuration
// const BUCKETS = {
//     UPLOADS: 'seasonality-uploads',
//     PROCESSED: 'seasonality-processed',
//     BACKUPS: 'seasonality-backups',
// };

// /**
//  * Ensure bucket exists, create if not
//  */
// async function ensureBucket(bucketName) {
//     try {
//         console.log(`Checking bucket '${bucketName}'...`);
//         const exists = await minioClient.bucketExists(bucketName);
//         if (!exists) {
//             console.log(`Creating bucket '${bucketName}'...`);
//             await minioClient.makeBucket(bucketName, 'us-east-1'); // Specify region
//             console.log(`Bucket '${bucketName}' created successfully`);
            
//             // Set bucket policy and CORS
//             await setBucketPolicy(bucketName);
//             await setBucketCORS(bucketName);
//         } else {
//             // Bucket exists, ensure CORS is set
//             console.log(`Bucket '${bucketName}' exists, verifying CORS...`);
//             await setBucketCORS(bucketName);
//         }
//     } catch (error) {
//         if (error.message && error.message.includes('API port')) {
//             console.error(`MinIO configuration error: ${error.message}`);
//             console.error('Make sure S3 API requests are sent to port 9000, not 9001');
//         }
//         console.error(`Error ensuring bucket '${bucketName}':`, error.message);
//         throw error;
//     }
// }

// /**
//  * Set bucket policy to allow public uploads (for presigned URLs)
//  */
// async function setBucketPolicy(bucketName) {
//     const policy = {
//         Version: '2012-10-17',
//         Statement: [
//             {
//                 Effect: 'Allow',
//                 Principal: { AWS: ['*'] },
//                 Action: [
//                     's3:GetBucketLocation',
//                     's3:ListBucket'
//                 ],
//                 Resource: [`arn:aws:s3:::${bucketName}`]
//             },
//             {
//                 Effect: 'Allow',
//                 Principal: { AWS: ['*'] },
//                 Action: [
//                     's3:PutObject',
//                     's3:GetObject',
//                 ],
//                 Resource: [`arn:aws:s3:::${bucketName}/*`]
//             }
//         ]
//     };

//     try {
//         await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
//         console.log(`✅ Bucket policy set for '${bucketName}'`);
//     } catch (error) {
//         console.warn(`⚠️ Could not set bucket policy for '${bucketName}':`, error.message);
//     }
// }

// /**
//  * Set CORS configuration for bucket
//  */
// async function setBucketCORS(bucketName) {
//     // MinIO CORS configuration
//     const corsConfig = `<?xml version="1.0" encoding="UTF-8"?>
// <CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
//   <CORSRule>
//     <AllowedOrigin>*</AllowedOrigin>
//     <AllowedMethod>GET</AllowedMethod>
//     <AllowedMethod>PUT</AllowedMethod>
//     <AllowedMethod>POST</AllowedMethod>
//     <AllowedMethod>DELETE</AllowedMethod>
//     <AllowedMethod>HEAD</AllowedMethod>
//     <AllowedHeader>*</AllowedHeader>
//     <ExposeHeader>ETag</ExposeHeader>
//     <ExposeHeader>Content-Length</ExposeHeader>
//   </CORSRule>
// </CORSConfiguration>`;

//     try {
//         // Using internal MinIO method to set CORS
//         await minioClient.setBucketCors(bucketName, corsConfig);
//         console.log(`✅ CORS configured for '${bucketName}'`);
//     } catch (error) {
//         console.warn(`⚠️ Could not set CORS for '${bucketName}':`, error.message);
//         console.warn('You may need to set CORS manually via MinIO Console');
//     }
// }

// /**
//  * Initialize all buckets
//  */
// async function initializeBuckets() {
//     console.log(`Initializing MinIO connection to ${endpoint}:${port}...`);

//     try {
//         console.log('Testing MinIO connection...');
//         const buckets = await minioClient.listBuckets();
//         console.log(`Connected to MinIO. Found ${buckets.length} existing buckets.`);
//     } catch (connError) {
//         console.warn('MinIO not available:', connError.message);
//         console.warn('Server will continue without MinIO - uploads may fail');
//         console.warn('To fix: Ensure MinIO is running and accessible at ' + endpoint + ':' + port);
//         return false;
//     }

//     try {
//         await ensureBucket(BUCKETS.UPLOADS);
//         await ensureBucket(BUCKETS.PROCESSED);
//         await ensureBucket(BUCKETS.BACKUPS);
//         console.log('All MinIO buckets initialized successfully');
//         return true;
//     } catch (error) {
//         console.error('Error initializing MinIO buckets:', error.message);
//         console.warn('Server will continue without MinIO - uploads may fail');
//         return false;
//     }
// }

// /**
//  * Generate presigned URL for PUT upload - FIXED VERSION
//  * @param {string} bucketName - Target bucket
//  * @param {string} objectKey - Object key (path + filename)
//  * @param {number} expiry - URL expiry in seconds (default 3600 = 1 hour)
//  * @returns {Promise<string>} Presigned upload URL
//  */
// async function getPresignedPutUrl(bucketName, objectKey, expiry = 3600) {
//     try {
//         // IMPORTANT: Use presignedPutObject with proper parameters
//         const url = await minioClient.presignedPutObject(
//             bucketName, 
//             objectKey, 
//             expiry
//         );
        
//         console.log(`Generated presigned PUT URL for ${objectKey}`);
//         return url;
//     } catch (error) {
//         console.error('Error generating presigned PUT URL:', error.message);
//         throw error;
//     }
// }

// /**
//  * Generate presigned URL for GET download
//  * @param {string} bucketName - Source bucket
//  * @param {string} objectKey - Object key
//  * @param {number} expiry - URL expiry in seconds
//  * @returns {Promise<string>} Presigned download URL
//  */
// async function getPresignedGetUrl(bucketName, objectKey, expiry = 3600) {
//     try {
//         const url = await minioClient.presignedGetObject(bucketName, objectKey, expiry);
//         return url;
//     } catch (error) {
//         console.error('Error generating presigned GET URL:', error.message);
//         throw error;
//     }
// }

// /**
//  * Download file from MinIO to local path
//  */
// async function downloadToFile(bucketName, objectKey, filePath) {
//     try {
//         await minioClient.fGetObject(bucketName, objectKey, filePath);
//     } catch (error) {
//         console.error('Error downloading from MinIO:', error.message);
//         throw error;
//     }
// }

// /**
//  * Upload file from local path to MinIO
//  */
// async function uploadFromFile(bucketName, objectKey, filePath) {
//     try {
//         await minioClient.fPutObject(bucketName, objectKey, filePath);
//     } catch (error) {
//         console.error('Error uploading to MinIO:', error.message);
//         throw error;
//     }
// }

// /**
//  * Delete object from MinIO
//  */
// async function deleteObject(bucketName, objectKey) {
//     try {
//         await minioClient.removeObject(bucketName, objectKey);
//     } catch (error) {
//         console.error('Error deleting from MinIO:', error.message);
//         throw error;
//     }
// }

// /**
//  * List objects in bucket with prefix
//  */
// async function listObjects(bucketName, prefix = '') {
//     try {
//         const objects = [];
//         const stream = minioClient.listObjects(bucketName, prefix, true);

//         return new Promise((resolve, reject) => {
//             stream.on('data', (obj) => objects.push(obj));
//             stream.on('end', () => resolve(objects));
//             stream.on('error', reject);
//         });
//     } catch (error) {
//         console.error('Error listing MinIO objects:', error.message);
//         throw error;
//     }
// }

// module.exports = {
//     minioClient,
//     BUCKETS,
//     initializeBuckets,
//     getPresignedPutUrl,
//     getPresignedGetUrl,
//     downloadToFile,
//     uploadFromFile,
//     deleteObject,
//     listObjects,
// };


/**
 * MinIO Client Configuration - DUAL ENDPOINT VERSION
 * Handles connection to MinIO S3-compatible object storage
 * Supports both internal Docker networking and external browser access
 */

const Minio = require('minio');

// Get configuration from environment
const internalEndpoint = process.env.MINIO_INTERNAL_ENDPOINT || process.env.MINIO_ENDPOINT || 'localhost';
const externalEndpoint = process.env.MINIO_ENDPOINT || 'localhost';
const port = parseInt(process.env.MINIO_PORT) || 9000;
const useSSL = process.env.MINIO_USE_SSL === 'true';
const accessKey = process.env.MINIO_ACCESS_KEY || 'admin';
const secretKey = process.env.MINIO_SECRET_KEY || 'admin12345';

// DEBUG: Log MinIO configuration
console.log('=================================');
console.log('MinIO Client Configuration:');
console.log(`  Internal Endpoint: ${internalEndpoint}:${port} (for operations)`);
console.log(`  External Endpoint: ${externalEndpoint}:${port} (for presigned URLs)`);
console.log(`  UseSSL: ${useSSL}`);
console.log(`  AccessKey: ${accessKey}`);
console.log(`  Region: us-east-1`);
console.log('=================================');

// Initialize MinIO client with INTERNAL endpoint for operations
const minioClient = new Minio.Client({
    endPoint: internalEndpoint,
    port: port,
    useSSL: useSSL,
    accessKey: accessKey,
    secretKey: secretKey,
    region: 'us-east-1',
    pathStyle: true,
});

// Create a second client for generating presigned URLs with EXTERNAL endpoint
const minioClientExternal = new Minio.Client({
    endPoint: externalEndpoint,
    port: port,
    useSSL: useSSL,
    accessKey: accessKey,
    secretKey: secretKey,
    region: 'us-east-1',
    pathStyle: true,
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
        console.log(`Checking bucket '${bucketName}'...`);
        const exists = await minioClient.bucketExists(bucketName);
        if (!exists) {
            console.log(`Creating bucket '${bucketName}'...`);
            await minioClient.makeBucket(bucketName, 'us-east-1'); // Specify region
            console.log(`Bucket '${bucketName}' created successfully`);
            
            // Set bucket policy and CORS
            await setBucketPolicy(bucketName);
            await setBucketCORS(bucketName);
        } else {
            // Bucket exists, ensure CORS is set
            console.log(`Bucket '${bucketName}' exists, verifying CORS...`);
            await setBucketCORS(bucketName);
        }
    } catch (error) {
        if (error.message && error.message.includes('API port')) {
            console.error(`MinIO configuration error: ${error.message}`);
            console.error('Make sure S3 API requests are sent to port 9000, not 9001');
        }
        console.error(`Error ensuring bucket '${bucketName}':`, error.message);
        throw error;
    }
}

/**
 * Set bucket policy to allow public uploads (for presigned URLs)
 */
async function setBucketPolicy(bucketName) {
    const policy = {
        Version: '2012-10-17',
        Statement: [
            {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: [
                    's3:GetBucketLocation',
                    's3:ListBucket'
                ],
                Resource: [`arn:aws:s3:::${bucketName}`]
            },
            {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: [
                    's3:PutObject',
                    's3:GetObject',
                ],
                Resource: [`arn:aws:s3:::${bucketName}/*`]
            }
        ]
    };

    try {
        await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
        console.log(`✅ Bucket policy set for '${bucketName}'`);
    } catch (error) {
        console.warn(`⚠️ Could not set bucket policy for '${bucketName}':`, error.message);
    }
}

/**
 * Set CORS configuration for bucket
 */
async function setBucketCORS(bucketName) {
    // MinIO CORS configuration
    const corsConfig = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>DELETE</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <ExposeHeader>Content-Length</ExposeHeader>
  </CORSRule>
</CORSConfiguration>`;

    try {
        // Using internal MinIO method to set CORS
        await minioClient.setBucketCors(bucketName, corsConfig);
        console.log(`✅ CORS configured for '${bucketName}'`);
    } catch (error) {
        console.warn(`⚠️ Could not set CORS for '${bucketName}':`, error.message);
        console.warn('You may need to set CORS manually via MinIO Console');
    }
}

/**
 * Initialize all buckets
 */
async function initializeBuckets() {
    console.log(`Initializing MinIO connection to ${internalEndpoint}:${port}...`);

    try {
        console.log('Testing MinIO connection...');
        const buckets = await minioClient.listBuckets();
        console.log(`Connected to MinIO. Found ${buckets.length} existing buckets.`);
    } catch (connError) {
        console.warn('MinIO not available:', connError.message);
        console.warn('Server will continue without MinIO - uploads may fail');
        console.warn('To fix: Ensure MinIO is running and accessible at ' + internalEndpoint + ':' + port);
        return false;
    }

    try {
        await ensureBucket(BUCKETS.UPLOADS);
        await ensureBucket(BUCKETS.PROCESSED);
        await ensureBucket(BUCKETS.BACKUPS);
        console.log('All MinIO buckets initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing MinIO buckets:', error.message);
        console.warn('Server will continue without MinIO - uploads may fail');
        return false;
    }
}

/**
 * Generate presigned URL for PUT upload - USES EXTERNAL ENDPOINT
 * @param {string} bucketName - Target bucket
 * @param {string} objectKey - Object key (path + filename)
 * @param {number} expiry - URL expiry in seconds (default 3600 = 1 hour)
 * @returns {Promise<string>} Presigned upload URL
 */
async function getPresignedPutUrl(bucketName, objectKey, expiry = 3600) {
    try {
        // Use EXTERNAL client for presigned URLs (browser needs to access this)
        const url = await minioClientExternal.presignedPutObject(
            bucketName, 
            objectKey, 
            expiry
        );
        
        console.log(`Generated presigned PUT URL for ${objectKey} using ${externalEndpoint}`);
        return url;
    } catch (error) {
        console.error('Error generating presigned PUT URL:', error.message);
        throw error;
    }
}

/**
 * Generate presigned URL for GET download - USES EXTERNAL ENDPOINT
 * @param {string} bucketName - Source bucket
 * @param {string} objectKey - Object key
 * @param {number} expiry - URL expiry in seconds
 * @returns {Promise<string>} Presigned download URL
 */
async function getPresignedGetUrl(bucketName, objectKey, expiry = 3600) {
    try {
        // Use EXTERNAL client for presigned URLs
        const url = await minioClientExternal.presignedGetObject(bucketName, objectKey, expiry);
        return url;
    } catch (error) {
        console.error('Error generating presigned GET URL:', error.message);
        throw error;
    }
}

/**
 * Download file from MinIO to local path
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