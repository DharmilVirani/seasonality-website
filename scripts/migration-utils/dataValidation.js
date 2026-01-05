/**
 * Data Validation Utilities for Migration
 * 
 * Provides comprehensive validation functions for CSV data integrity
 * and database consistency checks
 * 
 * @author Seasonality SaaS Team
 * @version 1.0.0
 */

const fs = require('fs').promises;
const csv = require('csv-parse');
const { createReadStream } = require('fs');

/**
 * CSV Structure Validation
 */
class CSVValidator {
    constructor() {
        this.requiredColumns = ['Date', 'Ticker', 'Close'];
        this.optionalColumns = ['Open', 'High', 'Low', 'Volume', 'OpenInterest'];
        this.validationRules = {
            date: /^\d{4}-\d{2}-\d{2}$/,
            ticker: /^[A-Z0-9&\-\s]+$/,
            price: /^\d+(\.\d+)?$/,
            volume: /^\d+(\.\d+)?$/
        };
    }

    /**
     * Validate CSV file structure
     */
    async validateCSVStructure(filePath) {
        return new Promise((resolve, reject) => {
            const validation = {
                isValid: true,
                errors: [],
                warnings: [],
                recordCount: 0,
                columns: [],
                sampleData: []
            };

            const parser = csv.parse({
                columns: true,
                skip_empty_lines: true,
                trim: true
            });

            let isFirstRecord = true;

            parser.on('data', (row) => {
                validation.recordCount++;

                if (isFirstRecord) {
                    validation.columns = Object.keys(row);
                    this.validateColumns(validation.columns, validation);
                    isFirstRecord = false;
                }

                // Validate first 10 records for data quality
                if (validation.recordCount <= 10) {
                    const recordValidation = this.validateRecord(row, validation.recordCount);
                    validation.sampleData.push(recordValidation);

                    if (!recordValidation.isValid) {
                        validation.isValid = false;
                        validation.errors.push(...recordValidation.errors);
                    }
                }
            });

            parser.on('end', () => {
                resolve(validation);
            });

            parser.on('error', (error) => {
                validation.isValid = false;
                validation.errors.push(`CSV parsing error: ${error.message}`);
                resolve(validation);
            });

            createReadStream(filePath).pipe(parser);
        });
    }

    /**
     * Validate column structure
     */
    validateColumns(columns, validation) {
        // Check required columns
        const missingRequired = this.requiredColumns.filter(req =>
            !columns.some(col => col.toLowerCase().includes(req.toLowerCase()))
        );

        if (missingRequired.length > 0) {
            validation.isValid = false;
            validation.errors.push(`Missing required columns: ${missingRequired.join(', ')}`);
        }

        // Check for unexpected columns
        const knownColumns = [...this.requiredColumns, ...this.optionalColumns];
        const unknownColumns = columns.filter(col =>
            !knownColumns.some(known =>
                col.toLowerCase().includes(known.toLowerCase())
            )
        );

        if (unknownColumns.length > 0) {
            validation.warnings.push(`Unknown columns found: ${unknownColumns.join(', ')}`);
        }
    }

    /**
     * Validate individual record
     */
    validateRecord(row, recordNumber) {
        const recordValidation = {
            recordNumber,
            isValid: true,
            errors: [],
            warnings: []
        };

        // Validate date
        if (!row.Date || !this.validationRules.date.test(row.Date)) {
            recordValidation.isValid = false;
            recordValidation.errors.push(`Invalid date format: ${row.Date}`);
        }

        // Validate ticker
        if (!row.Ticker || !this.validationRules.ticker.test(row.Ticker)) {
            recordValidation.isValid = false;
            recordValidation.errors.push(`Invalid ticker format: ${row.Ticker}`);
        }

        // Validate close price (required)
        if (!row.Close || !this.validationRules.price.test(row.Close)) {
            recordValidation.isValid = false;
            recordValidation.errors.push(`Invalid close price: ${row.Close}`);
        }

        // Validate optional price fields
        ['Open', 'High', 'Low'].forEach(field => {
            if (row[field] && !this.validationRules.price.test(row[field])) {
                recordValidation.warnings.push(`Invalid ${field} price: ${row[field]}`);
            }
        });

        // Validate volume and open interest
        ['Volume', 'OpenInterest'].forEach(field => {
            if (row[field] && !this.validationRules.volume.test(row[field])) {
                recordValidation.warnings.push(`Invalid ${field}: ${row[field]}`);
            }
        });

        return recordValidation;
    }
}

/**
 * Data Type Validation
 */
