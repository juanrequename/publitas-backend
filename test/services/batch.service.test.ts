import { BatchService } from '../../src/services/batch.service';
import { Product } from '../../src/types/product';
import ExternalService from '../../src/services/external.service';

// Mock ExternalService
jest.mock('../../src/services/external.service');

describe('BatchService', () => {
  let mockExternalService: jest.Mocked<ExternalService>;
  let batchService: BatchService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExternalService = new ExternalService() as jest.Mocked<ExternalService>;
    mockExternalService.call = jest.fn();
    batchService = new BatchService(mockExternalService);
  });

  describe('addProduct', () => {
    it('should add a product to the batch without flushing', () => {
      const product: Product = {
        id: '1',
        title: 'Test Product',
        description: 'A test product',
      };

      batchService.addProduct(product);

      // Should not flush yet since batch size is small
      expect(mockExternalService.call).not.toHaveBeenCalled();
    });

    it('should add multiple products to the batch', () => {
      const products: Product[] = [
        { id: '1', title: 'Product 1', description: 'Description 1' },
        { id: '2', title: 'Product 2', description: 'Description 2' },
        { id: '3', title: 'Product 3', description: 'Description 3' },
      ];

      products.forEach((p) => batchService.addProduct(p));

      // Should not flush yet since batch size is small
      expect(mockExternalService.call).not.toHaveBeenCalled();
    });
  });

  describe('flush', () => {
    it('should send the batch to the external service', () => {
      const product: Product = {
        id: '1',
        title: 'Test Product',
        description: 'A test product',
      };

      batchService.addProduct(product);
      batchService.flush();

      expect(mockExternalService.call).toHaveBeenCalledTimes(1);
      expect(mockExternalService.call).toHaveBeenCalledWith(JSON.stringify([product]));
    });

    it('should not call external service when batch is empty', () => {
      batchService.flush();

      expect(mockExternalService.call).not.toHaveBeenCalled();
    });

    it('should reset the batch after flushing', () => {
      const product: Product = {
        id: '1',
        title: 'Test Product',
        description: 'A test product',
      };

      batchService.addProduct(product);
      batchService.flush();

      // Flush again - should not call since batch is empty
      batchService.flush();

      expect(mockExternalService.call).toHaveBeenCalledTimes(1);
    });

    it('should serialize multiple products as a JSON array', () => {
      const products: Product[] = [
        { id: '1', title: 'Product 1', description: 'Description 1' },
        { id: '2', title: 'Product 2', description: 'Description 2' },
      ];

      products.forEach((p) => batchService.addProduct(p));
      batchService.flush();

      expect(mockExternalService.call).toHaveBeenCalledWith(JSON.stringify(products));
    });
  });

  describe('auto-flush on size limit', () => {
    it('should auto-flush when batch size approaches 5MB limit', () => {
      // Create a large product that takes up significant space
      const largeDescription = 'x'.repeat(1024 * 1024); // ~1MB string
      const largeProduct: Product = {
        id: '1',
        title: 'Large Product',
        description: largeDescription,
      };

      // Add 5 products of ~1MB each - should trigger auto-flush before 5MB
      for (let i = 0; i < 5; i++) {
        batchService.addProduct({
          ...largeProduct,
          id: String(i),
        });
      }

      // Should have auto-flushed at least once
      expect(mockExternalService.call).toHaveBeenCalled();
    });

    it('should keep products in batch after auto-flush', () => {
      const largeDescription = 'x'.repeat(1024 * 1024); // ~1MB string

      // Add products until auto-flush occurs
      for (let i = 0; i < 6; i++) {
        batchService.addProduct({
          id: String(i),
          title: 'Large Product',
          description: largeDescription,
        });
      }

      // Manually flush remaining products
      batchService.flush();

      // Should have called at least twice (once auto, once manual)
      expect(mockExternalService.call.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should correctly handle batch size calculations with unicode characters', () => {
      // Unicode characters take more bytes than their character count
      const unicodeDescription = '日本語テスト'.repeat(100000); // Japanese characters
      const product: Product = {
        id: '1',
        title: 'Unicode Product',
        description: unicodeDescription,
      };

      batchService.addProduct(product);
      batchService.flush();

      expect(mockExternalService.call).toHaveBeenCalledTimes(1);
      const calledWith = mockExternalService.call.mock.calls[0][0];
      expect(JSON.parse(calledWith)).toEqual([product]);
    });

    it('should throw when a single product exceeds the 5MB batch size limit', () => {
      // Create a product whose JSON representation is larger than 5MB
      const hugeDescription = 'x'.repeat(6 * 1024 * 1024); // ~6MB string
      const hugeProduct: Product = {
        id: 'huge',
        title: 'Huge Product',
        description: hugeDescription,
      };

      expect(() => batchService.addProduct(hugeProduct)).toThrow(
        /Product size \(\d+\.\d+MB\) exceeds 5MB batch size limit/
      );
    });
  });

  describe('edge cases', () => {
    it('should handle products with empty strings', () => {
      const product: Product = {
        id: '',
        title: '',
        description: '',
      };

      batchService.addProduct(product);
      batchService.flush();

      expect(mockExternalService.call).toHaveBeenCalledWith(JSON.stringify([product]));
    });

    it('should handle products with special characters', () => {
      const product: Product = {
        id: '123',
        title: 'Product with "quotes" and \\backslash',
        description: 'Description with\nnewlines\tand\ttabs',
      };

      batchService.addProduct(product);
      batchService.flush();

      expect(mockExternalService.call).toHaveBeenCalledTimes(1);
      const calledWith = mockExternalService.call.mock.calls[0][0];
      expect(JSON.parse(calledWith)).toEqual([product]);
    });
  });
});
