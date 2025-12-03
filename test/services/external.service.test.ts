import ExternalService from '../../src/services/external.service';
import logger from '../../src/utils/logger';

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  __esModule: true,
}));

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('ExternalService', () => {
  let externalService: ExternalService;

  beforeEach(() => {
    jest.clearAllMocks();
    externalService = new ExternalService();
  });

  describe('constructor', () => {
    it('should initialize with batch number 0', async () => {
      const batch = JSON.stringify([{ id: '1', title: 'Test', description: 'Desc' }]);
      await externalService.call(batch);

      // First call should show batch 1
      const calls = mockLogger.info.mock.calls.map((call) => call[0]) as string[];
      const batchCalls = calls.filter((c) => c?.includes('Received batch'));

      expect(batchCalls[0]).toContain('batch   1');
    });
  });

  describe('call', () => {
    it('should increment batch number on each call', async () => {
      const batch = JSON.stringify([{ id: '1', title: 'Test', description: 'Desc' }]);

      await externalService.call(batch);
      await externalService.call(batch);
      await externalService.call(batch);

      // Check batch numbers were incremented
      const calls = mockLogger.info.mock.calls.map((call) => call[0]) as string[];
      const batchCalls = calls.filter((c) => c?.includes('Received batch'));

      expect(batchCalls[0]).toContain('batch   1');
      expect(batchCalls[1]).toContain('batch   2');
      expect(batchCalls[2]).toContain('batch   3');
    });

    it('should log size in megabytes', async () => {
      const batch = JSON.stringify([{ id: '1', title: 'Test', description: 'Desc' }]);
      await externalService.call(batch);

      // Size is logged as the 2nd line
      expect(mockLogger.info).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(/^Size:\s+[\d.]+MB$/)
      );
    });

    it('should log product count', async () => {
      const products = [
        { id: '1', title: 'Product 1', description: 'Desc 1' },
        { id: '2', title: 'Product 2', description: 'Desc 2' },
        { id: '3', title: 'Product 3', description: 'Desc 3' },
      ];
      const batch = JSON.stringify(products);
      await externalService.call(batch);

      // Products count is logged as the 3rd line
      expect(mockLogger.info).toHaveBeenNthCalledWith(3, 'Products:        3');
    });

    it('should calculate correct size for a known payload', async () => {
      // Create a batch of exactly 1MB
      const oneMBString = 'x'.repeat(1024 * 1024);
      const batch = JSON.stringify([{ data: oneMBString }]);
      await externalService.call(batch);

      // Size is logged as the 2nd line
      const sizeLog = mockLogger.info.mock.calls[1][0] as string;
      const sizeMB = parseFloat(sizeLog.replace('Size:', '').replace('MB', '').trim());

      // Should be around 1MB (slightly over due to JSON structure)
      expect(sizeMB).toBeGreaterThanOrEqual(1);
      expect(sizeMB).toBeLessThan(1.1);
    });

    it('should handle empty array batch', async () => {
      const batch = JSON.stringify([]);
      await externalService.call(batch);

      // Products count is logged as the 3rd line
      expect(mockLogger.info).toHaveBeenNthCalledWith(3, 'Products:        0');
    });

    it('should handle single product batch', async () => {
      const batch = JSON.stringify([{ id: '1', title: 'Test', description: 'Desc' }]);
      await externalService.call(batch);

      // Products count is logged as the 3rd line
      expect(mockLogger.info).toHaveBeenNthCalledWith(3, 'Products:        1');
    });

    it('should throw error for invalid JSON', async () => {
      await expect(externalService.call('not valid json')).rejects.toThrow();
    });

    it('should correctly calculate byte size for unicode characters', async () => {
      // Japanese characters take 3 bytes each in UTF-8
      const unicodeProduct = { id: '1', title: '日本語', description: 'テスト' };
      const batch = JSON.stringify([unicodeProduct]);
      const expectedSize = Buffer.byteLength(batch);

      await externalService.call(batch);

      // Size is logged as the 2nd line
      const sizeLog = mockLogger.info.mock.calls[1][0] as string;
      const loggedSizeMB = parseFloat(sizeLog.replace('Size:', '').replace('MB', '').trim());
      const expectedSizeMB = expectedSize / 1_048_576;

      expect(loggedSizeMB).toBeCloseTo(expectedSizeMB, 2);
    });

    it('should log empty line at the end', async () => {
      const batch = JSON.stringify([{ id: '1', title: 'Test', description: 'Desc' }]);
      await externalService.call(batch);

      // Empty line is logged as the 4th line
      expect(mockLogger.info).toHaveBeenNthCalledWith(4, '');
    });
  });
});
