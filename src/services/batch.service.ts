import ExternalService from './external.service';
import { Product } from '../types/product';

const MAX_BATCH_SIZE = 5 * 1024 * 1024;
const EMPTY_JSON_ARRAY_SIZE = Buffer.byteLength('[]', 'utf8'); // 2 bytes
const COMMA_SEPARATOR_SIZE = Buffer.byteLength(',', 'utf8'); // 1 byte

/**
 * Service for batching products for efficient bulk processing.
 *
 * The BatchService accumulates products and automatically flushes them
 * to an external service when the batch size approaches the 5MB limit.
 * This ensures that each API call stays within size constraints while
 * maximizing throughput by batching multiple products together.
 */
export class BatchService {
  /** Array holding the current batch of products awaiting flush. */
  private batch: Product[] = [];

  /** Tracks the current byte size of the batch when serialized as JSON. */
  private currentBatchSize = EMPTY_JSON_ARRAY_SIZE;

  /** The external service to send batches to when flushed. */
  private readonly externalService: ExternalService;

  /**
   * @param externalService - The external service to send batches to when flushed.
   */
  constructor(externalService: ExternalService) {
    this.externalService = externalService;
  }

  /**
   * Calculates the additional byte size needed to add an item to the batch.
   * Accounts for the comma separator required between JSON array elements.
   */
  private calculateAdditionalSize(itemByteSize: number): number {
    return this.batch.length === 0 ? itemByteSize : itemByteSize + COMMA_SEPARATOR_SIZE;
  }

  /**
   * Flushes the current batch to the external service.
   *
   * Serializes all accumulated products as a JSON array and sends them
   * to the external service. After flushing, the batch is reset to empty.
   */
  flush(): void {
    if (this.batch.length > 0) {
      const jsonBatch = JSON.stringify(this.batch);
      this.externalService.call(jsonBatch);
      this.batch = [];
      this.currentBatchSize = EMPTY_JSON_ARRAY_SIZE;
    }
  }

  /**
   * Adds a product to the current batch.
   *
   * If adding the product would cause the batch to reach or exceed the
   * maximum size limit (5MB), the current batch is automatically flushed
   * before the new product is added.
   *
   * If a single product is so large that even a batch containing only that
   * product would reach or exceed the 5MB limit, an error is thrown rather
   * than sending an invalid oversized batch.
   *
   * @param product - The product to add to the batch.
   */
  addProduct(product: Product): void {
    const productJson = JSON.stringify(product);
    const productByteSize = Buffer.byteLength(productJson, 'utf8');

    // Guard rail: reject products that cannot ever fit in a valid batch
    if (EMPTY_JSON_ARRAY_SIZE + productByteSize >= MAX_BATCH_SIZE) {
      const sizeMB = (productByteSize / (1024 * 1024)).toFixed(2);
      throw new Error(
        `Product size (${sizeMB}MB) exceeds 5MB batch size limit and cannot be added to any batch.`
      );
    }

    // Flush if adding this product would reach or exceed the 5MB limit
    if (this.currentBatchSize + this.calculateAdditionalSize(productByteSize) >= MAX_BATCH_SIZE) {
      this.flush();
    }

    // Add product and update the tracked byte size
    this.currentBatchSize += this.calculateAdditionalSize(productByteSize);
    this.batch.push(product);
  }
}
