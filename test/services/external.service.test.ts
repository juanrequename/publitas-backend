import ExternalService from '../../src/services/external.service';

describe('ExternalService', () => {
  let externalService: ExternalService;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    externalService = new ExternalService();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with batch number 0', () => {
      const batch = JSON.stringify([{ id: '1', title: 'Test', description: 'Desc' }]);
      externalService.call(batch);

      // First call should show batch 1
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('batch    1'));
    });
  });

  describe('call', () => {
    it('should increment batch number on each call', () => {
      const batch = JSON.stringify([{ id: '1', title: 'Test', description: 'Desc' }]);

      externalService.call(batch);
      externalService.call(batch);
      externalService.call(batch);

      // Check batch numbers were incremented
      const calls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const batchCalls = calls.filter((c: string) => c?.includes('Received batch'));

      expect(batchCalls[0]).toContain('batch    1');
      expect(batchCalls[1]).toContain('batch    2');
      expect(batchCalls[2]).toContain('batch    3');
    });

    it('should log batch number with bold formatting', () => {
      const batch = JSON.stringify([]);
      externalService.call(batch);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('\x1b[1m'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('\x1b[22m'));
    });

    it('should log size in megabytes', () => {
      const batch = JSON.stringify([{ id: '1', title: 'Test', description: 'Desc' }]);
      externalService.call(batch);

      const calls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const sizeCalls = calls.filter((c: string) => c?.includes('Size:'));

      expect(sizeCalls).toHaveLength(1);
      expect(sizeCalls[0]).toMatch(/Size:\s+[\d.]+MB/);
    });

    it('should log product count', () => {
      const products = [
        { id: '1', title: 'Product 1', description: 'Desc 1' },
        { id: '2', title: 'Product 2', description: 'Desc 2' },
        { id: '3', title: 'Product 3', description: 'Desc 3' },
      ];
      const batch = JSON.stringify(products);
      externalService.call(batch);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Products:        3'));
    });

    it('should calculate correct size for a known payload', () => {
      // Create a batch of exactly 1MB
      const oneMBString = 'x'.repeat(1024 * 1024);
      const batch = JSON.stringify([{ data: oneMBString }]);
      externalService.call(batch);

      const calls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const sizeCalls = calls.filter((c: string) => c?.includes('Size:'));

      // Should be slightly over 1MB due to JSON structure
      expect(sizeCalls[0]).toMatch(/Size:\s+1\.\d+MB/);
    });

    it('should handle empty array batch', () => {
      const batch = JSON.stringify([]);
      externalService.call(batch);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Products:        0'));
    });

    it('should handle single product batch', () => {
      const batch = JSON.stringify([{ id: '1', title: 'Test', description: 'Desc' }]);
      externalService.call(batch);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Products:        1'));
    });

    it('should output an empty line at the end', () => {
      const batch = JSON.stringify([]);
      externalService.call(batch);

      // Last call should be empty (the newline separator)
      const lastCall = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1];
      expect(lastCall).toEqual([]);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => {
        externalService.call('not valid json');
      }).toThrow();
    });

    it('should pad batch numbers correctly for multi-digit numbers', () => {
      const batch = JSON.stringify([]);

      // Call 10 times
      for (let i = 0; i < 10; i++) {
        externalService.call(batch);
      }

      const calls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const batchCalls = calls.filter((c: string) => c?.includes('Received batch'));

      // Batch 10 should be formatted with proper padding
      expect(batchCalls[9]).toContain('batch   10');
    });

    it('should correctly calculate byte size for unicode characters', () => {
      // Japanese characters take 3 bytes each in UTF-8
      const unicodeProduct = { id: '1', title: '日本語', description: 'テスト' };
      const batch = JSON.stringify([unicodeProduct]);
      const expectedSize = Buffer.byteLength(batch);

      externalService.call(batch);

      const calls = consoleLogSpy.mock.calls.map((call) => call[0]);
      const sizeCalls = calls.filter((c: string) => c?.includes('Size:'));

      // Extract the size value from the log
      const sizeMatch = sizeCalls[0].match(/Size:\s+([\d.]+)MB/);
      expect(sizeMatch).not.toBeNull();

      const loggedSizeMB = parseFloat(sizeMatch![1]);
      const expectedSizeMB = expectedSize / 1_048_576;

      expect(loggedSizeMB).toBeCloseTo(expectedSizeMB, 2);
    });
  });
});
