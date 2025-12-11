const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

class CsvService {
  /**
   * Normalize CSV column headers
   * @param {string[]} headers - Original column headers
   * @returns {string[]} Normalized headers (lowercase, no spaces)
   */
  normalizeHeaders(headers) {
    return headers.map(header =>
      header.toLowerCase().replace(/\s+/g, '')
    );
  }

  /**
   * Validate required columns
   * @param {string[]} headers - Normalized headers
   * @throws {Error} If required columns are missing
   */
  validateRequiredColumns(headers) {
    const requiredColumns = ['date', 'ticker', 'close'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
      throw new Error(`Column name not valid. Missing required columns: ${missingColumns.join(', ')}`);
    }
  }

  /**
   * Parse CSV file content
   * @param {Buffer} fileBuffer - CSV file buffer
   * @returns {Object} Parsed CSV data
   */
  parseCsv(fileBuffer) {
    try {
      const csvContent = fileBuffer.toString('utf8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      if (records.length === 0) {
        throw new Error('CSV file is empty');
      }

      return records;
    } catch (error) {
      throw new Error(`Failed to parse CSV: ${error.message}`);
    }
  }

  /**
   * Process CSV records according to business rules
   * @param {Array} records - Parsed CSV records
   * @returns {Array} Processed records
   */
  processRecords(records) {
    return records.map(record => {
      // Handle null values according to business rules
      const processed = { ...record };

      // Volume and OpenInterest null handling
      if (processed.volume === null || processed.volume === undefined || processed.volume === '') {
        processed.volume = 0;
      }

      if (processed.openinterest === null || processed.openinterest === undefined || processed.openinterest === '') {
        processed.openinterest = 0;
      }

      // Open null handling - use adjacent close value
      if (processed.open === null || processed.open === undefined || processed.open === '') {
        processed.open = processed.close;
      }

      return processed;
    });
  }

  /**
   * Validate mandatory fields
   * @param {Array} records - Processed records
   * @throws {Error} If mandatory fields are null
   */
  validateMandatoryFields(records) {
    const errors = [];

    records.forEach((record, index) => {
      if (!record.date || record.date === '') {
        errors.push(`Row ${index + 1}: Date cannot be null`);
      }
      if (!record.ticker || record.ticker === '') {
        errors.push(`Row ${index + 1}: Ticker cannot be null`);
      }
      if (!record.close || record.close === '') {
        errors.push(`Row ${index + 1}: Close cannot be null`);
      }
    });

    if (errors.length > 0) {
      throw new Error(`Mandatory fields validation failed:\n${errors.join('\n')}`);
    }
  }
}

module.exports = new CsvService();