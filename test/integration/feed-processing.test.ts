import path from 'path';
import { parseProductFeed } from '../../src/feed-parser';
import { BatchService } from '../../src/services/batch.service';
import { BYTES_PER_MB } from '../../src/config';
import ExternalService from '../../src/services/external.service';

const MAX_BATCH_SIZE = 5 * BYTES_PER_MB;

/** Extends ExternalService to capture batches for verification */
class TestExternalService extends ExternalService {
  public batches: string[] = [];

  public async call(batch: string): Promise<void> {
    this.batches.push(batch);
  }
}

describe('Feed Processing Integration', () => {
  it('should process feed.xml with all batches strictly under 5MB', async () => {
    const feedPath = path.join(process.cwd(), 'data', 'feed.xml');
    const externalService = new TestExternalService();
    const batchService = new BatchService(externalService);

    await parseProductFeed(feedPath, batchService);

    expect(externalService.batches.length).toBeGreaterThan(0);

    for (const batch of externalService.batches) {
      const batchSize = Buffer.byteLength(batch, 'utf8');
      expect(batchSize).toBeLessThan(MAX_BATCH_SIZE);
    }
  });
});

