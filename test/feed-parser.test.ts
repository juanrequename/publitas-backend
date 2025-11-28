import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseProductFeed } from '../src/feed-parser';
import { BatchService } from '../src/services/batch.service';
import { Product } from '../src/types/product';
import ExternalService from '../src/services/external.service';

// Mock ExternalService
jest.mock('../src/services/external.service');

describe('parseProductFeed', () => {
  let mockExternalService: jest.Mocked<ExternalService>;
  let batchService: BatchService;
  let tempDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExternalService = new ExternalService() as jest.Mocked<ExternalService>;
    mockExternalService.call = jest.fn();
    batchService = new BatchService(mockExternalService);
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-feed-'));
  });

  afterEach(() => {
    // Clean up temp files
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createTempXmlFile(content: string): string {
    const filePath = path.join(tempDir, 'test-feed.xml');
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  describe('basic XML parsing', () => {
    it('should parse a single product from XML', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed>
          <item>
            <id>123</id>
            <title>Test Product</title>
            <description>A test description</description>
          </item>
        </feed>`;

      const filePath = createTempXmlFile(xml);
      await parseProductFeed(filePath, batchService);

      expect(mockExternalService.call).toHaveBeenCalledTimes(1);
      const products: Product[] = JSON.parse(mockExternalService.call.mock.calls[0][0]);
      expect(products).toHaveLength(1);
      expect(products[0]).toEqual({
        id: '123',
        title: 'Test Product',
        description: 'A test description',
      });
    });

    it('should parse multiple products from XML', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed>
          <item>
            <id>1</id>
            <title>Product 1</title>
            <description>Description 1</description>
          </item>
          <item>
            <id>2</id>
            <title>Product 2</title>
            <description>Description 2</description>
          </item>
          <item>
            <id>3</id>
            <title>Product 3</title>
            <description>Description 3</description>
          </item>
        </feed>`;

      const filePath = createTempXmlFile(xml);
      await parseProductFeed(filePath, batchService);

      expect(mockExternalService.call).toHaveBeenCalledTimes(1);
      const products: Product[] = JSON.parse(mockExternalService.call.mock.calls[0][0]);
      expect(products).toHaveLength(3);
      expect(products.map((p) => p.id)).toEqual(['1', '2', '3']);
    });
  });

  describe('namespaced XML tags', () => {
    it('should handle Google Shopping namespaced tags (g:)', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns:g="http://base.google.com/ns/1.0">
          <item>
            <g:id>456</g:id>
            <g:title>Namespaced Product</g:title>
            <g:description>Namespaced description</g:description>
          </item>
        </feed>`;

      const filePath = createTempXmlFile(xml);
      await parseProductFeed(filePath, batchService);

      expect(mockExternalService.call).toHaveBeenCalledTimes(1);
      const products: Product[] = JSON.parse(mockExternalService.call.mock.calls[0][0]);
      expect(products).toHaveLength(1);
      expect(products[0]).toEqual({
        id: '456',
        title: 'Namespaced Product',
        description: 'Namespaced description',
      });
    });

    it('should handle mixed namespaced and non-namespaced tags', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns:g="http://base.google.com/ns/1.0">
          <item>
            <g:id>789</g:id>
            <title>Mixed Title</title>
            <g:description>Mixed description</g:description>
          </item>
        </feed>`;

      const filePath = createTempXmlFile(xml);
      await parseProductFeed(filePath, batchService);

      expect(mockExternalService.call).toHaveBeenCalledTimes(1);
      const products: Product[] = JSON.parse(mockExternalService.call.mock.calls[0][0]);
      expect(products[0]).toEqual({
        id: '789',
        title: 'Mixed Title',
        description: 'Mixed description',
      });
    });
  });

  describe('CDATA handling', () => {
    it('should correctly parse CDATA content', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed>
          <item>
            <id>cdata-1</id>
            <title><![CDATA[Product with <special> & "chars"]]></title>
            <description><![CDATA[Description with <html> tags & entities]]></description>
          </item>
        </feed>`;

      const filePath = createTempXmlFile(xml);
      await parseProductFeed(filePath, batchService);

      expect(mockExternalService.call).toHaveBeenCalledTimes(1);
      const products: Product[] = JSON.parse(mockExternalService.call.mock.calls[0][0]);
      expect(products[0].title).toBe('Product with <special> & "chars"');
      expect(products[0].description).toBe('Description with <html> tags & entities');
    });
  });

  describe('whitespace handling', () => {
    it('should trim whitespace from text content', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed>
          <item>
            <id>  whitespace-1  </id>
            <title>
              Whitespace Title
            </title>
            <description>   Whitespace Description   </description>
          </item>
        </feed>`;

      const filePath = createTempXmlFile(xml);
      await parseProductFeed(filePath, batchService);

      const products: Product[] = JSON.parse(mockExternalService.call.mock.calls[0][0]);
      expect(products[0]).toEqual({
        id: 'whitespace-1',
        title: 'Whitespace Title',
        description: 'Whitespace Description',
      });
    });
  });

  describe('incomplete products', () => {
    it('should skip products without an id', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed>
          <item>
            <title>No ID Product</title>
            <description>This product has no ID</description>
          </item>
          <item>
            <id>valid-1</id>
            <title>Valid Product</title>
            <description>Valid description</description>
          </item>
        </feed>`;

      const filePath = createTempXmlFile(xml);
      await parseProductFeed(filePath, batchService);

      const products: Product[] = JSON.parse(mockExternalService.call.mock.calls[0][0]);
      expect(products).toHaveLength(1);
      expect(products[0].id).toBe('valid-1');
    });

    it('should include products with empty title or description', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed>
          <item>
            <id>empty-1</id>
            <title></title>
            <description></description>
          </item>
        </feed>`;

      const filePath = createTempXmlFile(xml);
      await parseProductFeed(filePath, batchService);

      const products: Product[] = JSON.parse(mockExternalService.call.mock.calls[0][0]);
      expect(products).toHaveLength(1);
      expect(products[0]).toEqual({
        id: 'empty-1',
        title: '',
        description: '',
      });
    });
  });

  describe('empty feed', () => {
    it('should handle empty feed with no items', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed>
        </feed>`;

      const filePath = createTempXmlFile(xml);
      await parseProductFeed(filePath, batchService);

      // Should not call external service when no products
      expect(mockExternalService.call).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should reject with error for non-existent file', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.xml');

      await expect(parseProductFeed(nonExistentPath, batchService)).rejects.toThrow();
    });

    it('should reject with error for malformed XML', async () => {
      const malformedXml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed>
          <item>
            <id>broken</id>
            <title>Unclosed tag
          </item>
        </feed>`;

      const filePath = createTempXmlFile(malformedXml);

      await expect(parseProductFeed(filePath, batchService)).rejects.toThrow();
    });
  });

  describe('special characters', () => {
    it('should handle XML entities', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed>
          <item>
            <id>entity-1</id>
            <title>Product &amp; More</title>
            <description>Less &lt; Greater &gt; Quote &quot;</description>
          </item>
        </feed>`;

      const filePath = createTempXmlFile(xml);
      await parseProductFeed(filePath, batchService);

      const products: Product[] = JSON.parse(mockExternalService.call.mock.calls[0][0]);
      expect(products[0].title).toBe('Product & More');
      expect(products[0].description).toBe('Less < Greater > Quote "');
    });

    it('should handle unicode characters', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed>
          <item>
            <id>unicode-1</id>
            <title>日本語製品</title>
            <description>Émojis: 🎉 🚀 ✨</description>
          </item>
        </feed>`;

      const filePath = createTempXmlFile(xml);
      await parseProductFeed(filePath, batchService);

      const products: Product[] = JSON.parse(mockExternalService.call.mock.calls[0][0]);
      expect(products[0].title).toBe('日本語製品');
      expect(products[0].description).toBe('Émojis: 🎉 🚀 ✨');
    });
  });

  describe('extra fields', () => {
    it('should ignore fields that are not id, title, or description', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <feed>
          <item>
            <id>extra-1</id>
            <title>Product with extras</title>
            <description>Standard description</description>
            <price>19.99</price>
            <category>Electronics</category>
            <image_link>http://example.com/image.jpg</image_link>
          </item>
        </feed>`;

      const filePath = createTempXmlFile(xml);
      await parseProductFeed(filePath, batchService);

      const products: Product[] = JSON.parse(mockExternalService.call.mock.calls[0][0]);
      expect(products[0]).toEqual({
        id: 'extra-1',
        title: 'Product with extras',
        description: 'Standard description',
      });
      // Ensure no extra fields
      expect(Object.keys(products[0])).toEqual(['id', 'title', 'description']);
    });
  });
});
