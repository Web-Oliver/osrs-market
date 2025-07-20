/**
 * ⚙️ Data Processing Pipeline Service - SOLID Optimized
 *
 * Single Responsibility Principle:
 * - ONLY processes and transforms collected data
 * - Data validation, cleaning, and enrichment
 * - Pipeline stage management and error handling
 *
 * Extracted from DataCollectionService to eliminate God Class
 */

const { BaseService } = require('../BaseService');

class DataProcessingPipelineService extends BaseService {
  constructor(dependencies = {}) {
    super('DataProcessingPipelineService', {
      enableCache: false, // Processing should not be cached
      enableMongoDB: false
    });

    // Dependency injection
    this.processors = dependencies.processors || [];
    this.validators = dependencies.validators || [];
    this.enrichers = dependencies.enrichers || [];

    // Pipeline configuration
    this.pipelineConfig = {
      enableValidation: true,
      enableEnrichment: true,
      enableErrorRecovery: true,
      maxRetries: 3,
      ...dependencies.config
    };

    // Processing metrics
    this.processingMetrics = {
      totalProcessed: 0,
      successfullyProcessed: 0,
      validationErrors: 0,
      processingErrors: 0,
      averageProcessingTime: 0
    };

    this.logger.info('Data Processing Pipeline initialized', {
      processors: this.processors.length,
      validators: this.validators.length,
      enrichers: this.enrichers.length,
      config: this.pipelineConfig
    });
  }

  /**
   * Process data through complete pipeline
   */
  async processData() {
    return this.execute(async() => {
      this.logger.debug('Starting data processing pipeline', {
        dataSize: Array.isArray(rawData) ? rawData.length : Object.keys(rawData || {}).length,
        context
      });

      // Stage 1: Validation
      let processedData = rawData;
      if (this.pipelineConfig.enableValidation) {
        processedData = await this.validateData(processedData, context);
      }

      // Stage 2: Processing/Transformation
      processedData = await this.transformData(processedData, context);

      // Stage 3: Enrichment
      if (this.pipelineConfig.enableEnrichment) {
        processedData = await this.enrichData(processedData, context);
      }

      // Stage 4: Final validation
      const finalData = await this.finalizeData(processedData, context);

      // Update metrics
      this.updateProcessingMetrics(startTime, true);

      this.logger.info('Data processing pipeline completed', {
        processingTime: Date.now() - startTime,
        inputSize: Array.isArray(rawData) ? rawData.length : Object.keys(rawData || {}).length,
        outputSize: Array.isArray(finalData) ? finalData.length : Object.keys(finalData || {}).length
      });

      return {
        data: finalData,
        metadata: {
          processingTime: Date.now() - startTime,
          pipeline: 'full',
          stages: ['validation', 'transformation', 'enrichment', 'finalization'],
          timestamp: new Date()
        }
      };
    }, 'processData', { logSuccess: true });
  }

  /**
   * Validate data stage
   */
  async validateData(data, context) {
    if (!this.validators.length) {
      return data;
    }

    this.logger.debug('Starting data validation stage');
    const validationResults = [];
    let validatedData = data;

    for (const validator of this.validators) {
      try {
        const result = await validator.validate(validatedData, context);
        validationResults.push({
          validator: validator.name,
          passed: result.isValid,
          errors: result.errors || [],
          warnings: result.warnings || []
        });

        if (!result.isValid) {
          if (validator.shouldReject) {
            this.processingMetrics.validationErrors++;
            throw new Error(`Validation failed: ${result.errors.join(', ')}`);
          } else {
            // Filter out invalid data
            validatedData = result.filteredData || validatedData;
          }
        }

      } catch (error) {
        this.logger.warn('Validator error', {
          validator: validator.name,
          error: error.message
        });

        if (validator.isRequired) {
          throw error;
        }
      }
    }

    this.logger.debug('Data validation completed', {
      validatorsRun: validationResults.length,
      validationsPassed: validationResults.filter(r => r.passed).length
    });

    return validatedData;
  }

  /**
   * Transform data stage
   */
  async transformData(data, context) {
    if (!this.processors.length) {
      return data;
    }

    this.logger.debug('Starting data transformation stage');
    let transformedData = data;

    for (const processor of this.processors) {
      try {
        transformedData = await processor.process(transformedData, context);

        this.logger.debug('Data processed by processor', {
          processor: processor.name,
          inputSize: Array.isArray(data) ? data.length : Object.keys(data || {}).length,
          outputSize: Array.isArray(transformedData) ? transformedData.length : Object.keys(transformedData || {}).length
        });

      } catch (error) {
        this.logger.warn('Processor error', {
          processor: processor.name,
          error: error.message
        });

        if (processor.isRequired) {
          throw error;
        }

        // Continue with previous data if processor fails
      }
    }

    return transformedData;
  }

