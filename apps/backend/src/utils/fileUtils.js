const fs = require('fs');
const path = require('path');

class FileUtils {
  /**
   * Create uploads directory if it doesn't exist
   */
  ensureUploadsDirectory() {
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    return uploadsDir;
  }

  /**
   * Save file to disk
   * @param {string} filePath - Full path to save file
   * @param {Buffer} fileData - File data buffer
   */
  saveFile(filePath, fileData) {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, fileData, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(filePath);
        }
      });
    });
  }

  /**
   * Generate unique filename
   * @param {string} originalName - Original filename
   * @returns {string} Unique filename
   */
  generateUniqueFilename(originalName) {
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext);
    const timestamp = Date.now();
    return `${base}_${timestamp}${ext}`;
  }

  /**
   * Get file extension
   * @param {string} filename - Filename
   * @returns {string} File extension
   */
  getFileExtension(filename) {
    return path.extname(filename).toLowerCase();
  }

  /**
   * Validate file type
   * @param {string} filename - Filename to validate
   * @param {string[]} allowedExtensions - Allowed file extensions
   * @returns {boolean} True if file type is allowed
   */
  validateFileType(filename, allowedExtensions = ['.csv']) {
    const ext = this.getFileExtension(filename);
    return allowedExtensions.includes(ext);
  }
}

module.exports = new FileUtils();