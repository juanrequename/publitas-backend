import fs from 'fs';
import sax from 'sax';
import { BatchService } from './services/batch.service';
import { Product } from './types/product';

/**
 * Extracts the local name from a potentially namespaced XML tag.
 * For example, "g:id" becomes "id", while "item" remains "item".
 */
const getLocalName = (name: string): string => (name.includes(':') ? name.split(':')[1] : name);

/** Maps XML tag names to Product property names. */
const FIELD_MAPPINGS: Record<string, keyof Product> = {
  id: 'id',
  title: 'title',
  description: 'description',
};

/** Type guard to check if a partial product has all required fields */
const isValidProduct = (p: Partial<Product>): p is Product =>
  !!p.id && p.title !== undefined && p.description !== undefined;

/**
 * Parses an XML product feed and processes products in batches.
 *
 * Uses SAX streaming parser for memory-efficient processing of large XML files.
 * Products are extracted from <item> elements and sent to the batch service.
 *
 * @param xmlFilePath - Path to the XML feed file
 * @param batchService - Batch service instance to handle product batching
 * @returns Promise that resolves when the entire feed has been processed
 */
export async function parseProductFeed(
  xmlFilePath: string,
  batchService: BatchService
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create a SAX streaming parser with strict mode and XML namespace support
    const parser = sax.createStream(true, { xmlns: true });

    let currentProduct: Partial<Product> = {}; // Accumulates fields of the current product
    let currentTag = '';
    let currentText = '';
    let insideItem = false; // Whether we're inside an <item> element

    // Promise queue to chain async operations sequentially
    let pending: Promise<void> = Promise.resolve();

    // Handle opening tags - detect when we enter an <item> and track nested tags
    parser.on('opentag', (node) => {
      const tagName = getLocalName(node.name);

      // When entering an <item>, reset state to start capturing a new product
      if (tagName === 'item') {
        insideItem = true;
        currentProduct = {};
      }

      if (insideItem) {
        currentTag = tagName;
        currentText = '';
      }
    });

    // Handle text nodes - accumulate text content within product fields
    parser.on('text', (text) => {
      if (insideItem && currentTag) {
        currentText += text;
      }
    });

    // Handle CDATA sections - treat the same as regular text
    parser.on('cdata', (cdata) => {
      if (insideItem && currentTag) {
        currentText += cdata;
      }
    });

    // Handle closing tags - assign accumulated text to product fields and emit products
    parser.on('closetag', (tagName) => {
      const localName = getLocalName(tagName);

      // Map tag content to the appropriate product field
      if (insideItem && localName in FIELD_MAPPINGS) {
        currentProduct[FIELD_MAPPINGS[localName]] = currentText.trim();
      }

      // When closing an <item>, validate and submit the product to the batch service
      if (localName === 'item') {
        insideItem = false;

        // Only add products that have all required fields
        if (isValidProduct(currentProduct)) {
          // Copy and chain the async addProduct operation to maintain order
          const product = { ...currentProduct } as Product;
          pending = pending.then(() => batchService.addProduct(product));
        }

        currentProduct = {};
      }

      currentTag = '';
      currentText = '';
    });

    parser.on('error', (err) => {
      reject(err);
    });

    parser.on('end', () => {
      // Wait for all pending addProduct operations, then flush remaining batch
      pending
        .then(() => batchService.flush())
        .then(resolve)
        .catch(reject);
    });

    // Stream the file through the parser for memory-efficient processing
    const fileStream = fs.createReadStream(xmlFilePath);
    fileStream.on('error', (err) => {
      reject(err);
    });
    fileStream.pipe(parser);
  });
}
