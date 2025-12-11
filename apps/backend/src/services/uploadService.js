const csvService = require('./csvService');
const { prisma } = require('../app');

class UploadService {
  /**
   * Process uploaded CSV file
   * @param {Object} file - Uploaded file object
   * @returns {Promise<Object>} Processing result
   */
  async processUploadedFile(file) {
    try {
      // Parse CSV file
      const records = csvService.parseCsv(file.buffer);

      // Normalize headers
      const headers = Object.keys(records[0]);
      const normalizedHeaders = csvService.normalizeHeaders(headers);

      // Validate required columns
      csvService.validateRequiredColumns(normalizedHeaders);

      // Process records according to business rules
      const processedRecords = csvService.processRecords(records);

      // Validate mandatory fields
      csvService.validateMandatoryFields(processedRecords);

      // Process data for database storage
      return await this.storeProcessedData(processedRecords);

    } catch (error) {
      console.error('Error processing uploaded file:', error);
      throw error;
    }
  }

  /**
   * Store processed data in database
   * @param {Array} records - Processed records
   * @returns {Promise<Object>} Storage result
   */
  async storeProcessedData(records) {
    const result = {
      recordsProcessed: records.length,
      tickersFound: 0,
      tickersCreated: 0,
      dataEntriesCreated: 0
    };

    // Group records by ticker for efficient processing
    const recordsByTicker = {};
    records.forEach(record => {
      if (!recordsByTicker[record.ticker]) {
        recordsByTicker[record.ticker] = [];
      }
      recordsByTicker[record.ticker].push(record);
    });

    // Process each ticker
    for (const [tickerSymbol, tickerRecords] of Object.entries(recordsByTicker)) {
      result.tickersFound++;

      // Find or create ticker
      let ticker = await prisma.ticker.findUnique({
        where: { symbol: tickerSymbol }
      });

      if (!ticker) {
        ticker = await prisma.ticker.create({
          data: { symbol: tickerSymbol }
        });
        result.tickersCreated++;
      }

      // Prepare data for bulk insert
      const dataToCreate = tickerRecords.map(record => ({
        date: new Date(record.date),
        open: parseFloat(record.open),
        high: record.high ? parseFloat(record.high) : null,
        low: record.low ? parseFloat(record.low) : null,
        close: parseFloat(record.close),
        volume: parseFloat(record.volume),
        openInterest: parseFloat(record.openinterest),
        tickerId: ticker.id
      }));

      // Bulk create seasonality data
      const createdData = await prisma.seasonalityData.createMany({
        data: dataToCreate,
        skipDuplicates: true // Skip if date + tickerId already exists
      });

      result.dataEntriesCreated += createdData.count;
    }

    return result;
  }
}

module.exports = new UploadService();