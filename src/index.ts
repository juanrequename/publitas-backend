import './config';
import path from 'path';
import ExternalService from './services/external.service';
import { BatchService } from './services/batch.service';
import { parseProductFeed } from './feed-parser';
import logger from './utils/logger';

let batchService: BatchService;

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, flushing remaining batch...');
  await batchService?.flush();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, flushing remaining batch...');
  await batchService?.flush();
  process.exit(0);
});

async function main(): Promise<void> {
  const feedPath = path.join(process.cwd(), 'data', 'feed.xml');
  const externalService = new ExternalService();
  batchService = new BatchService(externalService);

  logger.info({ feedPath }, 'Processing feed');
  await parseProductFeed(feedPath, batchService);
  logger.info('Processing complete');
}

main().catch((error) => {
  logger.error({ err: error }, 'Error processing feed');
  process.exit(1);
});