class DataTypeValidator {
    /**
     * Validate data types in records
     */
    validateDataTypes(records) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            typeIssues: []
        };

        records.forEach((record, index) => {
            const recordValidation = this.validateRecordTypes(record, index);

            if (!recordValidation.isValid) {
                validation.isValid = false;
                validation.errors.push(...recordValidation.errors);
            }

            validation.warnings.push(...recordValidation.warnings);
            validation.typeIssues.push(...recordValidation.typeIssues);
        });

        return validation;
    }

    /**
     * Validate individual record types
     */
    validateRecordTypes(record, index) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            typeIssues: []
        };

        // Date validation
        if (record.date && !(record.date instanceof Date)) {
            validation.typeIssues.push({
                record: index,
                field: 'date',
                expected: 'Date',
                actual: typeof record.date,
                value: record.date
            });
        }

        // Numeric field validation
        const numericFields = ['open', 'high', 'low', 'close', 'volume', 'openInterest'];
        numericFields.forEach(field => {
            if (record[field] !== null && record[field] !== undefined) {
                if (typeof record[field] !== 'number' || isNaN(record[field])) {
                    validation.typeIssues.push({
                        record: index,
                        field,
                        expected: 'number',
                        actual: typeof record[field],
                        value: record[field]
                    });
                }
            }
        });

        return validation;
    }
}

/**
 * Date Range Validation
 */
class DateRangeValidator {
    /**
     * Validate date ranges in records
     */
    validateDateRanges(records) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            dateRange: {
                min: null,
                max: null,
                span: null
            },
            dateIssues: []
        };

        const dates = records
            .map(r => r.date)
            .filter(d => d instanceof Date)
            .sort((a, b) => a - b);

        if (dates.length === 0) {
            validation.isValid = false;
            validation.errors.push('No valid dates found in records');
            return validation;
        }

        validation.dateRange.min = dates[0];
        validation.dateRange.max = dates[dates.length - 1];
        validation.dateRange.span = Math.floor(
            (validation.dateRange.max - validation.dateRange.min) / (1000 * 60 * 60 * 24)
        );

        // Check for future dates
        const now = new Date();
        const futureDates = dates.filter(d => d > now);
        if (futureDates.length > 0) {
            validation.warnings.push(`Found ${futureDates.length} future dates`);
        }

        // Check for very old dates (before 1990)
        const oldThreshold = new Date('1990-01-01');
        const oldDates = dates.filter(d => d < oldThreshold);
        if (oldDates.length > 0) {
            validation.warnings.push(`Found ${oldDates.length} dates before 1990`);
        }

        // Check for date gaps
        const dateGaps = this.findDateGaps(dates);
        if (dateGaps.length > 0) {
            validation.warnings.push(`Found ${dateGaps.length} significant date gaps`);
            validation.dateIssues.push(...dateGaps);
        }

        return validation;
    }

    /**
     * Find significant gaps in date sequence
     */
    findDateGaps(sortedDates, maxGapDays = 30) {
        const gaps = [];

        for (let i = 1; i < sortedDates.length; i++) {
            const gapDays = Math.floor(
                (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24)
            );

            if (gapDays > maxGapDays) {
                gaps.push({
                    startDate: sortedDates[i - 1],
                    endDate: sortedDates[i],
                    gapDays
                });
            }
        }

        return gaps;
    }
}

/**
 * Calculation Validation
 */
class CalculationValidator {
    /**
     * Validate calculations match expected results
     */
    validateCalculations(records) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            calculationIssues: []
        };

        records.forEach((record, index) => {
            const issues = this.validateRecordCalculations(record, index);
            validation.calculationIssues.push(...issues);

            if (issues.length > 0) {
                validation.warnings.push(`Record ${index}: ${issues.length} calculation issues`);
            }
        });

        return validation;
    }

    /**
     * Validate individual record calculations
     */
    validateRecordCalculations(record, index) {
        const issues = [];

        // Validate OHLC relationships
        if (record.high < record.low) {
            issues.push({
                type: 'OHLC_INVALID',
                message: 'High price is less than low price',
                record: index
            });
        }

        if (record.close > record.high || record.close < record.low) {
            issues.push({
                type: 'CLOSE_OUT_OF_RANGE',
                message: 'Close price is outside high-low range',
                record: index
            });
        }

        if (record.open > record.high || record.open < record.low) {
            issues.push({
                type: 'OPEN_OUT_OF_RANGE',
                message: 'Open price is outside high-low range',
                record: index
            });
        }

        // Validate reasonable price ranges (no negative prices)
        ['open', 'high', 'low', 'close'].forEach(field => {
            if (record[field] < 0) {
                issues.push({
                    type: 'NEGATIVE_PRICE',
                    message: `Negative ${field} price`,
                    record: index,
                    field,
                    value: record[field]
                });
            }
        });

        return issues;
    }
}

module.exports = {
    CSVValidator,
    DataTypeValidator,
    DateRangeValidator,
    CalculationValidator
};