  /**
   * Enrich data stage
   */
  async enrichData(data, context) {
    if (!this.enrichers.length) {
      return data;
    }

    this.logger.debug('Starting data enrichment stage');
    let enrichedData = data;

    for (const enricher of this.enrichers) {
      try {
        enrichedData = await enricher.enrich(enrichedData, context);

        this.logger.debug('Data enriched by enricher', {
          enricher: enricher.name
        });

      } catch (error) {
        this.logger.warn('Enricher error', {
          enricher: enricher.name,
          error: error.message
        });

        // Enrichment failures are usually non-fatal
        if (enricher.isRequired) {
          throw error;
        }
      }
    }

    return enrichedData;
  }

  /**
   * Finalize data stage
   */
  async finalizeData(data, context) {
    // Apply final formatting and cleanup
    let finalData = data;

    // Remove any temporary processing fields
    if (Array.isArray(finalData)) {
      finalData = finalData.map(item => this.cleanupItem(item));
    } else if (typeof finalData === 'object' && finalData !== null) {
      finalData = this.cleanupItem(finalData);
    }

    // Apply final validation
    if (this.pipelineConfig.enableValidation) {
      finalData = await this.finalValidation(finalData, context);
    }

    return finalData;
  }

  /**
   * Clean up individual item
   */
  cleanupItem(item) {
    if (typeof item !== 'object' || item === null) {
      return item;
    }

    const cleaned = { ...item };

    // Remove temporary fields (fields starting with _temp or _processing)
    Object.keys(cleaned).forEach(key => {
      if (key.startsWith('_temp') || key.startsWith('_processing')) {
        delete cleaned[key];
      }
    });

    // Ensure required fields have defaults
    if (!cleaned.timestamp) {
      cleaned.timestamp = new Date();
    }

    if (!cleaned.id && cleaned.itemId) {
      cleaned.id = cleaned.itemId;
    }

    return cleaned;
  }

  /**
   * Final validation
   */
  async finalValidation(data, context) {
    // Basic final checks
    if (Array.isArray(data)) {
      const validItems = data.filter(item => {
        return item &&
               typeof item === 'object' &&
               Object.keys(item).length > 0;
      });

      this.logger.debug('Final validation completed', {
        originalCount: data.length,
        validCount: validItems.length,
        filteredOut: data.length - validItems.length
      });

      return validItems;
    }

    return data;
  }

  /**
   * Process data with retry logic
   */
  async processDataWithRetry(rawData, context = {}) {
    let lastError;

    for (let attempt = 1; attempt <= this.pipelineConfig.maxRetries; attempt++) {
      try {
        return await this.processData(rawData, context);
      } catch (error) {
        lastError = error;

        if (attempt < this.pipelineConfig.maxRetries) {
          this.logger.warn('Processing attempt failed, retrying', {
            attempt,
            maxRetries: this.pipelineConfig.maxRetries,
            error: error.message
          });

          // Exponential backoff
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError;
  }

  /**
   * Add processor to pipeline
   */
  addProcessor(processor) {
    if (!processor.name || !processor.process) {
      throw new Error('Processor must have name and process method');
    }

    this.processors.push(processor);
    this.logger.info('Added processor to pipeline', { processor: processor.name });
  }

  /**
   * Add validator to pipeline
   */
  addValidator(validator) {
    if (!validator.name || !validator.validate) {
      throw new Error('Validator must have name and validate method');
    }

    this.validators.push(validator);
    this.logger.info('Added validator to pipeline', { validator: validator.name });
  }

  /**
   * Add enricher to pipeline
   */
  addEnricher(enricher) {
    if (!enricher.name || !enricher.enrich) {
      throw new Error('Enricher must have name and enrich method');
    }

    this.enrichers.push(enricher);
    this.logger.info('Added enricher to pipeline', { enricher: enricher.name });
  }

  /**
   * Update processing metrics
   */
  updateProcessingMetrics(startTime, success) {
    const processingTime = Date.now() - startTime;

    this.processingMetrics.totalProcessed++;

    if (success) {
      this.processingMetrics.successfullyProcessed++;
    } else {
      this.processingMetrics.processingErrors++;
    }

    // Update running average of processing time
    const alpha = 0.1;
    this.processingMetrics.averageProcessingTime =
      this.processingMetrics.averageProcessingTime === 0
        ? processingTime
        : (1 - alpha) * this.processingMetrics.averageProcessingTime + alpha * processingTime;
  }

  /**
   * Get processing metrics
   */
  getProcessingMetrics() {
    return {
      ...this.processingMetrics,
      successRate: this.processingMetrics.totalProcessed > 0
        ? this.processingMetrics.successfullyProcessed / this.processingMetrics.totalProcessed
        : 0,
      pipelineComponents: {
        processors: this.processors.length,
        validators: this.validators.length,
        enrichers: this.enrichers.length
      },
      config: this.pipelineConfig
    };
  }

  /**
   * Reset processing metrics
   */
  resetProcessingMetrics() {
    this.processingMetrics = {
      totalProcessed: 0,
      successfullyProcessed: 0,
      validationErrors: 0,
      processingErrors: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { DataProcessingPipelineService };
